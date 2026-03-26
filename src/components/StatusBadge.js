"use client";
import { motion } from "framer-motion";

const statusConfig = {
  SAFE: {
    bg: "bg-safe/15",
    text: "text-safe",
    border: "border-safe/30",
    label: "SAFE",
    icon: "✓",
  },
  RISKY: {
    bg: "bg-risky/15",
    text: "text-risky",
    border: "border-risky/30",
    label: "RISKY",
    icon: "⚠",
  },
  DANGER: {
    bg: "bg-danger/15",
    text: "text-danger",
    border: "border-danger/30",
    label: "DANGER",
    icon: "✗",
  },
};

export default function StatusBadge({ status, size = "sm" }) {
  const config = statusConfig[status] || statusConfig.SAFE;
  const sizeClasses =
    size === "lg"
      ? "px-4 py-2 text-sm font-bold"
      : "px-2.5 py-1 text-xs font-semibold";

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses} tracking-wide`}
    >
      <span>{config.icon}</span>
      {config.label}
    </motion.span>
  );
}
