"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NoteUploadPanel from "./NoteUploadPanel";
import NoteFilesViewer from "./NoteFilesViewer";

export default function ClassNotesBoard({ subjectId, myAlias }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`/api/anon-notes?subjectId=${encodeURIComponent(subjectId)}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch {}
    setLoading(false);
  }, [subjectId]);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 8000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="glow-card stat-glow p-10 text-center rounded-2xl">
        <div className="w-6 h-6 border-2 border-violet border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="glow-card stat-glow p-10 text-center rounded-2xl">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm text-muted leading-relaxed">No note requests yet for this class.</p>
          </div>
        ) : (
          requests.map((req, i) => {
            const isMine = req.alias === myAlias;
            const hasUploads = req.uploads > 0;

            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glow-card stat-glow p-5 md:p-6 rounded-2xl transition-all relative max-w-xl mx-auto w-full text-center ${
                  isMine ? "border-violet/40 shadow-lg shadow-violet/5" : ""
                }`}
              >
                {isMine && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] bg-violet/20 text-violet-light border border-violet/30">
                    Your request
                  </span>
                )}

                <div className="flex flex-col items-center gap-2 mb-2 pt-1">
                  <span className="text-lg">🕵️</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      <span className="anon-alias-badge">{req.alias}</span> needs notes
                    </p>
                    <p className="text-xs text-muted mt-0.5">{formatDate(req.date)}</p>
                  </div>

                  {hasUploads && (
                    <span className="anon-upload-badge mt-1">
                      📎 {req.uploads} upload{req.uploads !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  {!isMine && (
                    <button
                      type="button"
                      onClick={() => setUploadTarget(req)}
                      className="min-w-[200px] max-w-full px-4 py-2.5 rounded-xl bg-violet/10 border border-violet/20 text-violet-light text-xs font-medium hover:bg-violet/20 transition-colors"
                    >
                      📤 Upload notes for this request
                    </button>
                  )}
                  {hasUploads && (
                    <button
                      type="button"
                      onClick={() => setViewTarget(req)}
                      className="min-w-[160px] max-w-full px-4 py-2.5 rounded-xl bg-cyan/10 border border-cyan/20 text-cyan-light text-xs font-medium hover:bg-cyan/20 transition-colors"
                    >
                      👀 View notes
                      {isMine && hasUploads && (
                        <span className="ml-1.5 inline-flex w-2 h-2 rounded-full bg-safe animate-pulse" />
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {uploadTarget && (
          <NoteUploadPanel
            requestId={uploadTarget.id}
            alias={myAlias}
            onClose={() => {
              setUploadTarget(null);
              fetchRequests();
            }}
          />
        )}
      </AnimatePresence>

      {/* Files Viewer Modal */}
      <AnimatePresence>
        {viewTarget && (
          <NoteFilesViewer
            requestId={viewTarget.id}
            requestAlias={viewTarget.alias}
            onClose={() => setViewTarget(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
