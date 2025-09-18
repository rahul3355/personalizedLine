"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthProvider";
import { API_URL } from "../lib/api";

export default function Grant50Button() {
  const { session, refreshUserInfo } = useAuth();
  const [claimed, setClaimed] = useState(false);
  const token = session?.access_token;

  useEffect(() => {
    // simple check: did we already claim today?
    fetch(`${API_URL}/rewards/grant-50/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setClaimed(d.claimed))
      .catch(() => {});
  }, [token]);

  const grant = async () => {
    await fetch(`${API_URL}/rewards/grant-50`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    await refreshUserInfo(); // update balance instantly
    setClaimed(true);
  };

  if (claimed) return null;

  return (
    <button
      onClick={grant}
      className="ml-3 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs hover:bg-green-700"
    >
      Grant 50
    </button>
  );
}