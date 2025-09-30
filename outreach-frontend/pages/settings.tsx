"use client";

import { useAuth } from "../lib/AuthProvider";

export default function SettingsPage() {
  const { userInfo, session } = useAuth();

  if (!session) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-sm text-[#667085]">
        You need to be signed in to view settings.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-[var(--r-on-bg)]">Profile</h2>
        <div className="grid gap-3 text-sm text-[#475467] sm:grid-cols-2">
          <div>
            <span className="font-medium text-[var(--r-on-bg)]">Name</span>
            <p>{userInfo?.full_name || session.user.email}</p>
          </div>
          <div>
            <span className="font-medium text-[var(--r-on-bg)]">Email</span>
            <p>{session.user.email}</p>
          </div>
          <div>
            <span className="font-medium text-[var(--r-on-bg)]">Plan</span>
            <p>{userInfo?.user?.plan_type || "Free"}</p>
          </div>
          <div>
            <span className="font-medium text-[var(--r-on-bg)]">Subscription status</span>
            <p>{userInfo?.user?.subscription_status || "inactive"}</p>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-[var(--r-on-bg)]">Usage</h2>
        <div className="grid gap-3 text-sm text-[#475467] sm:grid-cols-2">
          <div>
            <span className="font-medium text-[var(--r-on-bg)]">Credits remaining</span>
            <p>{userInfo?.credits_remaining ?? 0}</p>
          </div>
          <div>
            <span className="font-medium text-[var(--r-on-bg)]">Maximum credits</span>
            <p>{userInfo?.max_credits ?? 0}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
