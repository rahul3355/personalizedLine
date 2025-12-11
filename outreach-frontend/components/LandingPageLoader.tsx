/**
 * LandingPageLoader - A sleek black loading spinner for public pages
 * Features a minimalist design with smooth animations
 */

export default function LandingPageLoader() {
    return (
        <div className="fixed inset-0 z-50 flex h-screen w-full flex-col items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-8">
                {/* Animated dots loader */}
                <div className="flex items-center gap-2">
                    <div
                        className="h-3 w-3 rounded-full bg-gray-900 animate-[bounce_1s_ease-in-out_infinite]"
                        style={{ animationDelay: '0ms' }}
                    />
                    <div
                        className="h-3 w-3 rounded-full bg-gray-900 animate-[bounce_1s_ease-in-out_infinite]"
                        style={{ animationDelay: '150ms' }}
                    />
                    <div
                        className="h-3 w-3 rounded-full bg-gray-900 animate-[bounce_1s_ease-in-out_infinite]"
                        style={{ animationDelay: '300ms' }}
                    />
                </div>
            </div>

            <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-12px);
          }
        }
      `}</style>
        </div>
    );
}
