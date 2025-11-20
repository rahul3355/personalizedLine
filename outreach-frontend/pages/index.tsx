import { useRouter } from "next/router";
import Image from "next/image";
import { useAuth } from "../lib/AuthProvider";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, FileText, Rocket, Sparkles, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import InlineLoader from "@/components/InlineLoader";
import { GridPattern } from "@/components/magicui/grid-pattern";
import { DotPattern } from "@/components/magicui/dot-pattern";

export default function Home() {
  const { session, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <InlineLoader />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <h1 className="text-lg font-medium text-gray-700">Please log in to continue</h1>
      </div>
    );
  }

  const quickActions = [
    {
      title: "Upload a file",
      description: "Map columns and queue the next outbound run in minutes.",
      icon: FileText,
      action: () => router.push("/upload"),
    },
    {
      title: "Track recent jobs",
      description: "Stay close to research speed and export availability.",
      icon: Sparkles,
      action: () => router.push("/jobs"),
    },
    {
      title: "Check credits",
      description: "See what has been used before you trigger the next wave.",
      icon: ShieldCheck,
      action: () => router.push("/billing"),
    },
  ];

  const loopHighlights = [
    {
      title: "Signals captured",
      detail: "Company and persona intel is lined up before writing begins.",
    },
    {
      title: "Tone stays guarded",
      detail: "Templates keep copy tight without revealing outputs on-screen.",
    },
    {
      title: "Exports stay clean",
      detail: "CSV/XLSX arrive formatted for a direct CRM handoff.",
    },
  ];

  const flow = [
    {
      title: "Ingest",
      detail: "Drop a CSV/XLSX and align the fields that matter.",
      icon: FileText,
    },
    {
      title: "Research",
      detail: "Parallel signals build context without leaking copy.",
      icon: Sparkles,
    },
    {
      title: "Compose",
      detail: "Guardrails hold tone and structure steady while drafts compile.",
      icon: ShieldCheck,
    },
    {
      title: "Release",
      detail: "Exports unlock for download once checks pass.",
      icon: Rocket,
    },
  ];

  const logos = [
    {
      name: "NVIDIA",
      logo: "https://cdn.simpleicons.org/nvidia/cccccc",
      colorLogo: "https://cdn.simpleicons.org/nvidia",
    },
    {
      name: "Salesforce",
      logo: "https://cdn.simpleicons.org/salesforce/cccccc",
      colorLogo: "https://cdn.simpleicons.org/salesforce",
    },
    {
      name: "Apple",
      logo: "https://cdn.simpleicons.org/apple/cccccc",
      colorLogo: "https://cdn.simpleicons.org/apple",
    },
    {
      name: "Nike",
      logo: "https://cdn.simpleicons.org/nike/cccccc",
      colorLogo: "https://cdn.simpleicons.org/nike",
    },
    {
      name: "Cloudflare",
      logo: "https://cdn.simpleicons.org/cloudflare/cccccc",
      colorLogo: "https://cdn.simpleicons.org/cloudflare",
    },
    {
      name: "Asda",
      logo: "https://cdn.simpleicons.org/asda/cccccc",
      colorLogo: "https://cdn.simpleicons.org/asda",
    },
    {
      name: "Etihad Airways",
      logo: "https://cdn.simpleicons.org/etihadairways/cccccc",
      colorLogo: "https://cdn.simpleicons.org/etihadairways",
    },
    {
      name: "Meta",
      logo: "https://cdn.simpleicons.org/meta/cccccc",
      colorLogo: "https://cdn.simpleicons.org/meta",
    },
    {
      name: "Electronic Arts",
      logo: "https://cdn.simpleicons.org/ea/cccccc",
      colorLogo: "https://cdn.simpleicons.org/ea",
    },
    {
      name: "Axis Bank",
      logo: "https://cdn.simpleicons.org/axisbank/cccccc",
      colorLogo: "https://cdn.simpleicons.org/axisbank",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-slate-900">
      <div className="absolute inset-0 text-slate-100">
        <GridPattern className="opacity-70" strokeWidth={0.7} width={64} height={64} />
        <DotPattern className="opacity-30" width={36} height={36} radius={0.8} />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-14 lg:px-10 lg:py-16">
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-slate-900" />
              Research-first composer
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-[1.05] text-slate-900 sm:text-5xl lg:text-6xl">
                Outreach that feels researched before you ever send
              </h1>
              <p className="max-w-2xl text-lg text-slate-700">
                Keep every run grounded in real signals while the UI stays clean, private, and ready for the next upload.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button
                onClick={() => router.push("/upload")}
                size="lg"
                className="h-12 rounded-full bg-slate-900 px-6 text-base font-semibold text-white transition-colors hover:bg-slate-700"
              >
                Start a new upload
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 rounded-full border-slate-300 bg-white px-6 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                onClick={() => router.push("/jobs")}
              >
                View current runs
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {loopHighlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <p className="text-base font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-2 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-white" />
            <DotPattern className="text-slate-200" width={28} height={28} radius={1} />
            <div className="relative space-y-6 p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600">Run overview</p>
                <div className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700">Private view</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {["Uploads ready", "Research syncing", "Exports queued", "Compliance on"]
                  .map((label) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100"
                    >
                      <Check className="h-4 w-4" />
                      {label}
                    </div>
                  ))}
              </div>
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                  <span>Upcoming unlocks</span>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white">Quiet mode</span>
                </div>
                <div className="space-y-3">
                  {["Signals", "Drafts", "Exports"].map((stage, idx) => (
                    <div key={stage} className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <span>{stage}</span>
                        <span className="text-xs font-semibold text-slate-500">Stage {idx + 1}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-slate-900"
                          style={{ width: `${[76, 64, 48][idx]}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
                  Outputs stay hidden until you export.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="relative overflow-hidden border border-slate-200 bg-white/80">
            <DotPattern className="text-slate-100" width={40} height={40} radius={1} />
            <CardHeader className="relative space-y-2">
              <CardTitle className="text-2xl font-semibold text-slate-900">Action hub</CardTitle>
              <CardDescription className="text-base text-slate-700">
                Minimal controls to move files, watch queues, and keep billing predictable.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative grid gap-4 md:grid-cols-3">
              {quickActions.map(({ title, description, icon: Icon, action }) => (
                <div
                  key={title}
                  className="group rounded-2xl border border-slate-200 bg-white/70 p-4 transition-colors hover:bg-slate-100"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-lg font-semibold text-slate-900">{title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{description}</p>
                  <Button
                    variant="link"
                    className="mt-3 px-0 text-sm font-semibold text-slate-900 hover:no-underline"
                    onClick={action}
                  >
                    Open <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border border-slate-200 bg-white/80">
            <GridPattern className="text-slate-100" width={56} height={56} strokeWidth={0.8} />
            <CardHeader className="relative space-y-2">
              <CardTitle className="text-2xl font-semibold text-slate-900">Flow chart</CardTitle>
              <CardDescription className="text-base text-slate-700">
                A simple map from file upload to export, keeping the suspense until you release it.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-5">
              <div className="space-y-4">
                {flow.map(({ title, detail, icon: Icon }, idx) => (
                  <div key={title} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-900">
                        <Icon className="h-5 w-5" />
                      </div>
                      {idx < flow.length - 1 && (
                        <div className="mt-2 h-10 w-px bg-slate-200" aria-hidden />
                      )}
                    </div>
                    <div className="flex-1 rounded-2xl border border-slate-200 bg-white/80 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-base font-semibold text-slate-900">{title}</p>
                        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Step {idx + 1}</span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                Progress only unlocks when you choose—no sample lines shown in the UI.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="relative overflow-hidden border border-slate-200 bg-white/80">
            <GridPattern className="text-slate-100" width={60} height={60} strokeWidth={0.8} />
            <CardHeader className="relative space-y-2">
              <CardTitle className="text-2xl font-semibold text-slate-900">Operational blocks</CardTitle>
              <CardDescription className="text-base text-slate-700">
                Small tiles that keep the experience focused on action, not noise.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative grid gap-4 lg:grid-cols-3">
              {["Research coverage", "Tone control", "Delivery window", "Domain safety", "CRM ready", "Usage clarity"].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100"
                >
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border border-slate-200 bg-white/80">
            <DotPattern className="text-slate-100" width={34} height={34} radius={0.9} />
            <CardHeader className="relative space-y-2">
              <CardTitle className="text-2xl font-semibold text-slate-900">Received positive replies from:</CardTitle>
              <CardDescription className="text-base text-slate-700">
                Recognizable names that responded after seeing personalized outreach.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {logos.map((brand) => (
                  <div
                    key={brand.name}
                    className="group flex h-16 items-center justify-center rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 transition-colors hover:bg-slate-100"
                  >
                    <div className="relative flex h-10 w-full items-center justify-center">
                      <Image
                        src={brand.logo}
                        alt={`${brand.name} monochrome logo`}
                        className="h-10 w-auto object-contain transition-opacity duration-200 group-hover:opacity-0"
                        width={120}
                        height={40}
                      />
                      <Image
                        src={brand.colorLogo}
                        alt={`${brand.name} logo`}
                        className="absolute h-10 w-auto object-contain opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        width={120}
                        height={40}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {["“Replies show up faster when the research is obvious.”", "“Exports stay tidy, so moving to CRM is painless.”"]
                  .map((quote) => (
                    <div key={quote} className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm leading-relaxed text-slate-800">
                      {quote}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
