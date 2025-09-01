import os
import json
import pandas as pd
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

# Load env + client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Load pain library + embeddings
with open("pain_library.json", "r", encoding="utf-8") as f:
    pain_library = json.load(f)

with open("pain_embeddings.json", "r", encoding="utf-8") as f:
    pain_embeddings = json.load(f)

# Normalize embeddings into numpy arrays
for entry in pain_embeddings:
    entry["embedding"] = np.array(entry["embedding"], dtype=np.float32)

def embed_text(text: str):
    """Embed text with OpenAI."""
    if not text or not text.strip():
        return np.zeros(len(pain_embeddings[0]["embedding"]))
    resp = client.embeddings.create(model="text-embedding-3-small", input=text[:2000])
    return np.array(resp.data[0].embedding, dtype=np.float32)

def get_top_pains(service_desc, company_desc, industry):
    """Retrieve top pains using service + company embeddings, enforce industry relevance."""
    service_vec = embed_text(service_desc)
    company_vec = embed_text(company_desc)

    scored = []
    for entry in pain_embeddings:
        pain_vec = entry["embedding"]
        service_sim = cosine_similarity([service_vec], [pain_vec])[0][0]
        company_sim = cosine_similarity([company_vec], [pain_vec])[0][0]

        # Equal weighting
        score = 0.5 * service_sim + 0.5 * company_sim
        scored.append({
            "pain": entry["pain"],
            "industry": entry.get("industry", "").lower(),
            "score": score
        })

    # Force industry-specific if available
    industry_pains = [x for x in scored if industry.lower() in x["industry"]]
    if industry_pains:
        ranked = sorted(industry_pains, key=lambda x: x["score"], reverse=True)
    else:
        ranked = sorted(scored, key=lambda x: x["score"], reverse=True)

    # Return top 2 for variety
    return ranked[:2]

def generate_opener(company, service, pains, description):
    """Generate one opener using selected pains and company description."""
    pain_text = pains[0]["pain"]

    prompt = f"""
You are writing a single cold email opening line.
Rules:
- Length: 14–22 words
- Must reference company context and provided pain
- Do not pitch the service directly
- No fluff (avoid "exciting opportunity", "great work", "game changer")
- Sound like a human wrote it, natural phrasing, not robotic.

Context:
Company: {company}
Description: {description[:400]}
Service: {service}
Pain: {pain_text}

Write ONE opener:
"""

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=80,
        temperature=0.8,
    )
    draft = resp.choices[0].message.content.strip()

    # Rewrite step for human tone
    refine_prompt = f"""
Rewrite this opener so it reads like natural human writing.
Keep it one sentence, 14–22 words, no questions, no fluff.

Original: "{draft}"
"""
    refine = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": refine_prompt}],
        max_tokens=80,
        temperature=0.7,
    )
    final = refine.choices[0].message.content.strip()
    return final, pain_text

if __name__ == "__main__":
    # Service description (you can swap this later)
    service_desc = "We provide an AI-powered outreach tool that automates personalized research and line generation for SDR teams."

    # Load leads Excel
    df = pd.read_excel("p3.xlsx")

    for idx, row in df.head(5).iterrows():
        company = str(row.get("Company Name", ""))
        industry = str(row.get("Industry", ""))
        desc = str(row.get("Company Short Description", ""))

        pains = get_top_pains(service_desc, desc, industry)
        opener, pain_used = generate_opener(company, service_desc, pains, desc)

        print(f"{company} → {opener}  [PainUsed: {pain_used}]")
