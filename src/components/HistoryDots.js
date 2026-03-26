"use client";
import { motion } from "framer-motion";

export default function HistoryDots({ history = [] }) {
  const dots = history.slice(-10);

  if (dots.length === 0) {
    return (
      <p className="text-sm text-muted italic text-center">No class history yet</p>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {dots.map((entry, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.05, type: "spring", stiffness: 300 }}
          className={`w-4 h-4 rounded-full ${
            entry.status === "attended"
              ? "bg-safe shadow-[0_0_8px_rgba(34,197,94,0.4)]"
              : "bg-danger shadow-[0_0_8px_rgba(239,68,68,0.4)]"
          }`}
          title={`${entry.status === "attended" ? "Attended" : "Bunked"} — ${new Date(entry.date).toLocaleDateString()}`}
        />
      ))}
    </div>
  );
}
