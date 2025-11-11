"use client";

import Image from "next/image";
import SendItFastSpinner from "./SendItFastSpinner";

export default function InlineLoader() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-6 py-20">
      {/* Logo */}
      <div className="relative mb-2 h-[40px] w-[160px]">
        <Image
          src="/logo.png"
          alt="SendItFast Logo"
          fill
          className="object-contain"
        />
      </div>
      <SendItFastSpinner size={64} />
      <p className="text-sm font-medium text-gray-700">
        Loading your SendItFast workspace…
      </p>
    </div>
  );
}
