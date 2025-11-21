"use client"
import { useRouter } from "next/router";
import { useAuth } from "../lib/AuthProvider";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import Image from "next/image"; // Add this import
import InlineLoader from "@/components/InlineLoader";
import Whiteboard from "../assets/whiteboard2.png";
import AppleLogo from "../assets/appleLogo.png";
import NvidiaLogo from "../assets/nvidiaLogo.png";
import McdonaldsLogo from "../assets/mcdLogo.png";
import NikeLogo from "../assets/nikeLogo.png";
import WbLogo from "../assets/wbLogo.png";
import AwsLogo from "../assets/awsLogo.png";
import metaLogo from "../assets/metaLogo.png";
import googleLogo from "../assets/googleLogo.png";
import MicrosoftLogo from "../assets/microsoftLogo.png";
import starbucksLogo from "../assets/starbucksLogo.png";
import AsdaLogo from "../assets/asdaLogo.png";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Lens } from "@/components/ui/lens";
import { AvatarCircles } from "@/components/ui/avatar-circles";
import { cn } from "@/lib/utils";
import { GridPattern } from "@/components/ui/grid-pattern";
import { RainbowButton } from "@/components/ui/rainbow-button";

const avatars = [
  {
    imageUrl: googleLogo.src,
    profileUrl: "https://github.com/dillionverma",
  },
  {
    imageUrl: NvidiaLogo.src,
    profileUrl: "https://github.com/dillionverma",
  },
  {
    imageUrl: AppleLogo.src,
    profileUrl: "https://github.com/tomonarifeehan",
  },
  {
    imageUrl: McdonaldsLogo.src,
    profileUrl: "https://github.com/BankkRoll",
  },
  {
    imageUrl: NikeLogo.src,
    profileUrl: "https://github.com/safethecode",
  },
  {
    imageUrl: AwsLogo.src,
    profileUrl: "https://github.com/sanjay-mali",
  },
  {
    imageUrl: metaLogo.src,
    profileUrl: "https://github.com/itsarghyadas",
  },
  {
    imageUrl: MicrosoftLogo.src,
    profileUrl: "https://github.com/BankkRoll",
  },
  {
    imageUrl: AsdaLogo.src,
    profileUrl: "https://github.com/safethecode",
  },
  {
    imageUrl: WbLogo.src,
    profileUrl: "https://github.com/sanjay-mali",
  },
  {
    imageUrl: starbucksLogo.src,
    profileUrl: "https://github.com/itsarghyadas",
  },
];

export default function Home() {
  const { session, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <InlineLoader />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-600">Please log in to continue</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* Grid Pattern Background - Below content, above white card */}
      <div className="absolute inset-0 overflow-hidden">
        <GridPattern
          width={30}
          height={30}
          x={-1}
          y={-1}
          strokeDasharray={"4 2"}
          className={cn(
            "[mask-image:radial-gradient(800px_circle_at_center,white,transparent)]"
          )}
        />
      </div>

      {/* Two Column Grid - Above pattern */}
      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 pt-20 lg:grid-cols-2 lg:gap-12">
        {/* Left Column - Hero Content */}
        <div className="flex flex-col items-start justify-start space-y-6">
          {/* Headline */}
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-black lg:text-6xl">
            Hours of research, done in seconds
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-gray-600 lg:text-2xl">
            Automated prospect research that writes personalized opening lines for you
          </p>

          {/* CTA Section */}
          <div className="space-y-3">
            <RainbowButton
              onClick={() => router.push("/upload")}
              className="h-12 rounded-full bg-black px-7 text-[15px] font-medium text-white transition-all hover:bg-[#1a1a1a] hover:shadow-lg"
            >
              Upload lead list
              <ArrowRight className="ml-2 h-4 w-4" />
            </RainbowButton>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-black" />
                <p className="text-sm text-black" style={{ fontFamily: 'Times New Roman, serif' }}>
                  No credit card required
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-black" />
                <p className="text-sm text-black" style={{ fontFamily: 'Times New Roman, serif' }}>
                  Spend 500 credits, get 500 credits extra (limited time)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-black" />
                <p className="text-sm text-black" style={{ fontFamily: 'Times New Roman, serif' }}>
                  Preview before full run
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Card */}
        <div className="flex items-start justify-center pt-0">
          <Card className="relative max-w-md border-0 shadow-none">
            <CardHeader className="pb-4">
              <Lens
                zoomFactor={2}
                lensSize={150}
                isStatic={false}
                ariaLabel="Zoom Area"
              >
                <Image
                  src={Whiteboard}
                  alt="SendItFast whiteboard"
                  placeholder="blur"
                  width={500}
                  height={500}
                  className="h-auto w-full"
                />
              </Lens>
            </CardHeader>
            <CardContent className="flex justify-center pt-0">
              <AvatarCircles numPeople={99} avatarUrls={avatars} className="[&_img]:border-2 [&_img]:border-black" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}