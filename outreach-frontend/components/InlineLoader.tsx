"use client";

import Image from "next/image";
import SendItFastSpinner from "./SendItFastSpinner";
import { FaRegLightbulb } from "react-icons/fa";

export default function InlineLoader() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-6 py-20">
      
      <SendItFastSpinner size={64} />
      <p className="flex items-center gap-2 text-sm font-bold text-gray-700">
        <FaRegLightbulb />
        <span>Include a case study in P.S. line</span>
      </p>
    </div>
  );
}