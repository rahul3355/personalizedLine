import os
import time
import re
import requests
import feedparser
import pandas as pd
from urllib.parse import quote
from openai import OpenAI
import trafilatura

# === API KEYS ===
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

# === OpenAI Client (DeepSeek endpoint) ===
client = OpenAI(
    api_key=DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com"
)

# === Default service context ===
DEFAULT_SERVICE_CONTEXT = (
    "I help you book qualified appointments through LinkedIn content and outreach. "
    "I guarantee 10+ appointments a month."
)

# === Opener Generation Rules (two sentences) ===
BATCH_PROMPT_RULES = (
    "You are a specialized B2B cold email strategist.\n\n"
    "Task:\n"
    "Generate one hyper-personalized cold email opening for each company using their specific data.\n\n"
    "Rules:\n"
    "- Write exactly two sentences.\n"
    "- First sentence: reference a trend, challenge, or recent news (from provided fields).\n"
    "- Second sentence: tie that challenge back to appointment booking and outreach pain points.\n"
    "- Conversational, natural, human-like tone.\n"
    "- Avoid stiff corporate phrasing, compliments, or flattery.\n"
    "- Do not invent specific numbers or fake data. If unclear, generalize.\n\n"
    "Output format:\n"
    "Numbered list (1., 2., 3., …) with exactly two sentences per input company."
)

# === User Template ===
USER_TEMPLATE = """Company: {company}
Industry: {industry}
Description: {description}
Keywords: {keywords}
Technologies: {technologies}
Title of lead: {title}
Seniority: {seniority}
Founded: {founded}
Funding: {funding}
Recent News: {recent_news}
Funding News: {funding_news}
AI Summarized News: {summ_news}
AI Estimated News: {est_news}
Guaranteed Trend: {guaranteed}
Service context: {service}"""

# === Globals for logging ===
TOTAL_TIME = 0.0
TOTAL_TOKENS = 0

# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def truncate(value, limit=1000):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    text = str(value)
    return text[:limit]

def _fetch_rss(url: str):
    try:
        resp = requests.get(url, timeout=15)
        feed = feedparser.parse(resp.text)
        return feed.entries if feed.entries else []
    except Exception:
        return []

def lookup_recent_news(company_name: str, company_domain: str = None) -> str:
    if company_domain:
        candidates = [
            f"https://{company_domain}/feed",
            f"https://{company_domain}/rss",
            f"https://{company_domain}/blog/feed",
            f"https://{company_domain}/blog/rss",
        ]
        for rss_url in candidates:
            entries = _fetch_rss(rss_url)
            if entries:
                e = entries[0]
                return f"Blog: {e.title} ({e.get('published','')}) {e.link}"

    if company_domain:
        query = f"site:{company_domain}"
        url = f"https://news.google.com/rss/search?q={quote(query)}"
        entries = _fetch_rss(url)
        if entries:
            e = entries[0]
            return f"News: {e.title} ({e.get('published','')}) {e.link}"

    query = f'"{company_name}"'
    url = f"https://news.google.com/rss/search?q={quote(query)}"
    entries = _fetch_rss(url)
    for e in entries[:5]:
        if company_name.lower() in e.title.lower():
            return f"News: {e.title} ({e.get('published','')}) {e.link}"

    return ""

def lookup_funding_news(company_name: str) -> str:
    query = f'"{company_name}" (funding OR raised OR investment)'
    url = f"https://news.google.com/rss/search?q={quote(query)}"
    entries = _fetch_rss(url)
    for e in entries[:5]:
        if company_name.lower() in e.title.lower():
            return f"Funding: {e.title} ({e.get('published','')}) {e.link}"
    return ""

def resolve_redirect(url: str) -> str:
    try:
        resp = requests.get(url, timeout=15, allow_redirects=True)
        return resp.url
    except Exception:
        return url

def fetch_article_content(url: str):
    raw, clean = "", ""
    try:
        final_url = resolve_redirect(url)
        downloaded = trafilatura.fetch_url(final_url)
        if downloaded:
            clean = trafilatura.extract(downloaded) or ""
        raw = requests.get(final_url, timeout=15).text
    except Exception:
        pass
    return raw, clean

