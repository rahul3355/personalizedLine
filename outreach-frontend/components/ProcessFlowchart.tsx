import React from "react";
import { Upload, Brain, FileText, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlowStep {
  icon: React.ElementType;
  title: string;
  description: string;
}

const steps: FlowStep[] = [
  {
    icon: Upload,
    title: "Upload CSV",
    description: "Drop your prospect list",
  },
  {
    icon: Brain,
    title: "AI Research",
    description: "Real-time web analysis",
  },
  {
    icon: FileText,
    title: "Get Results",
    description: "Personalized opening lines",
  },
];

export function ProcessFlowchart() {
  return (
    <div className="w-full py-20">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-semibold text-center text-black mb-16">
          How It Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 relative">
          {/* Connection lines for desktop */}
          <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative">
                {/* Vertical connector for mobile */}
                {index < steps.length - 1 && (
                  <div className="md:hidden absolute left-1/2 top-32 -translate-x-1/2 w-0.5 h-8 bg-gray-300" />
                )}

                <div className="relative flex flex-col items-center text-center group">
                  {/* Step number */}
                  <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-black text-white text-xs font-semibold flex items-center justify-center z-10">
                    {index + 1}
                  </div>

                  {/* Icon container */}
                  <div className="relative w-32 h-32 rounded-2xl border-2 border-gray-200 bg-white flex items-center justify-center mb-6 transition-colors group-hover:bg-gray-50">
                    <Icon className="w-12 h-12 text-black" strokeWidth={1.5} />
                  </div>

                  {/* Text content */}
                  <h3 className="text-xl font-semibold text-black mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {step.description}
                  </p>
                </div>

                {/* Arrow for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden md:flex absolute -right-6 top-16 -translate-y-1/2 text-gray-400">
                    <ArrowRight className="w-8 h-8" strokeWidth={1.5} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
