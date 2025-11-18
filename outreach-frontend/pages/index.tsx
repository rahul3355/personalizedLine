import { useRouter } from "next/router";
import { useAuth } from "../lib/AuthProvider";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Check } from "lucide-react";
import InlineLoader from "@/components/InlineLoader";

export default function Home() {
  const { session, loading } = useAuth();
  const router = useRouter();

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

  const handleStartFree = () => {
    router.push("/upload");
  };

  const handleSeeHowItWorks = () => {
    // Scroll to a how it works section if exists, or show modal/drawer
    // For now, just scroll to bottom or navigate
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 pt-12 pb-24">
      {/* Hero Section */}
      <div className="text-center space-y-8">
        {/* Headline */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 max-w-4xl mx-auto">
            Turn your lead list into{" "}
            <span className="text-[#4F55F1]">booked meetings</span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Upload CSV, get research-backed personalized openers in minutes
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button
            onClick={handleStartFree}
            size="lg"
            className="bg-[#4F55F1] hover:bg-[#3D42D8] text-white px-8 py-6 text-base font-medium shadow-sm hover:shadow-md transition-all"
          >
            Start Free (500 rows)
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          
          <Button
            onClick={handleSeeHowItWorks}
            variant="outline"
            size="lg"
            className="px-8 py-6 text-base font-medium border-gray-300 hover:bg-gray-50 transition-all"
          >
            <Play className="mr-2 h-4 w-4" />
            See How It Works
          </Button>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            <span>500 free rows</span>
          </div>
        </div>
      </div>
    </div>
  );
}
