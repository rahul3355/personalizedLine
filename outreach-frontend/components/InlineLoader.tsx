"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function InlineLoader() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full py-20">
      {/* Logo */}
      <div className="relative w-[160px] h-[40px] mb-4">
        <Image
          src="/logo.png"
          alt="SendItFast Logo"
          fill
          className="object-contain"
        />
        {/* Shimmer sweep */}
        <motion.div
          className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
          style={{ mixBlendMode: "screen" }}
        />
      </div>

      {/* Progress bar */}
      <div className="w-56 h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-black"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "easeInOut", duration: 0.3 }}
        />
      </div>
    </div>
  );
}
