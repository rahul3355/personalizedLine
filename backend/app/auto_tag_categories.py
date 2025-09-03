import json

# Load hierarchical pains
with open("pain_library_hier.json", "r", encoding="utf-8") as f:
    pain_library = json.load(f)

# Define 10 categories with keyword rules
CATEGORY_KEYWORDS = {
    "scaling": [
        "scale", "scaling", "growth", "expand", "churn", "cac", "cloud cost", "headcount"
    ],
    "compliance": [
        "compliance", "regulation", "gdpr", "hipaa", "audit", "legal", "policy", "privacy", "risk"
    ],
    "personalization": [
        "personalization", "personalised", "outreach", "messaging", "robotic", "customer communication", "response rate"
    ],
    "talent": [
        "hiring", "recruit", "recruitment", "training", "turnover", "skills", "team bandwidth", "staff"
    ],
    "operations": [
        "process", "efficiency", "workflow", "integration", "operations", "system", "manual", "automation", "bottleneck"
    ],
    "technology": [
        "tech", "it", "integration", "legacy", "tools", "platform", "data silo", "migration", "infrastructure"
    ],
    "customer_experience": [
        "customer", "onboarding", "support", "adoption", "retention", "renewal", "satisfaction", "experience"
    ],
    "competition": [
        "competition", "competitor", "competitive", "pricing", "feature parity", "differentiate", "crowded market"
    ],
    "financial": [
        "budget", "roi", "cost", "margin", "funding", "investment", "spend", "financial pressure"
    ],
    "innovation": [
        "innovation", "feature", "ship fast", "release", "roadmap", "launch", "product velocity", "speed"
    ]
}

def assign_category(pain_text):
    text = pain_text.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return category
    return "uncategorized"

def walk_and_tag(node):
    if isinstance(node, dict):
        for key, value in node.items():
            walk_and_tag(value)
    elif isinstance(node, list):
        for entry in node:
            if isinstance(entry, dict):
                entry["category"] = assign_category(entry["pain"])
                if "tags" not in entry:
                    entry["tags"] = []

# Walk the library and tag categories
walk_and_tag(pain_library)

# Save updated library
with open("pain_library_hier.json", "w", encoding="utf-8") as f:
    json.dump(pain_library, f, indent=2, ensure_ascii=False)

print("Auto-tagged pains into 10 categories. Saved updated pain_library_hier.json")
