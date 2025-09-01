import os
import json
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
# -------------------------------------------------------------------

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Files
EMBEDDINGS_FILE = "pain_embeddings.json"

def embed_text(text: str):
    """Generate embedding for a given text."""
    resp = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return np.array(resp.data[0].embedding)

def cosine_similarity(a, b):
    """Compute cosine similarity between two vectors."""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def load_embeddings():
    """Load precomputed embeddings from JSON file."""
    with open(EMBEDDINGS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def retrieve_pains(query_text, top_k=3):
    """Retrieve the most relevant pains for given text."""
    pains = load_embeddings()
    query_vec = embed_text(query_text)

    scored = []
    for entry in pains:
        vec = np.array(entry["embedding"])
        score = cosine_similarity(query_vec, vec)
        scored.append((score, entry))

    # Sort by similarity, descending
    scored.sort(key=lambda x: x[0], reverse=True)
    return [entry for _, entry in scored[:top_k]]

# --- Example usage ---
if __name__ == "__main__":
    # Example: company description + role
    query = "SAP UK cloud compliance challenges with data sovereignty"
    results = retrieve_pains(query, top_k=3)

    print("Top pains retrieved:\n")
    for r in results:
        print(f"- ({r['role']} | {r['industry']}) {r['pain']}")
