import json
from collections import defaultdict

# Load your flat pain embeddings
with open("pain_embeddings5.json", "r", encoding="utf-8") as f:
    flat_pains = json.load(f)

# Nested dict factory
def nested_dict():
    return defaultdict(nested_dict)

hier = nested_dict()

for entry in flat_pains:
    industry = (entry.get("industry") or "general").lower()
    role = (entry.get("role") or "general").lower()
    size = (entry.get("size") or "general").lower()
    pain_text = entry.get("pain", "").strip()

    if not pain_text:
        continue

    pain_entry = {
        "pain": pain_text,
        "category": entry.get("category", "uncategorized"),
        "tags": entry.get("tags", [])
    }

    # ✅ Always store pains in a list
    if isinstance(hier[industry][role][size], list):
        hier[industry][role][size].append(pain_entry)
    else:
        hier[industry][role][size] = [pain_entry]

# Convert defaultdict to normal dict
def convert(d):
    if isinstance(d, defaultdict):
        return {k: convert(v) for k, v in d.items()}
    elif isinstance(d, list):
        return d
    else:
        return d

hier_dict = convert(hier)

# Save hierarchical JSON
with open("pain_library_hier.json", "w", encoding="utf-8") as f:
    json.dump(hier_dict, f, indent=2, ensure_ascii=False)

# Summary stats
count = 0
industry_count = len(hier_dict)
role_count = 0
size_count = 0

for ind, roles in hier_dict.items():
    for role, sizes in roles.items():
        role_count += 1
        for size, pains in sizes.items():
            size_count += 1
            count += len(pains)

print(f"Converted {count} pains into hierarchical format "
      f"across {industry_count} industries, {role_count} roles, {size_count} size buckets.")
