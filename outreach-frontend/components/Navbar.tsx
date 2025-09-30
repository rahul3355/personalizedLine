"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import {
  ArrowSquareOut,
  Bell,
  CreditCard,
  House,
  Lifebuoy,
  SignOut,
  SquaresFour,
  Upload,
  Wallet,
} from "@phosphor-icons/react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import logo from "../pages/logo.png";

export default function Navbar() {
  const router = useRouter();

  // --- state (functionality unchanged) ---
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [shinePlayed, setShinePlayed] = useState(false); // kept for parity (unused in rail now)
  const [menuOpen, setMenuOpen] = useState(false);
  const iconWrapperRef = useRef<HTMLSpanElement | null>(null);

  const { userInfo, loading } = useAuth();

  // --- effects (functionality unchanged) ---
  useEffect(() => {
    if (router.pathname === "/jobs" && iconWrapperRef.current) {
      iconWrapperRef.current.animate(
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(-15deg)" },
          { transform: "rotate(15deg)" },
          { transform: "rotate(0deg)" },
        ],
        { duration: 300, easing: "ease-in-out" }
      );
    }
  }, [router.pathname]);

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
  }, [menuOpen]);

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

  // --- handlers (functionality unchanged) ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleHover = () => {
    if (!iconWrapperRef.current) return;
    iconWrapperRef.current.animate(
      [
        { transform: "rotate(0deg)" },
        { transform: "rotate(-15deg)" },
        { transform: "rotate(15deg)" },
        { transform: "rotate(0deg)" },
      ],
      { duration: 300, easing: "ease-in-out" }
    );
  };

  // --- derived (functionality unchanged) ---
  const credits = userInfo?.credits_remaining ?? 0;
  const userName = loading ? "" : userInfo?.full_name ? userInfo.full_name : "";
  const avatarUrl = loading ? null : userInfo?.avatar_url || null;

  const isActive = (path: string) => router.pathname === path;

  // --- Desktop rail tokens (exact Revolut-like) ---
  // Rail bg is light grey; icons are filled dark grey; active gets a white squircle behind.
  const railBg = "bg-[#F5F7FA]"; // very light grey
  const railBorder = "border-r border-[#E9ECF2]";
  const railWidth = "w-[264px]"; // Revolut desktop rail width
  const iconSizeBox = "h-9 w-9"; // squircle size
  const iconLabel =
    'text-[14px] font-medium tracking-[-0.2px] text-[#1F2933]';
  const iconDescription =
    'text-[13px] text-[#697386] tracking-[-0.1px]';
  const iconInactive = "text-[#5B616E]"; // dark grey
  const iconActive = "text-[#111827]"; // near-black
  const squircle =
    "rounded-[16px] bg-white shadow-[0_12px_24px_rgba(15,23,42,.08)] ring-1 ring-inset ring-[#E3E8EF]";
  const hit =
    "group relative flex w-full items-center gap-3 rounded-[18px] px-3 py-2 transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F7FA]";

  const navItems = [
    {
      label: "Home",
      description: "Personal overview",
      href: "/",
      icon: House,
    },
    {
      label: "Upload",
      description: "Create new jobs",
      href: "/upload",
      icon: Upload,
    },
    {
      label: "Files",
      description: "History & status",
      href: "/jobs",
      icon: SquaresFour,
    },
    {
      label: "Billing",
      description: "Plans & invoices",
      href: "/billing",
      icon: CreditCard,
    },
    {
      label: "Test",
      description: "Lab features",
      href: "/test-button",
      icon: Wallet,
    },
  ];

  return (
    <>
      {/* ====================== DESKTOP: EXACT REVOLUT-STYLE SIDENAV ====================== */}
      <div
        className={`hidden lg:flex fixed top-0 left-0 h-screen ${railWidth} ${railBg} ${railBorder} flex-col z-50 px-6 pb-6`}
        style={{
          fontFamily:
            '"Aeonik Pro","Aeonik",-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif',
        }}
      >
        {/* Brand puck — solid gradient circle */}
        <div className="flex items-center gap-3 pt-6 pb-3">
          <div
            className="h-10 w-10 rounded-full bg-[radial-gradient(64%_64%_at_30%_30%,#9BA2FF_0%,#7F84F6_42%,#5B5FEA_100%)] shadow-[0_16px_32px_rgba(15,23,42,.16)]"
            aria-label="Brand"
            title="AuthorityPoint"
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-[-0.2px] text-[#111827]">AuthorityPoint</span>
            <span className="text-xs text-[#697386] tracking-[-0.1px]">Workspace</span>
          </div>
        </div>

        <div className="mt-2 flex-1 space-y-1">
          {navItems.map(({ icon: Icon, label, description, href }) => {
            const active = isActive(href);

            return (
              <Link
                key={href}
                href={href}
                className={`${hit} ${active ? "bg-white shadow-[0_16px_32px_rgba(15,23,42,.08)]" : "hover:bg-white/60"}`}
                aria-current={active ? "page" : undefined}
                title={label}
                onMouseEnter={href === "/jobs" ? handleHover : undefined}
              >
                <div
                  className={`${iconSizeBox} flex items-center justify-center ${
                    active
                      ? `${squircle} text-[#2B2E3A]`
                      : "rounded-[16px] bg-white/60 text-[#5B616E] border border-transparent group-hover:border-white/80"
                  }`}
                >
                  <span ref={href === "/jobs" ? iconWrapperRef : undefined}>
                    <Icon size={20} weight={active ? "fill" : "regular"} />
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className={`${iconLabel} ${active ? "text-[#111827]" : ""}`}>{label}</span>
                  <span className={iconDescription}>{description}</span>
                </div>
                {active && (
                  <span className="absolute inset-y-1 right-2 w-1.5 rounded-full bg-[#6366F1]" aria-hidden />
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 space-y-3">
          <div className="rounded-[18px] bg-white/80 px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,.08)] ring-1 ring-[#E3E8EF]">
            <p className="text-xs font-semibold uppercase text-[#556079] tracking-[0.12em]">Need help?</p>
            <button
              className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[#373F51] hover:text-[#1F2937] transition-colors"
            >
              <Lifebuoy size={18} weight="duotone" />
              Support Center
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-[#111827] py-2.5 text-[14px] font-medium text-white shadow-[0_12px_24px_rgba(15,23,42,.24)] transition duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:bg-[#0f172a] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F7FA]"
            title="Logout"
          >
            <SignOut size={18} weight="bold" />
            Sign out
          </button>
        </div>
      </div>

      {/* ====================== DESKTOP: TOP STRIP (unchanged functionality; left offset matches thicker rail) ====================== */}
      <div className="hidden lg:flex fixed top-0 left-[264px] right-0 h-16 bg-white border-b border-gray-100 items-center justify-end px-6 z-40">
        {/* right cluster */}
        <div className="flex items-center gap-3">
          <div
            className="hidden md:flex items-center h-9 px-3 rounded-[14px] border border-gray-200 bg-slate-50 text-sm font-medium text-gray-900 min-w-[120px] justify-end tracking-tight tabular-nums"
            style={{
              fontFamily:
                '"Aeonik Pro","Aeonik",-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif',
              letterSpacing: "-0.2px",
            }}
            aria-label="Credits remaining"
          >
            {credits.toLocaleString()} lines
          </div>

          <button
            aria-label="Notifications"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[14px] border border-gray-200 bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-100 transition-colors duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
          >
            <Bell size={18} weight="bold" />
          </button>
          <button
            aria-label="Help"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[14px] border border-gray-200 bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-100 transition-colors duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
          >
            <Lifebuoy size={18} weight="bold" />
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-3 px-2 py-1.5 rounded-[14px] hover:bg-slate-50 transition-colors duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
              aria-haspopup="menu"
              aria-expanded={dropdownOpen}
            >
              {loading ? (
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
              ) : avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={userName}
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-medium text-gray-700">
                  {userName.charAt(0)}
                </div>
              )}
              <span
                className="font-medium text-gray-700 text-sm"
                style={{
                  fontFamily:
                    '"Aeonik Pro","Aeonik",-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif',
                }}
              >
                {userName}
              </span>
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-[12px] shadow-[0_8px_24px_rgba(16,24,40,.10)] overflow-hidden"
                  role="menu"
                >
                  <button
                    className="flex w-full items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    role="menuitem"
                  >
                    Account
                    <ArrowSquareOut size={16} />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50"
                    role="menuitem"
                  >
                    Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ====================== MOBILE: UNCHANGED BELOW ====================== */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between px-4 h-16 bg-white border-b border-gray-200">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="relative w-8 h-8 flex flex-col justify-center items-center"
          >
            <motion.span
              animate={menuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.15 }}
              className="block w-6 h-0.5 bg-gray-800 rounded-sm mb-1"
            />
            <motion.span
              animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
              transition={{ duration: 0.1 }}
              className="block w-6 h-0.5 bg-gray-800 rounded-sm mb-1"
            />
            <motion.span
              animate={menuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.15 }}
              className="block w-6 h-0.5 bg-gray-800 rounded-sm"
            />
          </button>

          <Image
            src={logo}
            alt="AuthorityPoint Logo"
            width={120}
            height={28}
            priority
          />

          <div className="flex items-center gap-3">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            ) : avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={userName}
                width={32}
                height={32}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-medium text-gray-700">
                {userName.charAt(0)}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 left-0 right-0 bottom-0 bg-black z-40"
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50 origin-top"
          >
            <motion.ul
              initial="hidden"
              animate="show"
              exit="hidden"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.03 } },
              }}
              className="flex flex-col px-6 py-4"
            >
              {[
                { name: "Home", href: "/" },
                { name: "Upload File", href: "/upload" },
                { name: "Your Files", href: "/jobs" },
                { name: "Plans & Billing", href: "/billing" },
              ].map((item) => (
                <motion.li
                  key={item.name}
                  variants={{
                    hidden: { opacity: 0, y: -5 },
                    show: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.15 }}
                  className="py-3 text-base font-medium text-gray-800 border-b last:border-0 border-gray-100"
                >
                  <Link href={item.href} onClick={() => setMenuOpen(false)}>
                    {item.name}
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
