"use client";

interface SendItFastSpinnerProps {
  size?: number | string;
  className?: string;
  ariaLabel?: string;
}

export default function SendItFastSpinner({
  size = 80,
  className = "",
  ariaLabel = "SendItFast is loading",
}: SendItFastSpinnerProps) {
  const dimension = typeof size === "number" ? `${size}px` : size;

  return (
    <svg
      className={`animate-[spin_0.6s_linear_infinite] ${className}`.trim()}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label={ariaLabel}
      style={{ width: dimension, height: dimension }}
    >
      <circle
        cx="24"
        cy="24"
        r="18"
        stroke="#4F55F1"
        strokeWidth="3"
        strokeLinecap="butt"
        strokeDasharray="90 180"
        fill="none"
      />
    </svg>
  );
}
