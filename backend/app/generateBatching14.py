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
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# === Clients ===
deepseek_client = OpenAI(
    api_key=DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com"
)
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# === Default service context (restored) ===
DEFAULT_SERVICE_CONTEXT = (
    "I help you book qualified appointments through LinkedIn content and outreach. "
    "I guarantee 10+ appointments a month."
)

# === Opener Generation Rules ===
BATCH_PROMPT_RULES = (
    "You are a specialized B2B cold email strategist.\n\n"
    "Task:\n"
    "Generate one hyper-personalized cold email ice-breaker for each company using their specific data.\n\n"
    "Rules:\n"
    "- Write 1–2 sentences only.\n"
    "- Mention the company by name.\n"
    "- Reference a trend, challenge, or recent news (from provided fields).\n"
    "- Conversational, natural, human-like tone.\n"
    "- Avoid service pitching, offers, or flattery.\n"
    "- Do not invent specific numbers or fake data. If unclear, generalize.\n\n"
    "Output format:\n"
    "Numbered list (1., 2., 3., …) with exactly one ice-breaker per input company."
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

# === Logging Globals ===
OPENAI_INPUT = 0
OPENAI_OUTPUT = 0
DEEPSEEK_INPUT = 0
DEEPSEEK_OUTPUT = 0
OPENAI_TIME = 0.0
DEEPSEEK_TIME = 0.0

# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def truncate(value, limit=4000):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    text = str(value)
    return text[:limit]

def strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", " ", str(text))

def safe_output(text: str) -> str:
    if not text:
        return ""
    lowered = text.lower()
    if lowered.startswith(("i'm unable", "i cannot", "sorry", "no information")):
        return ""
    if "<!doctype" in lowered or "<html" in lowered:
        return ""
    return strip_html(text).strip()

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
    global OPENAI_INPUT, OPENAI_OUTPUT, OPENAI_TIME
    if not text.strip():
        return ""
    try:
        start = time.time()
        resp = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Summarize this news article in 2-3 sentences, focusing only on company context."},
                {"role": "user", "content": text[:12000]}
            ],
            max_tokens=1200
        )
        duration = time.time() - start
        usage = resp.usage
        OPENAI_TIME += duration
        OPENAI_INPUT += usage.prompt_tokens
        OPENAI_OUTPUT += usage.completion_tokens
        print(f"[Summarize] Time: {duration:.2f}s | In: {usage.prompt_tokens} Out: {usage.completion_tokens}")
        return safe_output(resp.choices[0].message.content.strip())
    except Exception:
        return ""

def ai_estimate_news(company_name, industry, description, headline=""):
    global OPENAI_INPUT, OPENAI_OUTPUT, OPENAI_TIME
    context = f"Company: {company_name}\nIndustry: {industry}\nDescription: {description}\nHeadline: {headline}"
    try:
        start = time.time()
        resp = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Write a short 1-2 sentence news-style update about the company. Avoid numbers or fake data, include company name."},
                {"role": "user", "content": context}
            ],
            max_tokens=600
        )
        duration = time.time() - start
        usage = resp.usage
        OPENAI_TIME += duration
        OPENAI_INPUT += usage.prompt_tokens
        OPENAI_OUTPUT += usage.completion_tokens
        print(f"[Estimate] {company_name} | Time: {duration:.2f}s | In: {usage.prompt_tokens} Out: {usage.completion_tokens}")
        return safe_output(resp.choices[0].message.content.strip())
    except Exception:
        return f"{company_name} continues to be active in the {industry} sector."

def regenerate_guaranteed_trend(row):
    global OPENAI_INPUT, OPENAI_OUTPUT, OPENAI_TIME
    context = []
    for col, val in row.items():
        val_str = truncate(val, 300)
        if val_str and val_str.lower() not in ["0", "nan", "none"]:
            context.append(f"{col}: {strip_html(val_str)}")
    context_str = " | ".join(context[:20])
    try:
        start = time.time()
        resp = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Write one clear sentence of trend/news for this company using provided fields. Must include company name. No filler or disclaimers."},
                {"role": "user", "content": context_str}
            ],
            max_tokens=400
        )
        duration = time.time() - start
        usage = resp.usage
        OPENAI_TIME += duration
        OPENAI_INPUT += usage.prompt_tokens
        OPENAI_OUTPUT += usage.completion_tokens
        print(f"[Guaranteed Retry] Time: {duration:.2f}s | In: {usage.prompt_tokens} Out: {usage.completion_tokens}")
        return safe_output(resp.choices[0].message.content.strip())
    except Exception:
        return f"{row.get('Company Name','This company')} is active in {row.get('Industry','its sector')}."

