"use client";

import SendItFastSpinner from "./SendItFastSpinner";

export default function SendItFastLoader() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6">
        <SendItFastSpinner />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-800 tracking-tight">
            Preparing your SendItFast workspace…
          </p>
        </div>
      </div>
    </div>
  );
}
