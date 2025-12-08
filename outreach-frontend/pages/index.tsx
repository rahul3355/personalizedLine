"use client";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../lib/AuthProvider";
import LandingPage from "./landing";
import SendItFastLoader from "../components/SendItFastLoader";

export default function Home() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is authenticated, redirect to dashboard
    if (!loading && session) {
      router.replace("/dashboard");
    }
  }, [session, loading, router]);

  // Show loading while checking auth
  if (loading) {
    return <SendItFastLoader />;
  }

  // Show landing page for unauthenticated users
  if (!session) {
    return <LandingPage />;
  }

  // Show loader while redirecting
  return <SendItFastLoader />;
}

Home.disableWhiteCard = true;
Home.backgroundClassName = "bg-white";
