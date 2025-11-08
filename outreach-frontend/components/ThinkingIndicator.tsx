"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const PHRASES = [
  "deducting credits in supabase.meta_json...",
  "downloading raw chunk from storage/raw_chunks...",
  "running perform_research on lead dataset...",
  "generating personalized line via OpenAI client...",
  "writing chunk CSV to user/job_id/chunk_X.csv...",
  "logging progress into supabase.job_logs...",
  "merging chunk files into final workbook...",
  "uploading result.xlsx to Supabase storage...",
];

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

type JobStatus = "pending" | "in_progress" | "succeeded" | "failed";

interface ThinkingIndicatorProps {
  status: JobStatus;
  progress?: number;
  message?: string | null;
}

export function ThinkingIndicator({ status, progress, message }: ThinkingIndicatorProps) {
  const isInProgress = status === "in_progress";
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
  const [stepIndex, setStepIndex] = useState(0);
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    setPhraseIndex(0);
  }, [subject]);

  useEffect(() => {
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current = [];

    if (!isInProgress) {
      setTypedText("");
      return;
    }

    let cancelled = false;
    const currentPhrase = PHRASES[phraseIndex % PHRASES.length];
    const fullText = `${subject} — ${currentPhrase}`;
    setTypedText("");

    let charIndex = 0;
    let deleting = false;

    const cycle = () => {
      if (cancelled) return;

      if (!deleting) {
        charIndex += 1;
        setTypedText(fullText.slice(0, charIndex));

        if (charIndex >= fullText.length) {
          const holdTimeoutId = window.setTimeout(() => {
            if (cancelled) return;
            deleting = true;
            const deleteTimeoutId = window.setTimeout(cycle, 18);
            timeoutsRef.current.push(deleteTimeoutId);
          }, 140);
          timeoutsRef.current.push(holdTimeoutId);
          return;
        }
      } else {
        charIndex -= 1;
        setTypedText(fullText.slice(0, Math.max(charIndex, 0)));

        if (charIndex <= 0) {
          const advanceTimeoutId = window.setTimeout(() => {
            if (cancelled) return;
            setPhraseIndex((prev) => (prev + 1) % PHRASES.length);
          }, 60);
          timeoutsRef.current.push(advanceTimeoutId);
          return;
        }
      }

      const delay = deleting
        ? 10 + Math.random() * 10
        : 14 + Math.random() * 12;
      const timeoutId = window.setTimeout(cycle, delay);
      timeoutsRef.current.push(timeoutId);
    };

    const startTimeoutId = window.setTimeout(cycle, 40);
    timeoutsRef.current.push(startTimeoutId);

    return () => {
      cancelled = true;
      timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutsRef.current = [];
    };
  }, [isInProgress, phraseIndex, subject]);

  useEffect(() => {
    if (!isInProgress) {
      setStepIndex(0);
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setStepIndex((prev) => (prev + 1) % 3);
    }, 600);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isInProgress]);

  const stepLabels = useMemo(
    () => [
      "① ingest CSV",
      "② research leads",
      "③ finalize export",
    ],
    []
  );

  if (!isInProgress && !isComplete) {
    return null;
  }

  return (
    <div className="min-w-0 flex items-center">
      <AnimatePresence mode="wait">
        {isInProgress ? (
          <motion.span
            key="thinking"
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="flex min-w-0 max-w-[32ch] items-center gap-2 text-[12px] font-semibold text-[#1D1F33]"
          >
            <motion.span
              key={stepLabels[stepIndex]}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="rounded-md border border-[#4F55F1]/40 px-2 py-[1px] text-[11px] text-[#4F55F1]"
              style={{ fontFamily: '"Consolas","Courier New",monospace' }}
            >
              {stepLabels[stepIndex]}
            </motion.span>
            <span
              className="pixel-thinking-text truncate whitespace-nowrap"
              style={{ fontFamily: '"Consolas","Courier New",monospace' }}
            >
              {typedText}
            </span>
            <span
              aria-hidden
              className="pixel-thinking-cursor"
              style={{ fontFamily: '"Consolas","Courier New",monospace' }}
            >
              █
            </span>
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
