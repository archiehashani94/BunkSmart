/**
 * Class Calculator
 * Given a subject-to-weekday mapping, semester dates, and holidays,
 * calculates total semester classes per subject.
 */

/**
 * Count occurrences of each weekday between two dates (inclusive).
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Object} - { 0: count, 1: count, ..., 6: count } (0=Sun, 1=Mon, ...)
 */
function countWeekdays(startDate, endDate) {
  const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) return counts;

  const current = new Date(start);
  while (current <= end) {
    counts[current.getDay()] += 1;
    current.setDate(current.getDate() + 1);
  }

  return counts;
}

/**
 * Get the weekday (0-6) for each holiday date.
 * @param {string[]} holidays - Array of YYYY-MM-DD strings
 * @returns {Object} - { dayNumber: count } for holidays
 */
function countHolidayWeekdays(holidays) {
  const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const h of holidays) {
    const day = new Date(h).getDay();
    counts[day] += 1;
  }
  return counts;
}

/**
 * Calculate total semester classes for each subject.
 *
 * @param {Object} subjectDayMap - { subjectName: { days: [dayNumbers], classesPerWeek: number } }
 * @param {string} semesterStart - YYYY-MM-DD
 * @param {string} semesterEnd - YYYY-MM-DD
 * @param {string[]} holidays - Array of YYYY-MM-DD strings
 * @returns {Object[]} - Array of { name, days, classesPerWeek, totalClasses, holidaysSubtracted, breakdown }
 */
export function calculateTotalClasses(subjectDayMap, semesterStart, semesterEnd, holidays = []) {
  if (!semesterStart || !semesterEnd) return [];

  const weekdayCounts = countWeekdays(semesterStart, semesterEnd);
  const holidayDayCounts = countHolidayWeekdays(holidays);

  const results = [];

  for (const [name, data] of Object.entries(subjectDayMap)) {
    const { days, classesPerWeek } = data;

    // For each day the subject meets, count available days minus holidays
    let totalClasses = 0;
    let holidaysSubtracted = 0;
    const breakdown = [];

    // Use explicit classesPerDay if provided, else distribute classesPerWeek evenly
    const classesPerDay = {};
    if (data.classesPerDay) {
      for (const d of days) {
        classesPerDay[d] = data.classesPerDay[d] || 1;
      }
    } else {
      const cpw = classesPerWeek || days.length;
      const basePerDay = Math.floor(cpw / days.length);
      let remainder = cpw - basePerDay * days.length;

      for (const d of days) {
        classesPerDay[d] = basePerDay + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;
      }
    }

    for (const d of days) {
      const availableDays = weekdayCounts[d] - (holidayDayCounts[d] || 0);
      const classesOnThisDay = availableDays * classesPerDay[d];
      const holidaysOnThisDay = (holidayDayCounts[d] || 0) * classesPerDay[d];

      totalClasses += classesOnThisDay;
      holidaysSubtracted += holidaysOnThisDay;

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      breakdown.push({
        day: dayNames[d],
        dayNumber: d,
        totalWeeks: weekdayCounts[d],
        holidays: holidayDayCounts[d] || 0,
        classesPerDay: classesPerDay[d],
        classes: classesOnThisDay,
      });
    }

    results.push({
      name,
      days,
      classesPerWeek,
      totalClasses: Math.max(0, totalClasses),
      holidaysSubtracted,
      breakdown,
    });
  }

  return results;
}

/**
 * Simple calculation: given classes per week, semester dates, specific days, and holidays,
 * compute total classes for a single subject.
 */
export function calculateForSubject(days, classesPerWeek, semesterStart, semesterEnd, holidays = []) {
  const map = { _single: { days, classesPerWeek } };
  const results = calculateTotalClasses(map, semesterStart, semesterEnd, holidays);
  return results[0]?.totalClasses || 0;
}
