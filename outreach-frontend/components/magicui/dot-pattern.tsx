import { useId } from "react";
import { cn } from "@/lib/utils";

interface DotPatternProps {
  width?: number;
  height?: number;
  cx?: number;
  cy?: number;
  radius?: number;
  className?: string;
}

export function DotPattern({
  width = 32,
  height = 32,
  cx = 1,
  cy = 1,
  radius = 1,
  className,
}: DotPatternProps) {
  const patternId = useId();

  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      role="presentation"
    >
      <defs>
        <pattern
          id={patternId}
          x="0"
          y="0"
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={cx} cy={cy} r={radius} fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

export default DotPattern;
