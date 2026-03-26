"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AnonNoteRequestPanel({ subjectId, subjectName, alias, onSend, onClose }) {
  const [sent, setSent] = useState(false);
  const [classmates, setClassmates] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [message, setMessage] = useState("");
  const [sendTo, setSendTo] = useState("class"); // "class" or "specific"

  const addClassmate = () => {
    const val = inputValue.trim();
    if (val && !classmates.includes(val)) {
      setClassmates((prev) => [...prev, val]);
      setInputValue("");
    }
  };

  const removeClassmate = (idx) => {
    setClassmates((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addClassmate();
    }
  };

  const handleSend = async () => {
    await onSend({
      classmates: sendTo === "specific" ? classmates.map((c) => ({ name: c, email: c.includes("@") ? c : "" })) : [],
      message,
      sendTo,
    });
    setSent(true);
    setTimeout(() => onClose(), 2800);
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
        style={{ background: "rgba(15, 20, 40, 0.98)", maxHeight: "85vh", overflowY: "auto" }}
      >
        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <div className="text-center mb-4">
                <div className="text-4xl mb-3">🕵️</div>
                <h3 className="text-xl font-bold text-foreground">
                  Get notes anonymously
                </h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">
                  Request sent as{" "}
                  <span className="anon-alias-badge">{alias}</span>.
                  No one will know it&apos;s you.
                </p>
              </div>

              <div className="glow-card p-3 mb-4 text-center">
                <p className="text-xs text-muted uppercase tracking-wider mb-0.5">Subject</p>
                <p className="text-sm font-semibold text-foreground">{subjectName}</p>
              </div>

              {/* Send To Toggle */}
              <div className="flex gap-2 p-1 bg-surface rounded-xl border border-border mb-4">
                <button
                  onClick={() => setSendTo("class")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                    sendTo === "class"
                      ? "bg-violet/20 text-violet-light"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  📢 Entire Class
                </button>
                <button
                  onClick={() => setSendTo("specific")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                    sendTo === "specific"
                      ? "bg-violet/20 text-violet-light"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  👤 Specific Classmates
                </button>
              </div>

              {/* Specific classmates input */}
              <AnimatePresence>
                {sendTo === "specific" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {classmates.map((c, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-full text-xs bg-violet/10 text-violet-light border border-violet/15 flex items-center gap-1"
                        >
                          {c}
                          <button
                            onClick={() => removeClassmate(i)}
                            className="text-muted hover:text-danger ml-0.5"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Name or email, press Enter"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 px-3 py-2 rounded-xl bg-surface border border-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-violet/40"
                      />
                      <button
                        onClick={addClassmate}
                        className="px-3 py-2 rounded-xl bg-violet/15 text-violet-light text-sm border border-violet/20 hover:bg-violet/25 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Optional message */}
              <input
                type="text"
                placeholder="Optional message (e.g. 'Need slides from lecture 5')"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-violet/40 mb-4"
              />

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl border border-border text-muted hover:text-foreground transition-colors text-sm"
                >
                  Skip
                </button>
                <button
                  onClick={handleSend}
                  disabled={sendTo === "specific" && classmates.length === 0}
                  className="flex-1 px-4 py-3 rounded-xl bg-violet text-white font-semibold btn-pulse text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  🔔 Send Note Request
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10 px-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                className="text-5xl mb-4"
              >
                ✅
              </motion.div>
              <p className="text-lg font-semibold text-foreground mb-2">
                Request sent as <span className="anon-alias-badge">{alias}</span>
              </p>
              <p className="text-sm text-muted">
                You&apos;ll be notified when notes are uploaded.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
