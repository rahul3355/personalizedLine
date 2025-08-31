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
} from "react-icons/fi";
import { supabase } from "../lib/supabaseClient";
import Image from "next/image";
import logo from "../pages/logo.png";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../lib/AuthProvider";

export default function Navbar() {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { userInfo } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

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
  const maxCredits = userInfo?.max_credits ?? 5000;
  const percent = Math.min((credits / maxCredits) * 100, 100);

  const userName = userInfo?.full_name || "User";
  const avatarUrl = userInfo?.avatar_url || null;

  return (
    <div className="fixed top-0 left-0 h-screen w-60 bg-white border-r border-gray-100 flex flex-col font-sans z-50">
      {/* Top Section: Logo */}
      <div className="p-6 border-b border-gray-100">
        <Image
          src={logo}
          alt="AuthorityPoint Logo"
          width={180}
          height={40}
          priority
          className="transition duration-500 ease-in-out hover:scale-105 hover:brightness-110 hover:drop-shadow-md"
        />
      </div>

      {/* Middle Section: Nav Links */}
      <div className="flex-1 flex flex-col px-4 py-6 gap-y-4">
        <Link
          href="/"
          className={`flex items-center px-3 py-2 rounded-lg text-[15px] font-medium transition-all duration-200 ${
            router.pathname === "/"
              ? "bg-gray-100 text-gray-900 shadow-sm"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <FiHome className="mr-3 h-5 w-5" />
          Home
        </Link>
        <Link
          href="/upload"
          className={`flex items-center px-3 py-2 rounded-lg text-[15px] font-medium transition-all duration-200 ${
            router.pathname === "/upload"
              ? "bg-gray-100 text-gray-900 shadow-sm"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <FiUpload className="mr-3 h-5 w-5" />
          Upload File
        </Link>
        <Link
          href="/jobs"
          className={`flex items-center px-3 py-2 rounded-lg text-[15px] font-medium transition-all duration-200 ${
            router.pathname === "/jobs"
              ? "bg-gray-100 text-gray-900 shadow-sm"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <FiFileText className="mr-3 h-5 w-5" />
          Past Files
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
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 0 8px rgba(0,0,0,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <FiLogOut className="h-5 w-5" />
          Logout
        </button>
      </div>

      {/* Top Strip Overlay */}
      <div className="fixed top-0 left-60 right-0 h-16 border-b border-gray-100 bg-white flex items-center justify-between px-8 shadow-sm z-40">
        {/* Left (empty for balance, could later hold breadcrumbs) */}
        <div className="flex-1" />

        {/* Middle: Credits capsule */}
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
          <div className="relative w-32 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="absolute top-0 left-0 h-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500 ease-in-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
            {credits} / {maxCredits}
          </span>
          <button className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 transition">
            Buy    
          </button>
        </div>

        {/* Right: Icons + User */}
        <div className="flex items-center gap-6 ml-6">
          <FiBell className="w-5 h-5 cursor-pointer text-gray-500 hover:text-gray-900 transition" />
          <FiHelpCircle className="w-5 h-5 cursor-pointer text-gray-500 hover:text-gray-900 transition" />

          {/* User Dropdown with Avatar + Name */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition"
            >
              {avatarUrl ? (
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
              <span className="font-medium text-gray-700 text-sm">{userName}</span>
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
    </div>
  );
}
