"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import {
  FiLogOut,
  FiBell,
  FiHelpCircle,
} from "react-icons/fi";
import {
  RiHome2Fill,
  RiUploadCloud2Fill,
  RiFileList2Fill,
  RiBankCard2Fill,
} from "react-icons/ri";
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
  const railWidth = "w-[96px]"; // thicker rail
  const iconSizeBox = "h-9 w-9"; // squircle size
  const iconLabel =
    'mt-1 text-[12px] leading-none font-medium tracking-[-0.1px]'; // always shown below
  const iconInactive = "text-[#5B616E]"; // dark grey
  const iconActive = "text-[#111827]"; // near-black
  const squircle =
    "rounded-[14px] bg-white shadow-[0_1px_2px_rgba(16,24,40,.06),0_1px_1px_rgba(16,24,40,.04)] ring-1 ring-inset ring-[#EDF0F6]";
  const hit =
    "flex flex-col items-center justify-start py-3 px-0 transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2";

  return (
    <>
      {/* ====================== DESKTOP: EXACT REVOLUT-STYLE SIDENAV ====================== */}
      <div className={`hidden lg:flex fixed top-0 left-0 h-screen ${railWidth} ${railBg} ${railBorder} flex-col items-center z-50`}>
        {/* Brand puck — solid gradient circle (no logo image) */}
        <div className="w-full flex items-center justify-center pt-4 pb-2">
          <div
            className="h-10 w-10 rounded-full bg-[radial-gradient(72%_72%_at_30%_30%,#9BA2FF_0%,#7F84F6_45%,#5B5FEA_100%)] shadow-[0_8px_24px_rgba(16,24,40,.10)]"
            aria-label="Brand"
            title="Brand"
          />
        </div>

        {/* Nav items: icon with label under; active uses white squircle */}
        <nav className="mt-2 flex-1 flex flex-col items-center">
          {/* Home */}
          <Link
            href="/"
            className={`${hit}`}
            aria-current={isActive("/") ? "page" : undefined}
            title="Home"
          >
            <div
              className={`${iconSizeBox} flex items-center justify-center ${
                isActive("/") ? squircle : ""
              }`}
            >
              <RiHome2Fill
                className={`h-5 w-5 ${
                  isActive("/") ? iconActive : iconInactive
                }`}
              />
            </div>
            <div
              className={`${iconLabel} ${
                isActive("/") ? "text-[#111827]" : "text-[#697386]"
              }`}
            >
              Home
            </div>
          </Link>

          {/* Upload */}
          <Link
            href="/upload"
            className={`${hit}`}
            aria-current={isActive("/upload") ? "page" : undefined}
            title="Upload File"
          >
            <div
              className={`${iconSizeBox} flex items-center justify-center ${
                isActive("/upload") ? squircle : ""
              }`}
            >
              <RiUploadCloud2Fill
                className={`h-5 w-5 ${
                  isActive("/upload") ? iconActive : iconInactive
                }`}
              />
            </div>
            <div
              className={`${iconLabel} ${
                isActive("/upload") ? "text-[#111827]" : "text-[#697386]"
              }`}
            >
              Upload
            </div>
          </Link>

          {/* Your Files */}
          <Link
            href="/jobs"
            className={`${hit}`}
            aria-current={isActive("/jobs") ? "page" : undefined}
            title="Your Files"
            onMouseEnter={handleHover}
          >
            <div
              className={`${iconSizeBox} flex items-center justify-center ${
                isActive("/jobs") ? squircle : ""
              }`}
            >
              <span ref={iconWrapperRef} className="flex">
                <RiFileList2Fill
                  className={`h-5 w-5 ${
                    isActive("/jobs") ? iconActive : iconInactive
                  }`}
                />
              </span>
            </div>
            <div
              className={`${iconLabel} ${
                isActive("/jobs") ? "text-[#111827]" : "text-[#697386]"
              }`}
            >
              Files
            </div>
          </Link>

          {/* Billing */}
          <Link
            href="/billing"
            className={`${hit}`}
            aria-current={isActive("/billing") ? "page" : undefined}
            title="Plans & Billing"
          >
            <div
              className={`${iconSizeBox} flex items-center justify-center ${
                isActive("/billing") ? squircle : ""
              }`}
            >
              <RiBankCard2Fill
                className={`h-5 w-5 ${
                  isActive("/billing") ? iconActive : iconInactive
                }`}
              />
            </div>
            <div
              className={`${iconLabel} ${
                isActive("/billing") ? "text-[#111827]" : "text-[#697386]"
              }`}
            >
              Billing
            </div>
          </Link>

          {/* Test UI button */}
          <Link
            href="/test-button"
            className={`${hit}`}
            aria-current={isActive("/test-button") ? "page" : undefined}
            title="Test UI button"
          >
            <div
              className={`${iconSizeBox} flex items-center justify-center ${
                isActive("/test-button") ? squircle : ""
              }`}
            >
              <RiBankCard2Fill
                className={`h-5 w-5 ${
                  isActive("/test-button") ? iconActive : iconInactive
                }`}
              />
            </div>
            <div
              className={`${iconLabel} ${
                isActive("/test-button") ? "text-[#111827]" : "text-[#697386]"
              }`}
            >
              Test
            </div>
          </Link>
        </nav>

        {/* Bottom actions (logout) — unchanged behavior, visuals neutral */}
        <div className="w-full mt-auto mb-4 px-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-[18px] text-[14px] font-medium text-white shadow-sm transition-all duration-150 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
            style={{ background: "linear-gradient(#5a5a5a, #1c1c1c)" }}
            title="Logout"
          >
            <FiLogOut className="h-5 w-5" />
          </button>
          <div className="w-full border-t border-[#E9ECF2] mt-3" />
        </div>
      </div>

      {/* ====================== DESKTOP: TOP STRIP (unchanged functionality; left offset matches thicker rail) ====================== */}
      <div className="hidden lg:flex fixed top-0 left-[96px] right-0 h-16 bg-white border-b border-gray-100 items-center justify-end px-6 z-40">
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
            <FiBell className="h-5 w-5" />
          </button>
          <button
            aria-label="Help"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[14px] border border-gray-200 bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-100 transition-colors duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
          >
            <FiHelpCircle className="h-5 w-5" />
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
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50"
                    role="menuitem"
                  >
                    Account
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
