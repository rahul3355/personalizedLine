import os
import json
import pandas as pd
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

# Load OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Load final pain embeddings
with open("pain_embeddings5.json", "r", encoding="utf-8") as f:
    pain_embeddings = json.load(f)

# Convert embeddings to numpy arrays
for entry in pain_embeddings:
    entry["embedding"] = np.array(entry["embedding"], dtype=np.float32)

# Load size buckets
with open("company_size.json", "r", encoding="utf-8") as f:
    size_map = json.load(f)

def map_size_bucket(emp_count: int) -> str:
    """Map employee count into defined size buckets."""
    for bucket, pains in size_map.items():
        if "-" in bucket:
            lo, hi = bucket.split("-")
            if int(lo) <= emp_count <= int(hi):
                return bucket
        elif "+" in bucket:
            if emp_count >= int(bucket.replace("+", "")):
                return bucket
    return ""

def embed_text(text):
    """Return embedding vector for given text or zero-vector if invalid."""
    if text is None:
        return np.zeros(len(pain_embeddings[0]["embedding"]))
    text = str(text).strip()
    if not text or text.lower() == "nan":
        return np.zeros(len(pain_embeddings[0]["embedding"]))
    resp = client.embeddings.create(
        model="text-embedding-3-small",
        input=text[:2000]
    )
    return np.array(resp.data[0].embedding, dtype=np.float32)

def get_top_pains(service_desc, company_desc, role, size, industry, top_k=2):
    """Hybrid retrieval: weight company, service, role, size, industry similarities."""
    service_vec = embed_text(service_desc)
    company_vec = embed_text(company_desc)
    role_vec = embed_text(role)
    size_vec = embed_text(size)
    industry_vec = embed_text(industry)

    scored = []
    for entry in pain_embeddings:
        pain_vec = entry["embedding"]

        # Compute similarities
        company_sim = cosine_similarity([company_vec], [pain_vec])[0][0]
        service_sim = cosine_similarity([service_vec], [pain_vec])[0][0]
        role_sim = cosine_similarity([role_vec], [pain_vec])[0][0] if role else 0
        size_sim = cosine_similarity([size_vec], [pain_vec])[0][0] if size else 0
        industry_sim = cosine_similarity([industry_vec], [pain_vec])[0][0] if industry else 0

        # Weighted scoring
        score = (
            0.4 * company_sim +
            0.3 * service_sim +
            0.2 * role_sim +
            0.05 * size_sim +
            0.05 * industry_sim
        )

        scored.append({
            "pain": entry["pain"],
            "role": entry.get("role", ""),
            "industry": entry.get("industry", ""),
            "size": entry.get("size", ""),
            "score": score
        })

    ranked = sorted(scored, key=lambda x: x["score"], reverse=True)
    return ranked[:top_k]

def generate_opener(company, service, pains, description):
    """Generate one cold opener line with stricter prompting and validation."""
    if not pains:
        return None, None

    pain_text = pains[0]["pain"]

    # Normalize fields to safe strings
    company = str(company) if company is not None and str(company).lower() != "nan" else ""
    description = str(description) if description is not None and str(description).lower() != "nan" else ""

    examples = """
Examples of good openers:
- "With just eight employees, scaling personalized cruise outreach must stretch your team thin during peak booking seasons."
- "Integrating SAP modules often leaves clients juggling duplicate records — a frustration that undermines adoption."
- "Insurance prospects demand GDPR compliance proof up front, slowing SaaS adoption despite available dashboards."
    """

    prompt = f"""
You are writing a single cold email opening line.
Rules:
- Length: 14–22 words
- Must reference company context and provided pain
- Do not pitch the service directly
- No fluff, no praise, no hedging ("I see that", "I'm curious", "great work")
- Sound natural, as if written by a human SDR after skimming the company website

Context:
Company: {company}
Description: {description[:400]}
Service: {service}
Pain: {pain_text}

{examples}

Write ONE opener:
"""

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=80,
            temperature=0.9,
        )
        draft = resp.choices[0].message.content.strip()
    except Exception:
        return None, None

    # Validator step
    bad_phrases = ["I see that", "I'm curious", "I've observed", "great work", "exciting", "game changer"]
    final = draft
    if any(p in draft for p in bad_phrases):
        refine_prompt = f"""
Rewrite this opener to sound like natural human writing, one sentence, 14–22 words.
Avoid hedges ("I see that", "I'm curious") and praise words.
Original: "{draft}"
"""
        try:
            refine = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": refine_prompt}],
                max_tokens=80,
                temperature=0.7,
            )
            final = refine.choices[0].message.content.strip()
        except Exception:
            pass

    return final, pain_text

if __name__ == "__main__":
    service_desc = "We provide an AI-powered outreach tool that helps SDRs scale personalization without losing human tone."

    df = pd.read_excel("p3.xlsx")

    row_count = 0
    for _, row in df.iterrows():
        if row_count >= 5:  # only first 5 rows
            break

        company = (
            row.get("Company Name")
            or row.get("Cleaned Company Name")
            or ""
        )
        description = row.get("Company Short Description") or ""
        industry = row.get("Industry") or ""
        role = row.get("Title") or row.get("Seniority") or ""

        size_bucket = ""
        try:
            emp_count = int(row.get("Employee Count", 0))
            size_bucket = map_size_bucket(emp_count)
        except Exception:
            pass

        pains = get_top_pains(service_desc, description, role, size_bucket, industry, top_k=2)
        if not pains:
            continue

        opener, pain_used = generate_opener(company, service_desc, pains, description)
        if opener and pain_used:
            print(f"{company} → {opener}  [PainUsed: {pain_used}]")

        row_count += 1
