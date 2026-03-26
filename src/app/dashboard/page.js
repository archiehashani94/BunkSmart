"use client";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAttendance } from "@/context/AttendanceContext";
import SubjectCard from "@/components/SubjectCard";
import BottomNav from "@/components/BottomNav";
import AddSubjectModal from "@/components/AddSubjectModal";
import { getVerdict, getVerdictMessage } from "@/utils/attendanceCalc";
import { computeAttendanceStreak } from "@/utils/attendanceStreak";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, isOnboarded, logout } = useAuth();
  const {
    subjects,
    loaded,
    unviewedNoteRequestCount,
    attendanceLog,
    calendar,
  } = useAttendance();
  const [anonActiveCount, setAnonActiveCount] = useState(0);
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
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

  // Don't redirect to calendar if we're about to show a streak celebration
  const hasUncelebratedMilestone = (() => {
    if (!loaded || subjects.length === 0 || streakDays < 1) return false;
    try {
      if (streakDays >= 7 && localStorage.getItem("bunksmart_streak_7_celebrated") !== "true") return true;
      if (streakDays >= 3 && localStorage.getItem("bunksmart_streak_3_celebrated") !== "true") return true;
      if (streakDays >= 1 && localStorage.getItem("bunksmart_streak_1_celebrated") !== "true") return true;
    } catch {}
    return false;
  })();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && !isOnboarded) router.push("/onboarding");
    if (!loading && user && isOnboarded && loaded && subjects.length > 0 && !hasUncelebratedMilestone) {
      const today = new Date();
      const key = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const lastSeen = localStorage.getItem("bunksmart_last_calendar_prompt");
      if (lastSeen !== key) {
        localStorage.setItem("bunksmart_last_calendar_prompt", key);
        router.push("/calendar");
      }
    }
  }, [user, loading, isOnboarded, loaded, subjects.length, streakDays, hasUncelebratedMilestone, router]);

  // Show streak celebration popup when user hits 1-, 3-, or 7-day streak
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

  // Show anonymous note requests in the Dashboard notification badge too.
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

  if (loading || !loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const verdict = getVerdict(subjects);
  const verdictInfo = getVerdictMessage(verdict);

  const glowClass =
    verdict === "SAFE"
      ? "glow-safe"
      : verdict === "RISKY"
        ? "glow-risky"
        : verdict === "DANGER"
          ? "glow-danger"
          : "";

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const dismissStreakCelebration = () => {
    const m = showStreakCelebration;
    if (m) {
      try {
        const key = m === 7 ? "bunksmart_streak_7_celebrated" : m === 3 ? "bunksmart_streak_3_celebrated" : "bunksmart_streak_1_celebrated";
        localStorage.setItem(key, "true");
      } catch {}
    }
    setShowStreakCelebration(null);
  };

  return (
    <div className="min-h-screen pb-32">
      <AddSubjectModal open={addSubjectOpen} onClose={() => setAddSubjectOpen(false)} />

      <AnimatePresence>
        {showStreakCelebration && (
          <motion.div
            key="streak-celebration"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={dismissStreakCelebration}
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
                onClick={dismissStreakCelebration}
                className="px-6 py-3 rounded-xl bg-amber-500/30 text-amber-100 font-semibold border border-amber-400/40 hover:bg-amber-500/40 transition-colors"
              >
                Nice!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto px-6 md:px-8 py-6 md:py-8 text-center">
          <h1 className="page-title">
            {greeting}, {user?.name || "Student"} 👋
          </h1>
          <p className="page-subtitle mx-auto max-w-lg">{dateStr}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-6 px-5 py-2.5 text-xs font-medium text-muted hover:text-foreground border border-border rounded-xl transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-8 py-10 md:py-12 text-center">
        {/* Streak */}
        {subjects.length > 0 && (
          <div className="mb-8 flex flex-col items-center gap-3">
            {streakDays >= 7 ? (
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-rose-500/20 border border-amber-400/40 text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.25)]">
                <span className="text-xl" aria-hidden>
                  🔥
                </span>
                <span className="font-bold text-sm md:text-base tracking-wide">
                  {streakDays} day attendance streak
                </span>
              </div>
            ) : streakDays > 0 ? (
              <p className="text-sm text-muted max-w-md">
                <span className="text-foreground font-semibold">{streakDays} day streak</span>
                {" — "}
                mark attended on class days (no bunks) to build toward a 7-day badge.
              </p>
            ) : (
              <p className="text-sm text-muted max-w-md">
                Build a streak: attend on scheduled days without bunking. Hit{" "}
                <span className="text-foreground font-medium">7 days</span> for the badge.
              </p>
            )}
          </div>
        )}

        {/* Today's Verdict */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`glow-card stat-glow ${glowClass} p-8 md:p-10 mb-10 text-center rounded-2xl`}
        >
          <p className="label-caps mb-4">
            Today&apos;s Verdict
          </p>
          <div className="text-6xl mb-5">{verdictInfo.emoji}</div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 tracking-tight">
            {verdictInfo.title}
          </h2>
          <p className="text-base text-muted max-w-md mx-auto leading-relaxed">{verdictInfo.subtitle}</p>
        </motion.div>

        {/* Subject Cards */}
        {subjects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glow-card stat-glow p-12 md:p-14 text-center rounded-2xl"
          >
            <div className="text-5xl mb-4">📚</div>
            <h3 className="section-heading mb-3">No subjects yet</h3>
            <p className="text-muted mb-8 text-base leading-relaxed max-w-sm mx-auto">
              Add your first subject to get started tracking!
            </p>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setAddSubjectOpen(true)}
                className="px-8 py-3.5 bg-violet rounded-xl text-white font-semibold btn-pulse text-base"
              >
                Add subject
              </button>
            </div>
          </motion.div>
        ) : (
          <>
          <div className="flex justify-center mb-8">
            <button
              type="button"
              onClick={() => setAddSubjectOpen(true)}
              className="px-6 py-3 rounded-xl border border-violet/40 bg-violet/10 text-violet-light font-semibold text-sm hover:bg-violet/20 transition-colors"
            >
              + Add another subject
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7 justify-items-center">
            {subjects.map((subject, i) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <SubjectCard
                  subject={subject}
                  onClick={() => router.push(`/subject/${subject.id}`)}
                />
              </motion.div>
            ))}
          </div>
          </>
        )}
      </div>

      <BottomNav
        active="dashboard"
        notificationBadge={unviewedNoteRequestCount + anonActiveCount}
      />
    </div>
  );
}
