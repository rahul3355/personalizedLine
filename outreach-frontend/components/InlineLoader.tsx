"use client";

import Image from "next/image";
import SendItFastSpinner from "./SendItFastSpinner";
import { FaRegLightbulb } from "react-icons/fa";

export default function InlineLoader() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-6 py-20">
      <SendItFastSpinner size={64} />
    </div>
  );
}