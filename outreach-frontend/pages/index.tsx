import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../lib/AuthProvider";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import InlineLoader from "@/components/InlineLoader";

export default function Home() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [underlinePlayed, setUnderlinePlayed] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <InlineLoader />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-lg font-medium text-gray-700">
          Please log in to continue
        </h1>
      </div>
    );
  }

  useEffect(() => {
    setUnderlinePlayed(true);
  }, []);

  const handleStartFree = () => {
    router.push("/upload");
  };

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-8 pt-16 pb-24">
      {/* Hero Section - Following shadcn 8pt grid system */}
      <div className="text-center space-y-8">
        {/* Headline - Times New Roman, bold, all black */}
        <h1
          className="text-5xl sm:text-6xl lg:text-7xl font-normal text-black max-w-4xl mx-auto leading-tight tracking-tight"
          style={{ fontFamily: '"Aeonik Pro", "Aeonik", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
        >
          Turn your leads into{" "}
          <span className="relative inline-block px-1">
            <span className="relative z-10">well-researched</span>
            {[0, 1, 2].map((stroke) => (
              <span
                key={stroke}
                aria-hidden="true"
                className={`underline-stroke stroke-${stroke + 1} ${
                  underlinePlayed ? "animate-marker-stroke" : ""
                }`}
                style={{
                  animationDelay: underlinePlayed ? `${stroke * 0.35}s` : undefined,
                }}
              />
            ))}
          </span>{" "}
          emails
        </h1>

        {/* CTA Button - shadcn default black theme, centered, interactive */}
        <div className="flex items-center justify-center pt-8">
          <div className="relative inline-flex group">
            <Button
              onClick={handleStartFree}
              size="lg"
              variant="default"
              className="relative rounded-full h-11 px-8 py-2.5 text-sm font-medium shadow-sm bg-black text-white hover:bg-black/90 hover:shadow-md transition-all duration-200 active:scale-[0.98] active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 z-10"
            >
              <span className="inline-flex items-center">
                Start Free (500 credits)
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 group-active:translate-x-0.5" />
              </span>
            </Button>
            <span 
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-dashed border-black opacity-0 transition-all duration-300 group-hover:opacity-100"
              style={{
                top: '-4px',
                left: '-4px',
                right: '-4px',
                bottom: '-4px',
              }}
            />
          </div>
        </div>

        {/* Trust Indicator - Times New Roman, all black */}
        <div className="flex items-center justify-center gap-2 pt-4">
          <Check className="h-4 w-4 text-black" />
          <span 
            className="text-sm text-black"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            No credit card required
          </span>
        </div>
      </div>
      <style jsx>{`
        .underline-stroke {
          position: absolute;
          left: 0;
          right: 0;
          transform: scaleX(0);
          transform-origin: left;
          border-radius: 2px;
          background-image: linear-gradient(
              90deg,
              rgba(255, 235, 59, 0.95),
              rgba(255, 220, 0, 0.95),
              rgba(255, 245, 80, 0.9)
            ),
            repeating-linear-gradient(
              -45deg,
              rgba(255, 255, 255, 0.15) 0,
              rgba(255, 255, 255, 0.15) 2px,
              transparent 2px,
              transparent 4px
            );
          filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.2));
          mix-blend-mode: multiply;
          opacity: 0.55;
        }

        .stroke-1 {
          bottom: 0.02em;
          height: 0.18em;
          transform-origin: left;
        }

        .stroke-2 {
          bottom: -0.01em;
          height: 0.16em;
          opacity: 0.88;
          transform-origin: right;
        }

        .stroke-3 {
          bottom: -0.04em;
          height: 0.14em;
          opacity: 0.85;
          transform-origin: left;
        }

        .animate-marker-stroke {
          animation: markerStroke 1.8s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
        }

        @keyframes markerStroke {
          0% {
            transform: scaleX(0);
          }
          70% {
            transform: scaleX(1.02);
          }
          100% {
            transform: scaleX(1);
          }
        }
      `}</style>
    </div>
  );
}
