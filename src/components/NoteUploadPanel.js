"use client";
import { useState, useRef } from "react";
import { motion } from "framer-motion";

export default function NoteUploadPanel({ requestId, alias, onClose }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const ACCEPTED = ".jpg,.jpeg,.png,.pdf";

  const addFiles = (fileList) => {
    const valid = Array.from(fileList).filter((f) => {
      const ext = f.name.split(".").pop().toLowerCase();
      return ["jpg", "jpeg", "png", "pdf"].includes(ext);
    });
    setFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("requestId", requestId);
    formData.append("alias", alias);
    files.forEach((f) => formData.append("files", f));

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 200);

    try {
      const res = await fetch("/api/anon-notes/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(interval);

      if (res.ok) {
        setProgress(100);
        setTimeout(() => setDone(true), 300);
        setTimeout(() => onClose(), 2500);
      } else {
        clearInterval(interval);
        setUploading(false);
        setProgress(0);
      }
    } catch {
      clearInterval(interval);
      setUploading(false);
      setProgress(0);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
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
        {!done ? (
          <div className="p-5">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-foreground">
                Upload notes as <span className="anon-alias-badge">{alias}</span>
              </h3>
              <p className="text-xs text-muted mt-1">
                JPG, PNG, or PDF · Multiple files allowed
              </p>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`anon-dropzone ${dragOver ? "anon-dropzone-active" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
              <div className="text-3xl mb-2">📁</div>
              <p className="text-sm text-muted">
                Drag & drop files here or <span className="text-violet-light">tap to select</span>
              </p>
            </div>

            {/* Tip */}
            {files.some((f) => f.type.startsWith("image/")) && (
              <p className="text-[11px] text-amber-300/80 mt-2 text-center">
                💡 Tip: Make sure pages are flat and well-lit for best readability
              </p>
            )}

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-2 mt-3 max-h-40 overflow-y-auto">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-border">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm flex-shrink-0">
                        {f.type === "application/pdf" ? "📄" : "🖼️"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{f.name}</p>
                        <p className="text-[10px] text-muted">{formatSize(f.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="text-muted hover:text-danger text-sm ml-2 flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Progress bar */}
            {uploading && (
              <div className="mt-3">
                <div className="w-full h-2 bg-surface-light rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-violet rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-muted text-center mt-1">
                  Uploading... {Math.round(progress)}%
                </p>
              </div>
            )}

            {/* Actions */}
            {!uploading && (
              <div className="flex gap-3 mt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-muted hover:text-foreground transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={files.length === 0}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-violet text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Upload {files.length > 0 ? `(${files.length})` : ""}
                </button>
              </div>
            )}
          </div>
        ) : (
          <motion.div
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
              🎉
            </motion.div>
            <p className="text-lg font-semibold text-foreground mb-2">
              Notes uploaded as <span className="anon-alias-badge">{alias}</span>
            </p>
            <p className="text-sm text-muted">The class thanks you! 🙏</p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
