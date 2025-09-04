"use client";

import { motion } from "framer-motion";

interface UploadProgressProps {
  step: number; // 1, 2, or 3
}

export default function UploadProgress({ step }: UploadProgressProps) {
  const steps = ["Upload File", "Confirm Headers", "Confirm Service"];

  return (
    <div className="flex items-center justify-center space-x-8 mb-8">
      {steps.map((label, index) => {
        const current = index + 1;
        const isActive = current === step;
        const isCompleted = current < step;

        return (
          <div key={index} className="flex items-center space-x-2">
            {/* Circle */}
            <motion.div
              className={`w-8 h-8 flex items-center justify-center rounded-full border-2
                ${isCompleted ? "border-green-500 bg-green-500 text-white" : ""}
                ${isActive ? "border-blue-500 bg-blue-100 text-blue-700" : ""}
                ${!isCompleted && !isActive ? "border-gray-300 bg-white text-gray-400" : ""}
              `}
              animate={isActive ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.6, repeat: isActive ? Infinity : 0 }}
            >
              {isCompleted ? "✓" : current}
            </motion.div>

            {/* Label */}
            <span
              className={`text-sm font-medium ${
                isCompleted ? "text-green-600" : isActive ? "text-blue-600" : "text-gray-500"
              }`}
            >
              {label}
            </span>

            {/* Connector */}
            {index < steps.length - 1 && (
              <div
                className={`w-16 h-1 rounded-full ${
                  isCompleted ? "bg-green-500" : isActive ? "bg-blue-400 animate-pulse" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
