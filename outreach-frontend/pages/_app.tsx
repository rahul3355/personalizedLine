import "../styles/globals.css";
import type { AppProps } from "next/app";
import Navbar from "../components/Navbar";
import { AuthProvider, useAuth } from "../lib/AuthProvider";
import { useRouter } from "next/router";
import { useEffect } from "react";

interface LayoutProps {
  Component: AppProps["Component"];
  pageProps: AppProps["pageProps"];
}

function Layout({ Component, pageProps }: LayoutProps) {
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!session && router.pathname !== "/login") {
      router.push("/login"); // force login page when logged out
    }
  }, [session, router]);

  return (
    <div className="min-h-screen flex bg-gray-50">
      {session && <Navbar />}
      <main className={`flex-1 p-8 ${session ? "ml-60" : ""}`}>
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
