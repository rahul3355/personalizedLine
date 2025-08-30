"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { FiHome, FiUpload, FiFileText, FiLogOut } from "react-icons/fi";
import { supabase } from "../lib/supabaseClient";

export default function Navbar() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="fixed top-0 left-0 h-screen w-60 bg-white border-r border-gray-100 flex flex-col font-sans">
      {/* Top Section: Logo */}
      <div className="p-6 border-b border-gray-100">
        <span className="text-xl font-bold text-gray-900 tracking-tight">
          AuthorityPoint
        </span>
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
    </nav>
  );
}
