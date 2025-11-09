"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

interface UserInfo {
  id: string;
  email: string;
  credits_remaining: number;
  max_credits: number;
  user: {
    plan_type: string | null;
    subscription_status: string | null;
    renewal_date: number | null;
  };
  full_name: string;
  avatar_url: string | null;
  ledger: any[];
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
  refreshUserInfo: async () => {},
  optimisticallyDeductCredits: () => {},
  revertOptimisticCredits: () => {},
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
        console.error("Error fetching profile:", fetchError);
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
            credits_remaining: 0,
            max_credits: 0,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error("Profile insert error:", insertError);
          return;
        }

        profile = inserted;
      }

      // 3. Use whatever is in Supabase (don’t overwrite Stripe updates)
      setUserInfo({
        id: profile.id,
        email,
        credits_remaining: profile.credits_remaining ?? 0,
        max_credits: profile.max_credits ?? 0,
        user: {
          plan_type: profile.plan_type,
          subscription_status: profile.subscription_status,
          renewal_date: profile.renewal_date,
        },
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        ledger: [], // could be filled with another query
      });
    } catch (err) {
      console.error("Failed to fetch/create user info", err);
    }
  }, []);

  const refreshUserInfo = useCallback(async () => {
    if (session) {
      await fetchUserInfo(session);
    }
  }, [fetchUserInfo, session]);

  // Optimistically deduct credits from the UI
  const optimisticallyDeductCredits = useCallback((amount: number) => {
    setUserInfo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        credits_remaining: Math.max(0, prev.credits_remaining - amount),
      };
    });
  }, []);

  // Revert optimistic credit deduction (on error)
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

  const value: AuthContextProps = {
    session,
    user,
    userInfo,
    loading,
    refreshUserInfo,
    optimisticallyDeductCredits,
    revertOptimisticCredits,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
