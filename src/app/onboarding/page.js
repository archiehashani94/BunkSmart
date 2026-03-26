"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAttendance } from "@/context/AttendanceContext";
import { extractHolidaysFromPdf } from "@/utils/pdfHolidayExtractor";
import { extractTimetableFromPdf, DAY_NAMES } from "@/utils/timetableExtractor";
import { calculateTotalClasses } from "@/utils/classCalculator";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");

  // Step 2: Calendar
  const [semesterStart, setSemesterStart] = useState("");
  const [semesterEnd, setSemesterEnd] = useState("");
  const [holidayInput, setHolidayInput] = useState("");
  const [holidays, setHolidays] = useState([]);
  const [pdfProcessing, setPdfProcessing] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  const [showManualAdd, setShowManualAdd] = useState(false);
  const holidayFileRef = useRef(null);

  // Step 3: Timetable + Subjects
  const [timetableData, setTimetableData] = useState(null); // raw extracted data
  const [timetableImages, setTimetableImages] = useState([]); // rendered PDF page images
  const [subjects, setSubjectsLocal] = useState([
    { name: "", classesPerDay: {}, minAttendance: "75", autoFilled: false },
  ]);
  const [ttProcessing, setTtProcessing] = useState(false);
  const [ttError, setTtError] = useState("");
  const [ttFileName, setTtFileName] = useState("");
  const timetableFileRef = useRef(null);

  const router = useRouter();
  const { user, updateName, completeOnboarding, loading } = useAuth();
  const { addMultipleSubjects, setCalendar } = useAttendance();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  // Auto-calculate total classes whenever subjects, semester dates, or holidays change
  const computedSubjects = useMemo(() => {
    if (!semesterStart || !semesterEnd) return subjects;

    return subjects.map((s) => {
      const cpd = s.classesPerDay || {};
      const days = Object.keys(cpd).map(Number).filter((d) => cpd[d] > 0);
      if (days.length > 0) {
        const subjectMap = {
          [s.name || "_"]: {
            days,
            classesPerDay: Object.fromEntries(days.map((d) => [d, cpd[d]])),
          },
        };
        const results = calculateTotalClasses(subjectMap, semesterStart, semesterEnd, holidays);
        const result = results[0];
        if (result) {
          return {
            ...s,
            totalClasses: result.totalClasses,
            holidaysSubtracted: result.holidaysSubtracted,
            breakdown: result.breakdown,
          };
        }
      }
      return s;
    });
  }, [subjects, semesterStart, semesterEnd, holidays]);

  // --- Step 2: Calendar handlers ---
  const addHoliday = () => {
    if (holidayInput && !holidays.includes(holidayInput)) {
      setHolidays((prev) => [...prev, holidayInput].sort());
      setHolidayInput("");
    }
  };

  const handleCalendarPdfUpload = async (file) => {
    if (!file || file.type !== "application/pdf") {
      setPdfError("Please upload a valid PDF file.");
      return;
    }
    setPdfProcessing(true);
    setPdfError("");
    setPdfFileName(file.name);
    try {
      const { dates } = await extractHolidaysFromPdf(file, {
        semesterStart,
        semesterEnd,
      });
      if (dates.length === 0) {
        setPdfError("No dates found in the PDF. Try adding holidays manually.");
      } else {
        let filteredDates = dates;
        if (semesterStart && semesterEnd) {
          filteredDates = dates.filter(
            (d) => d >= semesterStart && d <= semesterEnd
          );
        }
        setHolidays((prev) => {
          const merged = new Set([...prev, ...filteredDates]);
          return Array.from(merged).sort();
        });
      }
    } catch (err) {
      console.error("PDF extraction error:", err);
      setPdfError("Failed to read the PDF. Please try a different file.");
    } finally {
      setPdfProcessing(false);
    }
  };

  // If user sets semester dates after uploading, re-filter holidays to range.
  useEffect(() => {
    if (!semesterStart || !semesterEnd) return;
    setHolidays((prev) =>
      prev.filter((d) => d >= semesterStart && d <= semesterEnd)
    );
  }, [semesterStart, semesterEnd]);

  const handleCalendarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleCalendarPdfUpload(file);
    e.target.value = "";
  };

  const handleCalendarDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleCalendarPdfUpload(file);
  };

  const removeHoliday = (date) => {
    setHolidays((prev) => prev.filter((h) => h !== date));
  };

  // --- Step 3: Timetable handlers ---
  const handleTimetableUpload = async (file) => {
    if (!file || file.type !== "application/pdf") {
      setTtError("Please upload a valid PDF file.");
      return;
    }
    setTtProcessing(true);
    setTtError("");
    setTtFileName(file.name);
    try {
      const { subjects: extracted, pageImages } = await extractTimetableFromPdf(file);
      setTimetableData(extracted);
      setTimetableImages(pageImages || []);

      if (Object.keys(extracted).length === 0) {
        setTtError("");
        // No error — we show the timetable image as reference instead
      } else {
        const newSubjects = Object.entries(extracted).map(([name, data]) => {
          // Convert days array + classesPerWeek into classesPerDay map
          const cpd = {};
          const perDay = Math.floor(data.classesPerWeek / data.days.length);
          let rem = data.classesPerWeek - perDay * data.days.length;
          for (const d of data.days) {
            cpd[d] = perDay + (rem > 0 ? 1 : 0);
            if (rem > 0) rem--;
          }
          return {
            name,
            classesPerDay: cpd,
            minAttendance: "75",
            autoFilled: true,
          };
        });
        setSubjectsLocal(newSubjects);
      }
    } catch (err) {
      console.error("Timetable extraction error:", err);
      setTtError("Failed to read the timetable PDF. Please try a different file.");
    } finally {
      setTtProcessing(false);
    }
  };

  const handleTimetableFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleTimetableUpload(file);
    e.target.value = "";
  };

  const handleTimetableDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleTimetableUpload(file);
  };

  // --- Subject editing ---
  const addSubjectRow = () => {
    setSubjectsLocal((prev) => [
      ...prev,
      { name: "", classesPerDay: {}, minAttendance: "75", autoFilled: false },
    ]);
  };

  const updateSubject = (index, field, value) => {
    setSubjectsLocal((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const toggleDay = (index, day) => {
    setSubjectsLocal((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const cpd = { ...(s.classesPerDay || {}) };
        if (cpd[day]) {
          delete cpd[day];
        } else {
          cpd[day] = 1;
        }
        return { ...s, classesPerDay: cpd };
      })
    );
  };

  const updateDayClassCount = (index, day, count) => {
    setSubjectsLocal((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const cpd = { ...(s.classesPerDay || {}) };
        cpd[day] = Math.max(1, parseInt(count) || 1);
        return { ...s, classesPerDay: cpd };
      })
    );
  };

  const removeSubject = (index) => {
    if (subjects.length > 1) {
      setSubjectsLocal((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const validSubjects = computedSubjects.filter(
    (s) => s.name.trim() && (s.totalClasses || Object.keys(s.classesPerDay || {}).length > 0)
  );

  const handleFinish = () => {
    updateName(name);
    setCalendar({ semesterStart, semesterEnd, holidays });
    addMultipleSubjects(
      validSubjects.map((s) => {
        const cpd = s.classesPerDay || {};
        const days = Object.keys(cpd).map(Number).sort();
        const classesPerWeek = Object.values(cpd).reduce((a, b) => a + b, 0);
        return {
          name: s.name.trim(),
          totalClasses: s.totalClasses || classesPerWeek || 0,
          minAttendance: parseInt(s.minAttendance) || 75,
          classesPerDay: cpd,
          days,
          classesPerWeek,
        };
      })
    );
    completeOnboarding();
    router.push("/dashboard");
  };

  const slideVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 md:p-10 relative z-10 text-center">
      {/* Progress bar */}
      <div className="w-full max-w-md mb-10">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-sm text-muted">Step {step} of 4</span>
        </div>
        <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-violet to-cyan rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${(step / 4) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="w-full max-w-md relative z-20">
        <AnimatePresence mode="wait">
          {/* ===== Step 1: Name ===== */}
          {step === 1 && (
            <motion.div
              key="step1"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="glow-card stat-glow p-8 md:p-10 rounded-2xl text-center"
            >
              <h2 className="page-title mb-3">
                What&apos;s your name? 👋
              </h2>
              <p className="text-muted text-sm mb-8 leading-relaxed">
                We&apos;ll use this to personalize your experience.
              </p>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                autoFocus
                onKeyDown={(e) =>
                  e.key === "Enter" && name.trim() && setStep(2)
                }
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground text-left placeholder:text-muted focus:outline-none focus:border-violet focus:ring-1 focus:ring-violet/30 transition-colors mb-6"
              />

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!name.trim()}
                  className="w-full max-w-sm py-3.5 bg-gradient-to-r from-violet to-violet-dark rounded-xl text-white font-semibold btn-pulse disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {/* ===== Step 2: Academic Calendar + Holidays ===== */}
          {step === 2 && (
            <motion.div
              key="step2"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="glow-card stat-glow p-8 md:p-10 rounded-2xl text-center"
            >
              <h2 className="page-title mb-3">
                Academic Calendar 📅
              </h2>
              <p className="text-muted text-sm mb-8 leading-relaxed">
                Set your semester dates and holidays first — we&apos;ll use
                these to auto-calculate total classes.
              </p>

              <div className="space-y-5 text-left">
                {/* Semester dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted mb-1.5 block font-medium">
                      Semester Start
                    </label>
                    <input
                      type="date"
                      value={semesterStart}
                      onChange={(e) => setSemesterStart(e.target.value)}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-violet focus:ring-1 focus:ring-violet/30 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1.5 block font-medium">
                      Semester End
                    </label>
                    <input
                      type="date"
                      value={semesterEnd}
                      onChange={(e) => setSemesterEnd(e.target.value)}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-violet focus:ring-1 focus:ring-violet/30 transition-colors"
                    />
                  </div>
                </div>

                {/* PDF Upload for holidays */}
                <div>
                  <label className="text-xs text-muted mb-1.5 block font-medium">
                    Upload Academic Calendar
                  </label>
                  <input
                    ref={holidayFileRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleCalendarFileChange}
                    className="hidden"
                  />
                  <div
                    onClick={() =>
                      !pdfProcessing && holidayFileRef.current?.click()
                    }
                    onDrop={handleCalendarDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className={`relative w-full p-6 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
                      pdfProcessing
                        ? "border-violet/50 bg-violet/5"
                        : "border-border hover:border-violet/40 hover:bg-violet/5"
                    }`}
                  >
                    {pdfProcessing ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-violet border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-violet">
                          Extracting holidays...
                        </p>
                      </div>
                    ) : pdfFileName && holidays.length > 0 ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-2xl">✅</span>
                        <p className="text-sm text-foreground font-medium">
                          {pdfFileName}
                        </p>
                        <p className="text-xs text-muted">
                          Click to upload a different file
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-2xl">📄</span>
                        <p className="text-sm text-foreground font-medium">
                          Drop your calendar PDF here or click to browse
                        </p>
                        <p className="text-xs text-muted">
                          We&apos;ll extract holiday dates automatically
                        </p>
                      </div>
                    )}
                  </div>
                  <AnimatePresence>
                    {pdfError && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-danger text-xs mt-2"
                      >
                        {pdfError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Holiday list */}
                {holidays.length > 0 && (
                  <div>
                    <p className="text-xs text-muted mb-2 font-medium">
                      {holidays.length} holiday
                      {holidays.length !== 1 ? "s" : ""} found
                    </p>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                      {holidays.map((h) => (
                        <motion.span
                          key={h}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet/10 border border-violet/20 rounded-lg text-xs text-violet-light"
                        >
                          {formatDate(h)}
                          <button
                            onClick={() => removeHoliday(h)}
                            className="text-violet hover:text-danger transition-colors ml-0.5"
                          >
                            ×
                          </button>
                        </motion.span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual add toggle */}
                <div>
                  <button
                    onClick={() => setShowManualAdd(!showManualAdd)}
                    className="text-xs text-violet hover:text-violet-light transition-colors font-medium"
                  >
                    {showManualAdd
                      ? "Hide manual entry ▲"
                      : "+ Add holidays manually ▼"}
                  </button>
                  <AnimatePresence>
                    {showManualAdd && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2"
                      >
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={holidayInput}
                            onChange={(e) => setHolidayInput(e.target.value)}
                            min={semesterStart}
                            max={semesterEnd}
                            className="flex-1 px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-violet focus:ring-1 focus:ring-violet/30 transition-colors"
                          />
                          <button
                            onClick={addHoliday}
                            disabled={!holidayInput}
                            className="px-4 py-2.5 bg-violet/15 border border-violet/30 text-violet rounded-lg text-sm font-medium hover:bg-violet/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Add
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3 mt-6 max-w-lg mx-auto w-full">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="sm:flex-1 sm:max-w-[200px] py-3.5 rounded-xl border border-border text-muted hover:text-foreground transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!semesterStart || !semesterEnd}
                  className="sm:flex-1 sm:max-w-[200px] py-3.5 bg-gradient-to-r from-violet to-violet-dark rounded-xl text-white font-semibold btn-pulse disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {/* ===== Step 3: Timetable + Subjects ===== */}
          {step === 3 && (
            <motion.div
              key="step3"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="glow-card stat-glow p-8 md:p-10 rounded-2xl text-center"
            >
              <h2 className="page-title mb-3">
                Your Timetable 📚
              </h2>
              <p className="text-muted text-sm mb-8 leading-relaxed">
                Upload your weekly timetable PDF or add subjects manually.
                Total classes are auto-calculated.
              </p>

              {/* Timetable PDF Upload */}
              <div className="mb-5">
                <input
                  ref={timetableFileRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleTimetableFileChange}
                  className="hidden"
                />
                <div
                  onClick={() =>
                    !ttProcessing && timetableFileRef.current?.click()
                  }
                  onDrop={handleTimetableDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className={`relative w-full p-5 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
                    ttProcessing
                      ? "border-cyan/50 bg-cyan/5"
                      : "border-border hover:border-cyan/40 hover:bg-cyan/5"
                  }`}
                >
                  {ttProcessing ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-cyan">
                        Extracting timetable...
                      </p>
                    </div>
                  ) : ttFileName ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">✅</span>
                      <p className="text-sm text-foreground font-medium">
                        {ttFileName}
                      </p>
                      <p className="text-xs text-muted">
                        Click to upload a different timetable
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">🗓️</span>
                      <p className="text-sm text-foreground font-medium">
                        Drop your weekly timetable PDF here
                      </p>
                      <p className="text-xs text-muted">
                        We&apos;ll extract subjects &amp; their schedule
                      </p>
                    </div>
                  )}
                </div>
                <AnimatePresence>
                  {ttError && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-danger text-xs mt-2"
                    >
                      {ttError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Rendered timetable image preview */}
              {timetableImages.length > 0 && (
                <div className="mb-5 text-left">
                  <p className="text-xs font-medium text-muted mb-2">
                    📋 Your timetable — add subjects below by referencing this
                  </p>
                  <div className="rounded-xl border border-border overflow-hidden bg-white max-h-64 overflow-y-auto">
                    {timetableImages.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Timetable page ${idx + 1}`}
                        className="w-full"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Subjects list */}
              <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1 text-left">
                {computedSubjects.map((subject, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-4 bg-background rounded-xl border border-border space-y-3 relative z-30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted font-medium">
                        Subject {i + 1}
                        {subject.autoFilled && (
                          <span className="ml-1.5 text-cyan">• auto-filled</span>
                        )}
                      </span>
                      {subjects.length > 1 && (
                        <button
                          onClick={() => removeSubject(i)}
                          className="text-xs text-danger hover:text-danger-light transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={subject.name}
                      onChange={(e) =>
                        updateSubject(i, "name", e.target.value)
                      }
                      placeholder="Subject name (e.g. Mathematics)"
                      className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-violet focus:ring-1 focus:ring-violet/30 transition-colors"
                    />

                    {/* Day selector with per-day class counts */}
                    <div>
                      <label className="text-xs text-muted mb-1.5 block">
                        Select days & set classes per day
                      </label>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5, 6].map((d) => {
                          const cpd = subject.classesPerDay || {};
                          const isActive = !!cpd[d];
                          return (
                            <button
                              key={d}
                              onClick={() => toggleDay(i, d)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all relative ${
                                isActive
                                  ? "bg-violet text-white"
                                  : "bg-surface border border-border text-muted hover:text-foreground"
                              }`}
                            >
                              {DAY_NAMES[d]}
                              {isActive && cpd[d] > 1 && (
                                <span className="absolute -top-1.5 -right-1 bg-cyan text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                  {cpd[d]}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Per-day class count editors */}
                      {Object.keys(subject.classesPerDay || {}).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Object.keys(subject.classesPerDay || {})
                            .map(Number)
                            .sort()
                            .map((d) => (
                              <div
                                key={d}
                                className="flex items-center gap-1.5 px-2 py-1 bg-violet/10 border border-violet/20 rounded-lg"
                              >
                                <span className="text-xs text-violet-light font-medium">
                                  {DAY_NAMES[d]}
                                </span>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={subject.classesPerDay[d]}
                                  onChange={(e) => updateDayClassCount(i, d, e.target.value)}
                                  className="w-10 text-center text-xs font-bold bg-surface border border-violet/30 rounded text-foreground focus:outline-none focus:ring-1 focus:ring-violet/50 py-0.5"
                                />
                                <span className="text-[10px] text-muted">cls</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-muted mb-1 block">
                        Min attendance %
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="100"
                        value={subject.minAttendance}
                        onChange={(e) =>
                          updateSubject(i, "minAttendance", e.target.value)
                        }
                        placeholder="75"
                        className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-violet focus:ring-1 focus:ring-violet/30 transition-colors"
                      />
                    </div>

                    {/* Computed total */}
                    {subject.totalClasses != null && (
                      <div className="flex items-center justify-between px-3 py-2 bg-safe/5 border border-safe/15 rounded-lg">
                        <span className="text-xs text-muted">Semester total</span>
                        <span className="text-sm font-bold text-safe">
                          {subject.totalClasses} classes
                          {subject.holidaysSubtracted > 0 && (
                            <span className="text-xs text-muted font-normal ml-1.5">
                              ({subject.holidaysSubtracted} holiday
                              {subject.holidaysSubtracted !== 1 ? "s" : ""}{" "}
                              subtracted)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={addSubjectRow}
                  className="w-full max-w-md mt-4 py-3 rounded-xl border border-dashed border-violet/30 text-violet text-sm font-medium hover:bg-violet/5 transition-colors"
                >
                  + Add another subject
                </button>
              </div>

              <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3 mt-6 max-w-lg mx-auto w-full">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="sm:flex-1 sm:max-w-[200px] py-3.5 rounded-xl border border-border text-muted hover:text-foreground transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  disabled={validSubjects.length === 0}
                  className="sm:flex-1 sm:max-w-[200px] py-3.5 bg-gradient-to-r from-violet to-violet-dark rounded-xl text-white font-semibold btn-pulse disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {/* ===== Step 4: Confirmation ===== */}
          {step === 4 && (
            <motion.div
              key="step4"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="glow-card stat-glow p-8 md:p-10 rounded-2xl text-center"
            >
              <h2 className="page-title mb-3">
                All set, {name}! 🎉
              </h2>
              <p className="text-muted text-sm mb-8 leading-relaxed">
                Here&apos;s a summary of your setup:
              </p>

              {/* Calendar summary */}
              {(semesterStart || semesterEnd) && (
                <div className="p-4 bg-background rounded-xl border border-border mb-4">
                  <p className="text-xs text-muted font-medium mb-2">
                    📅 Semester
                  </p>
                  <p className="text-sm text-foreground">
                    {formatDate(semesterStart)} — {formatDate(semesterEnd)}
                  </p>
                  {holidays.length > 0 && (
                    <p className="text-xs text-muted mt-1.5">
                      {holidays.length} holiday
                      {holidays.length !== 1 ? "s" : ""} marked
                    </p>
                  )}
                </div>
              )}

              {/* Subject summary */}
              <div className="space-y-3 mb-8">
                {validSubjects.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex flex-col items-center text-center gap-2 p-4 bg-background rounded-xl border border-border"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{s.name}</p>
                      <p className="text-xs text-muted mt-1">
                        {s.days && s.days.length > 0
                          ? s.days.map((d) => DAY_NAMES[d]).join(", ")
                          : `${s.classesPerWeek || "?"} classes/wk`}
                        {" · "}
                        <span className="text-safe font-medium">
                          {s.totalClasses || "?"} total
                        </span>
                        {s.holidaysSubtracted > 0 && (
                          <span className="text-muted">
                            {" "}
                            (−{s.holidaysSubtracted} holidays)
                          </span>
                        )}
                        {" · "}Min {s.minAttendance}%
                      </p>
                    </div>
                    <span className="text-safe text-lg" aria-hidden>✓</span>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3 max-w-lg mx-auto w-full">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="sm:flex-1 sm:max-w-[200px] py-3.5 rounded-xl border border-border text-muted hover:text-foreground transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="sm:flex-1 sm:max-w-[220px] py-3.5 bg-gradient-to-r from-violet to-cyan rounded-xl text-white font-semibold btn-pulse"
                >
                  Start Tracking →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
