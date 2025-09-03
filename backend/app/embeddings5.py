import os
import json
import time
import math
import random
from openai import OpenAI

# Monkeypatch for proxies bug
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
# Settings
# ---------------------------
DEBUG = False   # True = just count pains, False = embed and save
OUTPUT_FILE = "pain_embeddings5.json"
BATCH_SIZE = 50
MAX_RETRIES = 3

# ---------------------------
# Files to process
# ---------------------------
json_files = [
    "industries3.json",
    "roles3.json",
    "company_size.json",
    "general.json",
    "edge_cases.json",
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
# Embedding helpers
# ---------------------------
def embed_batch(texts):
    """Embed a batch of texts with retry logic."""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.embeddings.create(
                input=texts,
                model="text-embedding-3-small"
            )
            return [item.embedding for item in response.data]
        except Exception as e:
            wait_time = 2 ** attempt + random.random()
            print(f"⚠️ Batch failed (attempt {attempt}/{MAX_RETRIES}): {e}")
            if attempt < MAX_RETRIES:
                print(f"⏳ Retrying in {wait_time:.1f}s...")
                time.sleep(wait_time)
            else:
                raise RuntimeError(f"❌ Failed after {MAX_RETRIES} retries: {e}")

def count_pains(file_name):
    with open(file_name, "r", encoding="utf-8") as f:
        data = json.load(f)

    if file_name == "industries3.json":
        return sum(len(v) for section in data.values() for v in section.values())
    elif file_name == "roles3.json":
        return sum(len(v) for section in data.values() for v in section.values())
    elif file_name == "company_size.json":
        return sum(len(v) for v in data.values())
    elif file_name == "general.json":
        return len(data.get("general", []))
    elif file_name == "edge_cases.json":
        return sum(len(v) for v in data.values())
    else:
        return sum(len(v) for v in data.values())

# ---------------------------
# Main logic
# ---------------------------
all_embeddings = []
file_counts = {}
total_count = 0

start_time = time.time()

# Count all pains first
for file_name in json_files:
    if not os.path.exists(file_name):
        file_counts[file_name] = "MISSING"
        continue
    c = count_pains(file_name)
    file_counts[file_name] = c
    total_count += c

elapsed = int(time.time() - start_time)
print(f"\n⏱️ Time elapsed so far: {elapsed}s")
print("\nPer-file counts:")
print("-" * 40)
for k, v in file_counts.items():
    print(f"{k:<30} {v}")
print("-" * 40)
print(f"TOTAL pains: {total_count}\n")

if DEBUG:
    print("✅ DEBUG mode: no embeddings done.")
else:
    print("🚀 Starting embeddings...\n")
    current = 0
    batch_num = 0
    total_batches = math.ceil(total_count / BATCH_SIZE)

    for file_name in json_files:
        if not os.path.exists(file_name):
            continue

        with open(file_name, "r", encoding="utf-8") as f:
            data = json.load(f)

        pains_with_meta = []

        if file_name == "industries3.json":
            for industry, sections in data.items():
                for section, pains in sections.items():
                    for pain in pains:
                        pains_with_meta.append((pain, "industries", industry, None, None))

        elif file_name == "roles3.json":
            for role, sections in data.items():
                for section, pains in sections.items():
                    for pain in pains:
                        pains_with_meta.append((pain, "roles", None, role, None))

        elif file_name == "company_size.json":
            for size, pains in data.items():
                for pain in pains:
                    pains_with_meta.append((pain, "company_size", None, None, size))

        elif file_name == "general.json":
            for pain in data.get("general", []):
                pains_with_meta.append((pain, "general", None, None, None))

        elif file_name == "edge_cases.json":
            for industry, pains in data.items():
                for pain in pains:
                    pains_with_meta.append((pain, "edge_cases", industry, None, None))

        else:  # composites
            for key, pains in data.items():
                try:
                    industry, role, size = key.split("_", 2)
                except ValueError:
                    industry, role, size = (None, None, None)
                for pain in pains:
                    pains_with_meta.append((pain, file_name.replace(".json", ""), industry, role, size))

        # Process pains in batches
        for i in range(0, len(pains_with_meta), BATCH_SIZE):
            batch = pains_with_meta[i:i+BATCH_SIZE]
            texts = [p[0] for p in batch]

            embeddings = embed_batch(texts)

            for (pain, source, industry, role, size), emb in zip(batch, embeddings):
                all_embeddings.append({
                    "pain": pain,
                    "embedding": emb,
                    "source": source,
                    "industry": industry,
                    "role": role,
                    "size": size
                })

            current += len(batch)
            batch_num += 1
            elapsed = int(time.time() - start_time)
            print(f"✅ Batch {batch_num}/{total_batches} | Embedded {current}/{total_count} pains | Elapsed: {elapsed}s")

    # Save results
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_embeddings, f, ensure_ascii=False, indent=2)

    end_time = time.time()
    elapsed = end_time - start_time
    minutes, seconds = divmod(int(elapsed), 60)

    print(f"\n✅ Collected and embedded {len(all_embeddings)} pains")
    print(f"💾 Saved embeddings to {OUTPUT_FILE}")
    print(f"⏱️ Total time taken: {minutes} min {seconds} sec")
