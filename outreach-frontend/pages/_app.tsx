import "../styles/globals.css";
import Head from "next/head";
import type { AppProps } from "next/app";
import Navbar from "../components/Navbar";
import { AuthProvider, useAuth } from "../lib/AuthProvider";
import { OptimisticJobsProvider } from "../lib/OptimisticJobsProvider";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import SendItFastLoader from "../components/SendItFastLoader";
import InlineLoader from "@/components/InlineLoader";
import LandingPageLoader from "@/components/LandingPageLoader";
import { ToastProvider } from "@/components/Toast";

type AugmentedComponent = AppProps["Component"] & {
  disableWhiteCard?: boolean;
  backgroundClassName?: string;
};

interface LayoutProps {
  Component: AugmentedComponent;
  pageProps: AppProps["pageProps"];
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/landing",
  "/features",
  "/pricing",
  "/about",
  "/terms",
  "/privacy",
  "/cookies",
  "/gdpr",
  "/billing/success",
];

function Layout({ Component, pageProps }: LayoutProps) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(false);

  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.includes(router.pathname);

  useEffect(() => {
    const handleStart = (_url: string, { shallow } = { shallow: false }) => {
      if (!shallow) {
        setPageLoading(true);
      }
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
    // Only redirect to login for non-public routes when not authenticated
    if (!loading && !session && !isPublicRoute) {
      router.push("/login");
    }
  }, [session, loading, router, isPublicRoute]);

  // Block render until session is resolved
  if (loading) {
    return <SendItFastLoader />;
  }
  const backgroundClassName = Component.backgroundClassName ?? "bg-[#F7F7F7]";
  const disableWhiteCard = Component.disableWhiteCard ?? false;
  const isLoginPage = router.pathname === "/login";

  // For public pages (landing, features, pricing, about), render without app shell
  const showAppShell = session && !isPublicRoute;

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

  // For public routes without session, render the page directly without app shell
  if (isPublicRoute && !session) {
    if (pageLoading) {
      return <LandingPageLoader />;
    }
    return (
      <div className={`min-h-screen ${backgroundClassName}`}>
        <Component {...pageProps} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex ${backgroundClassName}`}>
      {showAppShell && <Navbar />}
      <main
        className={`flex-1 flex flex-col transition-all duration-200 ${showAppShell ? `mt-16 px-0 ${disableWhiteCard ? "lg:pb-10" : "pb-10"}` : ""
          }`}
      >
        <div
          className={`flex min-h-0 flex-1 flex-col ${disableWhiteCard
            ? `overflow-visible ml-0 mr-0 ${isLoginPage || isPublicRoute ? "" : "lg:ml-[108px]"}`
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
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>
      <OptimisticJobsProvider>
        <ToastProvider>
          <Layout Component={Component} pageProps={pageProps} />
        </ToastProvider>
      </OptimisticJobsProvider>
    </AuthProvider>
  );
}
