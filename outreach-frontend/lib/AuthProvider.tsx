"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
}

const AuthContext = createContext<AuthContextProps>({
  session: null,
  user: null,
  userInfo: null,
  loading: true,
  refreshUserInfo: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session);
    setUser(data.session?.user ?? null);
    if (data.session?.user) {
      fetchUserInfo(data.session);
    }
    setLoading(false);   // ⬅️ move here
  });

  const { data: listener } = supabase.auth.onAuthStateChange(
    async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserInfo(session);
      } else {
        setUserInfo(null);
      }
    }
  );

  return () => {
    listener.subscription.unsubscribe();
  };
}, []);

  const fetchUserInfo = async (session: Session | null) => {
    if (!session?.user) return;

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, plan_type, subscription_status, renewal_date, credits_remaining")
        .eq("id", session.user.id)
        .single();

      if (error || !profile) {
        console.error("Profile fetch error:", error);
        return;
      }

      const merged: UserInfo = {
        id: profile.id,
        email: session.user.email || "",
        credits_remaining: profile.credits_remaining ?? 0,
        max_credits: 5000, // fallback until you add a max_credits column
        user: {
          plan_type: profile.plan_type,
          subscription_status: profile.subscription_status,
          renewal_date: profile.renewal_date,
        },
        full_name:
          session.user.user_metadata?.full_name ||
          session.user.email ||
          "User",
        avatar_url: session.user.user_metadata?.avatar_url || null,
        ledger: [],
      };

      setUserInfo(merged);
    } catch (err) {
      console.error("Failed to fetch user info", err);
    }
  };

  const refreshUserInfo = async () => {
    if (session) {
      await fetchUserInfo(session);
    }
  };

  const value: AuthContextProps = {
    session,
    user,
    userInfo,
    loading,
    refreshUserInfo,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
