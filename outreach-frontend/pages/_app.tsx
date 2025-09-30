import "../styles/globals.css";
import type { AppProps } from "next/app";
import Navbar from "../components/Navbar";
import { AuthProvider, useAuth } from "../lib/AuthProvider";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState, useRef, type ComponentType } from "react";
import AuthorityPointLoader from "../components/AuthorityPointLoader";
import InlineLoader from "@/components/InlineLoader";
import { supabase } from "../lib/supabaseClient";
import { ArrowUpRight, FileText, IdCard } from "lucide-react";

type Action = {
  label: string;
  onClick: () => void;
  Icon: ComponentType<{ className?: string }>;
};

const classNames = (
  ...classes: Array<string | false | null | undefined>
) => classes.filter(Boolean).join(" ");

interface LayoutProps {
  Component: AppProps["Component"];
  pageProps: AppProps["pageProps"];
}

function Layout({ Component, pageProps }: LayoutProps) {
  const { session, loading, userInfo } = useAuth();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerElevated, setHeaderElevated] = useState(false);

  useEffect(() => {
    const handleStart = () => {
      setProfileOpen(false);
      setPageLoading(true);
    };
    const handleComplete = () => setPageLoading(false);

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, [router]);

  useEffect(() => {
    if (!loading && !session && router.pathname !== "/login") {
      router.push("/login");
    }
  }, [session, loading, router]);

  useEffect(() => {
    const clickHandler = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", clickHandler);
    return () => document.removeEventListener("mousedown", clickHandler);
  }, []);

  useEffect(() => {
    if (!headerRef.current || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setHeaderElevated(!entry.isIntersecting);
      },
      { threshold: 1.0 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [session]);

  const isLoginRoute = router.pathname === "/login";

  if (loading) {
    return <AuthorityPointLoader />;
  }

  if (!session && !isLoginRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--r-bg)]">
        <InlineLoader />
      </div>
    );
  }

  const showShell = Boolean(session && !isLoginRoute);

  const pageTitle = useMemo(() => {
    const path = router.pathname;
    if (path.startsWith("/upload")) return "Upload File";
    if (path.startsWith("/billing")) return "Plans & Billing";
    if (path.startsWith("/jobs/[")) return "File Details";
    if (path.startsWith("/jobs")) return "Past Files";
    if (path.startsWith("/settings")) return "Account Settings";
    return "Home";
  }, [router.pathname]);

  const actions: Action[] = useMemo(
    () => [
      {
        label: "Move money",
        onClick: () => router.push("/upload"),
        Icon: ArrowUpRight,
      },
      {
        label: "Statements",
        onClick: () => router.push("/jobs"),
        Icon: FileText,
      },
      {
        label: "Account",
        onClick: () => router.push("/billing"),
        Icon: IdCard,
      },
    ],
    [router]
  );

  const creditsRemaining = userInfo?.credits_remaining ?? 0;
  const resolvedName =
    userInfo?.full_name || session?.user?.email?.split("@")[0] || "";
  const displayName = resolvedName || "User";
  const avatarUrl = userInfo?.avatar_url || null;
  const displayInitial = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfileOpen(false);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[var(--r-bg)] text-[var(--r-on-bg)]">
      {showShell && <Navbar />}
      <main
        className={classNames(
          "min-h-screen transition-[padding] duration-[var(--r-med)] ease-[var(--r-ease)]",
          showShell && "pt-[88px] lg:pt-10 lg:pl-[calc(var(--rail-current)+32px)]"
        )}
      >
        {showShell ? (
          <div className="px-4 pb-10 sm:px-8 lg:px-12">
            <div className="max-w-6xl mx-auto">
              <section
                className="relative overflow-hidden bg-white"
                style={{
                  borderRadius: "var(--r-radius-card)",
                  boxShadow: "var(--r-shadow-card)",
                }}
              >
                <div
                  ref={sentinelRef}
                  aria-hidden
                  className="h-px"
                  style={{ opacity: 0 }}
                />
                <div
                  ref={headerRef}
                  className="sticky top-0 z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                  style={{
                    padding: "24px",
                    background: "#fff",
                    borderBottom: "1px solid var(--r-border)",
                    boxShadow: headerElevated ? "var(--r-shadow-float)" : "none",
                    transition: `box-shadow var(--r-fast) var(--r-ease)`
                  }}
                >
                  <div className="flex flex-col gap-1">
                    <h1 className="text-[24px] font-semibold tracking-[-0.2px]">
                      {pageTitle}
                    </h1>
                    <span className="text-sm text-[#667085]">
                      {creditsRemaining.toLocaleString()} lines remaining
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {actions.map(({ label, onClick, Icon }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={onClick}
                          className="flex items-center gap-2 text-sm font-medium transition-colors duration-[var(--r-fast)] ease-[var(--r-ease)] hover:bg-[#EFF2F6] active:bg-[var(--r-active)] active:text-[var(--r-primary-ink)]"
                          style={{
                            background: "#F5F6F7",
                            color: "#111827",
                            border: "1px solid #E6E8EC",
                            borderRadius: "12px",
                            padding: "8px 12px",
                          }}
                        >
                          <Icon className="h-[18px] w-[18px]" />
                          {label}
                        </button>
                      ))}
                    </div>
                    <div
                      className="hidden sm:flex items-center rounded-full border text-sm font-medium"
                      style={{
                        padding: "6px 14px",
                        background: "var(--r-hover)",
                        borderColor: "var(--r-border)",
                      }}
                    >
                      <span className="text-[#475467]">Balance</span>
                      <span className="ml-2 text-[var(--r-primary-ink)]">
                        {creditsRemaining.toLocaleString()} lines
                      </span>
                    </div>
                    <div className="relative" ref={profileRef}>
                      <button
                        type="button"
                        onClick={() => setProfileOpen((open) => !open)}
                        className="flex items-center gap-3 transition-colors duration-[var(--r-fast)] ease-[var(--r-ease)] hover:bg-[var(--r-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(127,132,246,0.8)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                        style={{
                          padding: "6px 10px",
                          borderRadius: "999px",
                        }}
                      >
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--r-hover)] text-sm font-semibold text-[var(--r-primary-ink)]">
                            {displayInitial}
                          </span>
                        )}
                        <span className="text-sm font-medium text-[var(--r-on-bg)]">
                          {displayName}
                        </span>
                      </button>
                      {profileOpen && (
                        <div
                          className="absolute right-0 mt-3 w-52 overflow-hidden"
                          style={{
                            background: "#fff",
                            borderRadius: "var(--r-radius-squircle)",
                            boxShadow: "var(--r-shadow-float)",
                            border: "1px solid var(--r-border)",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setProfileOpen(false);
                              router.push("/settings");
                            }}
                            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-[var(--r-on-bg)] transition-colors duration-[var(--r-fast)] ease-[var(--r-ease)] hover:bg-[var(--r-hover)]"
                          >
                            Settings
                          </button>
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-[#FF4D4F] transition-colors duration-[var(--r-fast)] ease-[var(--r-ease)] hover:bg-[var(--r-hover)]"
                          >
                            Sign out
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ padding: "24px" }}>
                  {pageLoading ? (
                    <div className="flex min-h-[240px] items-center justify-center">
                      <InlineLoader />
                    </div>
                  ) : (
                    <Component {...pageProps} />
                  )}
                </div>
              </section>
            </div>
          </div>
        ) : (
          <Component {...pageProps} />
        )}
      </main>
    </div>
  );
}

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Layout Component={Component} pageProps={pageProps} />
    </AuthProvider>
  );
}
