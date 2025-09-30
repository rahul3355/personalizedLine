"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { FiUserPlus } from "react-icons/fi";
import {
  PiNavigationArrowFill,
  PiQuestionBold,
  PiGearSixFill,
  PiSignOutBold,
} from "react-icons/pi";

import { PiHouseLineFill } from "react-icons/pi";
import { PiFileArrowDownFill } from "react-icons/pi";
import { PiCreditCardFill } from "react-icons/pi";
import { PiMoneyWavyFill } from "react-icons/pi";


import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import logo from "../pages/logo.png";
import aplogo from "./aplogo.svg"



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
  const railBg = "bg-[#F7F7F7]"; // very light grey
  // before: const railBorder = "border-r border-[#E9ECF2]";
  const railBorder = "border-r border-transparent";

  const railWidth = "w-[108px]"; // thicker rail
  const iconSizeBox = "h-9 w-9"; // squircle size
  const iconLabel =
    'mt-1.5 text-[12px] leading-none font-medium tracking-[-0.1px]'; // always shown below
  const iconInactive = "text-[#717173]"; // grey 
  const iconActive = "text-[#4F55F1]"; // purple
  const labelInactive = "text-[#717173]";        // default label color
  const labelActive = "text-[#4F55F1]";          // ACTIVE label color
  // flat squircle for ACTIVE (no shadow)
  const squircleActive = "rounded-[14px] bg-white";
  const squircle =
    "rounded-[14px] bg-white ";
  const hit =
    "flex flex-col items-center justify-start py-3 px-0 transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus:outline-none cursor-pointer select-none ";

  const pageTitle = {
    "/": "Home",
    "/upload": "Enrich",
    "/jobs": "Files",
    "/billing": "Billing",
    "/test-button": "Test",
  }[router.pathname] ?? "";

  const displayName = loading ? "" : (userInfo?.full_name ?? "");
  const handleName =
    loading ? "" : (userInfo?.email ? `@${userInfo.email.split("@")[0]}` : "");
  const initials =
    displayName
      ? displayName.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase()
      : (userName?.[0]?.toUpperCase() ?? "U");


  return (
    <>
      {/* ====================== DESKTOP: EXACT REVOLUT-STYLE SIDENAV ====================== */}
      <div className={`hidden lg:flex fixed top-0 left-0 h-screen ${railWidth} ${railBg} ${railBorder} flex-col items-center z-50`}>
        {/* Brand puck — solid gradient circle (no logo image) */}
        {/* Brand logo in a flat white squircle, same size as selected icon */}
        <div className="w-full flex items-center justify-center pt-4 pb-2">
          <div className="h-9 w-9 rounded-[14px] bg-white flex items-center justify-center">
            <Link href="/">
              <Image src={aplogo} alt="AuthorityPoint" width={18} height={18} priority />
            </Link>
          </div>
        </div>


        {/* Nav items: icon with label under; active uses white squircle */}
        <nav className="mt-2 flex-1 flex flex-col items-center">
          {/* Home */}
          <Link href="/" className={`${hit} group`} aria-current={isActive("/") ? "page" : undefined} title="Home">
            <div
              className={`${iconSizeBox} flex items-center justify-center
      ${isActive("/") ? squircleActive : "group-hover:bg-[#E2E2E7] group-hover:rounded-[14px]"}
    `}
            >
              <PiHouseLineFill className={`h-5 w-5 ${isActive("/") ? iconActive : iconInactive}`} />

            </div>
            <div className={`${iconLabel} ${isActive("/") ? labelActive : labelInactive}`}>
              Home
            </div>

          </Link>

          {/* Upload */}
          <Link href="/upload" className={`${hit} group active:scale-[0.98]`} style={{ transform: "translateZ(0)", willChange: "transform" }} aria-current={isActive("/upload") ? "page" : undefined} title="Upload">
            <div
              className={`${iconSizeBox} flex items-center justify-center
      ${isActive("/upload") ? squircleActive : "group-hover:bg-[#E2E2E7] group-hover:rounded-[14px]"}
    `}
            >
              <FiUserPlus
                className={`h-5 w-5 ${isActive("/upload") ? iconActive : iconInactive
                  }`}
              />
            </div>
            <div
              className={`${iconLabel} ${isActive("/upload") ? labelActive : labelInactive
                }`}
            >
              Enrich
            </div>
          </Link>

          {/* Your Files */}
          <Link href="/jobs" className={`${hit} group`} aria-current={isActive("/jobs") ? "page" : undefined} title="Your Files">
            <div
              className={`${iconSizeBox} flex items-center justify-center
      ${isActive("/jobs") ? squircleActive : "group-hover:bg-[#E2E2E7] group-hover:rounded-[14px]"}
    `}
            >
              <span ref={iconWrapperRef} className="flex">
                <PiFileArrowDownFill
                  className={`h-5 w-5 ${isActive("/jobs") ? iconActive : iconInactive
                    }`}
                />
              </span>
            </div>
            <div
              className={`${iconLabel} ${isActive("/jobs") ? labelActive : labelInactive
                }`}
            >
              Files
            </div>
          </Link>

          {/* Billing */}
          <Link href="/billing" className={`${hit} group`} aria-current={isActive("/billing") ? "page" : undefined} title="Billing">
            <div
              className={`${iconSizeBox} flex items-center justify-center
      ${isActive("/billing") ? squircleActive : "group-hover:bg-[#E2E2E7] group-hover:rounded-[14px]"}
    `}
            >
              <PiCreditCardFill
                className={`h-5 w-5 ${isActive("/billing") ? iconActive : iconInactive
                  }`}
              />
            </div>
            <div
              className={`${iconLabel} ${isActive("/billing") ? labelActive : labelInactive
                }`}
            >
              Billing
            </div>
          </Link>

          {/* Test UI button */}
          <Link href="/test-button" className={`${hit} group`} aria-current={isActive("/test-button") ? "page" : undefined} title="Test UI button">
            <div
              className={`${iconSizeBox} flex items-center justify-center
      ${isActive("/test-button") ? squircleActive : "group-hover:bg-[#E2E2E7] group-hover:rounded-[14px]"}
    `}
            >
              <PiMoneyWavyFill
                className={`h-5 w-5 ${isActive("/test-button") ? iconActive : iconInactive
                  }`}
              />
            </div>
            <div
              className={`${iconLabel} ${isActive("/test-button") ? labelActive : labelInactive
                }`}
            >
              Test
            </div>
          </Link>
        </nav>


      </div>

      {/* ====================== DESKTOP: TOP STRIP (thicker + bolder + left) ====================== */}
      <div className="hidden lg:flex fixed top-0 left-[90px] right-0 h-[68px] bg-[#F7F7F7] items-center justify-between pl-4 pr-5 z-40">

        {/* Title */}
        <h1
          className="text-[26px] leading-[32px] font-bold text-[#111827] tracking-[-0.2px]"
          style={{
            fontFamily:
              '"Aeonik Pro","Aeonik",-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif',
          }}
        >
          {pageTitle}
        </h1>


        {/* Right cluster: Credits + Avatar */}
        <div className="flex items-center gap-[10px]">
          <div
            className="inline-flex items-center h-8 px-3 rounded-full bg-white border border-[#E6E6E6]
               text-[12px] font-medium text-[#111827] tracking-tight tabular-nums"
            aria-label="Credits"
          >
            <span className="opacity-70 mr-2">Credits</span>
            {credits.toLocaleString()}
          </div>

          <div className="relative" ref={dropdownRef}>
            {/* Avatar button */}
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden bg-[#EEF0F4] focus:outline-none"
              aria-haspopup="menu" aria-expanded={dropdownOpen}
            >
              {loading ? (
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
              ) : avatarUrl ? (
                <Image src={avatarUrl} alt={displayName} width={32} height={32} className="rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[12px] font-semibold text-gray-700">
                  {initials}
                </div>
              )}
            </button>

            {/* Revolut-style dropdown */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 mt-2 w-[360px] rounded-2xl bg-white
             ring-1 ring-[#EEF0F4] shadow-[0_20px_60px_rgba(16,24,40,0.08),0_2px_8px_rgba(16,24,40,0.06)] p-4"
                  role="menu"
                  style={{
                    fontFamily:
                      '"Aeonik Pro","Aeonik",-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif',
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-1 py-2">
                    <div>
                      <div className="text-[26px] leading-6 font-semibold text-[#111827] tracking-[-0.2px]">
                        {displayName}
                      </div>

                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#EEF0F4] overflow-hidden flex items-center justify-center">
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt={displayName} width={40} height={40} className="rounded-full object-cover" />
                      ) : (
                        <span className="text-[13px] font-semibold text-gray-700">{initials}</span>
                      )}
                    </div>
                  </div>

                  <div className="my-2 border-t border-[#EAECEE]" />

                  {/* Rows (transparent icons, no border) */}
                  <div className="flex flex-col gap-1">
                    <Link href="/help" role="menuitem" className="group flex items-center h-11 px-2.5 rounded-[12px] hover:bg-[#F7F7F7]">
                      <span className="mr-3 inline-flex items-center justify-center min-w-[20px] bg-transparent text-[#4F55F1]">
                        <PiQuestionBold className="w-5 h-5" />
                      </span>
                      <span className="text-[15px] text-[#111827]">Help</span>
                    </Link>

                    <Link href="/settings" role="menuitem" className="group flex items-center h-11 px-2.5 rounded-[12px] hover:bg-[#F7F7F7]">
                      <span className="mr-3 inline-flex items-center justify-center min-w-[20px] bg-transparent text-[#4F55F1]">
                        <PiGearSixFill className="w-5 h-5" />
                      </span>
                      <span className="text-[15px] text-[#111827]">Settings</span>
                    </Link>

                    <div className="my-1 border-t border-[#EAECEE]" />

                    <Link href="/about" role="menuitem" className="group flex items-center h-11 px-2.5 rounded-[12px] hover:bg-[#F7F7F7]">
                      <span className="mr-3 inline-flex items-center justify-center min-w-[20px] bg-transparent text-[#4F55F1]">
                        <PiNavigationArrowFill className="w-5 h-5" />
                      </span>
                      <span className="text-[15px] text-[#111827]">About us</span>
                    </Link>

                    <div className="my-1 border-t border-[#EAECEE]" />

                    <button onClick={handleLogout} role="menuitem" className="group flex items-center h-11 px-2.5 rounded-[12px] hover:bg-[#F7F7F7] w-full text-left">
                      <span className="mr-3 inline-flex items-center justify-center min-w-[20px] bg-transparent text-[#4F55F1]">
                        <PiSignOutBold className="w-5 h-5" />
                      </span>
                      <span className="text-[15px] text-[#111827]">Log out</span>
                    </button>
                  </div>

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
