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
  }, [router.events]);

  useEffect(() => {
    if (!loading && !session && router.pathname !== "/login") {
      router.push("/login");
    }
  }, [session, loading, router]);

  if (loading) {
    return <AuthorityPointLoader />;
  }

  const content = pageLoading ? (
    <div className="flex min-h-[50vh] items-center justify-center">
      <InlineLoader />
    </div>
  ) : (
    <Component {...pageProps} />
  );

  return (
    <div className="min-h-screen bg-[#F5F6FB]">
      {session && <Navbar />}
      <main className={`${session ? "pt-[140px] md:pt-[120px]" : "pt-6"}`}>
        <div className="mx-auto w-full max-w-[1180px] px-5 pb-12 sm:px-8">
          {content}
        </div>
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
