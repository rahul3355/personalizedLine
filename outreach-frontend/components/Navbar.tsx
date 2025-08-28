"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Upload, FolderClock } from "lucide-react"; // optional icons

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/upload", label: "Upload File", icon: Upload },
    { href: "/jobs", label: "Past Files", icon: FolderClock },
  ];

  return (
    <nav className="w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col">
      {/* Brand / Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <span className="text-xl font-bold text-gray-800">Mailite</span>
      </div>

      {/* Nav Links */}
      <ul className="flex-1 px-4 py-6 space-y-2">
        {links.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                pathname === href
                  ? "bg-gray-100 text-gray-900 font-semibold"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Bottom Button */}
      <div className="p-4 border-t border-gray-200">
        <button className="w-full bg-gradient-to-r from-gray-800 to-gray-900 text-white py-2 px-4 rounded-lg shadow hover:opacity-90">
          Get Started
        </button>
      </div>
    </nav>
  );
}
