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
        // Don't return early - try to create profile via backend
      }

      let profile = existing;

      // 2. If no profile exists, try to insert defaults with retries
      if (!existing) {
        console.log(`[AuthProvider] Creating new profile for user ${userId} with 500 initial credits`);

        const { data: inserted, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            email,
            full_name: fullName,
            avatar_url: avatarUrl,
            plan_type: "free",
            subscription_status: "active", // Changed from "inactive" to match backend
            credits_remaining: 500,
            max_credits: 5000,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error("Profile insert error:", insertError);
          console.error("This may be due to RLS policies. Attempting to fetch via backend /me endpoint...");

          // FALLBACK: Try to create profile via backend /me endpoint
          // The backend has service role access and can bypass RLS
          try {
            const token = session.access_token;
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/me`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (response.ok) {
              const backendProfile = await response.json();
              console.log("[AuthProvider] Successfully created profile via backend:", backendProfile);
              profile = backendProfile;
            } else {
              console.error("Backend /me endpoint also failed:", await response.text());
              // Last resort: set a temporary profile so user isn't blocked
              profile = {
                id: userId,
                email,
                full_name: fullName,
                avatar_url: avatarUrl,
                plan_type: "free",
                subscription_status: "active",
                credits_remaining: 0, // Will be fixed when backend is called
                max_credits: 5000,
              };
            }
          } catch (backendError) {
            console.error("Failed to create profile via backend:", backendError);
            // Set temporary profile
            profile = {
              id: userId,
              email,
              full_name: fullName,
              avatar_url: avatarUrl,
              plan_type: "free",
              subscription_status: "active",
              credits_remaining: 0,
              max_credits: 5000,
            };
          }
        } else {
          console.log("[AuthProvider] Successfully created profile with 500 credits:", inserted);
          profile = inserted;
        }
      }

      if (!profile) {
        console.error("[AuthProvider] CRITICAL: No profile available after all attempts");
        return;
      }

      // 3. Use whatever is in Supabase (don't overwrite Stripe updates)
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

      console.log(`[AuthProvider] User info set: ${profile.credits_remaining} credits remaining`);
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
