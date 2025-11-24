"use client";


export default function SendItFastLoader() {
  return (
    <div className="fixed inset-0 z-50 flex h-screen w-full flex-col items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center">
          <svg
            className="h-20 w-20 animate-[spin_0.6s_linear_infinite]"
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
              strokeWidth="3"
              strokeLinecap="butt"
              strokeDasharray="90 180"
              fill="none"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
