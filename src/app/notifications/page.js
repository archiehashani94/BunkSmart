"use client";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAttendance } from "@/context/AttendanceContext";
import StatusBadge from "@/components/StatusBadge";
import UploadNotesModal from "@/components/UploadNotesModal";
import NoteUploadPanel from "@/components/NoteUploadPanel";
import NoteFilesViewer from "@/components/NoteFilesViewer";
import { getAlias } from "@/utils/anonAlias";
import {
  calcPercent,
  getStatus,
  safeBunks,
  classesNeeded,
} from "@/utils/attendanceCalc";
import BottomNav from "@/components/BottomNav";

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const {
    subjects,
    loaded,
    noteRequests,
    unviewedNoteRequestCount,
    markAllNoteRequestsViewed,
    clearNoteRequests,
    deleteNoteRequest,
    reactToNoteRequest,
  } = useAttendance();
  const [enabledSubjects, setEnabledSubjects] = useState({});
  const [activeTab, setActiveTab] = useState("alerts");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [uploadReq, setUploadReq] = useState(null);
  const [anonRequests, setAnonRequests] = useState([]);
  const [anonUploadTarget, setAnonUploadTarget] = useState(null);
  const [anonViewTarget, setAnonViewTarget] = useState(null);
  const [anonActiveCount, setAnonActiveCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (loaded && subjects.length > 0) {
      const stored = localStorage.getItem("bunksmart_notif_prefs");
      if (stored) {
        setEnabledSubjects(JSON.parse(stored));
      } else {
        const defaults = {};
        subjects.forEach((s) => (defaults[s.id] = true));
        setEnabledSubjects(defaults);
      }
    }
  }, [loaded, subjects]);

  // Auto-mark note requests as viewed when visiting this page
  useEffect(() => {
    if (loaded && noteRequests.some((r) => r.status === "sent")) {
      markAllNoteRequestsViewed();
    }
  }, [loaded]);

  // Poll anonymous note requests (used by calendar/subject pages)
  useEffect(() => {
    if (!loaded) return;

    const fetchAnon = async () => {
      try {
        const res = await fetch("/api/anon-notes");
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data.requests) ? data.requests : [];
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
        setAnonRequests(list);
      } catch {}
    };

    fetchAnon();
    const interval = setInterval(fetchAnon, 10000);
    return () => clearInterval(interval);
  }, [loaded]);

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

  const toggleNotification = (subjectId) => {
    const updated = {
      ...enabledSubjects,
      [subjectId]: !enabledSubjects[subjectId],
    };
    setEnabledSubjects(updated);
    localStorage.setItem("bunksmart_notif_prefs", JSON.stringify(updated));
  };

  const receivedNotes = useMemo(() => {
    const myEmail = (user?.email || "").trim().toLowerCase();
    if (!myEmail || !Array.isArray(noteRequests) || noteRequests.length === 0) {
      return [];
    }
    return noteRequests
      .filter((req) => {
        const isIncoming = (req?.senderEmail || "").toLowerCase() !== myEmail;
        const uploads = Array.isArray(req?.uploads) ? req.uploads : [];
        return isIncoming && uploads.length > 0;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [noteRequests, user?.email]);

  const formatNoteDate = (dateStr) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return String(dateStr || "");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading || !loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Generate today's simulated morning alerts
  const alerts = subjects
    .filter((s) => enabledSubjects[s.id] !== false)
    .map((subject) => {
      const percent = calcPercent(subject.attended, subject.total);
      const status = getStatus(
        subject.attended,
        subject.total,
        subject.minAttendance
      );
      const bunks = safeBunks(
        subject.attended,
        subject.total,
        subject.minAttendance
      );
      const needed = classesNeeded(
        subject.attended,
        subject.total,
        subject.minAttendance
      );

      switch (status) {
        case "SAFE":
          return {
            subject: subject.name,
            status,
            recommendation: `You're killing it! ${bunks} safe bunk${bunks !== 1 ? "s" : ""} remaining. You can relax today.`,
            time: "8:00 AM",
          };
        case "RISKY":
          return {
            subject: subject.name,
            status,
            recommendation: `Walking the tightrope! Attendance at ${Math.round(percent)}%. Try to attend if you can.`,
            time: "8:00 AM",
          };
        case "DANGER":
          return {
            subject: subject.name,
            status,
            recommendation: `Your attendance is CRYING at ${Math.round(percent)}%. You MUST attend the next ${needed} class${needed !== 1 ? "es" : ""}.`,
            time: "8:00 AM",
          };
      }
    });

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen pb-32">
      <AnimatePresence>
        {uploadReq && (
          <UploadNotesModal
            request={uploadReq}
            uploaderEmail={user?.email?.toLowerCase() || ""}
            onClose={() => setUploadReq(null)}
            onUploaded={() => {
              // Poller will pick up changes via updatedAt; this just closes.
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {anonUploadTarget && (
          <NoteUploadPanel
            requestId={anonUploadTarget.id}
            alias={getAlias(anonUploadTarget.subjectId) || ""}
            onClose={() => {
              setAnonUploadTarget(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {anonViewTarget && (
          <NoteFilesViewer
            requestId={anonViewTarget.id}
            requestAlias={anonViewTarget.alias}
            onClose={() => setAnonViewTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-3xl mx-auto px-6 md:px-8 py-6 md:py-8 text-center">
          <h1 className="page-title flex items-center justify-center gap-3 flex-wrap">
            Notifications <span className="text-2xl md:text-3xl" aria-hidden>🔔</span>
          </h1>
          <p className="page-subtitle mx-auto max-w-lg">Alerts & note requests</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 md:px-8 py-8 md:py-10 text-center">
        {/* Tab Switcher */}
        <div className="flex gap-2 mb-8 p-1.5 bg-surface rounded-2xl border border-border max-w-2xl mx-auto">
          <button
            onClick={() => setActiveTab("alerts")}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === "alerts"
                ? "bg-violet/20 text-violet-light shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            📊 Alerts
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 relative ${
              activeTab === "notes"
                ? "bg-violet/20 text-violet-light shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            📝 Note Requests
            {noteRequests.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-violet/30 text-violet-light rounded-full">
                {noteRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === "settings"
                ? "bg-violet/20 text-violet-light shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            ⚙️ Settings
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* ===== ALERTS TAB ===== */}
          {activeTab === "alerts" && (
            <motion.div
              key="alerts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="section-heading mb-6">
                Today&apos;s Alerts
              </h2>
              {alerts.length === 0 ? (
                <div className="glow-card stat-glow p-10 text-center rounded-2xl">
                  <div className="text-4xl mb-3">🔕</div>
                  <p className="text-muted text-sm leading-relaxed">
                    No alerts today. Add subjects or enable notifications.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className={`glow-card stat-glow p-6 rounded-2xl text-center max-w-xl mx-auto ${
                        alert.status === "SAFE"
                          ? "border-l-4 border-l-safe"
                          : alert.status === "RISKY"
                            ? "border-l-4 border-l-risky"
                            : "border-l-4 border-l-danger"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-3 mb-4">
                        <h3 className="font-bold text-lg">{alert.subject}</h3>
                        <StatusBadge status={alert.status} />
                        <span className="text-xs text-muted">{alert.time}</span>
                      </div>
                      <p className="text-sm text-muted leading-relaxed max-w-md mx-auto">
                        {alert.recommendation}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ===== NOTE REQUESTS TAB ===== */}
          {activeTab === "notes" && (
            <motion.div
              key="notes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col items-center gap-4 mb-8">
                <h2 className="section-heading">Note Requests</h2>

              {/* Search bar */}
              <div className="w-full max-w-2xl mx-auto mb-2">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none">🔍</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by subject, date, sender..."
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-surface border border-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-violet/50 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-sm transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* === Notes Received Section === */}
              <div className="w-full rounded-2xl border border-white/10 bg-surface/50 p-4 text-left mb-6">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-1">
                      Notes received
                    </p>
                    <h3 className="text-lg font-bold text-foreground">Class Notes</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[11px] bg-violet/10 border border-violet/20 text-violet-light">
                    {receivedNotes.length} item{receivedNotes.length === 1 ? "" : "s"}
                  </span>
                </div>

                {receivedNotes.length === 0 ? (
                  <div className="glow-card stat-glow p-10 text-center rounded-2xl">
                    <div className="text-4xl mb-2">📭</div>
                    <p className="text-sm text-muted leading-relaxed">No notes received yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                    {receivedNotes.map((req) => {
                      const uploads = Array.isArray(req?.uploads) ? req.uploads : [];
                      return (
                        <div
                          key={req.id}
                          className="rounded-xl border border-border bg-background/60 p-3"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {req.subjectName || "Unknown subject"}
                              </p>
                              <p className="text-xs text-muted mt-0.5">
                                {formatNoteDate(req.date)}
                              </p>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-100 border border-emerald-400/25 whitespace-nowrap">
                              Received
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {uploads.map((u) => (
                              <a
                                key={u?.id || u?.downloadUrl || u?.name}
                                href={u?.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-lg bg-violet/10 border border-violet/20 text-violet-light text-xs font-medium hover:bg-violet/20 transition-colors break-all"
                              >
                                ⬇ {u?.name || "Download"}
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
                {noteRequests.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="text-xs text-muted hover:text-danger transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-danger/30"
                    >
                      Clear All
                    </button>

                    <AnimatePresence>
                      {showClearConfirm && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: -5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -5 }}
                          className="absolute right-0 top-10 z-10 bg-surface border border-border rounded-xl p-4 shadow-xl w-56"
                          style={{ background: "rgba(15, 20, 40, 0.98)" }}
                        >
                          <p className="text-sm text-foreground mb-3">
                            Clear all note requests?
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowClearConfirm(false)}
                              className="flex-1 text-xs py-1.5 rounded-lg border border-border text-muted hover:text-foreground transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                clearNoteRequests();
                                // Also clear anonymous requests created by current user
                                const allAliases = new Set();
                                anonRequests.forEach((r) => {
                                  const alias = getAlias(r.subjectId);
                                  if (alias && r.alias === alias) allAliases.add(alias);
                                });
                                // Optimistically clear from UI
                                setAnonRequests([]);
                                // Delete from API
                                for (const alias of allAliases) {
                                  try {
                                    await fetch('/api/anon-notes', {
                                      method: 'DELETE',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ clearAll: true, alias }),
                                    });
                                  } catch {}
                                }
                                setShowClearConfirm(false);
                              }}
                              className="flex-1 text-xs py-1.5 rounded-lg bg-danger/15 text-danger hover:bg-danger/25 transition-colors"
                            >
                              Clear
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {noteRequests.length === 0 ? (
                <div className="glow-card stat-glow p-12 text-center rounded-2xl">
                  <div className="text-5xl mb-4">📭</div>
                  <h3 className="text-xl font-bold mb-2 text-foreground tracking-tight">
                    No note requests yet
                  </h3>
                  <p className="text-sm text-muted leading-relaxed max-w-xs mx-auto">
                    When you bunk a class, you can request notes from your
                    classmates. They&apos;ll appear here!
                  </p>
                </div>
              ) : (() => {
                const q = searchQuery.toLowerCase().trim();
                const filteredNoteRequests = q
                  ? noteRequests.filter((req) => {
                      const subj = (req.subjectName || "").toLowerCase();
                      const dateStr = new Date(req.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toLowerCase();
                      const sender = (req.senderName || req.senderEmail || "").toLowerCase();
                      const classmates = (req.classmates || []).map(c => (c.name || c.email || "").toLowerCase()).join(" ");
                      const haystack = `${subj} ${dateStr} ${sender} ${classmates}`;
                      return haystack.includes(q);
                    })
                  : noteRequests;

                return filteredNoteRequests.length === 0 ? (
                  <div className="glow-card stat-glow p-8 text-center rounded-2xl">
                    <div className="text-3xl mb-2">🔍</div>
                    <p className="text-sm text-muted">No note requests match &ldquo;{searchQuery}&rdquo;</p>
                  </div>
                ) : (
                <div className="space-y-3">
                  {filteredNoteRequests.map((req, i) => {
                    // Determine if this is an incoming request (someone sent TO me)
                    const myEmail = user?.email?.toLowerCase() || "";
                    const isSender = req.senderEmail?.toLowerCase() === myEmail;
                    const isIncoming = !isSender && myEmail;
                    const hasUploads = Array.isArray(req.uploads) && req.uploads.length > 0;
                    const reactions = Array.isArray(req.reactions) ? req.reactions : [];
                    const myThumbsUpReaction = reactions.some(
                      (r) => r?.type === "thumbs_up" && r?.fromEmail?.toLowerCase() === myEmail
                    );
                    const myThanksReaction = reactions.some(
                      (r) => r?.type === "thanks" && r?.fromEmail?.toLowerCase() === myEmail
                    );
                    const canReact = isSender && hasUploads;

                    return (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className={`note-request-card ${isIncoming ? "cursor-pointer" : ""}`}
                        onClick={() => {
                          if (isIncoming) setUploadReq(req);
                        }}
                      >
                        {/* Header row */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {isIncoming ? "📩" : req.method === "email" ? "✉️" : "🔔"}
                            </span>
                            <div>
                              <h4 className="font-semibold text-foreground text-sm">
                                {req.subjectName}
                              </h4>
                              <p className="text-xs text-muted">
                                {formatDate(req.date)} ·{" "}
                                {isIncoming ? "Incoming request" : req.method === "email" ? "Via email" : "In-app"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`note-request-status ${
                                isIncoming
                                  ? "note-request-status-sent"
                                  : "note-request-status-viewed"
                              }`}
                            >
                              {isIncoming ? "Received" : "Sent"}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNoteRequest(req.id);
                              }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 transition-all text-sm"
                              title="Delete this request"
                            >
                              🗑
                            </button>
                          </div>
                        </div>

                        {/* Show sender for incoming, show classmates for outgoing */}
                        {isIncoming ? (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            <span className="px-2.5 py-1 rounded-full text-xs bg-cyan/10 text-cyan-light border border-cyan/15">
                              📨 From: {req.senderName || req.senderEmail || "A classmate"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            <span className="text-[10px] text-muted uppercase tracking-wider mr-1 self-center">To:</span>
                            {(req.classmates || []).map((c, j) => (
                              <span
                                key={j}
                                className="px-2.5 py-1 rounded-full text-xs bg-violet/10 text-violet-light border border-violet/15"
                              >
                                {c.email ? "✉️" : "👤"}{" "}
                                {c.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Message */}
                        {req.message && (
                          <p className="text-xs text-muted/80 italic pl-1 border-l-2 border-violet/20 ml-1">
                            &ldquo;{req.message}&rdquo;
                          </p>
                        )}

                        {/* Reactions (visible to both sides) */}
                        {reactions.length > 0 && (
                          <div className="mt-3">
                            <p className="text-[11px] text-muted mb-2">Reactions</p>
                            <div className="flex flex-wrap gap-2">
                              {reactions
                                .slice()
                                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                                .map((r) => (
                                  <span
                                    key={r.id}
                                    className="px-2.5 py-1 rounded-lg text-[11px] bg-surface border border-border text-muted"
                                  >
                                    {r.type === "thumbs_up" ? "👍" : "🙏"}{" "}
                                    <span className="text-violet-light">
                                      Anonymous
                                    </span>
                                  </span>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Upload hint or uploaded info */}
                        {isIncoming && (
                          <div className="mt-3 flex items-center justify-between">
                            <p className="text-[11px] text-muted">
                              Tap to upload notes (PDF/JPG/PNG)
                            </p>
                            <span className="px-2 py-1 rounded-lg text-[11px] bg-violet/10 border border-violet/20 text-violet-light">
                              ⬆ Upload
                            </span>
                          </div>
                        )}

                        {!isIncoming && hasUploads && (
                          <div className="mt-3">
                            <p className="text-[11px] text-safe">
                              ✅ Notes uploaded ({req.uploads.length})
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {req.uploads.slice(0, 3).map((u) => (
                                <a
                                  key={u.id}
                                  href={u.downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-lg bg-violet/10 border border-violet/20 text-violet-light text-xs font-medium hover:bg-violet/20 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  ⬇ {u.name}
                                </a>
                              ))}
                              {req.uploads.length > 3 && (
                                <span className="text-[11px] text-muted self-center">
                                  +{req.uploads.length - 3} more
                                </span>
                              )}
                            </div>

                            {/* Reaction buttons (notes receiver = requester) */}
                            {canReact && (
                              <div className="mt-3 flex gap-2 flex-wrap">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!myThumbsUpReaction) {
                                      reactToNoteRequest(req.id, "thumbs_up");
                                    }
                                  }}
                                  disabled={myThumbsUpReaction}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                    myThumbsUpReaction
                                      ? "bg-surface-light text-foreground border-border cursor-default"
                                      : "bg-violet/10 border-violet/20 text-violet-light hover:bg-violet/20"
                                  }`}
                                >
                                  👍 {myThumbsUpReaction ? "Sent" : "Thumbs up"}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!myThanksReaction) {
                                      reactToNoteRequest(req.id, "thanks");
                                    }
                                  }}
                                  disabled={myThanksReaction}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                    myThanksReaction
                                      ? "bg-surface-light text-foreground border-border cursor-default"
                                      : "bg-violet/10 border-violet/20 text-violet-light hover:bg-violet/20"
                                  }`}
                                >
                                  🙏 {myThanksReaction ? "Sent" : "Thanks"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
                );
              })()}

              {/* Anonymous Requests */}
              <div className="mt-7">
                <h2 className="section-heading mb-4">Anonymous Note Requests</h2>
                {anonRequests.length === 0 ? (
                  <div className="glow-card p-6 text-center text-sm text-muted">
                    No anonymous note requests yet.
                  </div>
                ) : (() => {
                  const q = searchQuery.toLowerCase().trim();
                  const filteredAnonRequests = q
                    ? anonRequests.filter((req) => {
                        const subj = (req.subjectName || "").toLowerCase();
                        const dateStr = new Date(req.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toLowerCase();
                        const alias = (req.alias || "").toLowerCase();
                        const haystack = `${subj} ${dateStr} ${alias}`;
                        return haystack.includes(q);
                      })
                    : anonRequests;

                  const deleteAnonRequest = async (requestId) => {
                    setAnonRequests((prev) => prev.filter((r) => r.id !== requestId));
                    try {
                      await fetch('/api/anon-notes', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: requestId }),
                      });
                    } catch {}
                  };

                  return filteredAnonRequests.length === 0 ? (
                    <div className="glow-card p-6 text-center text-sm text-muted">
                      {q ? `No anonymous requests match "${searchQuery}"` : "No anonymous note requests yet."}
                    </div>
                  ) : (
                  <div className="space-y-3">
                    {filteredAnonRequests.map((req) => {
                      const myAlias = (getAlias(req.subjectId) || "").toString();
                      const isMine = myAlias && req.alias === myAlias;
                      const hasUploads = (req.uploads || 0) > 0;
                      const reactions = Array.isArray(req.reactions) ? req.reactions : [];
                      // Identity is already protected by alias; UI is anonymous.
                      const canReact = isMine && hasUploads;
                      const didThumbsUp = reactions.some(
                        (r) => r.type === "thumbs_up" && (r.fromAlias || "") === myAlias
                      );
                      const didThanks = reactions.some(
                        (r) => r.type === "thanks" && (r.fromAlias || "") === myAlias
                      );

                      const sendAnonReaction = async (type) => {
                        if (!myAlias) return;
                        try {
                          await fetch("/api/anon-notes/react", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ requestId: req.id, fromAlias: myAlias, type }),
                          });
                        } catch {}
                      };

                      return (
                        <motion.div key={req.id} className="note-request-card">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-foreground text-sm">{req.subjectName}</h4>
                              <p className="text-xs text-muted">
                                {new Date(req.date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="note-request-status note-request-status-sent">
                                {isMine ? "Requested" : "Incoming"}
                              </span>
                              <button
                                onClick={() => deleteAnonRequest(req.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 transition-all text-sm"
                                title={isMine ? "Delete this request" : "Dismiss"}
                              >
                                🗑
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-2">
                            <span className="px-2.5 py-1 rounded-full text-xs bg-cyan/10 text-cyan-light border border-cyan/15">
                              📎 From: {isMine ? "Anonymous" : req.alias}
                            </span>
                          </div>

                          {hasUploads && (
                            <p className="text-[11px] text-safe">
                              ✅ Notes uploaded ({req.uploads} file{req.uploads !== 1 ? "s" : ""})
                            </p>
                          )}

                          <div className="flex gap-2 flex-wrap mt-3">
                            {!isMine && (
                              <button
                                onClick={() => setAnonUploadTarget(req)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet/10 border border-violet/20 text-violet-light hover:bg-violet/20 transition-colors"
                              >
                                ⬆ Upload notes
                              </button>
                            )}

                            {hasUploads && (
                              <button
                                onClick={() => setAnonViewTarget(req)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan/10 border border-cyan/20 text-cyan-light hover:bg-cyan/20 transition-colors"
                              >
                                👀 View files
                              </button>
                            )}

                            {canReact && (
                              <>
                                <button
                                  onClick={() => sendAnonReaction("thumbs_up")}
                                  disabled={didThumbsUp}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-violet/10 text-violet-light hover:bg-violet/20 transition-colors disabled:opacity-40"
                                >
                                  👍 {didThumbsUp ? "Sent" : "Thumbs up"}
                                </button>
                                <button
                                  onClick={() => sendAnonReaction("thanks")}
                                  disabled={didThanks}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-violet/10 text-violet-light hover:bg-violet/20 transition-colors disabled:opacity-40"
                                >
                                  🙏 {didThanks ? "Sent" : "Thanks"}
                                </button>
                              </>
                            )}
                          </div>

                          {reactions.length > 0 && (
                            <div className="mt-3">
                              <p className="text-[11px] text-muted mb-2">Reactions</p>
                              <div className="flex flex-wrap gap-2">
                                {reactions
                                  .slice()
                                  .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                                  .map((r) => (
                                    <span
                                      key={r.id}
                                      className="px-2.5 py-1 rounded-lg text-[11px] bg-surface border border-border text-muted"
                                    >
                                      {r.type === "thumbs_up" ? "👍" : "🙏"} Anonymous
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                  );
                })()}
              </div>
            </motion.div>
          )}

          {/* ===== SETTINGS TAB ===== */}
          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="section-heading mb-6">
                Notification Settings
              </h2>
              <div className="space-y-3">
                {subjects.map((subject, i) => (
                  <motion.div
                    key={subject.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glow-card stat-glow p-5 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8 rounded-2xl max-w-md mx-auto"
                  >
                    <span className="font-bold text-foreground text-center">{subject.name}</span>
                    <button
                      onClick={() => toggleNotification(subject.id)}
                      className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
                        enabledSubjects[subject.id] !== false
                          ? "bg-violet"
                          : "bg-surface-light"
                      }`}
                    >
                      <motion.div
                        animate={{
                          x:
                            enabledSubjects[subject.id] !== false ? 20 : 2,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                        className="absolute top-1 w-5 h-5 bg-white rounded-full shadow"
                      />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav
        active="notifications"
        notificationBadge={unviewedNoteRequestCount + anonActiveCount}
      />
    </div>
  );
}
