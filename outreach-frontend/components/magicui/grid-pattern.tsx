import { useId } from "react";
import { cn } from "@/lib/utils";

interface GridPatternProps {
  width?: number;
  height?: number;
  strokeWidth?: number;
  x?: number;
  y?: number;
  className?: string;
}

export function GridPattern({
  width = 48,
  height = 48,
  strokeWidth = 1,
  x = 0,
  y = 0,
  className,
}: GridPatternProps) {
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
          x={x}
          y={y}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${width} 0 V ${height} H 0`}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

export default GridPattern;
