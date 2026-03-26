/**
 * Timetable Extractor
 * Extracts subjects and their weekday schedule from a timetable PDF.
 *
 * Supports two modes:
 * 1. Text-based: Parses slot-code legend + day grid (for PDFs with selectable text)
 * 2. Image fallback: Renders PDF pages as images for visual reference
 *    (when text extraction fails due to font issues)
 */

let pdfjsLib = null;

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import("pdfjs-dist");
  // Point to the local worker copy in public/ (Turbopack doesn't support ?url imports)
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjsLib;
}

// Day name → JS day number (0=Sun, 1=Mon, ..., 6=Sat)
const DAY_MAP = {
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
  sunday: 0, sun: 0,
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Extract text from a PDF file, preserving spatial layout.
 */
async function extractTextFromPdf(pdfDoc) {
  let fullText = "";

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();

    const itemsByRow = {};
    for (const item of textContent.items) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5] / 5) * 5;
      if (!itemsByRow[y]) itemsByRow[y] = [];
      itemsByRow[y].push({
        text: item.str.trim(),
        x: item.transform[4],
      });
    }

    const sortedRows = Object.keys(itemsByRow)
      .sort((a, b) => Number(b) - Number(a))
      .map((y) => itemsByRow[y].sort((a, b) => a.x - b.x));

    for (const row of sortedRows) {
      fullText += row.map((item) => item.text).join("  ") + "\n";
    }
  }

  return fullText;
}

/**
 * Render a PDF page to a data URL (image) for visual reference.
 */
async function renderPageToImage(pdfDoc, pageNum = 1, scale = 1.5) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;

  return canvas.toDataURL("image/png");
}

/**
 * Parse legend table mapping slot codes to subject names.
 */
function parseSlotLegend(text) {
  const slotToSubject = {};
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let legendStartIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (
      (lower.includes("subject") && lower.includes("slot")) ||
      (lower.includes("subject") && lower.includes("code")) ||
      (lower.includes("course") && lower.includes("slot")) ||
      (lower.includes("course") && lower.includes("code"))
    ) {
      legendStartIdx = i;
      break;
    }
  }

  if (legendStartIdx >= 0) {
    for (let i = legendStartIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.length < 3) continue;

      const parts = line.split(/\s{2,}|\t+/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const slotCode = parts[parts.length - 1];
        if (slotCode.length <= 4 && slotCode.length >= 1 && /^[A-Za-z0-9]+$/.test(slotCode)) {
          let subjectName = "";
          if (parts.length >= 3) {
            const candidates = parts.slice(1, -1);
            subjectName = candidates.reduce((best, candidate) => {
              if (/^(dr|prof|mr|mrs|ms|adf)\.?\s/i.test(candidate)) return best;
              if (/^\d+$/.test(candidate)) return best;
              return candidate.length > best.length ? candidate : best;
            }, "");
            if (!subjectName) subjectName = candidates.join(" ").trim();
          } else {
            subjectName = parts[0];
          }
          if (subjectName && subjectName.length > 1) {
            slotToSubject[slotCode.toUpperCase()] = subjectName;
          }
        }
      }
    }
  }

  if (Object.keys(slotToSubject).length === 0) {
    for (const line of lines) {
      const match = line.match(/\b([A-Z][A-Z0-9]?)\s*[-:=]\s*([A-Za-z][A-Za-z\s&,]+)/);
      if (match) {
        const code = match[1].toUpperCase();
        const name = match[2].trim();
        if (name.length > 2 && !/^(mon|tue|wed|thu|fri|sat|sun)/i.test(name)) {
          slotToSubject[code] = name;
        }
      }
    }
  }

  return slotToSubject;
}

/**
 * Parse timetable grid to find slot codes per day.
 */
function parseTimetableGrid(text) {
  const slotDayMap = {};
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    let dayNumber = null;

    for (const [dayName, num] of Object.entries(DAY_MAP)) {
      if (new RegExp(`^${dayName}\\b`, "i").test(lowerLine)) {
        dayNumber = num;
        break;
      }
    }

    if (dayNumber === null) continue;

    let cleaned = line
      .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b/gi, "")
      .replace(/\d{1,2}[:.]\d{2}\s*[-–]\s*\d{1,2}[:.]\d{2}/g, "")
      .replace(/\d{1,2}[:.]\d{2}\s*(am|pm|AM|PM)?/g, "")
      .replace(/\d{1,2}\s*[-–]\s*\d{1,2}/g, "")
      .trim();

    const tokens = cleaned
      .split(/[\s,|/\\;]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 1 && t.length <= 4 && /^[A-Za-z][A-Za-z0-9]*$/.test(t));

    for (const token of tokens) {
      const code = token.toUpperCase();
      if (!slotDayMap[code]) {
        slotDayMap[code] = { days: new Set(), classesPerWeek: 0 };
      }
      slotDayMap[code].days.add(dayNumber);
      slotDayMap[code].classesPerWeek += 1;
    }
  }

  return slotDayMap;
}

/**
 * Main function: Extract timetable from PDF.
 *
 * @param {File} file - The uploaded timetable PDF
 * @returns {Promise<{subjects: Object, rawText: string, slotLegend: Object, pageImages: string[]}>}
 *   - subjects: { name: { days: number[], classesPerWeek: number } }
 *   - rawText: extracted text (may be empty if PDF uses non-decodable fonts)
 *   - slotLegend: { slotCode: subjectName }
 *   - pageImages: data URL images of each PDF page (for visual reference)
 */
export async function extractTimetableFromPdf(file) {
  const pdfjs = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  // Always render the PDF as images for visual reference
  const pageImages = [];
  try {
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const img = await renderPageToImage(pdfDoc, i);
      pageImages.push(img);
    }
  } catch (err) {
    console.warn(
      "PDF page render failed; continuing without images:",
      err
    );
  }

  // Try text extraction
  const fullText = await extractTextFromPdf(pdfDoc);
  const hasText = fullText.trim().length > 10;

  let result = {};
  let slotLegend = {};

  if (hasText) {
    slotLegend = parseSlotLegend(fullText);
    const slotDayMap = parseTimetableGrid(fullText);
    const legendCodes = new Set(Object.keys(slotLegend));

    const subjects = {};
    for (const [code, data] of Object.entries(slotDayMap)) {
      if (legendCodes.has(code)) {
        const subjectName = slotLegend[code];
        if (subjects[subjectName]) {
          for (const d of data.days) subjects[subjectName].days.add(d);
          subjects[subjectName].classesPerWeek += data.classesPerWeek;
        } else {
          subjects[subjectName] = {
            days: new Set(data.days),
            classesPerWeek: data.classesPerWeek,
          };
        }
      }
    }

    for (const [name, data] of Object.entries(subjects)) {
      result[name] = {
        days: Array.from(data.days).sort(),
        classesPerWeek: data.classesPerWeek,
      };
    }
  }

  return { subjects: result, rawText: fullText, slotLegend, pageImages };
}

export { DAY_NAMES };
