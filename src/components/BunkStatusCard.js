"use client";
import { motion } from "framer-motion";
import {
  getStatus,
  safeBunks,
  classesNeeded,
  getBunkMessage,
} from "@/utils/attendanceCalc";
import StatusBadge from "./StatusBadge";

export default function BunkStatusCard({ subject }) {
  const status = getStatus(subject.attended, subject.total, subject.minAttendance);
  const bunks = safeBunks(subject.attended, subject.total, subject.minAttendance);
  const needed = classesNeeded(subject.attended, subject.total, subject.minAttendance);
  const message = getBunkMessage(status, bunks, needed);

  const glowClass =
    status === "SAFE"
      ? "glow-safe"
      : status === "RISKY"
        ? "glow-risky"
        : "glow-danger";

  const bgGradient =
    status === "SAFE"
      ? "from-safe/10 to-safe/5"
      : status === "RISKY"
        ? "from-risky/10 to-risky/5"
        : "from-danger/10 to-danger/5";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={`glow-card stat-glow ${glowClass} p-8 md:p-10 bg-gradient-to-br ${bgGradient} rounded-2xl max-w-xl mx-auto w-full`}
    >
      <div className="text-center">
        <p className="label-caps mb-4">
          Can I bunk today?
        </p>

        <div className="mb-4">
          <StatusBadge status={status} size="lg" />
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-lg md:text-xl font-semibold text-foreground/95 mb-6 leading-snug"
        >
          {message}
        </motion.p>

        {status === "SAFE" && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-safe/10 border border-safe/20">
            <span className="text-safe font-bold text-2xl">{bunks}</span>
            <span className="text-safe/80 text-sm">
              safe bunk{bunks !== 1 ? "s" : ""} remaining
            </span>
          </div>
        )}

        {status === "DANGER" && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-danger/10 border border-danger/20">
            <span className="text-danger font-bold text-2xl">{needed}</span>
            <span className="text-danger/80 text-sm">
              class{needed !== 1 ? "es" : ""} to recover
            </span>
          </div>
        )}

        {status === "RISKY" && bunks > 0 && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-risky/10 border border-risky/20">
            <span className="text-risky font-bold text-2xl">{bunks}</span>
            <span className="text-risky/80 text-sm">
              bunk{bunks !== 1 ? "s" : ""} left (risky!)
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
