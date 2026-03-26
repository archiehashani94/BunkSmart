"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function NoteFilesViewer({ requestId, requestAlias, onClose }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fullscreenImg, setFullscreenImg] = useState(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch(`/api/anon-notes/files?requestId=${encodeURIComponent(requestId)}`);
        if (res.ok) {
          const data = await res.json();
          setFiles(data.files || []);
        }
      } catch {}
      setLoading(false);
    };
    fetchFiles();
  }, [requestId]);

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const isImage = (type) => type?.startsWith("image/");
  const isPdf = (type) => type === "application/pdf";

  return (
    <>
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
          className="w-full max-w-lg rounded-2xl border border-border overflow-hidden"
          style={{ background: "rgba(15, 20, 40, 0.98)", maxHeight: "85vh", overflowY: "auto" }}
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Notes for <span className="anon-alias-badge">{requestAlias}</span>
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {files.length} file{files.length !== 1 ? "s" : ""} uploaded
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-muted hover:text-foreground text-xl transition-colors"
              >
                ✕
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center">
                <div className="w-6 h-6 border-2 border-violet border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : files.length === 0 ? (
              <div className="py-8 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-sm text-muted">No files uploaded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {files.map((file, i) => (
                  <motion.div
                    key={file.id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-border bg-surface overflow-hidden"
                  >
                    {/* Image preview */}
                    {isImage(file.type) && (
                      <div
                        className="w-full h-40 bg-background cursor-pointer relative group"
                        onClick={() => setFullscreenImg(file.url)}
                      >
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 text-white text-sm transition-opacity">
                            🔍 Tap to fullscreen
                          </span>
                        </div>
                      </div>
                    )}

                    {/* PDF icon */}
                    {isPdf(file.type) && (
                      <div className="w-full h-24 bg-background flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-3xl">📄</div>
                          <p className="text-xs text-muted mt-1">PDF Document</p>
                        </div>
                      </div>
                    )}

                    {/* File info + download */}
                    <div className="p-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-[10px] text-muted mt-0.5">
                          {formatSize(file.size)} · by{" "}
                          <span className="text-violet-light">{file.uploaderAlias}</span>
                        </p>
                      </div>
                      <a
                        href={file.url}
                        download={file.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-violet/10 border border-violet/20 text-violet-light text-xs font-medium hover:bg-violet/20 transition-colors flex-shrink-0"
                      >
                        ⬇ Download
                      </a>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            <p className="text-[10px] text-muted/60 text-center mt-4">
              All from anonymous classmates. Their identity is protected. 🔒
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Fullscreen image overlay */}
      <AnimatePresence>
        {fullscreenImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setFullscreenImg(null)}
          >
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={fullscreenImg}
              alt="Fullscreen"
              className="max-w-full max-h-full object-contain rounded-xl"
            />
            <button
              className="absolute top-6 right-6 text-white/80 hover:text-white text-2xl"
              onClick={() => setFullscreenImg(null)}
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
