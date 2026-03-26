/**
 * BunkSmart — Attendance Calculation Utilities
 */

/**
 * Calculate the number of holidays that fall within the semester.
 */
export function calcHolidayCount(holidays = [], semesterStart, semesterEnd) {
  if (!semesterStart || !semesterEnd || !holidays.length) return 0;
  const start = new Date(semesterStart);
  const end = new Date(semesterEnd);
  return holidays.filter((h) => {
    const d = new Date(h);
    return d >= start && d <= end;
  }).length;
}

/**
 * Calculate total remaining classes in the semester.
 */
export function calcRemainingClasses(totalClasses, classesHeld) {
  return Math.max(0, totalClasses - classesHeld);
}

export function calcPercent(attended, total) {
  if (total === 0) return 100;
  return (attended / total) * 100;
}

export function getStatus(attended, total, minAttendance = 75) {
  const percent = calcPercent(attended, total);
  const safeThreshold = minAttendance + 10;
  if (percent >= safeThreshold) return "SAFE";
  if (percent >= minAttendance) return "RISKY";
  return "DANGER";
}

export function safeBunks(attended, total, minAttendance = 75) {
  const threshold = minAttendance / 100;
  const bunks = Math.floor(
    (attended - threshold * total) / (1 - threshold)
  );
  return Math.max(0, bunks);
}

export function classesNeeded(attended, total, minAttendance = 75) {
  const threshold = minAttendance / 100;
  const needed = Math.ceil(
    (threshold * total - attended) / (1 - threshold)
  );
  return Math.max(0, needed);
}

export function getVerdict(subjects) {
  if (!subjects || subjects.length === 0) return "NONE";
  const statuses = subjects.map((s) =>
    getStatus(s.attended, s.total, s.minAttendance)
  );
  if (statuses.includes("DANGER")) return "DANGER";
  if (statuses.includes("RISKY")) return "RISKY";
  return "SAFE";
}

export function getStatusColor(status) {
  switch (status) {
    case "SAFE":
      return "#22c55e";
    case "RISKY":
      return "#f59e0b";
    case "DANGER":
      return "#ef4444";
    default:
      return "#6b7280";
  }
}

export function getVerdictMessage(verdict) {
  switch (verdict) {
    case "SAFE":
      return {
        title: "All clear. You can afford to relax today.",
        subtitle: "You're killing it! Keep up the great work.",
        emoji: "😎",
      };
    case "RISKY":
      return {
        title: "Careful. Check your subjects below.",
        subtitle: "Some subjects are walking the tightrope.",
        emoji: "⚠️",
      };
    case "DANGER":
      return {
        title: "Do NOT bunk today. Attend everything.",
        subtitle: "Your attendance is crying. Show up.",
        emoji: "🚨",
      };
    default:
      return {
        title: "Add subjects to start tracking.",
        subtitle: "Let's get your attendance on lock.",
        emoji: "📚",
      };
  }
}

export function getBunkMessage(status, bunks, needed) {
  switch (status) {
    case "SAFE":
      return `You can safely bunk ${bunks} more time${bunks !== 1 ? "s" : ""}`;
    case "RISKY":
      return bunks > 0
        ? `Risky territory — only ${bunks} bunk${bunks !== 1 ? "s" : ""} left`
        : "You CANNOT bunk anymore. Attend every class.";
    case "DANGER":
      return `You must attend the next ${needed} class${needed !== 1 ? "es" : ""} to recover`;
    default:
      return "No data yet";
  }
}
