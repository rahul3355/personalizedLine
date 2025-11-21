"use client"

import React, { forwardRef, useRef } from "react"
import { cn } from "@/lib/utils"
import { AnimatedBeam } from "@/components/ui/animated-beam"

const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex size-16 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white p-3 shadow-lg",
        className
      )}
    >
      {children}
    </div>
  )
})

Circle.displayName = "Circle"

export function AnimatedBeamVertical({
  className,
}: {
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const researchRef = useRef<HTMLDivElement>(null)
  const linkedinRef = useRef<HTMLDivElement>(null)
  const newsRef = useRef<HTMLDivElement>(null)
  const companyRef = useRef<HTMLDivElement>(null)
  const blogRef = useRef<HTMLDivElement>(null)
  const podcastRef = useRef<HTMLDivElement>(null)
  const youtubeRef = useRef<HTMLDivElement>(null)

  return (
    <div
      className={cn(
        "relative flex h-[600px] w-full items-center justify-center overflow-visible rounded-2xl border border-slate-200 bg-white/50 p-10",
        className
      )}
      ref={containerRef}
    >
      <div className="flex size-full max-h-[500px] flex-col items-stretch justify-between gap-6">
        {/* Left side - Research hub */}
        <div className="flex flex-1 items-center justify-start pl-8">
          <Circle ref={researchRef} className="size-20">
            <div className="text-center">
              <div className="text-xs font-bold text-slate-900">Research</div>
            </div>
          </Circle>
        </div>

        {/* Right side - Data sources */}
        <div className="flex flex-1 flex-col justify-center gap-4 pr-8">
          <Circle ref={linkedinRef} className="ml-auto">
            <span className="text-xs font-semibold text-slate-900">LinkedIn</span>
          </Circle>
          <Circle ref={newsRef} className="ml-auto">
            <span className="text-xs font-semibold text-slate-900">News</span>
          </Circle>
          <Circle ref={companyRef} className="ml-auto">
            <span className="text-xs font-semibold text-slate-900">Company</span>
          </Circle>
          <Circle ref={blogRef} className="ml-auto">
            <span className="text-xs font-semibold text-slate-900">Blog</span>
          </Circle>
          <Circle ref={podcastRef} className="ml-auto">
            <span className="text-xs font-semibold text-slate-900">Podcast</span>
          </Circle>
          <Circle ref={youtubeRef} className="ml-auto">
            <span className="text-xs font-semibold text-slate-900">YouTube</span>
          </Circle>
        </div>
      </div>

      {/* AnimatedBeams - from sources to research */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={linkedinRef}
        toRef={researchRef}
        duration={3}
        curvature={-50}
        gradientStartColor="#0077B5"
        gradientStopColor="#0A66C2"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={newsRef}
        toRef={researchRef}
        duration={3.2}
        curvature={-30}
        gradientStartColor="#FF6B6B"
        gradientStopColor="#C92A2A"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={companyRef}
        toRef={researchRef}
        duration={2.8}
        curvature={-10}
        gradientStartColor="#4C6EF5"
        gradientStopColor="#364FC7"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={blogRef}
        toRef={researchRef}
        duration={3.5}
        curvature={10}
        gradientStartColor="#51CF66"
        gradientStopColor="#2F9E44"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={podcastRef}
        toRef={researchRef}
        duration={3.3}
        curvature={30}
        gradientStartColor="#9775FA"
        gradientStopColor="#7950F2"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={youtubeRef}
        toRef={researchRef}
        duration={3.1}
        curvature={50}
        gradientStartColor="#FF0000"
        gradientStopColor="#CC0000"
      />
    </div>
  )
}
