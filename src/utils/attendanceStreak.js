/**
 * Daily attendance streak: consecutive calendar days (walking backward from today)
 * where the user had at least one scheduled class, marked at least one "attended",
 * and marked no "bunked" for that day.
 *
 * - Days with no scheduled classes (or holidays) are skipped and do not break the streak.
 * - If today has classes but no marks yet, today is skipped (streak continues from yesterday).
 * - Any "bunked" on a day with classes breaks the streak.
 * - A past school day with classes but no marks breaks the streak.
 */

export function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * @param {{ subjects: object[], attendanceLog: Record<string, Record<string, string>>, calendar: { semesterStart?: string, semesterEnd?: string, holidays?: string[] } }} params
 * @returns {number}
 */
export function computeAttendanceStreak({ subjects, attendanceLog, calendar }) {
  if (!subjects?.length) return 0;

  const holidays = new Set(calendar?.holidays || []);
  const semesterStart = calendar?.semesterStart
    ? startOfDay(new Date(calendar.semesterStart))
    : null;
  const semesterEnd = calendar?.semesterEnd
    ? startOfDay(new Date(calendar.semesterEnd))
    : null;

  const today = startOfDay(new Date());

  function hasClassesOnDate(date) {
    const key = formatDateKey(date);
    if (holidays.has(key)) return false;
    const wd = date.getDay();
    for (const s of subjects) {
      const cpd = s.classesPerDay || {};
      const days =
        s.days && s.days.length
          ? s.days
          : Object.keys(cpd)
              .map(Number)
              .sort();
      if (days.length === 0) return true; // No timetable = any day can count for streak
      if (!days.includes(wd)) continue;
      const n = cpd[wd] ?? 1;
      if (n > 0) return true;
    }
    return false;
  }

  function dayAttendanceFlags(key) {
    const perDay = attendanceLog[key];
    if (!perDay) return { hasAttended: false, hasBunked: false };
    let hasAttended = false;
    let hasBunked = false;
    for (const s of subjects) {
      const st = perDay[s.id];
      if (st === "attended") hasAttended = true;
      if (st === "bunked") hasBunked = true;
    }
    return { hasAttended, hasBunked };
  }

  let streak = 0;
  const d = new Date(today);
  const maxIterations = 800;

  for (let iter = 0; iter < maxIterations; iter++) {
    if (semesterStart && d < semesterStart) break;
    if (semesterEnd && d > semesterEnd) {
      d.setDate(d.getDate() - 1);
      continue;
    }
    if (d > today) {
      d.setDate(d.getDate() - 1);
      continue;
    }

    const key = formatDateKey(d);

    if (!hasClassesOnDate(d)) {
      d.setDate(d.getDate() - 1);
      if (semesterStart && d < semesterStart) break;
      continue;
    }

    const { hasAttended, hasBunked } = dayAttendanceFlags(key);
    if (hasBunked) break;

    if (hasAttended) {
      streak += 1;
      d.setDate(d.getDate() - 1);
      continue;
    }

    // Unmarked: today can still be filled in
    if (startOfDay(d).getTime() === today.getTime()) {
      d.setDate(d.getDate() - 1);
      continue;
    }

    break;
  }

  return streak;
}

