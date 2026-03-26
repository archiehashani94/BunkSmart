"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function NoteRequestPanel({ subjectName, onSend, onClose }) {
  const [classmates, setClassmates] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [message, setMessage] = useState("");
  const [method, setMethod] = useState("in-app");
  const [sent, setSent] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const normalizeEmail = (val) => val.trim().toLowerCase();
  const isValidEmail = (val) => {
    const v = normalizeEmail(val);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  };

  const addClassmate = () => {
    const val = inputValue.trim();
    if (!val) return;
    setError("");
    if (classmates.some((c) => c.name.toLowerCase() === val.toLowerCase())) {
      setInputValue("");
      return;
    }
    const isEmail = isValidEmail(val);
    setClassmates((prev) => [
      ...prev,
      { name: val, email: isEmail ? normalizeEmail(val) : "" },
    ]);
    setInputValue("");
  };

  const removeClassmate = (index) => {
    setClassmates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addClassmate();
    }
    if (e.key === "Backspace" && inputValue === "" && classmates.length > 0) {
      removeClassmate(classmates.length - 1);
    }
  };

  const handleSend = () => {
    if (classmates.length === 0) return;

    if (method === "in-app") {
      const invalid = classmates.filter((c) => !c.email || !isValidEmail(c.email));
      if (invalid.length > 0) {
        setError("For In-App requests, please enter recipient emails (not just names).");
        return;
      }
    }

    if (method === "email") {
      const emails = classmates
        .map((c) => c.email || "")
        .filter(Boolean)
        .join(",");
      const subject = `Notes Request: ${subjectName || "Class"}`;
      const body = message
        ? `Hey! I missed today's ${subjectName || "class"} and was hoping you could share your notes.\n\n${message}\n\nSent via BunkSmart 📚`
        : `Hey! I missed today's ${subjectName || "class"} and was hoping you could share your notes.\n\nThanks!\n\nSent via BunkSmart 📚`;

      if (emails) {
        window.open(
          `mailto:${emails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
          "_blank"
        );
      }
    }

    onSend({
      classmates: classmates.map((c) => ({
        ...c,
        email: c.email ? normalizeEmail(c.email) : "",
      })),
      message,
      method,
    });
    setSentCount(classmates.length);
    setSent(true);
    setTimeout(() => {
      onClose();
    }, 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border overflow-hidden"
        style={{ background: "rgba(15, 20, 40, 0.98)" }}
      >
        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-5"
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">📝</span>
                <h3 className="text-lg font-bold text-foreground">
                  Request Notes
                  {subjectName && (
                    <span className="text-sm font-normal text-violet-light ml-2">
                      for {subjectName}
                    </span>
                  )}
                </h3>
              </div>

              {/* Classmate chips + input */}
              <div className="mb-3">
                <label className="text-[10px] text-muted uppercase tracking-wider mb-1.5 block">
                  Classmates
                </label>
                <div
                  className="note-chips-container"
                  onClick={() => inputRef.current?.focus()}
                >
                  {classmates.map((c, i) => (
                    <motion.span
                      key={i}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className={`note-chip ${method === "in-app" && !c.email ? "border border-danger/40" : ""}`}
                    >
                      <span className="note-chip-icon">
                        {c.email ? "✉️" : "👤"}
                      </span>
                      {c.name}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeClassmate(i);
                        }}
                        className="note-chip-remove"
                      >
                        ×
                      </button>
                    </motion.span>
                  ))}
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => {
                      if (inputValue.trim()) addClassmate();
                    }}
                    placeholder={
                      classmates.length === 0
                        ? "Type name or email, press Enter"
                        : "Add more..."
                    }
                    className="note-chips-input"
                  />
                </div>
                {error && (
                  <p className="mt-2 text-xs text-danger">
                    {error}
                  </p>
                )}
                {method === "in-app" && !error && (
                  <p className="mt-2 text-[11px] text-muted">
                    In-App delivery works only with emails.
                  </p>
                )}
              </div>

              {/* Message */}
              <div className="mb-3">
                <label className="text-[10px] text-muted uppercase tracking-wider mb-1.5 block">
                  Message (optional)
                </label>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hey, can you share today's notes?"
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground placeholder:text-muted/60 focus:outline-none focus:border-violet/50 transition-colors text-sm"
                />
              </div>

              {/* Method toggle */}
              <div className="mb-4">
                <label className="text-[10px] text-muted uppercase tracking-wider mb-1.5 block">
                  Send via
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMethod("in-app")}
                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                      method === "in-app"
                        ? "bg-violet/20 border-violet/50 text-violet-light border"
                        : "bg-surface border border-border text-muted hover:text-foreground"
                    }`}
                  >
                    <span>🔔</span> In-App
                  </button>
                  <button
                    onClick={() => setMethod("email")}
                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                      method === "email"
                        ? "bg-cyan/20 border-cyan/50 text-cyan-light border"
                        : "bg-surface border border-border text-muted hover:text-foreground"
                    }`}
                  >
                    <span>✉️</span> Email
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-muted hover:text-foreground transition-colors text-sm"
                >
                  Skip
                </button>
                <button
                  onClick={handleSend}
                  disabled={classmates.length === 0}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-violet text-white font-semibold btn-pulse disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                >
                  Request Notes
                  {classmates.length > 0 && (
                    <span className="ml-1 opacity-70">
                      ({classmates.length})
                    </span>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10 px-5"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                  delay: 0.1,
                }}
                className="text-5xl mb-4"
              >
                {method === "email" ? "📨" : "✅"}
              </motion.div>
              <p className="text-lg font-semibold text-foreground mb-1">
                {method === "email"
                  ? "Email composed!"
                  : `Request sent to ${sentCount} classmate${sentCount > 1 ? "s" : ""}!`}
              </p>
              <p className="text-sm text-muted">
                {method === "email"
                  ? "Check your email client to send the message."
                  : "They'll get a reminder to share their notes."}
              </p>

              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {classmates.map((c, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    className="px-3 py-1 rounded-full text-xs bg-violet/15 text-violet-light border border-violet/20"
                  >
                    {c.name}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
