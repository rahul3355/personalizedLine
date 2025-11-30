
import re

keywords = [
    "Money", "Coin", "Card", "Wallet", "Bank", "Receipt", "Tag", "Credit", "Dollar", 
    "Currency", "Payment", "Price", "Shopping", "Basket", "Cart", "Bill", "Invoice", 
    "Calculator", "Percent", "Chart", "Graph", "Trend"
]

found_icons = set()

with open("node_modules/react-icons/pi/index.d.ts", "r", encoding="utf-8") as f:
    content = f.read()
    
    # Regex to find export declarations
    matches = re.findall(r"export declare const (Pi[a-zA-Z0-9]+): IconType;", content)
    
    for icon in matches:
        for keyword in keywords:
            if keyword in icon:
                found_icons.add(icon)
                break

sorted_icons = sorted(list(found_icons))

# Generate the TSX content
imports = ", ".join(sorted_icons)
icon_objects = ",\n".join([f'  {{ name: "{icon}", icon: {icon} }}' for icon in sorted_icons])

tsx_content = f"""import React from 'react';
import {{
  {imports}
}} from "react-icons/pi";

const icons = [
{icon_objects}
];

export default function IconGallery() {{
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Billing & Finance Icons ({len(sorted_icons)})</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {{icons.map(({{ name, icon: Icon }}) => (
          <div key={{name}} className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
            <Icon className="w-12 h-12 text-gray-700 mb-3" />
            <span className="text-xs text-gray-500 font-mono select-all cursor-pointer hover:text-blue-600" title="Click to select">{{name}}</span>
          </div>
        ))}}
      </div>
    </div>
  );
}}
"""

with open("pages/icon-gallery.tsx", "w", encoding="utf-8") as f:
    f.write(tsx_content)

print(f"Generated pages/icon-gallery.tsx with {len(sorted_icons)} icons.")
