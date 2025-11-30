"use client";

interface SendItFastSpinnerProps {
  size?: number | string;
  className?: string;
  ariaLabel?: string;
}

export default function SendItFastSpinner({
  size = 50,
  className = "",
  ariaLabel = "SendItFast is loading",
}: SendItFastSpinnerProps) {
  const dimension = typeof size === "number" ? `${size}px` : size;

  return (
    <svg
      className={`animate-spin text-[#7c3aed] ${className}`.trim()}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="img"
      aria-label={ariaLabel}
      style={{ width: dimension, height: dimension }}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