def summarize_article(text: str) -> str:
    global TOTAL_TIME, TOTAL_TOKENS
    if not text.strip():
        return ""
    try:
        start = time.time()
        resp = client.chat.completions.create(
            model="deepseek-reasoner",
            messages=[
                {"role": "system", "content": "Summarize this news article in 3-4 sentences, focusing only on company context."},
                {"role": "user", "content": text[:8000]}
            ],
            max_tokens=800
        )
        duration = time.time() - start
        usage = resp.usage
        TOTAL_TIME += duration
        TOTAL_TOKENS += usage.total_tokens
        print(f"[Summarize] Time: {duration:.2f}s | Tokens: {usage.total_tokens}")
        return resp.choices[0].message.content.strip()
    except Exception:
        return ""

def ai_estimate_news(company_name, industry, description, headline=""):
    global TOTAL_TIME, TOTAL_TOKENS
    context = f"Company: {company_name}\nIndustry: {industry}\nDescription: {description}\nHeadline: {headline}"
    try:
        start = time.time()
        resp = client.chat.completions.create(
            model="deepseek-reasoner",
            messages=[
                {"role": "system", "content": "Generate a short 3-4 sentence news-style update about the company. Stay general and plausible, avoid numbers or fake data."},
                {"role": "user", "content": context}
            ],
            max_tokens=600
        )
        duration = time.time() - start
        usage = resp.usage
        TOTAL_TIME += duration
        TOTAL_TOKENS += usage.total_tokens
        print(f"[Estimate] {company_name} | Time: {duration:.2f}s | Tokens: {usage.total_tokens}")
        return resp.choices[0].message.content.strip()
    except Exception:
        return f"{company_name} is navigating shifts in the {industry} sector, shaping its strategy around industry trends."

def regenerate_guaranteed_trend(row):
    """Builds fallback guaranteed trend from all row fields via AI."""
    context = []
    for col, val in row.items():
        val_str = truncate(val, 200)
        if val_str and val_str.lower() not in ["0", "nan", "none"]:
            context.append(f"{col}: {val_str}")
    context_str = " | ".join(context[:15])
    try:
        start = time.time()
        resp = client.chat.completions.create(
            model="deepseek-reasoner",
            messages=[
                {"role": "system", "content": "Generate a short 2-3 sentence plausible news/trend update for this company using all provided fields. Avoid fake numbers."},
                {"role": "user", "content": context_str}
            ],
            max_tokens=600
        )
        duration = time.time() - start
        usage = resp.usage
        global TOTAL_TIME, TOTAL_TOKENS
        TOTAL_TIME += duration
        TOTAL_TOKENS += usage.total_tokens
        print(f"[Guaranteed Retry] Time: {duration:.2f}s | Tokens: {usage.total_tokens}")
        return resp.choices[0].message.content.strip()
    except Exception:
        return f"This company is adapting to changes in {row.get('Industry','its sector')}."

def build_guaranteed_trend(row):
    text_candidates = [
        row.get("ai_summarized_news"),
        row.get("ai_estimated_news"),
        row.get("clean_news_data"),
        row.get("raw_news_data"),
    ]
    for t in text_candidates:
        if t and not str(t).lower().startswith(("i'm unable", "i cannot", "sorry", "no information")):
            return t
    # fallback: regenerate from all row fields
    return regenerate_guaranteed_trend(row)

# ------------------------------------------------------------------
# LLM opener generator
# ------------------------------------------------------------------

