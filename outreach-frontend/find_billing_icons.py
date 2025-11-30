
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

# Sort and print the first 100 icons
sorted_icons = sorted(list(found_icons))
print(f"Found {len(sorted_icons)} icons.")
for icon in sorted_icons[:120]:
    print(icon)
