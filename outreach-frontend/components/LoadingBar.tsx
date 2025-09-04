export default function LoadingBar() {
  return (
    <div className="w-full flex justify-center py-4">
      <div className="relative w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-700 to-gray-900 animate-[progress_1.2s_ease-in-out_infinite]" />
      </div>

      <style jsx>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
