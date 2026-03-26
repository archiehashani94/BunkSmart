"use client";
import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";

const AttendanceContext = createContext();

export function AttendanceProvider({ children }) {
  const [subjects, setSubjects] = useState([]);
  const [calendar, setCalendarState] = useState({
    semesterStart: "",
    semesterEnd: "",
    holidays: [],
  });
  const [noteRequests, setNoteRequests] = useState([]);
  const [attendanceLog, setAttendanceLog] = useState({});
  const [loaded, setLoaded] = useState(false);
  // Persist deleted note IDs in localStorage so they survive refresh
  const getDeletedNoteIds = useCallback(() => {
    try {
      const stored = localStorage.getItem("bunksmart_deleted_note_ids");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  }, []);
  const addDeletedNoteId = useCallback((id) => {
    const ids = getDeletedNoteIds();
    ids.add(id);
    localStorage.setItem("bunksmart_deleted_note_ids", JSON.stringify([...ids]));
  }, [getDeletedNoteIds]);
  const addDeletedNoteIds = useCallback((idsArray) => {
    const ids = getDeletedNoteIds();
    idsArray.forEach(id => ids.add(id));
    localStorage.setItem("bunksmart_deleted_note_ids", JSON.stringify([...ids]));
  }, [getDeletedNoteIds]);

  // Helper to get current user email from localStorage (avoids useAuth dependency)
  const getUserEmail = useCallback(() => {
    try {
      const stored = localStorage.getItem("bunksmart_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.email || "";
      }
    } catch {}
    return "";
  }, []);

  useEffect(() => {
    const storedSubjects = localStorage.getItem("bunksmart_subjects");
    const storedCalendar = localStorage.getItem("bunksmart_calendar");
    const storedNotes = localStorage.getItem("bunksmart_notes");
    const storedLog = localStorage.getItem("bunksmart_attendance_log");
    if (storedSubjects) setSubjects(JSON.parse(storedSubjects));
    if (storedCalendar) setCalendarState(JSON.parse(storedCalendar));
    if (storedNotes) setNoteRequests(JSON.parse(storedNotes));
    if (storedLog) setAttendanceLog(JSON.parse(storedLog));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem("bunksmart_subjects", JSON.stringify(subjects));
    }
  }, [subjects, loaded]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem("bunksmart_calendar", JSON.stringify(calendar));
    }
  }, [calendar, loaded]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem("bunksmart_notes", JSON.stringify(noteRequests));
    }
  }, [noteRequests, loaded]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(
        "bunksmart_attendance_log",
        JSON.stringify(attendanceLog)
      );
    }
  }, [attendanceLog, loaded]);

  // Poll API for incoming note requests every 10 seconds
  useEffect(() => {
    if (!loaded) return;

    const fetchNotes = async () => {
      const email = (getUserEmail() || "").trim().toLowerCase();
      if (!email) return;

      try {
        const res = await fetch(`/api/notes?email=${encodeURIComponent(email)}`);
        if (!res.ok) return;
        const data = await res.json();

        const deletedIds = getDeletedNoteIds();
        setNoteRequests(prev => {
          const apiNotes = data.requests || [];
          const localNotes = [...prev];
          let changed = false;

          apiNotes.forEach(apiNote => {
            if (deletedIds.has(apiNote.id)) return;
            const idx = localNotes.findIndex(n => n.id === apiNote.id);
            if (idx === -1) {
              localNotes.push(apiNote);
              changed = true;
            } else {
              const localUpdatedAt = localNotes[idx]?.updatedAt || "";
              const apiUpdatedAt = apiNote?.updatedAt || "";
              if (
                (apiUpdatedAt && apiUpdatedAt !== localUpdatedAt) ||
                localNotes[idx].status !== apiNote.status
              ) {
                localNotes[idx] = { ...localNotes[idx], ...apiNote };
                changed = true;
              }
            }
          });

          if (changed) {
            return localNotes.sort((a, b) => new Date(b.date) - new Date(a.date));
          }
          return prev;
        });
      } catch (err) {
        // Silently fail — API might not be ready yet
      }
    };

    fetchNotes();
    const interval = setInterval(fetchNotes, 10000);
    return () => clearInterval(interval);
  }, [loaded, getUserEmail]);

  const setCalendar = (calendarData) => {
    setCalendarState(calendarData);
  };

  const addSubject = (subject) => {
    const newSubject = {
      id: Date.now().toString(),
      name: subject.name,
      attended: 0,
      total: 0,
      totalClasses: subject.totalClasses,
      minAttendance: subject.minAttendance || 75,
      history: [],
      classesPerDay: subject.classesPerDay || {},
      days:
        subject.days ||
        Object.keys(subject.classesPerDay || {})
          .map(Number)
          .sort(),
      classesPerWeek:
        subject.classesPerWeek ||
        Object.values(subject.classesPerDay || {}).reduce(
          (a, b) => a + b,
          0
        ),
    };
    setSubjects((prev) => [...prev, newSubject]);
  };

  const addMultipleSubjects = (subjectsList) => {
    const newSubjects = subjectsList.map((s, i) => ({
      id: (Date.now() + i).toString(),
      name: s.name,
      attended: 0,
      total: 0,
      totalClasses: s.totalClasses,
      minAttendance: s.minAttendance || 75,
      history: [],
      classesPerDay: s.classesPerDay || {},
      days:
        s.days ||
        Object.keys(s.classesPerDay || {})
          .map(Number)
          .sort(),
      classesPerWeek:
        s.classesPerWeek ||
        Object.values(s.classesPerDay || {}).reduce((a, b) => a + b, 0),
    }));
    setSubjects(newSubjects);
  };

  const applyStatusDelta = (prevStatus, nextStatus) => {
    const statusToCounts = (status) => {
      if (status === "attended") return { attended: 1, total: 1 };
      if (status === "bunked") return { attended: 0, total: 1 };
      return { attended: 0, total: 0 };
    };

    const prevCounts = statusToCounts(prevStatus);
    const nextCounts = statusToCounts(nextStatus);

    return {
      attendedDelta: nextCounts.attended - prevCounts.attended,
      totalDelta: nextCounts.total - prevCounts.total,
    };
  };

  const setAttendanceForDate = (subjectId, dateKey, status) => {
    if (!dateKey) return;

    setAttendanceLog((prevLog) => {
      const prevForDate = prevLog[dateKey] || {};
      const prevStatus = prevForDate[subjectId] || "none";
      const nextStatus = status === "none" ? "none" : status;

      if (prevStatus === nextStatus) {
        return prevLog;
      }

      const { attendedDelta, totalDelta } = applyStatusDelta(
        prevStatus,
        nextStatus
      );

      setSubjects((prevSubjects) =>
        prevSubjects.map((s) =>
          s.id === subjectId
            ? {
                ...s,
                attended: Math.max(0, s.attended + attendedDelta),
                total: Math.max(0, s.total + totalDelta),
                history: [
                  ...s.history,
                  {
                    date: new Date(dateKey).toISOString(),
                    status: nextStatus === "none" ? "cleared" : nextStatus,
                  },
                ].slice(-30),
              }
            : s
        )
      );

      const updatedForDate = {
        ...prevForDate,
      };
      if (nextStatus === "none") {
        delete updatedForDate[subjectId];
      } else {
        updatedForDate[subjectId] = nextStatus;
      }

      const nextLog = {
        ...prevLog,
        [dateKey]: updatedForDate,
      };

      if (Object.keys(updatedForDate).length === 0) {
        delete nextLog[dateKey];
      }

      return { ...nextLog };
    });
  };

  const getAttendanceForDate = (subjectId, dateKey) => {
    if (!dateKey) return "none";
    const forDate = attendanceLog[dateKey];
    if (!forDate) return "none";
    return forDate[subjectId] || "none";
  };

  const markAttended = (subjectId) => {
    const today = new Date();
    const key = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setAttendanceForDate(subjectId, key, "attended");
  };

  const markBunked = (subjectId) => {
    const today = new Date();
    const key = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setAttendanceForDate(subjectId, key, "bunked");
  };

  const updateSubject = (subjectId, updates) => {
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId ? { ...s, ...updates } : s
      )
    );
  };

  // Enhanced note request — syncs with API
  const sendNoteRequest = async (subjectId, { classmates, message, method }) => {
    const subject = subjects.find((s) => s.id === subjectId);
    const tempId = Date.now().toString();
    const email = (getUserEmail() || "").trim().toLowerCase();

    // Read user name from localStorage
    let senderName = "A classmate";
    try {
      const stored = localStorage.getItem("bunksmart_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        senderName = parsed.name || parsed.email || "A classmate";
      }
    } catch {}

    const normalizedMethod = method || "in-app";
    const normalizedClassmates = (classmates || []).map((c) => ({
      ...c,
      email: (c?.email || "").trim().toLowerCase(),
    }));
    if (
      normalizedMethod === "in-app" &&
      normalizedClassmates.some((c) => !c.email || !c.email.includes("@"))
    ) {
      // UI should prevent this, but keep a guardrail.
      throw new Error("In-app requests require recipient emails.");
    }

    const requestPayload = {
      senderEmail: email,
      senderName,
      subjectName: subject?.name || "Unknown",
      classmates: normalizedClassmates,
      message: message || "",
      method: normalizedMethod,
    };

    const nowIso = new Date().toISOString();
    const optimisticRequest = {
      id: tempId,
      subjectId,
      senderEmail: email,
      senderName,
      subjectName: requestPayload.subjectName,
      classmates: requestPayload.classmates,
      message: requestPayload.message,
      method: normalizedMethod,
      date: nowIso,
      updatedAt: nowIso,
      status: "sent",
      uploads: [],
      reactions: [],
    };

    setNoteRequests((prev) => [optimisticRequest, ...prev]);

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });
      if (res.ok) {
        const data = await res.json();
        setNoteRequests(prev => prev.map(r => r.id === tempId ? data.request : r));
      }
    } catch(err) {
      console.error("Failed to send note request to API", err);
    }

    return optimisticRequest;
  };

  const markNoteRequestViewed = async (requestId) => {
    setNoteRequests((prev) =>
      prev.map((r) =>
        r.id === requestId ? { ...r, status: "viewed" } : r
      )
    );
    try {
      await fetch('/api/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId })
      });
    } catch(err) {}
  };

  const markAllNoteRequestsViewed = () => {
    const unviewed = noteRequests.filter(r => r.status === "sent");
    setNoteRequests((prev) =>
      prev.map((r) => ({ ...r, status: "viewed" }))
    );
    unviewed.forEach(r => {
      fetch('/api/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.id })
      }).catch(()=>{});
    });
  };

  const clearNoteRequests = async () => {
    const email = (getUserEmail() || "").trim().toLowerCase();
    setNoteRequests((prev) => {
      addDeletedNoteIds(prev.map(r => r.id));
      return [];
    });
    if (email) {
      try {
        await fetch('/api/notes', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clearAll: true, senderEmail: email }),
        });
      } catch {}
    }
  };

  const deleteNoteRequest = async (requestId) => {
    addDeletedNoteId(requestId);
    setNoteRequests((prev) => prev.filter((r) => r.id !== requestId));
    try {
      await fetch('/api/notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId }),
      });
    } catch {}
  };

  const reactToNoteRequest = async (requestId, type) => {
    const email = getUserEmail().trim().toLowerCase();
    if (!email || !requestId) return;

    try {
      await fetch("/api/notes/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Reactions are intentionally anonymous in the UI.
        body: JSON.stringify({ id: requestId, fromEmail: email, fromName: "Anonymous", type }),
      });
    } catch (e) {
      // Ignore; polling will eventually reflect the reaction.
    }
  };

  const unviewedNoteRequestCount = useMemo(
    () => noteRequests.filter((r) => r.status === "sent").length,
    [noteRequests]
  );

  const getSubject = (id) => subjects.find((s) => s.id === id);

  return (
    <AttendanceContext.Provider
      value={{
        subjects,
        calendar,
        noteRequests,
        attendanceLog,
        loaded,
        addSubject,
        addMultipleSubjects,
        setCalendar,
        markAttended,
        markBunked,
        updateSubject,
        sendNoteRequest,
        markNoteRequestViewed,
        markAllNoteRequestsViewed,
        clearNoteRequests,
        deleteNoteRequest,
        reactToNoteRequest,
        unviewedNoteRequestCount,
        getSubject,
        getAttendanceForDate,
        setAttendanceForDate,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const ctx = useContext(AttendanceContext);
  if (!ctx)
    throw new Error("useAttendance must be used within AttendanceProvider");
  return ctx;
}
