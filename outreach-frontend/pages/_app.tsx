import "../styles/globals.css";
import type { AppProps } from "next/app";
import Navbar from "../components/Navbar";
import { AuthProvider, useAuth } from "../lib/AuthProvider";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

interface LayoutProps {
  Component: AppProps["Component"];
  pageProps: AppProps["pageProps"];
}

function Layout({ Component, pageProps }: LayoutProps) {
  const { session } = useAuth();
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
    if (!session && router.pathname !== "/login") {
      router.push("/login");
    }
  }, [session, router]);

  return (
    <div className="min-h-screen flex bg-gray-50">

      {session && <Navbar />}
      <main
        className={`flex-1 p-8 transition-all duration-200 ${session ? "md:ml-60 mt-16" : ""
          }`}
      >
        <Component {...pageProps} />
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
