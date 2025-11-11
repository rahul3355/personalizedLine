"use client";


export default function SendItFastLoader() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center">
          <svg
            className="h-20 w-20 animate-[spin_1.2s_linear_infinite]"
            viewBox="0 0 48 48"
            fill="none"
            role="img"
            aria-label="SendItFast is loading"
          >
            <circle
              cx="24"
              cy="24"
              r="18"
              stroke="#4F55F1"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="90 180"
              strokeDashoffset="0"
              opacity="0.5"
            />
            <circle
              cx="24"
              cy="24"
              r="18"
              stroke="#4F55F1"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="30 180"
              strokeDashoffset="-45"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-800 tracking-tight">
            Preparing your SendItFast workspace…
          </p>
        </div>
      </div>
    </div>
  );
}
