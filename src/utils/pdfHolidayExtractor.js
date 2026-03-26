/**
 * PDF Holiday Extractor
 * Extracts holiday dates from academic calendar PDFs using pdfjs-dist.
 */

let pdfjsLib = null;

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import("pdfjs-dist");
  // Point to the local worker copy in public/ (Turbopack doesn't support ?url imports)
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjsLib;
}

/**
 * Extract all text content from a PDF file.
 * @param {File} file - The uploaded PDF file
 * @returns {Promise<string>} - The extracted text
 */
async function extractTextFromPdf(file) {
  const pdfjs = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n";
  }

  return fullText;
}

// Month name mappings
const MONTH_MAP = {
  january: "01", jan: "01",
  february: "02", feb: "02",
  march: "03", mar: "03",
  april: "04", apr: "04",
  may: "05",
  june: "06", jun: "06",
  july: "07", jul: "07",
  august: "08", aug: "08",
  september: "09", sep: "09", sept: "09",
  october: "10", oct: "10",
  november: "11", nov: "11",
  december: "12", dec: "12",
};

function toYmd(year, month, day) {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function inferYears(semesterStart, semesterEnd) {
  const nowYear = new Date().getFullYear();
  const startYear = semesterStart ? new Date(semesterStart).getFullYear() : null;
  const endYear = semesterEnd ? new Date(semesterEnd).getFullYear() : null;
  if (startYear && endYear) return [startYear, endYear];
  if (startYear) return [startYear, startYear + 1];
  if (endYear) return [endYear - 1, endYear];
  return [nowYear, nowYear + 1];
}

function pickBestYear(month, day, candidateYears, semesterStart, semesterEnd) {
  const candidates = candidateYears.map((y) => toYmd(y, month, day));
  if (semesterStart && semesterEnd) {
    const start = semesterStart;
    const end = semesterEnd;
    const inRange = candidates.filter((d) => d >= start && d <= end);
    if (inRange.length > 0) return inRange[0];
  }
  return candidates[0];
}

function isLikelyHolidayContext(contextLower) {
  // Keep this conservative: only accept dates that look like they're in a holiday row/label.
  const strongKeywords = [
    "holiday",
    "holidays",
    "closed",
    "no class",
    "no classes",
    "vacation",
    "break",
    "recess",
    "festival",
    "diwali",
    "dussehra",
    "dasara",
    "pongal",
    "holi",
    "eid",
    "christmas",
    "new year",
    "independence",
    "republic",
    "sankranti",
    "onam",
    "ganesh",
    "gandhi",
    "mahatma",
    "ambedkar",
    "muharram",
    "ram navami",
    "good friday",
  ];
  return strongKeywords.some((k) => contextLower.includes(k));
}

/**
 * Extract candidate holiday dates from text.
 * - Uses year inference from semester range when year is missing.
 * - Filters out many non-holiday dates via keyword context scoring.
 */
function parseHolidayDatesFromText(text, { semesterStart, semesterEnd } = {}) {
  const lower = text.toLowerCase();
  const listIdx = lower.indexOf("list of holidays");
  const statsIdx = lower.indexOf("teaching days statistics");

  let source;
  if (listIdx !== -1) {
    const start = listIdx;
    const end =
      statsIdx !== -1 && statsIdx > listIdx
        ? statsIdx
        : Math.min(text.length, start + 8000);
    source = text.slice(start, end);
  } else {
    // Fallback to bottom of document if heading not found
    const tailWindow = 4000;
    source =
      text.length > tailWindow ? text.slice(text.length - tailWindow) : text;
  }

  const inHolidaySection = listIdx !== -1;
  const candidateYears = inferYears(semesterStart, semesterEnd);
  const dates = new Set();

  // Pattern 1: "15 August 2025", "15 Aug 2025", "15th August 2025"
  const pattern1 = /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s*[,.]?\s*(\d{4})/gi;

  // Pattern 2: "August 15, 2025", "Aug 15 2025"
  const pattern2 = /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s*[.]?\s*(\d{1,2})(?:st|nd|rd|th)?\s*[,.]?\s*(\d{4})/gi;

  // Pattern 3: "15/08/2025", "15-08-2025", "15.08.2025" (DD/MM/YYYY)
  const pattern3 = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/g;

  // Pattern 4: "2025-08-15" (ISO format)
  const pattern4 = /(\d{4})-(\d{1,2})-(\d{1,2})/g;

  // Pattern 5: "15 August", "15th Aug" (without year — assume current/next academic year)
  const pattern5 = /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)(?!\s*\d{4})/gi;

  // Pattern 6: "August 15", "Aug 15th" (without year)
  const pattern6 = /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s*[.]?\s*(\d{1,2})(?:st|nd|rd|th)?(?!\s*[,.]?\s*\d{4})/gi;

  let match;

  // Process pattern 1: "15 August 2025"
  while ((match = pattern1.exec(source)) !== null) {
    const day = match[1].padStart(2, "0");
    const month = MONTH_MAP[match[2].toLowerCase()];
    const year = match[3];
    if (month && parseInt(day) >= 1 && parseInt(day) <= 31) {
      const idx = match.index;
      if (inHolidaySection) {
        dates.add(`${year}-${month}-${day}`);
      } else {
        const ctx = source
          .slice(
            Math.max(0, idx - 60),
            Math.min(source.length, idx + match[0].length + 60)
          )
          .toLowerCase();
        if (isLikelyHolidayContext(ctx)) dates.add(`${year}-${month}-${day}`);
      }
    }
  }

  // Process pattern 2: "August 15, 2025"
  while ((match = pattern2.exec(source)) !== null) {
    const month = MONTH_MAP[match[1].toLowerCase()];
    const day = match[2].padStart(2, "0");
    const year = match[3];
    if (month && parseInt(day) >= 1 && parseInt(day) <= 31) {
      const idx = match.index;
      if (inHolidaySection) {
        dates.add(`${year}-${month}-${day}`);
      } else {
        const ctx = source
          .slice(
            Math.max(0, idx - 60),
            Math.min(source.length, idx + match[0].length + 60)
          )
          .toLowerCase();
        if (isLikelyHolidayContext(ctx)) dates.add(`${year}-${month}-${day}`);
      }
    }
  }

  // Process pattern 3: "15/08/2025" (DD/MM/YYYY)
  while ((match = pattern3.exec(source)) !== null) {
    const part1 = parseInt(match[1]);
    const part2 = parseInt(match[2]);
    const year = match[3];

    // Determine DD/MM vs MM/DD: if part1 > 12, it must be DD/MM
    let day, month;
    if (part1 > 12) {
      day = match[1].padStart(2, "0");
      month = match[2].padStart(2, "0");
    } else if (part2 > 12) {
      month = match[1].padStart(2, "0");
      day = match[2].padStart(2, "0");
    } else {
      // Ambiguous — assume DD/MM (common in Indian academic calendars)
      day = match[1].padStart(2, "0");
      month = match[2].padStart(2, "0");
    }

    if (
      parseInt(month) >= 1 &&
      parseInt(month) <= 12 &&
      parseInt(day) >= 1 &&
      parseInt(day) <= 31
    ) {
      const idx = match.index;
      if (inHolidaySection) {
        dates.add(`${year}-${month}-${day}`);
      } else {
        const ctx = source
          .slice(
            Math.max(0, idx - 60),
            Math.min(source.length, idx + match[0].length + 60)
          )
          .toLowerCase();
        if (isLikelyHolidayContext(ctx)) dates.add(`${year}-${month}-${day}`);
      }
    }
  }

  // Process pattern 4: "2025-08-15"
  while ((match = pattern4.exec(source)) !== null) {
    const year = match[1];
    const month = match[2].padStart(2, "0");
    const day = match[3].padStart(2, "0");
    if (
      parseInt(month) >= 1 &&
      parseInt(month) <= 12 &&
      parseInt(day) >= 1 &&
      parseInt(day) <= 31
    ) {
      const idx = match.index;
      if (inHolidaySection) {
        dates.add(`${year}-${month}-${day}`);
      } else {
        const ctx = source
          .slice(
            Math.max(0, idx - 60),
            Math.min(source.length, idx + match[0].length + 60)
          )
          .toLowerCase();
        if (isLikelyHolidayContext(ctx)) dates.add(`${year}-${month}-${day}`);
      }
    }
  }

  // Process pattern 5: "15 August" (no year)
  while ((match = pattern5.exec(source)) !== null) {
    const dayNum = parseInt(match[1]);
    const month = MONTH_MAP[match[2].toLowerCase()];
    if (month && dayNum >= 1 && dayNum <= 31) {
      const idx = match.index;
      if (!inHolidaySection) {
        const ctx = source
          .slice(
            Math.max(0, idx - 60),
            Math.min(source.length, idx + match[0].length + 60)
          )
          .toLowerCase();
        if (!isLikelyHolidayContext(ctx)) continue;
      }
      const picked = pickBestYear(
        parseInt(month),
        dayNum,
        candidateYears,
        semesterStart,
        semesterEnd
      );
      dates.add(picked);
    }
  }

  // Process pattern 6: "August 15" (no year)
  while ((match = pattern6.exec(source)) !== null) {
    const month = MONTH_MAP[match[1].toLowerCase()];
    const dayNum = parseInt(match[2]);
    if (month && dayNum >= 1 && dayNum <= 31) {
      const idx = match.index;
      if (!inHolidaySection) {
        const ctx = source
          .slice(
            Math.max(0, idx - 60),
            Math.min(source.length, idx + match[0].length + 60)
          )
          .toLowerCase();
        if (!isLikelyHolidayContext(ctx)) continue;
      }
      const picked = pickBestYear(
        parseInt(month),
        dayNum,
        candidateYears,
        semesterStart,
        semesterEnd
      );
      dates.add(picked);
    }
  }

  return Array.from(dates).sort();
}

/**
 * Main function: Extract holiday dates from an academic calendar PDF.
 * @param {File} file - The uploaded PDF file
 * @returns {Promise<{dates: string[], rawText: string}>} - Extracted dates and raw text
 */
export async function extractHolidaysFromPdf(
  file,
  { semesterStart, semesterEnd } = {}
) {
  const rawText = await extractTextFromPdf(file);
  const dates = parseHolidayDatesFromText(rawText, { semesterStart, semesterEnd });
  return { dates, rawText };
}
