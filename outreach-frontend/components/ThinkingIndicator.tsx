"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const PHRASES = [
  "deliberating possibilities...",
  "conceptualising next step...",
  "synthesising solution vectors...",
  "evaluating heuristic pathways...",
  "formulating service schema...",
  "extrapolating engagement logic...",
  "architecting reasoning flow...",
  "orchestrating inference layers...",
];

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

type JobStatus = "pending" | "in_progress" | "succeeded" | "failed";

interface ThinkingIndicatorProps {
  status: JobStatus;
  progress?: number;
  message?: string | null;
}

export function ThinkingIndicator({ status, progress, message }: ThinkingIndicatorProps) {
  const isActive = status === "pending" || status === "in_progress";
  const isComplete = status === "succeeded" || (typeof progress === "number" && progress >= 100);

  const subject = useMemo(() => {
    if (message) {
      const emailMatch = message.match(EMAIL_REGEX);
      if (emailMatch) {
        return emailMatch[0];
      }
      const trimmed = message.replace(/\s+/g, " ").trim();
      if (trimmed) {
        return trimmed;
      }
    }
    return "processing dataset";
  }, [message]);

  const [typedText, setTypedText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    setPhraseIndex(0);
  }, [subject]);

  useEffect(() => {
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current = [];

    if (!isActive) {
      setTypedText("");
      return;
    }

    let cancelled = false;
    const currentPhrase = PHRASES[phraseIndex % PHRASES.length];
    const fullText = `${subject} — ${currentPhrase}`;
    setTypedText("");

    let charIndex = 0;

    const typeNext = () => {
      if (cancelled) return;

      setTypedText(fullText.slice(0, charIndex + 1));
      charIndex += 1;

      if (charIndex < fullText.length) {
        const timeoutId = window.setTimeout(typeNext, 48 + Math.random() * 32);
        timeoutsRef.current.push(timeoutId);
      } else {
        const holdTimeoutId = window.setTimeout(() => {
          if (cancelled) return;
          const advanceTimeoutId = window.setTimeout(() => {
            if (cancelled) return;
            setPhraseIndex((prev) => (prev + 1) % PHRASES.length);
          }, 120);
          timeoutsRef.current.push(advanceTimeoutId);
        }, 1200);
        timeoutsRef.current.push(holdTimeoutId);
      }
    };

    const startTimeoutId = window.setTimeout(typeNext, 120);
    timeoutsRef.current.push(startTimeoutId);

    return () => {
      cancelled = true;
      timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutsRef.current = [];
    };
  }, [isActive, phraseIndex, subject]);

  if (!isActive && !isComplete) {
    return null;
  }

  return (
    <div className="min-w-0 flex items-center">
      <AnimatePresence mode="wait">
        {isActive ? (
          <motion.span
            key="thinking"
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="flex min-w-0 max-w-[28ch] items-center text-[12px] font-semibold text-[#4F55F1]"
          >
            <span className="pixel-thinking-text truncate whitespace-nowrap">{typedText}</span>
            <span aria-hidden className="pixel-thinking-cursor ml-[3px]">█</span>
          </motion.span>
        ) : isComplete ? (
          <motion.span
            key="complete"
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-[12px] font-bold text-[#4F55F1]"
          >
            Job Complete
          </motion.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default ThinkingIndicator;
