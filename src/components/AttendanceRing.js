"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getStatusColor, getStatus } from "@/utils/attendanceCalc";

export default function AttendanceRing({
  attended,
  total,
  minAttendance = 75,
  size = 200,
  strokeWidth = 12,
}) {
  const [progress, setProgress] = useState(0);
  const percent = total === 0 ? 100 : (attended / total) * 100;
  const status = getStatus(attended, total, minAttendance);
  const color = getStatusColor(status);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setProgress(Math.min(percent, 100)), 100);
    return () => clearTimeout(timer);
  }, [percent]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{
            filter: `drop-shadow(0 0 6px ${color}40)`,
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-4xl font-bold"
          style={{ color }}
        >
          {Math.round(percent)}%
        </motion.span>
        <span className="text-xs text-muted mt-1">attendance</span>
      </div>
    </div>
  );
}
