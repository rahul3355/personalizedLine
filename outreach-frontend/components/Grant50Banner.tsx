"use client";
import React, { useState } from "react";
import { useAuth } from "../lib/AuthProvider";
import { API_URL } from "../lib/api";

export default function Grant50Banner() {
  const { session, refreshUserInfo } = useAuth();
  const [loading, setLoading] = useState(false);
  if (!session) return null;

  const claim = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/rewards/grant-50`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Grant50 failed", res.status, txt);
        return;
      }

      await refreshUserInfo();
    } catch (err) {
      console.error("Grant50 error", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={claim}
      disabled={loading}
      className="ml-3 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs hover:bg-green-700 disabled:opacity-60"
    >
      {loading ? "Granting…" : "Grant 50"}
    </button>
  );
}
