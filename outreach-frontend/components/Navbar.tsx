"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import {
  FiHome,
  FiUpload,
  FiFileText,
  FiBell,
  FiSettings,
} from "react-icons/fi";
import { CreditCard } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const navItems: NavItem[] = [
  { label: "Home", href: "/", icon: FiHome },
  { label: "Upload", href: "/upload", icon: FiUpload },
  { label: "Files", href: "/jobs", icon: FiFileText },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "Labs", href: "/test-button", icon: FiSettings },
];

const quickActions = [
  { label: "Move", href: "/upload", variant: "filled" as const },
  { label: "Statement", href: "/billing", variant: "outline" as const },
  { label: "Account details", href: "/billing", variant: "outline" as const },
];

export default function Navbar() {
  const router = useRouter();
  const { userInfo, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const credits = userInfo?.credits_remaining ?? 0;
  const userName = loading
    ? ""
    : userInfo?.full_name
    ? userInfo.full_name
    : "";
  const avatarUrl = loading ? null : userInfo?.avatar_url || null;
  const userInitial = userName ? userName.charAt(0).toUpperCase() : "U";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isActive = (href: string) => router.pathname === href;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#E6E8F2] bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[1180px] items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-7">
          <Link
            href="/"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F101C] text-2xl font-semibold text-white shadow-[0_12px_24px_rgba(12,14,27,0.18)]"
          >
            R
          </Link>

          <nav className="hidden md:flex items-end gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex h-[70px] w-16 flex-col items-center justify-end gap-2 text-[11px] font-semibold tracking-wide transition-colors ${
                    active ? "text-[#181C2F]" : "text-[#7A82A4] hover:text-[#1F2337]"
                  }`}
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-base transition-all duration-150 ${
                      active
                        ? "border-transparent bg-gradient-to-b from-[#EFF1FF] to-[#DDE2FF] text-[#2F3BFF] shadow-[0_12px_22px_rgba(87,96,255,0.22)]"
                        : "border-[#E4E7F5] bg-white text-[#7A82A4] group-hover:border-[#D5DAF5] group-hover:bg-[#F6F7FF]"
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.7} />
                  </span>
                  <span>{item.label}</span>
                  {active && (
                    <span className="absolute -bottom-1 h-1 w-8 rounded-full bg-gradient-to-r from-[#2F3BFF] via-[#7B66FF] to-[#A377FF]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 md:gap-5">
          <div className="hidden md:flex items-center gap-3 rounded-2xl border border-[#E4E7F5] bg-[#F6F7FF] px-4 py-2 text-[13px] font-medium text-[#1C2034]">
            <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#9CA2C2]">
              Credits
            </span>
            <span className="text-sm font-semibold text-[#14182B]">
              {credits.toLocaleString()} lines
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                  action.variant === "filled"
                    ? "border-transparent bg-gradient-to-r from-[#343DFF] via-[#5853FF] to-[#9E6BFF] text-white shadow-[0_10px_18px_rgba(75,83,255,0.25)] hover:brightness-[1.05]"
                    : "border-[#E3E6F6] bg-white text-[#1B1F32] hover:border-[#D3D8F5] hover:bg-[#F6F7FF]"
                }`}
              >
                {action.label}
              </Link>
            ))}
          </div>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E4E7F5] bg-white text-[#70779C] transition hover:border-[#D6DBF6] hover:bg-[#F6F7FF] hover:text-[#1D2236]"
          >
            <FiBell className="h-5 w-5" />
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-3 rounded-2xl border border-[#E4E7F5] bg-white/90 px-2.5 py-2 text-left text-sm font-medium text-[#1C2034] transition hover:border-[#D6DBF6] hover:bg-[#F6F7FF]"
            >
              {loading ? (
                <div className="h-9 w-9 animate-pulse rounded-full bg-[#EEF0FB]" />
              ) : avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={userName}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-[#343DFF] to-[#9E6BFF] text-sm font-semibold text-white">
                  {userInitial}
                </div>
              )}
              <span className="leading-tight">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.3em] text-[#A0A6C6]">
                  Profile
                </span>
                <span className="text-[13px] font-semibold text-[#1C2034]">
                  {userName || "Member"}
                </span>
              </span>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-48 overflow-hidden rounded-2xl border border-[#E4E7F5] bg-white shadow-xl">
                <button className="w-full px-4 py-3 text-left text-sm text-[#1B1F33] transition hover:bg-[#F6F7FF]">
                  Account
                </button>
                <button className="w-full px-4 py-3 text-left text-sm text-[#1B1F33] transition hover:bg-[#F6F7FF]">
                  Help centre
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 text-left text-sm text-[#FF5B5C] transition hover:bg-[#FFF5F5]"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <nav className="md:hidden border-t border-[#E6E8F2] bg-white/95 px-4 pb-3 pt-2">
        <div className="flex items-end gap-3 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={`mobile-${item.href}`}
                href={item.href}
                className={`flex min-w-[72px] flex-col items-center gap-1 rounded-2xl border px-3 py-2 text-[11px] font-semibold transition ${
                  active
                    ? "border-transparent bg-gradient-to-b from-[#EFF1FF] to-[#DDE2FF] text-[#20243A] shadow-[0_10px_20px_rgba(65,74,255,0.18)]"
                    : "border-[#E4E7F5] bg-white text-[#7A82A4]"
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                    active
                      ? "bg-white text-[#343DFF]"
                      : "bg-[#F5F6FB] text-[#7A82A4]"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.1 : 1.6} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
