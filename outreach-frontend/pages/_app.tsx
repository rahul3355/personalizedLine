import "../styles/globals.css";
import type { AppProps } from "next/app";
import Navbar from "../components/Navbar";
import { AuthProvider, useAuth } from "../lib/AuthProvider";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import AuthorityPointLoader from "../components/AuthorityPointLoader";
import InlineLoader from "@/components/InlineLoader";

interface LayoutProps {
  Component: AppProps["Component"];
  pageProps: AppProps["pageProps"];
}

function Layout({ Component, pageProps }: LayoutProps) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(false);

  useEffect(() => {
    const handleStart = () => setPageLoading(true);
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

  // Block render until session is resolved
  if (loading) {
    return (
      <AuthorityPointLoader />
    );
  }


  return (
    <div className="flex min-h-screen bg-[#F7F7F7]">
      {session && <Navbar />}
      <main
        className={`flex-1 transition-all duration-200 ${
          session ? "flex flex-col px-4 py-8 sm:px-10 lg:ml-[108px] lg:px-16" : "flex"
        }`}
      >
        {session ? (
          <div className="mx-auto flex min-h-full w-full max-w-5xl flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-[#E2E2E7] bg-white shadow-[0_32px_80px_rgba(15,23,42,0.08)]">
              {pageLoading ? (
                <div className="flex flex-1 items-center justify-center px-8 py-10">
                  <InlineLoader />
                </div>
              ) : (
                <div className="flex-1 px-6 py-8 sm:px-10 sm:py-10 lg:px-12">
                  <Component {...pageProps} />
                </div>
              )}
            </div>
          </div>
        ) : pageLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <InlineLoader />
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
