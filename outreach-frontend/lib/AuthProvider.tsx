"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    // Initial session load
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session) {
        fetchUserInfo(data.session);
      }
    });

    // Listen for session changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) {
          fetchUserInfo(session);
        } else {
          setUserInfo(null);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Fetch backend /me endpoint + merge with Supabase metadata
  const fetchUserInfo = async (session: any) => {
    try {
      let backendData: any = {};
      try {
        const res = await fetch("http://localhost:8000/me", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          backendData = await res.json();
        }
      } catch (err) {
        console.error("Failed to fetch /me", err);
      }

      const meta = session?.user?.user_metadata || {};

      // Build merged object
      const merged = {
        // keep full backend structure
        ...backendData,

        // convenience fields for UI
        full_name:
          backendData?.user?.full_name ||
          meta.full_name ||
          meta.name ||
          "User",
        avatar_url:
          backendData?.user?.avatar_url ||
          meta.avatar_url ||
          meta.picture ||
          null,
        email: backendData?.user?.email || session?.user?.email || null,
      };

      setUserInfo(merged);
    } catch (err) {
      console.error("Failed to build userInfo", err);
    }
  };

  return (
    <AuthContext.Provider value={{ session, loading, userInfo }}>
       {loading ? <p className="text-center text-gray-500 mt-20">Loading...</p> : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
