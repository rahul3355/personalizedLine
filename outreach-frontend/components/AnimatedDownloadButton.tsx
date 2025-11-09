"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, Check } from "lucide-react";

interface Props {
  onDownload: () => Promise<void>;
}

export default function AnimatedDownloadButton({ onDownload }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  const handleClick = async () => {
    if (status !== "idle") return;

    // Optimistically show done state immediately
    setStatus("done");

    try {
      // Start download in background
      await onDownload();
      // Keep done state for 2s
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      // Revert to idle if download fails
      setStatus("idle");
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center justify-center gap-2 px-6 py-2 rounded-full font-medium text-white text-sm shadow-sm transition-all duration-300 relative overflow-hidden"
      style={{
        background: "linear-gradient(#5a5a5a, #1c1c1c)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </motion.div>
        )}

        {status === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Preparing…</span>
          </motion.div>
        )}

        {status === "done" && (
          <motion.div
            key="done"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-emerald-400"
          >
            <Check className="h-4 w-4" />
            <span>Started</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
