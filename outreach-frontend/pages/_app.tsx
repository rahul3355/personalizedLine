import "../styles/globals.css";
import type { AppProps } from "next/app";
import Navbar from "../components/Navbar";
import { AuthProvider, useAuth } from "../lib/AuthProvider";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import AuthorityPointLoader from "../components/AuthorityPointLoader";
import InlineLoader from "@/components/InlineLoader";

type AugmentedComponent = AppProps["Component"] & {
  disableWhiteCard?: boolean;
  backgroundClassName?: string;
};

interface LayoutProps {
  Component: AugmentedComponent;
  pageProps: AppProps["pageProps"];
}

function Layout({ Component, pageProps }: LayoutProps) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(false);

  useEffect(() => {
    const handleStart = (url: string, { shallow } = { shallow: false }) => {
      if (shallow) {
        return;
      }

      if (typeof window !== "undefined") {
        try {
          const nextUrl = new URL(url, window.location.href);
          const currentUrl = new URL(router.asPath, window.location.href);

          if (nextUrl.pathname === currentUrl.pathname) {
            return;
          }
        } catch {
          // ignore malformed URLs and fall back to showing the loader
        }
      }

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

  // Block render until session is resolved
  if (loading) {
    return (
      <AuthorityPointLoader />
    );
  }
  const backgroundClassName = Component.backgroundClassName ?? "bg-[#F7F7F7]";
  const disableWhiteCard = Component.disableWhiteCard ?? false;

  const renderPage = () => {
    if (pageLoading) {
      return (
        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-8 lg:px-10">
          <InlineLoader />
        </div>
      );
    }

    return <Component {...pageProps} />;
  };

  return (
    <div className={`min-h-screen flex ${backgroundClassName}`}>
      {session && <Navbar />}
      <main
        className={`flex-1 flex flex-col transition-all duration-200 ${session ? "mt-16 px-0 pb-10" : ""
          }`}
      >
        <div
          className={`flex min-h-0 flex-1 flex-col ${
            disableWhiteCard
              ? "overflow-visible ml-0 mr-0 lg:ml-[108px]"
              : "overflow-hidden rounded-[32px] bg-white shadow-sm ml-0 mr-4 lg:ml-[108px]"
            }`}
        >
          {disableWhiteCard ? (
            renderPage()
          ) : pageLoading ? (
            <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-8 lg:px-10">
              <InlineLoader />
            </div>
          ) : (
            <div className="flex-1 px-6 py-8 sm:px-8 lg:px-10">
              <Component {...pageProps} />
            </div>
          )}
        </div>
      </main>


    </div>
  );

}

interface MyAppProps extends AppProps {
  Component: AugmentedComponent;
}

export default function MyApp({ Component, pageProps }: MyAppProps) {
  return (
    <AuthProvider>
      <Layout Component={Component} pageProps={pageProps} />
    </AuthProvider>
  );
}
