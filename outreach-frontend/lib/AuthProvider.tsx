"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { logger } from "../lib/logger";

interface UserInfo {
  id: string;
  email: string;
  credits_remaining: number;
  addon_credits: number;
  max_credits: number;
  user: {
    plan_type: string | null;
    subscription_status: string | null;
    renewal_date: number | null;
  };
  full_name: string;
  avatar_url: string | null;
  ledger: any[];
  service_context?: any;
  [key: string]: any;
}

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  userInfo: UserInfo | null;
  loading: boolean;
  refreshUserInfo: () => Promise<void>;
  optimisticallyDeductCredits: (amount: number) => void;
  revertOptimisticCredits: (amount: number) => void;
}

const AuthContext = createContext<AuthContextProps>({
  session: null,
  user: null,
  userInfo: null,
  loading: true,
  refreshUserInfo: async () => { },
  optimisticallyDeductCredits: () => { },
  revertOptimisticCredits: () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserInfo = useCallback(async (session: Session | null) => {
    if (!session?.user) return;

    const userId = session.user.id;
    const email = session.user.email || "";
    const fullName =
      session.user.user_metadata?.full_name ||
      session.user.user_metadata?.name ||
      email.split("@")[0] ||
      "User";
    const avatarUrl =
      session.user.user_metadata?.avatar_url ||
      session.user.user_metadata?.picture ||
      null;

    try {
      // 1. Try to fetch existing profile
      const { data: existing, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (fetchError) {
        logger.error("Error fetching profile:", fetchError);
        return;
      }

      let profile = existing;

      // 2. If no profile exists, insert defaults
      if (!existing) {
        const { data: inserted, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            email,
            full_name: fullName,
            avatar_url: avatarUrl,
            plan_type: "free",
            subscription_status: "inactive",
            credits_remaining: 500,
            max_credits: 5000,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          logger.error("Profile insert error:", insertError);
          // Throw error to trigger the catch block and alert the user
          throw new Error(
            `Failed to create user profile: ${insertError.message || "Unknown database error"}. Please try signing out and signing in again, or contact support if the issue persists.`
          );
        }

        if (!inserted) {
          throw new Error(
            "Failed to create user profile: No data returned from database. Please try signing out and signing in again."
          );
        }

        profile = inserted;
      }

      // 3. Use whatever is in Supabase (don't overwrite Stripe updates)
      setUserInfo({
        id: profile.id,
        email,
        credits_remaining: profile.credits_remaining ?? 0,
        addon_credits: profile.addon_credits ?? 0,
        max_credits: profile.max_credits ?? 0,
        user: {
          plan_type: profile.plan_type,
          subscription_status: profile.subscription_status,
          renewal_date: profile.renewal_date,
        },
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        service_context: profile.service_context,
        ledger: [], // could be filled with another query
      });
    } catch (err) {
      logger.error("Failed to fetch/create user info", err);
      // Alert user if profile creation/fetch fails - this is critical
      if (typeof window !== "undefined") {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to load your account information. Please try signing out and signing in again.";
        alert(errorMessage);
      }
    }
  }, []);

  const refreshUserInfo = useCallback(async () => {
    if (session) {
      await fetchUserInfo(session);
    }
  }, [fetchUserInfo, session]);

  // Optimistically deduct credits from the UI (monthly first, then addon)
  const optimisticallyDeductCredits = useCallback((amount: number) => {
    setUserInfo((prev) => {
      if (!prev) return prev;

      let remaining = amount;
      let newMonthly = prev.credits_remaining;
      let newAddon = prev.addon_credits;

      // Use monthly credits first
      if (newMonthly >= remaining) {
        newMonthly -= remaining;
      } else {
        // Use all monthly + some addon
        remaining -= newMonthly;
        newMonthly = 0;
        newAddon = Math.max(0, newAddon - remaining);
      }

      return {
        ...prev,
        credits_remaining: newMonthly,
        addon_credits: newAddon,
      };
    });
  }, []);

  // Revert optimistic credit deduction (on error) - add back to monthly
  const revertOptimisticCredits = useCallback((amount: number) => {
    setUserInfo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        credits_remaining: prev.credits_remaining + amount,
      };
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserInfo(session); // don’t await here
      }

      setLoading(false); // release loader right away
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserInfo(session); // don’t await here
      } else {
        setUserInfo(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserInfo]);

  const value: AuthContextProps = useMemo(
    () => ({
      session,
      user,
      userInfo,
      loading,
      refreshUserInfo,
      optimisticallyDeductCredits,
      revertOptimisticCredits,
    }),
    [session, user, userInfo, loading, refreshUserInfo, optimisticallyDeductCredits, revertOptimisticCredits]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
