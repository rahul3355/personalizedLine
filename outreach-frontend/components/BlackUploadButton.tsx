"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check } from "lucide-react";

type Status = "idle" | "processing" | "success";

interface BlackUploadButtonProps {
  onProceed: () => Promise<boolean> | void;
  disabled?: boolean;
  loading?: boolean;
  showArrow?: boolean; // <--- add this
}


export default function BlackUploadButton({
  onProceed,
  disabled = false,
  loading = false,
  showArrow = false, // <--- add this
}: BlackUploadButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [shine, setShine] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Shine once when button becomes enabled and idle
  useEffect(() => {
    if (!disabled && status === "idle") {
      setShine(true);
      const id = setTimeout(() => setShine(false), 800);
      return () => clearTimeout(id);
    }
  }, [disabled, status]);

  // Re-shine every 3s when hovered
  useEffect(() => {
    if (!hovered || disabled || status !== "idle") return;
    const interval = setInterval(() => {
      setShine(true);
      setTimeout(() => setShine(false), 800);
    }, 3000);
    return () => clearInterval(interval);
  }, [hovered, disabled, status]);

  const handleClick = async () => {
    if (disabled || status === "processing") return;
    setStatus("processing");
    try {
      const result = await onProceed();
      if (result === true) {
        setStatus("success");
        // Show success briefly, then reset
        setTimeout(() => setStatus("idle"), 800);
      } else {
        setStatus("idle");
      }
    } catch {
      setStatus("idle");
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled || status === "processing"}
      className={`mt-6 w-full h-12 rounded-lg flex items-center justify-center font-semibold relative overflow-hidden transition-all duration-300
  ${disabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-xl"}`}
style={{
  background:
    status === "success"
      ? "#2ecc71"
      : hovered
      ? "linear-gradient(to bottom, #4a4a4a, #2a2a2a)" // darker on hover
      : "linear-gradient(to bottom, #3a3a3a, #1c1c1c)",
  boxShadow: hovered
    ? "0 4px 12px rgba(0,0,0,0.6)" // deeper shadow on hover
    : "0 2px 6px rgba(0,0,0,0.5)",
  color: "#fff",
  borderTop: status !== "success" ? "1px solid rgba(255,255,255,0.1)" : undefined,
  borderBottom: status !== "success" ? "1px solid rgba(0,0,0,0.4)" : undefined,
}}

    >
      {/* Shine overlay */}
      {shine && (
        <motion.div
          key={status + Math.random()}
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
        />
      )}

      <AnimatePresence mode="wait" initial={false}>
        {status === "processing" ? (
          <motion.div
            key="processing"
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span>Processing…</span>
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          </motion.div>
        ) : status === "success" ? (
          <motion.div
            key="success"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Check className="h-6 w-6 text-white" />
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <span>Proceed</span>

          </motion.div>

        )}
      </AnimatePresence>
      {showArrow && status === "idle" && (
        <motion.div
  key="arrow"
  animate={{
    opacity: [1, 0.2, 1],
    x: hovered ? [0, 4, 0] : 0, // move back & forth only when hovered
  }}
  transition={{
    duration: hovered ? 0.8 : 1,
    repeat: Infinity,
    ease: "easeInOut",
  }}
  style={{ display: "flex", alignItems: "center", marginLeft: "8px" }}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 12h12" />
    <path d="M12 6l6 6-6 6" />
  </svg>
</motion.div>

      )}

    </motion.button>
  );
}
