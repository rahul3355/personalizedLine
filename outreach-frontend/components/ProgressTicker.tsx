"use client";

export type JobActivityMessage = {
  glyph: string;
  verb: string;
  subject: string;
  detail?: string;
  row?: number | null;
  email?: string | null;
};

export type ProgressMessage = JobActivityMessage | string | null | undefined;

export function isJobActivityMessage(
  message: ProgressMessage
): message is JobActivityMessage {
  return Boolean(
    message &&
    typeof message === "object" &&
    "glyph" in message &&
    "verb" in message &&
    "subject" in message
  );
}

const BRAND_COLOR = "#4F55F1";
const FALLBACK_LINES = [
  "Calibrating personalization engine",
  "Syncing lead intelligence buffers",
  "Queuing signal extractors",
  "Re-indexing outreach playbooks",
];

function formatPercent(value: number) {
  const bounded = Math.max(0, Math.min(100, value));
  const rounded = Math.round(bounded * 10) / 10;
  return Number.isInteger(rounded) ? `${Math.trunc(rounded)}%` : `${rounded.toFixed(1)}%`;
}

function pickFallbackDetail(percentLabel: string, legacy: string | null) {
  if (legacy) {
    return legacy;
  }
  const numeric = parseInt(percentLabel, 10);
  const index = Number.isNaN(numeric) ? 0 : numeric % FALLBACK_LINES.length;
  return FALLBACK_LINES[index];
}

interface ProgressTickerProps {
  percent?: number | null;
  message?: ProgressMessage;
  className?: string;
}

export default function ProgressTicker({
  percent,
  message,
  className,
}: ProgressTickerProps) {
  if (typeof percent !== "number") {
    return null;
  }

  const percentLabel = formatPercent(percent);
  const activity = isJobActivityMessage(message) ? message : null;
  const legacyDetail =
    typeof message === "string"
      ? message.trim() && !message.trim().toLowerCase().startsWith("global progress")
        ? message.trim()
        : null
      : null;

  const glyph = activity?.glyph ?? "⋆";
  const verb = activity?.verb ?? "Processing…";
  const subject = activity?.subject ?? "Lead pipeline";
  const detail = activity?.detail ?? pickFallbackDetail(percentLabel, legacyDetail);

  return (
    <div
      className={`flex flex-wrap items-center gap-2 text-xs font-medium ${className ?? ""}`.trim()}
      style={{ color: BRAND_COLOR }}
    >
      <span className="tabular-nums text-sm font-semibold">{percentLabel}</span>
      <span className="flex min-w-0 items-center gap-2 truncate">
        <span className="flex items-center gap-1 whitespace-nowrap text-[11px] uppercase tracking-[0.16em]">
          <span className="text-sm">{glyph}</span>
          <span>{verb}</span>
        </span>
        <span className="min-w-0 truncate text-[12px] normal-case tracking-normal opacity-90">
          {subject}
          {detail ? ` — ${detail}` : ""}
        </span>
      </span>
    </div>
  );
}
