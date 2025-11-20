import { useEffect, useMemo, useState } from "react";
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

  const sampleOutputs = useMemo(
    () => ({
      concise:
        "I noticed your team is scaling account-based outreach. We enrich every lead with fresh context, write openings that mirror your tone, and ship them back as export-ready XLSX files—no brittle playbooks needed.",
      warm:
        "Saw you're building momentum in enterprise deals. We quietly research each prospect, craft openings that feel hand-written, and return them to your CRM with sourcing receipts so your reps can simply press send.",
    }),
    []
  );

  const [tone, setTone] = useState<"concise" | "warm">("concise");

  const quickActions = [
    {
      title: "Upload new file",
      description: "Map columns, set guardrails, and let the AI research every row in parallel.",
      icon: Upload,
      action: () => router.push("/upload"),
    },
    {
      title: "Recent jobs",
      description: "Monitor enrichment progress, retries, and exports in real time.",
      icon: BarChart3,
      action: () => router.push("/jobs"),
    },
    {
      title: "Credits & billing",
      description: "Track remaining credits, top up, and share access across teammates.",
      icon: ShieldCheck,
      action: () => router.push("/billing"),
    },
  ];

  const workflow = [
    {
      title: "Upload & map",
      detail: "Drop your CSV/XLSX, auto-detect columns, and set tone + safety policies.",
      icon: FileText,
    },
    {
      title: "Research in parallel",
      detail: "Our agents enrich every row with company + persona signals and citations.",
      icon: Sparkles,
    },
    {
      title: "Quality guardrails",
      detail: "Deduplicate, verify domains, and apply brand filters before writing copy.",
      icon: ShieldCheck,
    },
    {
      title: "Export instantly",
      detail: "Ship clean XLSX/CSV with ready-to-send openings or sync straight to your CRM.",
      icon: Rocket,
    },
  ];

  const handleStartFree = () => {
    router.push("/upload");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-slate-50 to-white">
      <div className="absolute inset-0 opacity-60 blur-[140px] bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.12),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(34,197,94,0.12),transparent_32%)]" />

      <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-12 lg:px-10">
        {/* Hero */}
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
              <Sparkles className={`h-3.5 w-3.5 text-blue-600 transition-transform duration-700 ${underlinePlayed ? "animate-[spin_4s_linear_infinite]" : ""}`} />
              <span>AI outbound that feels handcrafted</span>
            </div>

            <h1 className="text-4xl leading-[1.05] font-semibold text-slate-900 sm:text-5xl lg:text-6xl">
              Turn raw lead lists into <span className="relative inline-block"><span className="relative z-10">precision outreach</span>
                {[0, 1, 2].map((stroke) => (
                  <span
                    key={stroke}
                    aria-hidden="true"
                    className={`underline-stroke stroke-${stroke + 1} ${underlinePlayed ? "animate-marker-stroke" : ""}`}
                    style={{ animationDelay: underlinePlayed ? `${stroke * 0.35}s` : undefined }}
                  />
                ))}
              </span> in minutes.
            </h1>

            <p className="max-w-2xl text-lg text-slate-700">
              We research every prospect, cite sources, and generate on-brand openers so your team ships smarter outreach at enterprise velocity. Built for operators who care about signal, not spray.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Button
                onClick={handleStartFree}
                size="lg"
                className="h-12 rounded-full bg-slate-900 px-7 text-base font-semibold text-white transition hover:scale-[1.01] hover:bg-slate-800 active:scale-[0.99]"
              >
                <span className="flex items-center">Start free (500 credits)<ArrowRight className="ml-2 h-4 w-4" /></span>
              </Button>
              <Button
                onClick={() => router.push("/upload")}
                variant="ghost"
                size="lg"
                className="h-12 rounded-full border border-slate-200 bg-white/60 px-7 text-base font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
              >
                Watch product loop
              </Button>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Check className="h-4 w-4 text-emerald-500" />
                No credit card. SOC2-in-progress.
              </div>
            </div>

            <div className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur sm:grid-cols-3">
              {[{
                label: "Research volume", value: ">12M signals enriched", detail: "fresh domains, titles, firmographics"
              }, {
                label: "Reply lift", value: "+27% avg uplift", detail: "measured across >80 teams"
              }, {
                label: "Time saved", value: "-80% manual work", detail: "1-click exports to CRM/XLSX"
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
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white via-blue-50 to-white blur-3xl" />
            <Card className="relative overflow-hidden rounded-3xl border-slate-200/80 bg-white/80 shadow-xl">
              <div className="absolute -left-24 -top-24 h-48 w-48 animate-[pulse_6s_ease-in-out_infinite] rounded-full bg-blue-100" />
              <CardHeader className="space-y-2 pb-4">
                <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900">
                  <Wand2 className="h-5 w-5 text-blue-600" />
                  Live control panel
                </CardTitle>
                <CardDescription className="text-base">
                  Monitor enrichment speed, safety checks, and delivery readiness from one place.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {["Research", "Writing", "Exports"].map((stage, idx) => (
                    <div
                      key={stage}
                      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900">{stage}</p>
                        <span className="text-xs font-semibold text-emerald-600">{[92, 74, 61][idx]}% live</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 animate-[pulse_5s_ease-in-out_infinite]"
                          style={{ width: `${[92, 74, 61][idx]}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-600">Parallelized across providers for resilience.</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {["Domain verified", "Deliverability safe"].map((flag) => (
                    <div key={flag} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm font-medium text-slate-800">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" /> {flag}
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/60">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Next export</p>
                  <p className="text-sm font-semibold text-slate-900">Delivery ETA · 3m 12s</p>
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
            <Button variant="ghost" className="rounded-full border border-slate-200 bg-white/70 text-slate-900" onClick={handleStartFree}>
              Start new upload
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {quickActions.map(({ title, description, icon: Icon, action }) => (
              <Card
                key={title}
                className="group relative overflow-hidden rounded-2xl border-slate-200/90 bg-white/80 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-slate-50 to-white opacity-0 transition group-hover:opacity-100" />
                <CardHeader className="space-y-3 pb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/10">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-slate-900">{title}</CardTitle>
                  <CardDescription className="text-sm text-slate-600">{description}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="link" className="px-0 text-slate-900" onClick={action}>
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
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-xs font-medium text-slate-700 shadow-sm">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Parallelized research online
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {workflow.map(({ title, detail, icon: Icon }, idx) => (
              <Card
                key={title}
                className="relative overflow-hidden rounded-2xl border-slate-200/90 bg-white/80 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" style={{ opacity: 0.8, animation: "pulse 6s ease-in-out infinite" }} />
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

        {/* Preview & proof */}
        <div className="mt-16 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="relative overflow-hidden rounded-3xl border-slate-200/80 bg-white/80 shadow-md">
            <div className="absolute -right-10 top-0 h-32 w-32 rounded-full bg-emerald-100 blur-3xl" />
            <CardHeader className="space-y-2">
              <CardTitle className="text-xl font-semibold text-slate-900">Preview the voice</CardTitle>
              <CardDescription className="text-base text-slate-600">
                Toggle tone and see how we ground every opener in verified research before it reaches your CRM.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                <Button
                  type="button"
                  size="sm"
                  variant={tone === "concise" ? "default" : "ghost"}
                  className={`h-8 rounded-full px-3 text-xs ${tone === "concise" ? "bg-slate-900 text-white hover:bg-slate-800" : "text-slate-700"}`}
                  onClick={() => setTone("concise")}
                >
                  Concise
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={tone === "warm" ? "default" : "ghost"}
                  className={`h-8 rounded-full px-3 text-xs ${tone === "warm" ? "bg-slate-900 text-white hover:bg-slate-800" : "text-slate-700"}`}
                  onClick={() => setTone("warm")}
                >
                  Warm
                </Button>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white p-5 shadow-sm">
                <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-blue-50/40 via-transparent to-emerald-50/40" />
                <div className="relative space-y-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Sample opener</p>
                  <p className="text-lg font-medium text-slate-900 leading-relaxed">{sampleOutputs[tone]}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1"><Sparkles className="h-3 w-3 text-blue-600" />AI drafted</div>
                    <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1"><ShieldCheck className="h-3 w-3 text-emerald-600" />Citations ready</div>
                    <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1"><Check className="h-3 w-3 text-emerald-600" />Deliverability safe</div>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {["CRM-safe formatting", "Tone-locked", "Source receipts"].map((tag) => (
                  <div key={tag} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
                    <Check className="h-4 w-4 text-emerald-600" /> {tag}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t border-slate-200/80 bg-slate-50/60">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-sm"><Sparkles className="h-3 w-3 text-blue-600" />Trained on fresh signals</span>
                <span className="flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-sm"><ShieldCheck className="h-3 w-3 text-emerald-600" />Brand safety controls</span>
                <span className="flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-sm"><Rocket className="h-3 w-3 text-indigo-600" />Exports ready in minutes</span>
              </div>
            </CardFooter>
          </Card>

          <Card className="rounded-3xl border-slate-200/80 bg-white/80 shadow-md">
            <CardHeader className="space-y-2">
              <CardTitle className="text-xl font-semibold text-slate-900">Signals of trust</CardTitle>
              <CardDescription className="text-base text-slate-600">
                Teams use us to debug their outbound at scale — from GTM startups to global enterprises.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-3 gap-4 text-center">
                {["SaaS", "Enterprise", "Agency"].map((segment) => (
                  <div key={segment} className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm">
                    {segment}
                  </div>
                ))}
              </div>
              <div className="grid gap-3">
                {[{
                  quote: "“We replaced three enrichment tools and finally have copy our reps can trust. The AI cites everything.”",
                  name: "VP Sales, cloud security",
                }, {
                  quote: "“Massively reduced manual QA—domain verification and brand guardrails are automatic.”",
                  name: "RevOps Lead, SaaS unicorn",
                }, {
                  quote: "“Went live in a day. Upload → research → export. The team loves the control surface.”",
                  name: "Founder, outbound agency",
                }].map((item) => (
                  <div key={item.name} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white p-4 shadow-sm">
                    <p className="text-sm text-slate-800 leading-relaxed">{item.quote}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{item.name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/60">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Uptime</p>
                <p className="text-sm font-semibold text-slate-900">99.95% last 90 days</p>
              </div>
              <Button className="rounded-full bg-slate-900 text-white hover:bg-slate-800">Book a live review</Button>
            </CardFooter>
          </Card>
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
              rgba(59, 130, 246, 0.95),
              rgba(79, 70, 229, 0.95),
              rgba(16, 185, 129, 0.9)
            ),
            repeating-linear-gradient(
              -45deg,
              rgba(255, 255, 255, 0.18) 0,
              rgba(255, 255, 255, 0.18) 2px,
              transparent 2px,
              transparent 4px
            );
          filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.15));
          mix-blend-mode: multiply;
          opacity: 0.7;
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
