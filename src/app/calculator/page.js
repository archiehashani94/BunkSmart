"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAttendance } from "@/context/AttendanceContext";
import AnimatedNumber from "@/components/AnimatedNumber";
import StatusBadge from "@/components/StatusBadge";
import BottomNav from "@/components/BottomNav";
import {
  calcPercent,
  getStatus,
  safeBunks,
  classesNeeded,
  getStatusColor,
} from "@/utils/attendanceCalc";

export default function CalculatorPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { subjects, loaded, unviewedNoteRequestCount } = useAttendance();
  const [anonActiveCount, setAnonActiveCount] = useState(0);

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

  if (loading || !loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-3xl mx-auto px-6 md:px-8 py-6 md:py-8 text-center">
          <h1 className="page-title flex items-center justify-center gap-3 flex-wrap">
            Bunk Calculator <span className="text-2xl md:text-3xl" aria-hidden>🧮</span>
          </h1>
          <p className="page-subtitle mx-auto max-w-lg">
            How many more classes can you skip?
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 md:px-8 py-10 md:py-12 text-center">
        {subjects.length === 0 ? (
          <div className="glow-card stat-glow p-12 md:p-14 text-center rounded-2xl">
            <div className="text-5xl mb-4">📚</div>
            <h3 className="text-2xl font-extrabold mb-2 tracking-tight">No subjects yet</h3>
            <p className="text-muted text-base leading-relaxed max-w-sm mx-auto">
              Add subjects from the dashboard to see your bunk budget.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {subjects.map((subject, i) => {
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
              const color = getStatusColor(status);

              // Calculate danger zone proximity (0 = at danger, 1 = far from danger)
              const safeThreshold = subject.minAttendance + 10;
              const dangerProximity = Math.max(
                0,
                Math.min(1, (percent - subject.minAttendance) / safeThreshold)
              );

              return (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="glow-card stat-glow p-6 md:p-8 rounded-2xl max-w-xl mx-auto w-full"
                >
                  <div className="flex flex-col items-center gap-3 mb-6">
                    <h3 className="text-xl md:text-2xl font-bold tracking-tight">{subject.name}</h3>
                    <StatusBadge status={status} />
                    <p className="text-sm text-muted leading-relaxed max-w-md">
                      {subject.attended}/{subject.total} attended · {subject.totalClasses || '—'} semester total · Min{" "}
                      {subject.minAttendance}%
                    </p>
                  </div>

                  {/* Danger proximity bar */}
                  <div className="mb-5 text-left">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-muted font-medium uppercase tracking-wider">Danger zone proximity</span>
                      <AnimatedNumber
                        value={Math.round(percent * 10) / 10}
                        suffix="%"
                        className="font-medium"
                        style={{ color }}
                      />
                    </div>
                    <div className="w-full h-2 bg-surface-light rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(100, Math.max(0, percent))}%`,
                        }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted mt-1">
                      <span>0%</span>
                      <span
                        className="text-danger"
                        style={{
                          marginLeft: `${subject.minAttendance - 5}%`,
                        }}
                      >
                        {subject.minAttendance}%
                      </span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Bunk info */}
                  <div className="flex flex-col items-center gap-4">
                    {status === "DANGER" ? (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-danger/12 border border-danger/25">
                        <span className="text-danger stat-value">
                          {needed}
                        </span>
                        <span className="text-danger/85 text-sm font-medium">
                          class{needed !== 1 ? "es" : ""} needed to recover
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-safe/12 border border-safe/25">
                        <span className="text-safe stat-value">
                          {bunks}
                        </span>
                        <span className="text-safe/85 text-sm font-medium">
                          safe bunk{bunks !== 1 ? "s" : ""} remaining
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav
        active="calculator"
        notificationBadge={unviewedNoteRequestCount + anonActiveCount}
      />
    </div>
  );
}
