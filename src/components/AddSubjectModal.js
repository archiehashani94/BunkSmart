"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAttendance } from "@/context/AttendanceContext";
import { calculateTotalClasses } from "@/utils/classCalculator";

const DAY_KEYS = [1, 2, 3, 4, 5, 6];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AddSubjectModal({ open, onClose }) {
  const { addSubject, calendar } = useAttendance();
  const [name, setName] = useState("");
  const [minAttendance, setMinAttendance] = useState("75");
  const [classesPerDay, setClassesPerDay] = useState({});
  const [manualTotal, setManualTotal] = useState("");
  const [error, setError] = useState("");

  const hasSemester =
    Boolean(calendar?.semesterStart) && Boolean(calendar?.semesterEnd);

  const computedTotal = useMemo(() => {
    if (!hasSemester || !name.trim()) return null;
    const days = Object.keys(classesPerDay)
      .map(Number)
      .filter((d) => classesPerDay[d] > 0)
      .sort();
    if (days.length === 0) return null;
    const map = {
      [name.trim()]: {
        days,
        classesPerDay: Object.fromEntries(
          days.map((d) => [d, Math.max(1, classesPerDay[d] || 1)])
        ),
      },
    };
    const results = calculateTotalClasses(
      map,
      calendar.semesterStart,
      calendar.semesterEnd,
      calendar.holidays || []
    );
    return results[0]?.totalClasses ?? 0;
  }, [name, classesPerDay, calendar, hasSemester]);

  const reset = () => {
    setName("");
    setMinAttendance("75");
    setClassesPerDay({});
    setManualTotal("");
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggleDay = (day) => {
    setClassesPerDay((prev) => {
      const next = { ...prev };
      if (next[day]) {
        delete next[day];
      } else {
        next[day] = 1;
      }
      return next;
    });
  };

  const setDayCount = (day, val) => {
    const n = Math.max(1, Math.min(10, parseInt(val, 10) || 1));
    setClassesPerDay((prev) => ({ ...prev, [day]: n }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a subject name.");
      return;
    }
    const days = Object.keys(classesPerDay)
      .map(Number)
      .filter((d) => classesPerDay[d] > 0)
      .sort();
    if (days.length === 0) {
      setError("Select at least one day with classes.");
      return;
    }
    const cpd = Object.fromEntries(
      days.map((d) => [d, Math.max(1, classesPerDay[d] || 1)])
    );
    const cpw = Object.values(cpd).reduce((a, b) => a + b, 0);

    let totalClasses;
    if (hasSemester) {
      totalClasses = computedTotal;
      if (totalClasses == null || totalClasses < 1) {
        setError("Could not compute total classes. Check semester dates in calendar.");
        return;
      }
    } else {
      const manual = parseInt(manualTotal, 10);
      if (!manual || manual < 1) {
        setError("Enter expected semester total classes (or set semester dates in calendar).");
        return;
      }
      totalClasses = manual;
    }

    addSubject({
      name: trimmed,
      minAttendance: minAttendance || "75",
      classesPerDay: cpd,
      days,
      classesPerWeek: cpw,
      totalClasses,
    });
    handleClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-subject-title"
            className="glow-card stat-glow w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 md:p-8 text-left"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-6">
              <h2 id="add-subject-title" className="text-xl font-bold text-foreground">
                Add subject
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="text-muted hover:text-foreground text-lg leading-none px-2"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block label-caps mb-2">Subject name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Data Structures"
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-violet"
                />
              </div>

              <div>
                <label className="block label-caps mb-2">Min attendance %</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={minAttendance}
                  onChange={(e) => setMinAttendance(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-violet"
                />
              </div>

              <div>
                <label className="block label-caps mb-2">Class days</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_KEYS.map((d, i) => {
                    const active = !!classesPerDay[d];
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        className={`flex-1 min-w-[2.5rem] py-2 rounded-lg text-xs font-medium transition-all ${
                          active
                            ? "bg-violet text-white"
                            : "bg-surface border border-border text-muted hover:text-foreground"
                        }`}
                      >
                        {DAY_LABELS[i]}
                        {active && classesPerDay[d] > 1 && (
                          <span className="ml-0.5 text-[10px] opacity-90">
                            ×{classesPerDay[d]}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {Object.keys(classesPerDay).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.keys(classesPerDay)
                      .map(Number)
                      .sort()
                      .map((d) => (
                        <div
                          key={d}
                          className="flex items-center gap-1.5 px-2 py-1 bg-violet/10 border border-violet/20 rounded-lg"
                        >
                          <span className="text-xs text-violet-light">
                            {DAY_LABELS[DAY_KEYS.indexOf(d)]}
                          </span>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={classesPerDay[d]}
                            onChange={(e) => setDayCount(d, e.target.value)}
                            className="w-10 text-center text-xs font-bold bg-surface border border-violet/30 rounded text-foreground py-0.5"
                          />
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {hasSemester ? (
                <p className="text-xs text-muted">
                  Semester total classes (auto):{" "}
                  <span className="text-foreground font-semibold">
                    {computedTotal != null ? computedTotal : "—"}
                  </span>
                </p>
              ) : (
                <div>
                  <label className="block label-caps mb-2">
                    Semester total classes (manual)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={manualTotal}
                    onChange={(e) => setManualTotal(e.target.value)}
                    placeholder="e.g. 40"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-violet"
                  />
                  <p className="text-[11px] text-muted mt-1.5">
                    Set semester dates in the calendar for automatic totals.
                  </p>
                </div>
              )}

              {error && (
                <p className="text-sm text-danger">{error}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 rounded-xl border border-border text-muted hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-violet text-white font-semibold btn-pulse"
                >
                  Add subject
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
