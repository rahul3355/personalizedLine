"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/upload", label: "Upload File" },
    { href: "/jobs", label: "Past Files" },
  ];

  return (
    <nav className="bg-gray-900 text-white px-6 py-3 shadow-md">
      <ul className="flex space-x-6">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`hover:text-blue-400 ${
                pathname === link.href ? "text-blue-400 font-bold" : ""
              }`}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
