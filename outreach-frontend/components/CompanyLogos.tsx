import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface CompanyLogo {
  name: string;
  logo: string; // URL or path to logo
  colorLogo: string; // Colored version
}

const companies: CompanyLogo[] = [
  {
    name: "Apple",
    logo: "https://cdn.simpleicons.org/apple/gray",
    colorLogo: "https://cdn.simpleicons.org/apple",
  },
  {
    name: "Microsoft",
    logo: "https://cdn.simpleicons.org/microsoft/gray",
    colorLogo: "https://cdn.simpleicons.org/microsoft",
  },
  {
    name: "NVIDIA",
    logo: "https://cdn.simpleicons.org/nvidia/gray",
    colorLogo: "https://cdn.simpleicons.org/nvidia",
  },
  {
    name: "Salesforce",
    logo: "https://cdn.simpleicons.org/salesforce/gray",
    colorLogo: "https://cdn.simpleicons.org/salesforce",
  },
  {
    name: "BlackRock",
    logo: "https://cdn.simpleicons.org/blackrock/gray",
    colorLogo: "https://cdn.simpleicons.org/blackrock",
  },
  {
    name: "Citi",
    logo: "https://cdn.simpleicons.org/citi/gray",
    colorLogo: "https://cdn.simpleicons.org/citi",
  },
];

export function CompanyLogos() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="w-full py-16">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-center text-sm font-medium text-gray-600 mb-12 tracking-wide uppercase">
          Received positive replies from:
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center justify-items-center">
          {companies.map((company, index) => (
            <div
              key={company.name}
              className="relative w-full h-16 flex items-center justify-center transition-all duration-300 hover:bg-gray-50 rounded-lg p-4 cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <img
                src={hoveredIndex === index ? company.colorLogo : company.logo}
                alt={company.name}
                className="h-10 w-auto object-contain transition-all duration-300"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
