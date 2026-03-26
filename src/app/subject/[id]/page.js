"use client";
import { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAttendance } from "@/context/AttendanceContext";
import AttendanceRing from "@/components/AttendanceRing";
import BunkStatusCard from "@/components/BunkStatusCard";
import HistoryDots from "@/components/HistoryDots";
import AnonNoteRequestPanel from "@/components/AnonNoteRequestPanel";
import ClassNotesBoard from "@/components/ClassNotesBoard";
import { getOrCreateAlias } from "@/utils/anonAlias";
import {
  calcPercent,
  getStatus,
  safeBunks,
  classesNeeded,
  calcRemainingClasses,
} from "@/utils/attendanceCalc";

export default function SubjectDetailPage({ params }) {
  const resolvedParams = use(params);
  const subjectId = resolvedParams.id;
  const router = useRouter();
  const { user, loading } = useAuth();
  const { getSubject, markAttended, markBunked, updateSubject, subjects } =
    useAttendance();
  const [showNotePanel, setShowNotePanel] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [editingTotal, setEditingTotal] = useState(false);
  const [editTotalValue, setEditTotalValue] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [myAlias, setMyAlias] = useState('');
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    if (subjectId) {
      setMyAlias(getOrCreateAlias(subjectId));
    }
  }, [subjectId]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const subject = getSubject(subjectId);

  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="page-title mb-2">Subject not found</h2>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-violet hover:text-violet-light transition-colors"
          >
            ← Back to dashboard
          </button>
        </div>
      </div>
    );
  }

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

  const handleMarkAttended = () => {
    const prevPercent = percent;
    markAttended(subjectId);
    // Trigger confetti if attendance improved past a threshold
    const newPercent = calcPercent(subject.attended + 1, subject.total + 1);
    if (newPercent > prevPercent && newPercent >= subject.minAttendance) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }
  };

  const handleMarkBunked = () => {
    markBunked(subjectId);
    setShowNotePanel(true);
  };

  return (
    <div className="min-h-screen pb-12 md:pb-16">
      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && (
          <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: -20,
                  rotate: 0,
                  scale: Math.random() * 0.5 + 0.5,
                }}
                animate={{
                  y: window.innerHeight + 20,
                  rotate: Math.random() * 720,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: Math.random() * 2 + 1.5,
                  ease: "easeIn",
                }}
                className="absolute w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: [
                    "#7C3AED",
                    "#06B6D4",
                    "#22c55e",
                    "#f59e0b",
                    "#ef4444",
                  ][Math.floor(Math.random() * 5)],
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="relative max-w-3xl mx-auto px-6 md:px-8 py-6 md:py-8 text-center">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="absolute left-6 md:left-8 top-1/2 -translate-y-1/2 text-sm text-muted hover:text-foreground transition-colors"
          >
            ← Back
          </button>
          <h1 className="page-title px-12 md:px-16">{subject.name}</h1>
          {myAlias && (
            <div className="mt-4 flex justify-center">
              <span className="anon-alias-badge">{myAlias}</span>
            </div>
          )}
        </div>
      </div>

      {/* Section Toggle */}
      <div className="max-w-3xl mx-auto px-6 md:px-8 pt-5 md:pt-6">
        <div className="flex gap-2 p-1.5 bg-surface rounded-2xl border border-border max-w-md mx-auto">
          <button
            onClick={() => setActiveSection('overview')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeSection === 'overview'
                ? 'bg-violet/20 text-violet-light shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveSection('notes')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeSection === 'notes'
                ? 'bg-violet/20 text-violet-light shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            📝 Class Notes
          </button>
        </div>
      </div>

      {activeSection === 'overview' && (
      <div className="max-w-3xl mx-auto px-6 md:px-8 py-10 md:py-12 space-y-10 text-center">
        {/* Attendance Ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center"
        >
          <AttendanceRing
            attended={subject.attended}
            total={subject.total}
            minAttendance={subject.minAttendance}
            size={220}
            strokeWidth={14}
          />
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-3 md:gap-5 max-w-2xl mx-auto"
        >
          <div className="glow-card stat-glow p-4 md:p-6 text-center rounded-2xl">
            <p className="stat-value text-violet">{subject.attended}</p>
            <p className="label-caps mt-2">Attended</p>
          </div>
          <div className="glow-card stat-glow p-5 md:p-6 text-center rounded-2xl">
            <p className="stat-value text-cyan">{subject.total}</p>
            <p className="label-caps mt-2">Classes Held</p>
          </div>
          <div
            className="glow-card stat-glow p-5 md:p-6 text-center cursor-pointer group relative hover:border-violet/40 transition-all rounded-2xl"
            onClick={() => {
              if (!editingTotal) {
                setEditTotalValue(String(subject.totalClasses || ''));
                setEditingTotal(true);
              }
            }}
          >
            {editingTotal ? (
              <div className="flex flex-col items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="999"
                  autoFocus
                  value={editTotalValue}
                  onChange={(e) => setEditTotalValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseInt(editTotalValue);
                      if (val > 0) {
                        updateSubject(subjectId, { totalClasses: val });
                      }
                      setEditingTotal(false);
                    } else if (e.key === 'Escape') {
                      setEditingTotal(false);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-16 text-center text-2xl font-bold bg-surface border border-violet/40 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-violet/50 py-0.5"
                />
                <div className="flex gap-1.5 mt-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const val = parseInt(editTotalValue);
                      if (val > 0) {
                        updateSubject(subjectId, { totalClasses: val });
                      }
                      setEditingTotal(false);
                    }}
                    className="text-xs px-2 py-0.5 rounded bg-safe/15 text-safe hover:bg-safe/25 transition-colors"
                  >
                    ✓
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTotal(false);
                    }}
                    className="text-xs px-2 py-0.5 rounded bg-danger/15 text-danger hover:bg-danger/25 transition-colors"
                  >
                    ✗
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="stat-value text-foreground">
                  {subject.totalClasses || '—'}
                </p>
                <p className="label-caps mt-2">
                  Semester Total{' '}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-violet">✏️</span>
                </p>
              </>
            )}
          </div>
        </motion.div>

        {/* Bunk Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <BunkStatusCard subject={subject} />
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-lg mx-auto"
        >
          <button
            type="button"
            onClick={handleMarkAttended}
            className="w-full sm:flex-1 sm:max-w-[220px] py-4 md:py-5 rounded-full bg-emerald-500/18 border border-emerald-400/40 text-emerald-100 font-bold text-base md:text-lg btn-pulse hover:bg-emerald-500/25 transition-colors shadow-[0_0_24px_rgba(34,197,94,0.15)]"
          >
            ✓ Attended
          </button>
          <button
            type="button"
            onClick={handleMarkBunked}
            className="w-full sm:flex-1 sm:max-w-[220px] py-4 md:py-5 rounded-full bg-red-500/18 border border-red-400/40 text-red-100 font-bold text-base md:text-lg btn-pulse hover:bg-red-500/25 transition-colors shadow-[0_0_24px_rgba(248,113,113,0.15)]"
          >
            ✗ Bunked
          </button>
        </motion.div>

        {/* History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glow-card stat-glow p-7 md:p-8 rounded-2xl"
        >
          <h3 className="section-heading mb-6">Recent Classes</h3>
          <HistoryDots history={subject.history} />
        </motion.div>

        {/* Class Schedule Editor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glow-card stat-glow overflow-hidden rounded-2xl"
        >
          <button
            type="button"
            onClick={() => setShowSchedule(!showSchedule)}
            className="w-full p-6 md:p-7 flex flex-col items-center gap-2 text-center"
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-2xl">📅</span>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Class Schedule</h3>
                <p className="text-xs text-muted mt-1">
                  {subject.classesPerWeek || 0} classes/week ·{' '}
                  {(subject.days || []).length} days
                </p>
              </div>
            </div>
            <span className={`text-muted transition-transform duration-200 ${showSchedule ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          <AnimatePresence>
            {showSchedule && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 space-y-3">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, dayIndex) => {
                    const cpd = subject.classesPerDay || {};
                    const isActive = (subject.days || []).includes(dayIndex);
                    const count = cpd[dayIndex] || 0;

                    const toggleDay = () => {
                      const currentDays = [...(subject.days || [])];
                      const currentCpd = { ...(subject.classesPerDay || {}) };

                      if (isActive) {
                        // Remove this day
                        const newDays = currentDays.filter(d => d !== dayIndex);
                        delete currentCpd[dayIndex];
                        updateSubject(subjectId, {
                          days: newDays,
                          classesPerDay: currentCpd,
                          classesPerWeek: Object.values(currentCpd).reduce((a, b) => a + b, 0),
                        });
                      } else {
                        // Add this day with 1 class
                        const newDays = [...currentDays, dayIndex].sort();
                        currentCpd[dayIndex] = 1;
                        updateSubject(subjectId, {
                          days: newDays,
                          classesPerDay: currentCpd,
                          classesPerWeek: Object.values(currentCpd).reduce((a, b) => a + b, 0),
                        });
                      }
                    };

                    const changeCount = (delta) => {
                      const currentCpd = { ...(subject.classesPerDay || {}) };
                      const newCount = Math.max(1, (currentCpd[dayIndex] || 1) + delta);
                      currentCpd[dayIndex] = newCount;
                      updateSubject(subjectId, {
                        classesPerDay: currentCpd,
                        classesPerWeek: Object.values(currentCpd).reduce((a, b) => a + b, 0),
                      });
                    };

                    return (
                      <div
                        key={dayIndex}
                        className={`flex flex-col items-center gap-3 py-3 px-3 rounded-xl text-center transition-colors ${
                          isActive
                            ? 'bg-violet/8 border border-violet/15'
                            : 'bg-surface border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={toggleDay}
                            className={`w-9 h-5 rounded-full transition-colors duration-200 relative shrink-0 ${
                              isActive ? 'bg-violet' : 'bg-surface-light'
                            }`}
                          >
                            <motion.div
                              animate={{ x: isActive ? 16 : 2 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow"
                            />
                          </button>
                          <span className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted'}`}>
                            {dayName}
                          </span>
                        </div>

                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-center gap-2 flex-wrap"
                          >
                            <button
                              type="button"
                              onClick={() => changeCount(-1)}
                              disabled={count <= 1}
                              className="w-7 h-7 rounded-lg bg-surface-light border border-border text-muted hover:text-foreground hover:border-violet/30 transition-colors flex items-center justify-center text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              −
                            </button>
                            <span className="w-8 text-center text-sm font-bold text-violet-light">
                              {count}
                            </span>
                            <button
                              type="button"
                              onClick={() => changeCount(1)}
                              className="w-7 h-7 rounded-lg bg-surface-light border border-border text-muted hover:text-foreground hover:border-violet/30 transition-colors flex items-center justify-center text-sm"
                            >
                              +
                            </button>
                            <span className="text-[11px] text-muted">
                              class{count !== 1 ? 'es' : ''}
                            </span>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      )}

      {/* Class Notes Section */}
      {activeSection === 'notes' && (
        <div className="max-w-3xl mx-auto px-6 md:px-8 py-8 md:py-10 text-center">
          <ClassNotesBoard subjectId={subjectId} myAlias={myAlias} />
        </div>
      )}

      {/* Anonymous Note Request Panel */}
      <AnimatePresence>
        {showNotePanel && (
          <AnonNoteRequestPanel
            subjectId={subjectId}
            subjectName={subject.name}
            alias={myAlias}
            onSend={async ({ classmates, message, sendTo }) => {
              await fetch('/api/anon-notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  subjectId,
                  subjectName: subject.name,
                  alias: myAlias,
                  classmates,
                  message,
                  sendTo,
                }),
              });
            }}
            onClose={() => setShowNotePanel(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
