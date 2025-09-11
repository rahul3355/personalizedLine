"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";
import { useRouter } from "next/router";
import {
  FiHome,
  FiUpload,
  FiFileText,
  FiLogOut,
  FiBell,
  FiHelpCircle,
  FiMenu,
  FiX,
} from "react-icons/fi";
import { supabase } from "../lib/supabaseClient";
import Image from "next/image";
import logo from "../pages/logo.png";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../lib/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [shinePlayed, setShinePlayed] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);

  const { userInfo, loading } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [menuOpen]);


  // Close dropdown when clicking outside
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Pull data from userInfo
  const credits = userInfo?.credits_remaining ?? 0;
  const userName = loading
    ? ""
    : userInfo?.full_name
      ? userInfo.full_name
      : "";
  const avatarUrl = loading ? null : userInfo?.avatar_url || null;

  return (
    <>
      {/* ---------------- Desktop Navbar ---------------- */}
      <div className="hidden lg:flex fixed top-0 left-0 h-screen w-60 bg-white border-r border-gray-100 flex-col font-sans z-50">
        {/* Top Section: Logo */}
        <div className="p-6 border-b border-gray-100">
          <div
            className="relative group w-[180px] h-[40px] cursor-pointer"
            onMouseEnter={() => {
              if (!shinePlayed) setShinePlayed(true);
            }}
          >
            {/* Logo image */}
            <Image
              src={logo}
              alt="AuthorityPoint Logo"
              fill
              
            />

            {/* Shimmer overlay, only triggers once */}
            {shinePlayed && (
              <motion.div
                key="shine"
                className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                style={{ mixBlendMode: "screen" }}
              />
            )}
          </div>

        </div>

        {/* Middle Section: Nav Links */}
        <div className="flex-1 flex flex-col px-4 py-6 gap-y-4">
          <Link
            href="/"
            className={`flex items-center px-3 py-2 rounded-lg text-[15px] font-medium transition-all duration-200 ${router.pathname === "/"
              ? "bg-gray-100 text-gray-900 shadow-sm"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
          >
            <FiHome className="mr-3 h-5 w-5" />
            Home
          </Link>
          <Link
            href="/upload"
            className={`flex items-center px-3 py-2 rounded-lg text-[15px] font-medium transition-all duration-200 ${router.pathname === "/upload"
              ? "bg-gray-100 text-gray-900 shadow-sm"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
          >
            <FiUpload className="mr-3 h-5 w-5" />
            Upload File
          </Link>
          <Link
            href="/jobs"
            className={`flex items-center px-3 py-2 rounded-lg text-[15px] font-medium transition-all duration-200 ${router.pathname === "/jobs"
              ? "bg-gray-100 text-gray-900 shadow-sm"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
          >
            <FiFileText className="mr-3 h-5 w-5" />
            Your Files
          </Link>
          <Link
            href="/billing"
            className={`flex items-center px-3 py-2 rounded-lg text-[15px] font-medium transition-all duration-200 ${router.pathname === "/billing"
              ? "bg-gray-100 text-gray-900 shadow-sm"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
          >
            <CreditCard className="mr-3 h-5 w-5" />
            Plans & Billing
          </Link>
        </div>

        {/* Bottom Section: Logout */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white text-[15px] tracking-tight shadow-sm transition-all duration-300"
            style={{
              background: "linear-gradient(#5a5a5a, #1c1c1c)",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
            }}
          >
            <FiLogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

      {/* ---------------- Desktop Top Strip ---------------- */}
      <div className="hidden lg:flex fixed top-0 left-60 right-0 h-16 border-b border-gray-100 bg-white items-center justify-between px-8 shadow-sm z-40">
        <div className="flex-1" />
        <div className="flex items-center gap-6 ml-6">
          <FiBell className="w-5 h-5 cursor-pointer text-gray-500 hover:text-gray-900 transition" />
          <FiHelpCircle className="w-5 h-5 cursor-pointer text-gray-500 hover:text-gray-900 transition" />
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition"
            >{loading ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            ) :
              avatarUrl ? (
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
              <span className="font-medium text-gray-700 text-sm">
                {userName}
              </span>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                <button className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50">
                  Account
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------- Mobile Navbar ---------------- */}
      {/* --- Mobile Navbar --- */}
      {/* ---------------- Mobile Navbar ---------------- */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between px-4 h-16 bg-white border-b border-gray-200">
          {/* Hamburger / X */}
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

          {/* Logo */}
          <Image src={logo} alt="AuthorityPoint Logo" width={120} height={28} priority />

          {/* Avatar */}
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

      {/* Overlay (fixed, disables scroll) */}
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

      {/* Dropdown Menu (fixed under navbar) */}
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
