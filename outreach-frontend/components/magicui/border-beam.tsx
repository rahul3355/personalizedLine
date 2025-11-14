import { cn } from "@/lib/utils";
import { motion, type Transition } from "framer-motion";
import { CSSProperties } from "react";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  transition?: Transition;
  style?: CSSProperties;
  reverse?: boolean;
  initialOffset?: number;
}

export function BorderBeam({
  className,
  size = 50,
  duration = 6,
  delay = 0,
  reverse = false,
  initialOffset = 0,
  transition,
  style,
}: BorderBeamProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent",
        "[mask-clip:padding-box,border-box] [mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]",
        className
      )}
    >
      <motion.div
        className={cn(
          "absolute aspect-square bg-gradient-to-l",
          className
        )}
        style={{
          width: `${size}px`,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
          ...style,
        }}
        initial={{
          offsetDistance: `${initialOffset}%`,
        }}
        animate={{
          offsetDistance: reverse
            ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
            : [`${initialOffset}%`, `${100 + initialOffset}%`],
        }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration,
          delay: -delay,
          ...transition,
        }}
      />
    </div>
  );
}
