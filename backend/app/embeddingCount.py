import os
import json
from openai import OpenAI

# Monkeypatch for proxies bug (only matters if DEBUG=False)
from openai._base_client import SyncHttpxClientWrapper
class CustomWrapper(SyncHttpxClientWrapper):
    def __init__(self, *args, **kwargs):
        kwargs.pop("proxies", None)
        super().__init__(*args, **kwargs)

import openai
openai._base_client.SyncHttpxClientWrapper = CustomWrapper

# Load OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ---------------------------
# Toggle for debug mode
# ---------------------------
DEBUG = True   # True = just count pains, False = embed and save

# ---------------------------
# Files to process
# ---------------------------
json_files = [
   "industries3.json",
    "roles3.json",
    "company_size.json",
    "general.json",
    "edge_cases.json",
    # composite files
    "composite_saas.json",
    "composite_marketing.json",
    "composite_it.json",
    "composite_recruitment.json",
    "composite_consulting.json",
    "composite_finance.json",
    "composite_education.json",
    "composite_healthcare.json",
    "composite_realestate.json",
    "composite_professional.json",
    "composite_agencies.json"
]

# ---------------------------
# Embedding helper
# ---------------------------
def embed_text(text: str):
    response = client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

# ---------------------------
# Count helper (for DEBUG mode)
# ---------------------------
def count_pains(file_name):
    with open(file_name, "r", encoding="utf-8") as f:
        data = json.load(f)

    if file_name == "industries.json":
        return sum(len(v) for v in data.values())
    elif file_name == "roles.json":
        total = 0
        for role_data in data.values():
            total += len(role_data.get("service_relevant", []))
            total += len(role_data.get("general_pains", []))
        return total
    elif file_name == "company_size.json":
        return sum(len(v) for v in data.values())
    elif file_name == "general.json":
        return len(data.get("general", []))
    elif file_name == "edge_cases.json":
        return sum(len(v) for v in data.values())
    else:  # composite files
        return sum(len(v) for v in data.values())

# ---------------------------
# Main logic
# ---------------------------
all_embeddings = []
total_count = 0
file_counts = {}

for file_name in json_files:
    if not os.path.exists(file_name):
        file_counts[file_name] = "MISSING"
        continue

    if DEBUG:
        c = count_pains(file_name)
        file_counts[file_name] = c
        total_count += c
    else:
        with open(file_name, "r", encoding="utf-8") as f:
            data = json.load(f)

        if file_name == "industries.json":
            for industry, pains in data.items():
                for pain in pains:
                    all_embeddings.append({
                        "pain": pain,
                        "embedding": embed_text(pain),
                        "source": "industries",
                        "industry": industry,
                        "role": None,
                        "size": None
                    })

        elif file_name == "roles.json":
            for role, role_data in data.items():
                for pain in role_data.get("service_relevant", []):
                    all_embeddings.append({
                        "pain": pain,
                        "embedding": embed_text(pain),
                        "source": "roles",
                        "industry": None,
                        "role": role,
                        "size": None
                    })
                for pain in role_data.get("general_pains", []):
                    all_embeddings.append({
                        "pain": pain,
                        "embedding": embed_text(pain),
                        "source": "roles",
                        "industry": None,
                        "role": role,
                        "size": None
                    })

        elif file_name == "company_size.json":
            for size, pains in data.items():
                for pain in pains:
                    all_embeddings.append({
                        "pain": pain,
                        "embedding": embed_text(pain),
                        "source": "company_size",
                        "industry": None,
                        "role": None,
                        "size": size
                    })

        elif file_name == "general.json":
            for pain in data.get("general", []):
                all_embeddings.append({
                    "pain": pain,
                    "embedding": embed_text(pain),
                    "source": "general",
                    "industry": None,
                    "role": None,
                    "size": None
                })

        elif file_name == "edge_cases.json":
            for industry, pains in data.items():
                for pain in pains:
                    all_embeddings.append({
                        "pain": pain,
                        "embedding": embed_text(pain),
                        "source": "edge_cases",
                        "industry": industry,
                        "role": None,
                        "size": None
                    })

        else:  # composite
            for key, pains in data.items():
                try:
                    industry, role, size = key.split("_", 2)
                except ValueError:
                    industry, role, size = (None, None, None)
                for pain in pains:
                    all_embeddings.append({
                        "pain": pain,
                        "embedding": embed_text(pain),
                        "source": file_name.replace(".json", ""),
                        "industry": industry,
                        "role": role,
                        "size": size
                    })

# ---------------------------
# Output
# ---------------------------
if DEBUG:
    print("\nPer-file counts:")
    print("-" * 40)
    for k, v in file_counts.items():
        print(f"{k:<30} {v}")
    print("-" * 40)
    print(f"TOTAL pains: {total_count}")
else:
    with open("pain_embeddings3.json", "w", encoding="utf-8") as f:
        json.dump(all_embeddings, f, ensure_ascii=False, indent=2)
    print(f"✅ Collected and embedded {len(all_embeddings)} pains")
    print("💾 Saved embeddings to pain_embeddings3.json")
