"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useAttendance } from "@/context/AttendanceContext";
import AnonNoteRequestPanel from "@/components/AnonNoteRequestPanel";
import BottomNav from "@/components/BottomNav";
import { getOrCreateAlias } from "@/utils/anonAlias";
import { computeAttendanceStreak } from "@/utils/attendanceStreak";


function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonthLabel(date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}


const SUBJECT_COLORS = [
  "from-violet-400 to-purple-500",
  "from-cyan-400 to-blue-500",
  "from-emerald-400 to-green-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-indigo-400 to-violet-500",
];

function getSubjectInitial(name) {
  if (!name || !name.trim()) return "?";
  return name.trim().charAt(0).toUpperCase();
}

function subjectHasClassOnWeekday(subject, weekday) {
  const cpd = subject.classesPerDay || {};
  const days = subject.days?.length ? subject.days : Object.keys(cpd).map(Number).sort();
  if (!days.length) return true; // No timetable = can mark any day
  if (!days.includes(weekday)) return false;
  return (cpd[weekday] ?? 1) > 0;
}

function buildMonthGrid(currentMonth) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day));
  }
  return cells;
}

export default function CalendarPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const {
    subjects,
    calendar,
    loaded,
    getAttendanceForDate,
    setAttendanceForDate,
    attendanceLog,
  } = useAttendance();

  const [showNotePanel, setShowNotePanel] = useState(false);
  const [bunkedSubject, setBunkedSubject] = useState(null);
  const [anonActiveCount, setAnonActiveCount] = useState(0);
  const [showStreakCelebration, setShowStreakCelebration] = useState(null); // null | 1 | 3 | 7

  const streakDays = useMemo(
    () =>
      computeAttendanceStreak({
        subjects,
        attendanceLog,
        calendar,
      }),
    [subjects, attendanceLog, calendar]
  );

  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!loaded) return;
    const fetchAnonCount = async () => {
      try {
        const res = await fetch("/api/anon-notes");
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data.requests) ? data.requests : [];
        setAnonActiveCount(list.filter((r) => r.status === "active").length);
      } catch {}
    };
    fetchAnonCount();
    const interval = setInterval(fetchAnonCount, 10000);
    return () => clearInterval(interval);
  }, [loaded]);

  useEffect(() => {
    if (!loaded || subjects.length === 0 || streakDays < 1) return;
    try {
      let milestone = null;
      if (streakDays >= 7 && localStorage.getItem("bunksmart_streak_7_celebrated") !== "true") {
        milestone = 7;
      } else if (streakDays >= 3 && localStorage.getItem("bunksmart_streak_3_celebrated") !== "true") {
        milestone = 3;
      } else if (streakDays >= 1 && localStorage.getItem("bunksmart_streak_1_celebrated") !== "true") {
        milestone = 1;
      }
      if (!milestone) return;
      const t = setTimeout(() => setShowStreakCelebration(milestone), 150);
      return () => clearTimeout(t);
    } catch {}
  }, [loaded, subjects.length, streakDays]);

  useEffect(() => {
    if (calendar?.semesterStart) {
      const start = new Date(calendar.semesterStart);
      const today = new Date();
      const base =
        today < start
          ? start
          : new Date(today.getFullYear(), today.getMonth(), 1);
      setCurrentMonth(base);
      setSelectedDate(today < start ? start : today);
    }
  }, [calendar?.semesterStart]);

  const today = new Date();
  const todayKey = formatDateKey(today);
  const semesterStart = calendar?.semesterStart
    ? new Date(calendar.semesterStart)
    : null;
  const semesterEnd = calendar?.semesterEnd
    ? new Date(calendar.semesterEnd)
    : null;

  // IMPORTANT: keep hooks order stable across renders.
  // Do not early-return before calling useMemo hooks.
  const monthCells = useMemo(() => buildMonthGrid(currentMonth), [currentMonth]);

  const holidaysSet = useMemo(() => new Set(calendar?.holidays || []), [
    calendar?.holidays,
  ]);


  const monthSummary = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);

    const bySubject = {};
    for (const s of subjects) {
      bySubject[s.id] = { name: s.name, attended: 0, bunked: 0 };
    }

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = formatDateKey(d);
      const perDay = attendanceLog?.[key];
      if (!perDay) continue;
      for (const [subjId, status] of Object.entries(perDay)) {
        if (!bySubject[subjId]) bySubject[subjId] = { name: "?", attended: 0, bunked: 0 };
        if (status === "attended") bySubject[subjId].attended += 1;
        if (status === "bunked") bySubject[subjId].bunked += 1;
      }
    }

    let attendedMarks = 0;
    let bunkedMarks = 0;
    for (const v of Object.values(bySubject)) {
      attendedMarks += v.attended;
      bunkedMarks += v.bunked;
    }

    let holidayCount = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (holidaysSet.has(formatDateKey(d))) holidayCount += 1;
    }

    const totalMarks = attendedMarks + bunkedMarks;
    return { attendedMarks, bunkedMarks, totalMarks, holidayCount, bySubject };
  }, [currentMonth, attendanceLog, holidaysSet, subjects]);

  if (loading || !loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedKey = formatDateKey(selectedDate);
  const isFuture =
    selectedDate > today && formatDateKey(selectedDate) !== todayKey;
  const selectedWeekday = selectedDate.getDay();

  // Month navigation limits for UX (disable buttons when you can't go further)
  const canGoPrevMonth = !semesterStart
    ? true
    : new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
      ) >
      new Date(
        semesterStart.getFullYear(),
        semesterStart.getMonth(),
        1
      );

  const canGoNextMonth = (() => {
    const nextMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      1
    );
    let maxMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    if (semesterEnd) {
      const endMonth = new Date(
        semesterEnd.getFullYear(),
        semesterEnd.getMonth(),
        1
      );
      if (endMonth < maxMonth) maxMonth = endMonth;
    }
    return nextMonth <= maxMonth;
  })();

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      if (
        semesterStart &&
        next < new Date(
          semesterStart.getFullYear(),
          semesterStart.getMonth(),
          1
        )
      ) {
        return prev;
      }
      return next;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      if (next > today) return prev;
      if (semesterEnd) {
        const endMonth = new Date(
          semesterEnd.getFullYear(),
          semesterEnd.getMonth(),
          1
        );
        if (next > endMonth) return prev;
      }
      return next;
    });
  };

  const handleSelectDate = (date) => {
    if (!date) return;
    setSelectedDate(date);
  };

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="min-h-screen pb-48">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="relative max-w-5xl mx-auto px-6 md:px-8 py-6 md:py-8 text-center">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="absolute left-6 md:left-8 top-1/2 -translate-y-1/2 text-sm text-muted hover:text-foreground transition-colors"
          >
            ← Back
          </button>
          <h1 className="page-title flex items-center justify-center gap-3 flex-wrap px-10 md:px-16">
            Attendance Calendar
            <span className="text-2xl md:text-3xl" aria-hidden>📅</span>
          </h1>
          <p className="page-subtitle mx-auto max-w-lg">
            Tap a day to mark attended / bunked for each subject.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-8 py-8 md:py-10 space-y-8 md:space-y-10 text-center">
        {/* Summary row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
          <div className="glow-card stat-glow p-5 md:p-6 rounded-2xl transition-transform duration-200 hover:-translate-y-1">
            <p className="label-caps mb-2">This month</p>
            <p className="stat-value text-foreground mt-1">{monthSummary.totalMarks}</p>
            <p className="text-[11px] text-muted mt-2 font-medium">marks added</p>
          </div>
          <div className="glow-card stat-glow p-5 md:p-6 rounded-2xl transition-transform duration-200 hover:-translate-y-1">
            <p className="label-caps mb-2">Attended</p>
            <p className="stat-value text-safe mt-1">
              {monthSummary.attendedMarks}
            </p>
            <p className="text-[11px] text-muted mt-2 font-medium">classes</p>
          </div>
          <div className="glow-card stat-glow p-5 md:p-6 rounded-2xl transition-transform duration-200 hover:-translate-y-1">
            <p className="label-caps mb-2">Bunked</p>
            <p className="stat-value text-danger mt-1">
              {monthSummary.bunkedMarks}
            </p>
            <p className="text-[11px] text-muted mt-2 font-medium">classes</p>
          </div>
          <div className="glow-card stat-glow p-5 md:p-6 rounded-2xl transition-transform duration-200 hover:-translate-y-1">
            <p className="label-caps mb-2">Holidays</p>
            <p className="stat-value text-amber-300 mt-1">
              {monthSummary.holidayCount}
            </p>
            <p className="text-[11px] text-muted mt-2 font-medium">days</p>
          </div>
        </div>

        {/* Per-subject breakdown */}
        {subjects.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-surface/50 p-4 text-left">
            <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-3">This month by subject</p>
            <div className="flex flex-wrap gap-3">
              {subjects.map((s) => {
                const data = monthSummary.bySubject?.[s.id] || { attended: 0, bunked: 0 };
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 px-4 py-2 rounded-xl border border-border bg-background/60"
                  >
                    <span className="text-sm font-semibold text-foreground min-w-[3rem]">{s.name}</span>
                    <span className="text-safe text-xs font-medium">{data.attended} attended</span>
                    <span className="text-danger text-xs font-medium">{data.bunked} bunked</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Month selector */}
        <div className="flex items-center justify-center gap-6 md:gap-10 mb-2 max-w-lg mx-auto">
          <button
            onClick={handlePrevMonth}
            disabled={!canGoPrevMonth}
            className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
              canGoPrevMonth
                ? "border-border text-muted hover:text-foreground hover:border-foreground/40"
                : "border-border/50 text-muted/40 cursor-not-allowed"
            }`}
          >
            ← Prev
          </button>
          <div className="text-base md:text-lg font-bold text-foreground min-w-[10rem]">{getMonthLabel(currentMonth)}</div>
          <button
            onClick={handleNextMonth}
            disabled={!canGoNextMonth}
            className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
              canGoNextMonth
                ? "border-border text-muted hover:text-foreground hover:border-foreground/40"
                : "border-border/50 text-muted/40 cursor-not-allowed"
            }`}
          >
            Next →
          </button>
        </div>

        {/* Legend + quick actions */}
        <div className="flex flex-col items-center gap-5">
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-[11px] text-muted">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-surface">
              <span className="min-w-[8px] min-h-[8px] w-2.5 h-2.5 rounded-full bg-violet shadow-[0_0_8px_rgba(124,58,237,0.6)]" />
              Today
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
              <span className="min-w-[8px] min-h-[8px] w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.45)]" />
              Holiday
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-surface">
              <span className="min-w-[8px] min-h-[8px] w-2.5 h-2.5 rounded-full bg-safe shadow-[0_0_8px_rgba(74,222,128,0.45)]" />
              Attended (per subject)
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-surface">
              <span className="min-w-[8px] min-h-[8px] w-2.5 h-2.5 rounded-full bg-danger shadow-[0_0_8px_rgba(248,113,113,0.45)]" />
              Bunked (per subject)
            </span>
            {subjects.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 border-t border-border/50 mt-2 pt-3">
                <span className="text-[10px] text-muted w-full">Subjects:</span>
                {subjects.map((s, i) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border bg-surface text-[10px]"
                    title={s.name}
                  >
                    <span className={`w-2 h-2 rounded-full bg-gradient-to-br ${SUBJECT_COLORS[i % SUBJECT_COLORS.length]}`} />
                    {getSubjectInitial(s.name)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => {
                const now = new Date();
                setCurrentMonth(
                  new Date(now.getFullYear(), now.getMonth(), 1)
                );
                setSelectedDate(now);
              }}
              className="px-3 py-2 rounded-xl border border-border text-sm text-muted hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              Jump to today
            </button>
            {calendar?.semesterStart && (
              <button
                onClick={() => {
                  const start = new Date(calendar.semesterStart);
                  setCurrentMonth(new Date(start.getFullYear(), start.getMonth(), 1));
                  setSelectedDate(start);
                }}
                className="px-3 py-2 rounded-xl border border-border text-sm text-muted hover:text-foreground hover:border-foreground/40 transition-colors"
              >
                Semester start
              </button>
            )}
          </div>
        </div>

        {/* Calendar + Attend/Bunk sidebar side by side */}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(140px,240px)] gap-4 lg:gap-6 items-start">
        {/* Left: Calendar */}
        <div className="min-w-0 max-h-[calc(100vh-20rem)] overflow-y-auto pr-1">
          <div className="grid grid-cols-7 text-center text-[10px] sm:text-xs font-semibold text-muted mb-1">
            {weekdayLabels.map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 md:gap-2.5 text-sm">
          {monthCells.map((date, idx) => {
            if (!date) {
              return <div key={idx} className="h-12 sm:h-14 md:h-16" />;
            }
            const key = formatDateKey(date);
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            const isHoliday = holidaysSet.has(key);
            const isOutOfRange =
              (semesterStart && date < semesterStart) ||
              (semesterEnd && date > semesterEnd) ||
              date > today;

            const perDay = attendanceLog?.[key] || null;
            const wd = date.getDay();
            const subjectIndicators = subjects
              .filter((s) => subjectHasClassOnWeekday(s, wd))
              .map((s) => ({ subject: s, status: perDay?.[s.id] || null }));

            const baseClasses =
              "relative h-12 sm:h-14 md:h-16 rounded-xl sm:rounded-2xl border text-xs flex flex-col items-center justify-center cursor-pointer transition-colors";

            let colorClasses =
              "border-surface-light bg-surface hover:border-violet/40";

            if (isOutOfRange) {
              colorClasses =
                "border-transparent bg-surface/40 text-muted cursor-not-allowed";
            } else if (isSelected) {
              colorClasses =
                "border-violet bg-violet/15 text-foreground shadow-sm";
            } else if (isToday) {
              colorClasses =
                "border-violet/60 bg-surface-light text-foreground";
            } else if (isHoliday) {
              colorClasses =
                "border-amber-400/40 bg-amber-400/10 text-amber-300";
            }

            return (
              <button
                key={key}
                onClick={() => !isOutOfRange && handleSelectDate(date)}
                className={`${baseClasses} ${colorClasses}`}
              >
                <span className="text-sm font-semibold">{date.getDate()}</span>
                {isHoliday && (
                  <span className="absolute bottom-1 text-[9px] uppercase tracking-wide">
                    Holiday
                  </span>
                )}
                {isToday && !isSelected && (
                  <span className="absolute top-1.5 right-1.5 min-w-[8px] min-h-[8px] w-2 h-2 rounded-full bg-violet shadow-[0_0_10px_rgba(124,58,237,0.75)]" />
                )}
                {!isOutOfRange && !isHoliday && subjectIndicators.length > 0 && (
                  <span className="absolute bottom-1 left-0.5 right-0.5 flex flex-wrap items-center justify-center gap-0.5">
                    {subjectIndicators.map(({ subject, status }) => (
                      <span
                        key={subject.id}
                        className={`inline-flex items-center justify-center min-w-[14px] h-3.5 rounded text-[8px] font-bold ${
                          status === "attended"
                            ? "bg-safe/90 text-white"
                            : status === "bunked"
                            ? "bg-danger/90 text-white"
                            : "bg-white/10 text-muted border border-white/20"
                        }`}
                        title={`${subject.name}: ${status === "attended" ? "Attended" : status === "bunked" ? "Bunked" : "Not marked"}`}
                      >
                        {getSubjectInitial(subject.name)}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            );
          })}
          </div>
        </div>

        {/* Right: Attend/Bunk controls for selected day */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-4 stat-glow shadow-[0_8px_32px_-12px_rgba(0,0,0,0.4)] min-h-0 flex flex-col sticky top-24 max-h-[calc(100vh-8rem)]">
          <div className="flex-shrink-0 pb-3 border-b border-white/[0.08]">
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Selected day</p>
            <p className="text-sm font-bold text-foreground mt-0.5 leading-tight">
              {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </p>
            {holidaysSet.has(selectedKey) && (
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400/12 text-amber-200 border border-amber-400/35">
                Holiday
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 mt-3 -mr-1 pr-1 space-y-3">
          {isFuture ? (
            <p className="text-[11px] text-muted leading-snug">
              Edit today or earlier only.
            </p>
          ) : subjects.length === 0 ? (
            <p className="text-[11px] text-muted leading-snug">
              Add subjects on the dashboard.
            </p>
          ) : (
            <>
              {subjects.map((subject) => {
                const status = getAttendanceForDate(subject.id, selectedKey);
                const classesPerDay = subject.classesPerDay || {};
                const subjectDays =
                  subject.days && subject.days.length
                    ? subject.days
                    : Object.keys(classesPerDay)
                        .map(Number)
                        .sort();

                const hasTimetableInfo = subjectDays.length > 0;
                let hasClassToday = !isFuture;
                if (hasTimetableInfo) {
                  hasClassToday =
                    !isFuture &&
                    subjectDays.includes(selectedWeekday) &&
                    (classesPerDay[selectedWeekday] || 1) > 0;
                }

                const attendPill =
                  !hasClassToday
                    ? "bg-white/[0.04] text-muted/45 border border-white/10 cursor-not-allowed opacity-60"
                    : status === "attended"
                      ? "bg-emerald-500/22 text-emerald-100 border border-emerald-400/55 shadow-[0_0_12px_rgba(34,197,94,0.25)]"
                      : "bg-white/[0.06] text-emerald-200/85 border border-emerald-500/35 hover:bg-emerald-500/15 hover:border-emerald-400/50";

                const bunkPill =
                  !hasClassToday
                    ? "bg-white/[0.04] text-muted/45 border border-white/10 cursor-not-allowed opacity-60"
                    : status === "bunked"
                      ? "bg-red-500/22 text-red-100 border border-red-400/55 shadow-[0_0_12px_rgba(248,113,113,0.25)]"
                      : "bg-white/[0.06] text-red-200/85 border border-red-500/35 hover:bg-red-500/15 hover:border-red-400/50";

                return (
                  <div
                    key={subject.id}
                    className="rounded-xl bg-background/45 border border-border/70 p-3 flex flex-col gap-2.5"
                  >
                    <p className="text-xs font-bold text-foreground truncate">{subject.name}</p>
                    <p className="text-[10px] text-muted leading-snug">
                      {!hasTimetableInfo && !isFuture
                        ? "Can mark"
                        : !hasClassToday
                        ? "No class"
                        : status === "attended"
                        ? "Attended"
                        : status === "bunked"
                        ? "Bunked"
                        : "Not marked"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          hasClassToday &&
                          setAttendanceForDate(subject.id, selectedKey, "attended")
                        }
                        disabled={!hasClassToday}
                        aria-label="Mark attended"
                        className={`rounded-full px-2.5 py-1.5 text-[10px] font-bold border transition-all flex-1 min-w-0 ${attendPill}`}
                      >
                        ✓ Attend
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (hasClassToday) {
                            setAttendanceForDate(subject.id, selectedKey, "bunked");
                            setBunkedSubject(subject);
                            setShowNotePanel(true);
                          }
                        }}
                        disabled={!hasClassToday}
                        aria-label="Mark bunked"
                        className={`rounded-full px-2.5 py-1.5 text-[10px] font-bold border transition-all flex-1 min-w-0 ${bunkPill}`}
                      >
                        ✗ Bunk
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAttendanceForDate(subject.id, selectedKey, "none")
                        }
                        className="rounded-full px-2.5 py-1.5 text-[10px] font-semibold border border-white/18 bg-white/[0.06] text-muted hover:text-foreground hover:bg-white/10 transition-colors"
                      >
                        Clear
                      </button>
                      {hasClassToday && (
                        <button
                          type="button"
                          onClick={() => {
                            setBunkedSubject(subject);
                            setShowNotePanel(true);
                          }}
                          className="rounded-full px-2.5 py-1.5 text-[10px] font-semibold border border-violet/30 bg-violet/10 text-violet-light hover:bg-violet/20 transition-colors flex-1 min-w-0"
                        >
                          📝 Notes
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
          </div>
        </div>
        </div>

      </div>

      {/* Anonymous Note Request Panel */}
      <AnimatePresence>
        {showNotePanel && bunkedSubject && (
          <AnonNoteRequestPanel
            subjectId={bunkedSubject.id}
            subjectName={bunkedSubject.name}
            alias={getOrCreateAlias(bunkedSubject.id)}
            onSend={async () => {
              await fetch('/api/anon-notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  subjectId: bunkedSubject.id,
                  subjectName: bunkedSubject.name,
                  alias: getOrCreateAlias(bunkedSubject.id),
                }),
              });
            }}
            onClose={() => {
              setShowNotePanel(false);
              setBunkedSubject(null);
            }}
          />
        )}
        {showStreakCelebration && (
          <motion.div
            key="streak-celebration"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              try {
                const key = showStreakCelebration === 7 ? "bunksmart_streak_7_celebrated"
                  : showStreakCelebration === 3 ? "bunksmart_streak_3_celebrated" : "bunksmart_streak_1_celebrated";
                localStorage.setItem(key, "true");
              } catch {}
              setShowStreakCelebration(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glow-card stat-glow w-full max-w-sm rounded-2xl p-8 text-center border border-amber-400/30 bg-gradient-to-b from-amber-500/15 to-orange-500/10 shadow-[0_0_48px_rgba(251,191,36,0.2)]"
            >
              <div className="text-6xl mb-4" aria-hidden>
                {showStreakCelebration >= 7 ? "🔥" : showStreakCelebration >= 3 ? "⭐" : "✨"}
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                {showStreakCelebration}-Day Streak!
              </h3>
              <p className="text-sm text-muted mb-6 leading-relaxed">
                {showStreakCelebration >= 7
                  ? "You've attended every scheduled class for 7 days in a row. Amazing!"
                  : showStreakCelebration >= 3
                  ? "Consecutive days of full attendance. Keep it up to reach 7 days!"
                  : "Streak started! Attend on class days without bunking to build it."}
              </p>
              <button
                type="button"
                onClick={() => {
                  try {
                    const key = showStreakCelebration === 7 ? "bunksmart_streak_7_celebrated"
                      : showStreakCelebration === 3 ? "bunksmart_streak_3_celebrated" : "bunksmart_streak_1_celebrated";
                    localStorage.setItem(key, "true");
                  } catch {}
                  setShowStreakCelebration(null);
                }}
                className="px-6 py-3 rounded-xl bg-amber-500/30 text-amber-100 font-semibold border border-amber-400/40 hover:bg-amber-500/40 transition-colors"
              >
                Nice!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav
        active="calendar"
        notificationBadge={anonActiveCount}
      />
    </div>
  );
}