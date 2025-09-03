import os
import json
import numpy as np
from openai import OpenAI
from sklearn.metrics.pairwise import cosine_similarity

# --- Monkeypatch for openai==1.40.2 proxies bug ---
from openai._base_client import SyncHttpxClientWrapper
class CustomWrapper(SyncHttpxClientWrapper):
    def __init__(self, *args, **kwargs):
        kwargs.pop("proxies", None)
        super().__init__(*args, **kwargs)

import openai
openai._base_client.SyncHttpxClientWrapper = CustomWrapper
# ---------------------------------------------------

# --- Setup client ---
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --- Load pain embeddings ---
with open("pain_embeddings_hier.json", "r", encoding="utf-8") as f:
    pain_embeddings = json.load(f)

# Normalize embeddings into numpy arrays
for entry in pain_embeddings:
    entry["embedding"] = np.array(entry["embedding"], dtype=np.float32)

# --- Embedding helper ---
def embed_text(text: str):
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return np.array(response.data[0].embedding, dtype=np.float32)

# --- Retrieve top pains ---
def retrieve_pains(industry, role, size, query, top_k=3):
    query_emb = embed_text(query)
    scored = []

    for entry in pain_embeddings:
        path = entry.get("path")
        if not path:
            continue

        # Handle path as dict or list
        if isinstance(path, dict):
            ind = path.get("industry")
            rol = path.get("role")
            sz = path.get("size")
        elif isinstance(path, list):
            # Expect format: [industry, role, size]
            ind = path[0] if len(path) > 0 else None
            rol = path[1] if len(path) > 1 else None
            sz = path[2] if len(path) > 2 else None
        else:
            continue

        # allow fallback matching
        if (
            (ind == industry or ind == "general")
            and (rol == role or rol == "general")
            and (sz == size or sz == "general")
        ):
            sim = cosine_similarity(
                query_emb.reshape(1, -1),
                entry["embedding"].reshape(1, -1)
            )[0][0]
            scored.append((sim, entry))

    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[:top_k]

# --- Generate outreach line ---
def generate_outreach_line(company, role, industry, size, query):
    pains = retrieve_pains(industry, role, size, query, top_k=3)

    if not pains:
        return f"Leaders in {industry} often face challenges with growth, compliance, and personalization."

    pain_texts = [p[1]["pain"] for p in pains]

    prompt = f"""
You are writing ONLY one personalized observation sentence for a cold email.
The sentence must:
- NOT start with "Hi", "Hello", or any greeting
- NOT contain placeholders like [Name] or [Company]
- NOT pitch or sell (do not mention "we can help" or "our solution")
- Simply point out a challenge the company likely faces, based on the pains

Company: {company}
Role: {role}
Industry: {industry}
Size: {size}

Here are this persona's top pains:
{pain_texts}

Write ONE clean sentence that references one of these pains naturally.
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=60
    )

    return response.choices[0].message.content.strip()

# --- Dustin-style email ---
def generate_dustin_email(company, name, role, industry, size, query):
    our_line = generate_outreach_line(company, role, industry, size, query)

    email = f"""
Hi {name},

{our_line}

My team and I have created an AI system that personalises each outreach email for you directly. 
Feel free to try it out and let me know what you think.

-Rahul
Founder at AuthorityPoint
"""
    return email.strip()

# --- Example run ---
if __name__ == "__main__":
    email = generate_dustin_email(
        company="HealthTech Global",
        name="John",
        role="cto",
        industry="healthcare",
        size="1000+",
        query="modernization and compliance"
    )
    print(email)