def build_guaranteed_trend(row):
    text_candidates = [
        row.get("ai_summarized_news"),
        row.get("ai_estimated_news"),
        row.get("clean_news_data"),
    ]
    for t in text_candidates:
        candidate = safe_output(t)
        if candidate:
            return candidate
    return regenerate_guaranteed_trend(row)

# ------------------------------------------------------------------
# LLM opener generator (DeepSeek)
# ------------------------------------------------------------------

def generate_openers_batch(batch_rows):
    global DEEPSEEK_INPUT, DEEPSEEK_OUTPUT, DEEPSEEK_TIME
    inputs_text = []
    for idx, row in enumerate(batch_rows, start=1):
        inputs_text.append(
            f"Input {idx}:\n" + USER_TEMPLATE.format(
                company=row.get("Company Name") or row.get("Cleaned Company Name") or "",
                industry=row.get("Industry") or "",
                description=truncate(row.get("Company Short Description") or row.get("Company SEO Description"), 2000),
                keywords=truncate(row.get("Company Keywords"), 400),
                technologies=truncate(row.get("Company Technologies"), 400),
                title=row.get("Title") or "",
                seniority=row.get("Seniority") or "",
                founded=row.get("Company Founded Year") or "",
                funding=row.get("Company Total Funding") or "",
                recent_news=truncate(row.get("Recent News"), 800),
                funding_news=truncate(row.get("Funding News"), 800),
                summ_news=truncate(row.get("ai_summarized_news"), 1500),
                est_news=truncate(row.get("ai_estimated_news"), 1500),
                guaranteed=truncate(row.get("guaranteed_news_trend"), 2000),
                service=row.get("Service") or DEFAULT_SERVICE_CONTEXT
            )
        )

    user_prompt = "\n\n".join(inputs_text)
    messages = [{"role": "user", "content": BATCH_PROMPT_RULES + "\n\n" + user_prompt}]

    start_time = time.time()
    resp = deepseek_client.chat.completions.create(
        model="deepseek-reasoner",
        messages=messages,
        max_tokens=3000
    )
    duration = time.time() - start_time

    usage = resp.usage
    DEEPSEEK_TIME += duration
    DEEPSEEK_INPUT += usage.prompt_tokens
    DEEPSEEK_OUTPUT += usage.completion_tokens
    print(f"[Openers Batch] Time: {duration:.2f}s | In: {usage.prompt_tokens} Out: {usage.completion_tokens}")

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

def process_excel_in_batches(file_path, batch_size=10, output_file="output.xlsx"):
    df = pd.read_excel(file_path)
    total_rows = len(df)
    batch_count = 0

    for start in range(0, total_rows, batch_size):
        batch = df.iloc[start:start+batch_size]
        batch_count += 1

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
        print(f"\n--- Batch {batch_count} ---\n")
        outputs = generate_openers_batch(rows_as_dicts)

        while len(outputs) < len(batch):
            outputs.append("")

        for out in outputs:
            print(out + "\n")

        df.loc[start:start+len(outputs)-1, "Personalized Opener"] = outputs

    df.to_excel(output_file, index=False)

    # Final summary
    total_openai = OPENAI_INPUT + OPENAI_OUTPUT
    total_deepseek = DEEPSEEK_INPUT + DEEPSEEK_OUTPUT
    grand_total = total_openai + total_deepseek

    print("\n=== Job Summary ===")
    print(f"OpenAI input tokens: {OPENAI_INPUT}")
    print(f"OpenAI output tokens: {OPENAI_OUTPUT}")
    print(f"DeepSeek input tokens: {DEEPSEEK_INPUT}")
    print(f"DeepSeek output tokens: {DEEPSEEK_OUTPUT}")
    print(f"Total OpenAI tokens: {total_openai}")
    print(f"Total DeepSeek tokens: {total_deepseek}")
    print(f"Grand Total tokens: {grand_total}")
    print(f"OpenAI time: {OPENAI_TIME:.2f}s")
    print(f"DeepSeek time: {DEEPSEEK_TIME:.2f}s")
    print(f"Grand Total time: {OPENAI_TIME+DEEPSEEK_TIME:.2f}s")
    print(f"Average OpenAI tokens per row: {total_openai/total_rows:.2f}")
    print(f"Average DeepSeek tokens per row: {total_deepseek/total_rows:.2f}")
    print(f"Average OpenAI tokens per batch: {total_openai/max(batch_count,1):.2f}")
    print(f"Average DeepSeek tokens per batch: {total_deepseek/max(batch_count,1):.2f}")
    print(f"Results saved to: {output_file}")


if __name__ == "__main__":
    process_excel_in_batches("p3.xlsx", batch_size=10, output_file="p3_with_openers13.xlsx")