def generate_openers_batch(batch_rows):
    global TOTAL_TIME, TOTAL_TOKENS
    inputs_text = []
    for idx, row in enumerate(batch_rows, start=1):
        inputs_text.append(
            f"Input {idx}:\n" + USER_TEMPLATE.format(
                company=row.get("Company Name") or row.get("Cleaned Company Name") or "",
                industry=row.get("Industry") or "",
                description=truncate(row.get("Company Short Description") or row.get("Company SEO Description"), 600),
                keywords=truncate(row.get("Company Keywords"), 200),
                technologies=truncate(row.get("Company Technologies"), 200),
                title=row.get("Title") or "",
                seniority=row.get("Seniority") or "",
                founded=row.get("Company Founded Year") or "",
                funding=row.get("Company Total Funding") or "",
                recent_news=truncate(row.get("Recent News"), 400),
                funding_news=truncate(row.get("Funding News"), 400),
                summ_news=truncate(row.get("ai_summarized_news"), 800),
                est_news=truncate(row.get("ai_estimated_news"), 800),
                guaranteed=truncate(row.get("guaranteed_news_trend"), 1200),
                service=row.get("Service") or DEFAULT_SERVICE_CONTEXT
            )
        )

    user_prompt = "\n\n".join(inputs_text)
    messages = [{"role": "user", "content": BATCH_PROMPT_RULES + "\n\n" + user_prompt}]

    start_time = time.time()
    resp = client.chat.completions.create(
        model="deepseek-reasoner",
        messages=messages,
        max_tokens=1200
    )
    duration = time.time() - start_time

    usage = resp.usage
    TOTAL_TIME += duration
    TOTAL_TOKENS += usage.total_tokens
    print(f"[Openers Batch] Time: {duration:.2f}s | Tokens: {usage.total_tokens}")

    raw_output = (resp.choices[0].message.content or "").strip()
    lines = []
    pattern = r'^\s*(\d+)\.\s*(.+)$'
    for line in raw_output.split("\n"):
        m = re.match(pattern, line.strip())
        if m:
            lines.append(m.group(2).strip())
    return lines

# ------------------------------------------------------------------
# Batch processor
# ------------------------------------------------------------------

def process_excel_in_batches(file_path, batch_size=4, output_file="output.xlsx"):
    global TOTAL_TIME, TOTAL_TOKENS
    df = pd.read_excel(file_path)

    for start in range(0, len(df), batch_size):
        batch = df.iloc[start:start+batch_size]

        for i, row in batch.iterrows():
            company_name = row.get("Company Name") or row.get("Cleaned Company Name") or ""
            company_domain = None
            if "Company Website Short" in row and pd.notna(row["Company Website Short"]):
                company_domain = str(row["Company Website Short"]).replace("http://", "").replace("https://", "").strip("/")

            news_val = lookup_recent_news(company_name, company_domain)
            funding_val = lookup_funding_news(company_name)
            df.at[i, "Recent News"] = news_val
            df.at[i, "Funding News"] = funding_val

            raw, clean, summ, est = "", "", "", ""
            if "http" in str(news_val):
                url = str(news_val).split()[-1]
                raw, clean = fetch_article_content(url)
                summ = summarize_article(clean or raw)
            if not summ:
                headline = news_val.split("(")[0] if news_val else ""
                est = ai_estimate_news(company_name, row.get("Industry",""), row.get("Company Short Description",""), headline)

            df.at[i, "raw_news_data"] = raw
            df.at[i, "clean_news_data"] = clean
            df.at[i, "ai_summarized_news"] = summ
            df.at[i, "ai_estimated_news"] = est
            guaranteed = build_guaranteed_trend({
                **row.to_dict(),
                "raw_news_data": raw,
                "clean_news_data": clean,
                "ai_summarized_news": summ,
                "ai_estimated_news": est
            })
            df.at[i, "guaranteed_news_trend"] = guaranteed

        rows_as_dicts = batch.to_dict(orient="records")
        print(f"\n--- Batch {start // batch_size + 1} ---\n")
        outputs = generate_openers_batch(rows_as_dicts)

        while len(outputs) < len(batch):
            outputs.append("")

        for out in outputs:
            print(out + "\n")

        df.loc[start:start+len(outputs)-1, "Personalized Opener"] = outputs

    df.to_excel(output_file, index=False)

    print("\n=== Job Summary ===")
    print(f"Grand Total time: {TOTAL_TIME:.2f}s")
    print(f"Grand Total tokens: {TOTAL_TOKENS}")
    print(f"Results saved to: {output_file}")


if __name__ == "__main__":
    process_excel_in_batches("p3.xlsx", batch_size=4, output_file="p3_with_openers10.xlsx")
