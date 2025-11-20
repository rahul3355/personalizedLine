import { useRouter } from "next/router";
import { useAuth } from "../lib/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  Check,
  FileText,
  Rocket,
  ShieldCheck,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  const quickActions = [
    {
      title: "Upload new file",
      description: "Map columns and kick off research from one place.",
      icon: Upload,
      action: () => router.push("/upload"),
    },
    {
      title: "Recent jobs",
      description: "Check progress and revisit completed runs.",
      icon: BarChart3,
      action: () => router.push("/jobs"),
    },
    {
      title: "Credits & billing",
      description: "Review usage and manage your plan.",
      icon: ShieldCheck,
      action: () => router.push("/billing"),
    },
  ];

  const workflow = [
    {
      title: "Upload & map",
      detail: "Drop your CSV/XLSX and align columns to the fields you need.",
      icon: FileText,
    },
    {
      title: "Research in parallel",
      detail: "AI gathers company and persona signals for each row.",
      icon: Sparkles,
    },
    {
      title: "Quality guardrails",
      detail: "Verify domains and keep tone controls in place while writing.",
      icon: ShieldCheck,
    },
    {
      title: "Export instantly",
      detail: "Download clean CSV/XLSX or hand off to your CRM.",
      icon: Rocket,
    },
  ];

  const logos = [
    { name: "Apple", hex: "#111827" },
    { name: "Microsoft", hex: "#2563EB" },
    { name: "Salesforce", hex: "#2563EB" },
    { name: "NVIDIA", hex: "#118d4f" },
    { name: "BlackRock", hex: "#111827" },
    { name: "Citi", hex: "#0c6fbb" },
  ];

  const handleStartFree = () => {
    router.push("/upload");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_1px_1px,#e5e7eb_1px,transparent_0)] [background-size:26px_26px]" />

      <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-12 lg:px-10">
        {/* Hero */}
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              AI-powered lead research • Export-ready
            </div>
            <h1 className="text-4xl leading-[1.05] font-semibold text-slate-900 sm:text-5xl lg:text-6xl">
              Turn your leads into well-researched emails
            </h1>

            <p className="max-w-2xl text-lg text-slate-700">
              Upload, review, and export from one place. Stay focused on the next send while the system assembles context for you.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Button
                onClick={handleStartFree}
                size="lg"
                className="h-12 rounded-full bg-slate-900 px-7 text-base font-semibold text-white transition hover:bg-slate-800"
              >
                <span className="flex items-center">Start a new upload<ArrowRight className="ml-2 h-4 w-4" /></span>
              </Button>
              <Button
                onClick={() => router.push("/upload")}
                variant="ghost"
                size="lg"
                className="h-12 rounded-full bg-white px-7 text-base font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
              >
                Watch product loop
              </Button>
            </div>

            <div className="grid gap-4 rounded-2xl bg-white/90 p-4 shadow-sm backdrop-blur sm:grid-cols-3">
              {[{
                label: "Research surface", value: "Company + persona signals", detail: "Grounded context for every row"
              }, {
                label: "Writing guardrails", value: "Tone + safety controls", detail: "Keep outputs on-brand"
              }, {
                label: "Delivery", value: "Exports ready", detail: "Download CSV/XLSX or sync"
              }].map((item) => (
                <div key={item.label} className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{item.label}</p>
                  <p className="text-xl font-semibold text-slate-900">{item.value}</p>
                  <p className="text-sm text-slate-600">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white via-slate-50 to-white" />
            <Card className="relative overflow-hidden rounded-3xl bg-white/90 shadow-xl">
              <div className="absolute -left-24 -top-24 h-48 w-48 animate-[pulse_6s_ease-in-out_infinite] rounded-full bg-slate-100" />
              <CardHeader className="space-y-2 pb-4">
                <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900">
                  <Wand2 className="h-5 w-5 text-blue-600" />
                  Live control panel
                </CardTitle>
                <CardDescription className="text-base">
                  Watch uploads, research, and exports without leaving the dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {["Research", "Writing", "Exports"].map((stage, idx) => (
                    <div
                      key={stage}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-slate-50 to-white p-4 shadow-sm transition hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900">{stage}</p>
                        <span className="text-xs font-semibold text-emerald-600">Status preview</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 animate-[pulse_5s_ease-in-out_infinite]"
                          style={{ width: `${[80, 70, 60][idx]}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-600">Keep tabs on each stage as jobs complete.</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {["Domain verified", "Deliverability safe"].map((flag) => (
                    <div key={flag} className="flex items-center gap-2 rounded-xl bg-slate-50/80 px-3 py-2 text-sm font-medium text-slate-800">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" /> {flag}
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between bg-slate-50/60">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Next export</p>
                  <p className="text-sm font-semibold text-slate-900">Delivery ETA updates here</p>
                </div>
                <Button size="sm" className="rounded-full bg-slate-900 text-white hover:bg-slate-800">Open job log</Button>
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Action hub */}
        <div className="mt-16 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Control center</p>
              <h2 className="text-2xl font-semibold text-slate-900">Ship outreach with less friction</h2>
            </div>
            <Button variant="ghost" className="rounded-full bg-white/70 text-slate-900 transition hover:bg-slate-50" onClick={handleStartFree}>
              Start new upload
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {quickActions.map(({ title, description, icon: Icon, action }) => (
              <Card
                key={title}
                className="group relative overflow-hidden rounded-2xl bg-white/80 shadow-sm transition hover:bg-slate-50"
              >
                <CardHeader className="space-y-3 pb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/10">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-slate-900">{title}</CardTitle>
                  <CardDescription className="text-sm text-slate-600">{description}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="link" className="px-0 text-slate-900 hover:no-underline" onClick={action}>
                    Go now <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* Workflow */}
        <div className="mt-16 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Product loop</p>
              <h2 className="text-2xl font-semibold text-slate-900">From raw rows to ready-to-send copy</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-medium text-slate-700 shadow-sm">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Parallelized research online
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {workflow.map(({ title, detail, icon: Icon }, idx) => (
              <Card
                key={title}
                className="relative overflow-hidden rounded-2xl bg-white/80 shadow-sm transition hover:bg-slate-50"
              >
                <CardHeader className="space-y-3 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/10">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">Step {idx + 1}</span>
                  </div>
                  <CardTitle className="text-lg font-semibold text-slate-900">{title}</CardTitle>
                  <CardDescription className="text-sm text-slate-600">{detail}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Confidence & testimonials */}
        <div className="mt-16 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="relative overflow-hidden rounded-3xl bg-white/90 shadow-md">
            <div className="absolute -right-10 top-0 h-32 w-32 rounded-full bg-blue-50 blur-3xl" />
            <CardHeader className="space-y-2">
              <CardTitle className="text-xl font-semibold text-slate-900">See the flow without spoilers</CardTitle>
              <CardDescription className="text-base text-slate-600">
                Follow the upload-to-export path and get a sense of the pacing before you run your next list.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                {["Upload", "Research", "Export"].map((pill) => (
                  <div
                    key={pill}
                    className="flex items-center gap-2 rounded-xl bg-slate-50/80 px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                  >
                    <Sparkles className="h-4 w-4 text-blue-600" /> {pill} preview
                  </div>
                ))}
              </div>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-slate-50 to-white p-5 shadow-sm">
                <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-50 via-transparent to-slate-100" />
                <div className="relative space-y-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Hype reel</p>
                  <p className="text-lg font-medium text-slate-900 leading-relaxed">
                    Watch jobs move through research and writing, then unlock the exports once you upload your first file.
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <div className="flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-sm"><Check className="h-3 w-3 text-emerald-600" />No sample copy shown</div>
                    <div className="flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-sm"><ShieldCheck className="h-3 w-3 text-emerald-600" />Safety-first</div>
                    <div className="flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-sm"><Rocket className="h-3 w-3 text-indigo-600" />Exports queued</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl bg-white/90 shadow-md">
            <CardHeader className="space-y-2">
              <CardTitle className="text-xl font-semibold text-slate-900">Received positive replies from:</CardTitle>
              <CardDescription className="text-base text-slate-600">
                Teams that already run outbound at scale.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                {["Upload", "Jobs", "Billing"].map((segment) => (
                  <div key={segment} className="rounded-xl bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-800">
                    {segment} hub ready
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {logos.map((brand) => (
                  <div
                    key={brand.name}
                    className="group flex items-center justify-center rounded-2xl bg-slate-50/70 px-4 py-3 text-base font-semibold text-slate-400 transition hover:bg-white"
                  >
                    <span
                      className="transition duration-200 grayscale group-hover:grayscale-0 group-hover:[color:var(--brand-color)]"
                      style={{ ["--brand-color" as string]: brand.hex }}
                    >
                      {brand.name}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid gap-3">
                {[{
                  quote: "“We can hand off lists knowing research and writing stay in sync.”",
                  name: "GTM lead"
                }, {
                  quote: "“Exports arrive clean, so the team keeps momentum.”",
                  name: "Operations manager"
                }].map((item) => (
                  <div key={item.name} className="rounded-2xl bg-gradient-to-br from-white via-slate-50 to-white p-4 shadow-sm">
                    <p className="text-sm text-slate-800 leading-relaxed">{item.quote}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{item.name}</p>
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
