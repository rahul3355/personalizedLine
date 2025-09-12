"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check } from "lucide-react";

type Status = "idle" | "processing" | "success";

interface Props {
  disabled?: boolean;
  shineKey?: number;
}

export default function TestStripeButton({ disabled, shineKey }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [shine, setShine] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    if (!disabled && status === "idle" && shineKey) {
      setShine(true);
      const id = setTimeout(() => setShine(false), 1200);
      return () => clearTimeout(id);
    }
  }, [shineKey, disabled, status]);

  const handleClick = () => {
    if (disabled || status !== "idle") return;
    setStatus("processing");
    setTimeout(() => {
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    }, 2500);
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled}
      onMouseDown={() => !disabled && status === "idle" && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onBlur={() => setIsPressed(false)}
      className={`w-56 h-12 rounded-lg flex items-center justify-center text-white font-semibold relative overflow-hidden transition-all
        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-lg"}`}
      style={{
        background:
          status === "success"
            ? "#2ecc71"
            : "linear-gradient(90deg, #0070f3, #0059c9)",
        boxShadow:
          isPressed && status === "idle" && !disabled
            ? "0 0 0 3px rgba(0, 118, 255, 0.6)" // light blue outer border
            : undefined,
      }}
    >
      {/* Shine overlay */}
      {shine && (
  <motion.div
    key={shineKey}
    initial={{ x: "-100%" }}
    animate={{ x: "100%" }}
    transition={{ duration: 0.6, ease: "easeInOut" }} // faster
    className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent" // lighter
  />
)}


      <AnimatePresence mode="wait" initial={false}>
        {status === "idle" && (
          <motion.span
            key="idle"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            Pay
          </motion.span>
        )}
        {status === "processing" && (
          <motion.div
            key="processing"
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span>Processing…</span>
            <Loader2 className="h-4 w-4 animate-spin" />
          </motion.div>
        )}
        {status === "success" && (
          <motion.div
            key="success"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Check className="h-6 w-6 text-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
