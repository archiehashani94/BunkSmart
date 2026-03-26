"use client";
import { motion } from "framer-motion";
import { calcPercent, getStatus, safeBunks } from "@/utils/attendanceCalc";
import StatusBadge from "./StatusBadge";
import AnimatedNumber from "./AnimatedNumber";

export default function SubjectCard({ subject, onClick }) {
  const percent = calcPercent(subject.attended, subject.total);
  const status = getStatus(subject.attended, subject.total, subject.minAttendance);
  const bunks = safeBunks(subject.attended, subject.total, subject.minAttendance);

  const glowClass =
    status === "SAFE"
      ? "glow-safe"
      : status === "RISKY"
        ? "glow-risky"
        : status === "DANGER"
          ? "glow-danger"
          : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className={`glow-card stat-glow ${glowClass} p-7 cursor-pointer rounded-2xl w-full max-w-md mx-auto text-center`}
    >
      <div className="flex flex-col items-center gap-3 mb-5">
        <h3 className="text-xl font-bold text-foreground tracking-tight px-1">
          {subject.name}
        </h3>
        <StatusBadge status={status} />
      </div>

      <div className="mb-4 flex justify-center">
        <AnimatedNumber
          value={Math.round(percent * 10) / 10}
          suffix="%"
          className={`stat-value-lg ${
            status === "SAFE"
              ? "text-safe"
              : status === "RISKY"
                ? "text-risky"
                : "text-danger"
          }`}
        />
      </div>

      <div className="flex flex-col items-center gap-2 text-sm">
        <span className="text-muted">
          {subject.attended} / {subject.total} classes
        </span>
        {status === "SAFE" && bunks > 0 && (
          <span className="text-safe-light text-xs font-medium">
            {bunks} bunk{bunks !== 1 ? "s" : ""} left
          </span>
        )}
      </div>
    </motion.div>
  );
}
