import os
import json
import numpy as np
from openai import OpenAI
from sklearn.metrics.pairwise import cosine_similarity

# Monkeypatch for proxies bug
from openai._base_client import SyncHttpxClientWrapper
class CustomWrapper(SyncHttpxClientWrapper):
    def __init__(self, *args, **kwargs):
        kwargs.pop("proxies", None)
        super().__init__(*args, **kwargs)

import openai
openai._base_client.SyncHttpxClientWrapper = CustomWrapper

# Load client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# === Load hierarchical pain library + embeddings ===
with open("pain_library_hier.json", "r", encoding="utf-8") as f:
    pain_library = json.load(f)

with open("pain_embeddings_hier.json", "r", encoding="utf-8") as f:
    pain_embeddings = json.load(f)

# Convert embeddings to numpy arrays
for entry in pain_embeddings:
    entry["embedding"] = np.array(entry["embedding"], dtype=np.float32)

print(f"Loaded {len(pain_embeddings)} pains with hierarchical embeddings.")

# === Embed input query ===
def embed_text(text: str):
    """Embed input text with OpenAI API"""
    resp = client.embeddings.create(
        model="text-embedding-3-small",  # or large if you want more quality
        input=text
    )
    return np.array(resp.data[0].embedding, dtype=np.float32)

# === Retrieve top matching pains ===
def retrieve_pains(industry, role, size, query, top_k=3):
    """Retrieve pains given industry, role, size, and query."""
    query_vec = embed_text(query)

    # Filter embeddings by hierarchy
    candidates = [
        entry for entry in pain_embeddings
        if industry in entry["path"]
        and role in entry["path"]
        and size in entry["path"]
    ]

    if not candidates:
        print("No pains found for this combo, falling back to general.")
        candidates = [entry for entry in pain_embeddings if "general" in entry["path"]]

    # Compute similarities
    sims = [
        (cosine_similarity([query_vec], [entry["embedding"]])[0][0], entry)
        for entry in candidates
    ]
    sims.sort(key=lambda x: x[0], reverse=True)

    return sims[:top_k]

# === Example run ===
if __name__ == "__main__":
    industry = "healthcare"
    role = "cto"
    size = "1000+"
    query = "struggling to modernize infrastructure without breaking compliance"

    results = retrieve_pains(industry, role, size, query, top_k=3)

    print(f"\nTop pains for {industry}/{role}/{size}:\n")
    for score, entry in results:
        print(f"- {entry['pain']}  (score={score:.4f})")
