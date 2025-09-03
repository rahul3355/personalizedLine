import os
import json
import time
import numpy as np
from openai import OpenAI

# --- Monkeypatch for openai==1.40.2 proxies bug ---
from openai._base_client import SyncHttpxClientWrapper
class CustomWrapper(SyncHttpxClientWrapper):
    def __init__(self, *args, **kwargs):
        kwargs.pop("proxies", None)
        super().__init__(*args, **kwargs)

import openai
openai._base_client.SyncHttpxClientWrapper = CustomWrapper
# ---------------------------------------------------

# Init client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Load hierarchical pain library
with open("pain_library_hier.json", "r", encoding="utf-8") as f:
    pain_hier = json.load(f)

embedded = []
count_total = 0

def embed_text(text: str):
    """Call OpenAI embedding API"""
    resp = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return resp.data[0].embedding

def traverse(node, path):
    """Recursively walk industry → role → size → pains"""
    global count_total

    if isinstance(node, dict):
        for key, val in node.items():
            traverse(val, path + [key])

    elif isinstance(node, list):
        bucket_count = 0
        for pain_obj in node:
            pain_text = pain_obj.get("pain")
            if not pain_text:
                continue
            try:
                emb = embed_text(pain_text)
                pain_obj["embedding"] = emb
                embedded.append({
                    "path": path,
                    "pain": pain_text,
                    "embedding": emb
                })
                bucket_count += 1
                count_total += 1
            except Exception as e:
                print(f"Error embedding pain at path {path}: {e}")

        print(f"  → Embedded {bucket_count} pains at path: {'/'.join(path)}")

start = time.time()
for industry, roles in pain_hier.items():
    print(f"Industry → {industry}")
    traverse(roles, [industry])

# Save updated embeddings
with open("pain_embeddings_hier.json", "w", encoding="utf-8") as f:
    json.dump(embedded, f)

elapsed = time.time() - start
print(f"\nTotal pains embedded: {count_total}")
print(f"Done. Total time: {elapsed:.2f}s")
