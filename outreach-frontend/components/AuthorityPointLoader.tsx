"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function AuthorityPointLoader() {
  const [progress, setProgress] = useState(0);

  // Simulated loading
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 80); // adjust speed
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-white">
      {/* Fake drawing animation over logo */}
      <div className="relative w-[220px] h-[80px] overflow-hidden">
        <Image
          src="/authoritypoint-logo.png" // put your PNG in /public
          alt="AuthorityPoint Logo"
          fill
          sizes="220px"
          className="object-contain"
        />
        {/* Mask shimmer */}
        <motion.div
          className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{
            duration: 2,
            ease: "easeInOut",
          }}
          style={{ mixBlendMode: "screen" }}
        />
      </div>

      {/* Progress bar */}
      <div className="mt-1 w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
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