import os
import sys
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
KIMI_API_KEY = "sk-hY4kxGp1xcEuIPSxcVSqKVYV6H7yCqwKgKM09zbssLieiObh"  # replace if rotated

# === Clients ===
deepseek_client = OpenAI(
    api_key=DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com"
)
openai_client = OpenAI(api_key=OPENAI_API_KEY)
kimi_client = OpenAI(
    api_key=KIMI_API_KEY,
    base_url="https://api.moonshot.ai/v1"  # CORRECT endpoint
)

# === Default service context ===
DEFAULT_SERVICE_CONTEXT = (
    "I help you book qualified appointments through LinkedIn content and outreach. "
    "I guarantee 10+ appointments a month."
)

# === Opener Generation Rules (DeepSeek) ===
BATCH_PROMPT_RULES = (
    "You are a specialized B2B cold email strategist.\n\n"
    "Task:\n"
    "Generate one hyper-personalized cold email opening for each company using their specific data.\n\n"
    "Rules:\n"
    "- Write exactly two sentences.\n"
    "- Mention the company by name.\n"
    "- First sentence: reference a trend, challenge, or recent news (from provided fields).\n"
    "- Second sentence: highlight a subtle implication or pain point this creates, framed in a way that aligns with the service context provided, but do not mention the service itself.\n"
    "- Conversational, natural, human-like tone, as if you’re writing casually to a colleague.\n"
    "- Use company-specific details from the input. Make it feel personal and alive.\n"
    "- Avoid stiff corporate phrasing, compliments, or flattery.\n"
    "- Do not invent specific numbers or fake data. If unclear, generalize naturally.\n"
    "- Do not explicitly mention LinkedIn, outreach, appointments, meetings, or any solution — focus only on the company and its implied challenges.\n\n"
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
Kimi News: {kimi_news}
Service context: {service}"""

# === Logging Globals ===
OPENAI_INPUT = 0
OPENAI_OUTPUT = 0
DEEPSEEK_INPUT = 0
DEEPSEEK_OUTPUT = 0
KIMI_INPUT = 0
KIMI_OUTPUT = 0
OPENAI_TIME = 0.0
DEEPSEEK_TIME = 0.0
KIMI_TIME = 0.0

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

# ------------------------------------------------------------------
# Kimi news enrichment
# ------------------------------------------------------------------

def kimi_enrich_news(company_name, recent_news=""):
    """Always call Kimi to fetch latest company-specific news"""
    global KIMI_INPUT, KIMI_OUTPUT, KIMI_TIME
    query = f"Latest news about {company_name}. {recent_news}"
    try:
        start = time.time()
        resp = kimi_client.chat.completions.create(
            model="kimi-k2-0905-preview",
            messages=[
                {"role": "system", "content": "Answer in 1–2 sentences, concise, company-specific, natural language. Always include company name."},
                {"role": "user", "content": query}
            ],
            max_tokens=2500
        )
        duration = time.time() - start
        usage = resp.usage
        KIMI_TIME += duration
        KIMI_INPUT += usage.prompt_tokens
        KIMI_OUTPUT += usage.completion_tokens
        print(f"[Kimi] {company_name} | Time: {duration:.2f}s | In: {usage.prompt_tokens} Out: {usage.completion_tokens}")
        time.sleep(20)  # throttle for 3 RPM
        return safe_output(resp.choices[0].message.content.strip())
    except Exception as e:
        print(f"[Kimi ERROR] {company_name}: {e}")
        sys.exit(1)

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
                kimi_news=truncate(row.get("kimi_news_enriched"), 400),
                service=row.get("Service") or DEFAULT_SERVICE_CONTEXT
            )
        )

    user_prompt = "\n\n".join(inputs_text)
    messages = [{"role": "user", "content": BATCH_PROMPT_RULES + "\n\n" + user_prompt}]

    start_time = time.time()
    resp = deepseek_client.chat.completions.create(
        model="deepseek-reasoner",
        messages=messages,
        max_tokens=2500
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

def process_excel_in_batches(file_path, batch_size=4, output_file="output.xlsx"):
    df = pd.read_excel(file_path)
    total_rows = len(df)
    batch_count = 0

    for start in range(0, total_rows, batch_size):
        batch = df.iloc[start:start+batch_size]
        batch_count += 1

        for i, row in batch.iterrows():
            company_name = row.get("Company Name") or row.get("Cleaned Company Name") or ""
            kimi_news = kimi_enrich_news(company_name, row.get("Recent News", ""))
            df.at[i, "kimi_news_enriched"] = kimi_news

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
    total_kimi = KIMI_INPUT + KIMI_OUTPUT
    grand_total = total_openai + total_deepseek + total_kimi

    print("\n=== Job Summary ===")
    print(f"OpenAI input tokens: {OPENAI_INPUT}")
    print(f"OpenAI output tokens: {OPENAI_OUTPUT}")
    print(f"DeepSeek input tokens: {DEEPSEEK_INPUT}")
    print(f"DeepSeek output tokens: {DEEPSEEK_OUTPUT}")
    print(f"Kimi input tokens: {KIMI_INPUT}")
    print(f"Kimi output tokens: {KIMI_OUTPUT}")
    print(f"Total OpenAI tokens: {total_openai}")
    print(f"Total DeepSeek tokens: {total_deepseek}")
    print(f"Total Kimi tokens: {total_kimi}")
    print(f"Grand Total tokens: {grand_total}")
    print(f"OpenAI time: {OPENAI_TIME:.2f}s")
    print(f"DeepSeek time: {DEEPSEEK_TIME:.2f}s")
    print(f"Kimi time: {KIMI_TIME:.2f}s")
    print(f"Grand Total time: {OPENAI_TIME+DEEPSEEK_TIME+KIMI_TIME:.2f}s")
    print(f"Results saved to: {output_file}")


if __name__ == "__main__":
    process_excel_in_batches("p4.xlsx", batch_size=4, output_file="p4_with_kimi.xlsx")
