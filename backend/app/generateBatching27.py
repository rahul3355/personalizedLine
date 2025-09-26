import os
import sys
import time
import re
import pandas as pd
from openai import OpenAI

# === API KEYS ===
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
KIMI_API_KEY = "sk-hY4kxGp1xcEuIPSxcVSqKVYV6H7yCqwKgKM09zbssLieiObh"  # fixed key

# === Clients ===
deepseek_client = OpenAI(
    api_key=DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com"
)
kimi_client = OpenAI(
    api_key=KIMI_API_KEY,
    base_url="https://api.moonshot.ai/v1"
)

# === Default service context (fallback if no Service column) ===
DEFAULT_SERVICE_CONTEXT = (
    "I help you book qualified appointments through LinkedIn content and outreach. "
    "I guarantee 10+ appointments a month."
)

# === User Template ===
USER_TEMPLATE = """Company: {company}
Industry: {industry}
Description: {description}
Keywords: {keywords}
Technologies: {technologies}
Title: {title}
Seniority: {seniority}
Founded: {founded}
Kimi News: {kimi_news}
Service context: {service}"""

# === Logging Globals ===
DEEPSEEK_INPUT = 0
DEEPSEEK_OUTPUT = 0
KIMI_INPUT = 0
KIMI_OUTPUT = 0
DEEPSEEK_TIME = 0.0
KIMI_TIME = 0.0


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------
def truncate(value, limit=4000):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    return str(value)[:limit]


def safe_output(text: str) -> str:
    if not text:
        return ""
    lowered = text.lower()
    if lowered.startswith(("i'm unable", "i cannot", "sorry")):
        return ""
    return re.sub(r"<[^>]+>", " ", str(text)).strip()


# ------------------------------------------------------------------
# Kimi enrichment (with $web_search tools)
# ------------------------------------------------------------------
def kimi_batch_enrich(batch_rows):
    """Fetch latest news for a batch of companies using Kimi $web_search tool."""
    global KIMI_INPUT, KIMI_OUTPUT, KIMI_TIME
    companies = [row.get("Company Name") or row.get("Cleaned Company Name") or "" for row in batch_rows]

    query = "Please search and provide one reliable, company-specific news update (1–2 sentences, last 30 days) for each of these companies:\n\n"
    query += "\n".join([f"{i+1}. {c}" for i, c in enumerate(companies, start=1)])

    print("\n[Kimi] Querying batch for companies:")
    for c in companies:
        print("   -", c)

    messages = [
        {
            "role": "system",
            "content": (
                "You are Kimi, an AI assistant. Use the $web_search tool to fetch fresh company-specific news. "
                "Return a numbered list matching the input order. "
                "Each entry must be exactly 1–2 sentences. "
                "If no news is found, output: 'No recent reliable news found for {company}'."
            ),
        },
        {"role": "user", "content": query},
    ]

    tools = [
        {"type": "builtin_function", "function": {"name": "$web_search"}}
    ]

    start_time = time.time()
    finish_reason = None
    resp_text = ""

    while finish_reason is None or finish_reason == "tool_calls":
        resp = kimi_client.chat.completions.create(
            model="kimi-k2-0905-preview",
            messages=messages,
            tools=tools,
            temperature=0.3,
            max_tokens=2500,
        )
        choice = resp.choices[0]
        finish_reason = choice.finish_reason

        usage = resp.usage
        KIMI_INPUT += usage.prompt_tokens
        KIMI_OUTPUT += usage.completion_tokens

        if finish_reason == "tool_calls":
            messages.append(choice.message)
            for tool_call in choice.message.tool_calls:
                if tool_call.function.name == "$web_search":
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": tool_call.function.name,
                        "content": tool_call.function.arguments,
                    })
        elif finish_reason == "stop":
            resp_text = safe_output(choice.message.content.strip())

    duration = time.time() - start_time
    KIMI_TIME += duration
    print(f"[Kimi Batch] {len(companies)} companies | Time: {duration:.2f}s")
    print("[Kimi Raw Output]\n", resp_text, "\n---")

    outputs = []
    pattern = r'^\s*(\d+)[\.\)]\s*(.+)$'
    for line in resp_text.split("\n"):
        m = re.match(pattern, line.strip())
        if m:
            outputs.append(m.group(2).strip())

    if not outputs:
        outputs = [l.strip() for l in resp_text.split("\n") if l.strip()]

    while len(outputs) < len(companies):
        outputs.append("")

    print("[Kimi] Parsed outputs:")
    for i, l in enumerate(outputs):
        print(f"   {companies[i]} -> {l}")

    print("[Kimi] Sleeping 20 seconds to respect rate limits...")
    time.sleep(20)

    return outputs


# ------------------------------------------------------------------
# DeepSeek opener generator (improved with reasoning steps)
# ------------------------------------------------------------------
def generate_openers_batch(batch_rows):
    global DEEPSEEK_INPUT, DEEPSEEK_OUTPUT, DEEPSEEK_TIME

    BATCH_PROMPT_RULES = (
        "You are writing the first two sentences of a cold email.\n"
        "Steps (do this internally, do not show):\n"
        "1. Skim the company details, service context, and Kimi-enriched news.\n"
        "2. Identify one specific pain or friction they likely face that connects directly to the service context.\n"
        "3. Write exactly two natural, conversational sentences (18–25 words each).\n"
        "4. Sentence 1: reference the company and something specific (news if available, otherwise description/industry).\n"
        "5. Sentence 2: highlight a subtle pain implied by that detail.\n\n"
        "Rules:\n"
        "- Mention the company name naturally.\n"
        "- Human-written tone, plain language, no headlines.\n"
        "- Do not pitch, do not compliment, do not ask questions.\n"
        "- Do not explain your reasoning, only output the sentences.\n\n"
        "Output format:\n"
        "Numbered list (1., 2., 3., …) with exactly one two-sentence opener per input company."
    )

    # --- Per-company input blocks ---
    inputs_text = []
    for idx, row in enumerate(batch_rows, start=1):
        company_block = f"""Input {idx}:
Company: {row.get("Company Name") or row.get("Cleaned Company Name") or ""}
Industry: {row.get("Industry") or ""}
Description: {truncate(row.get("Company Short Description") or row.get("Company SEO Description"), 2000)}
Keywords: {truncate(row.get("Company Keywords"), 400)}
Technologies: {truncate(row.get("Company Technologies"), 400)}
Title of lead: {row.get("Title") or ""}
Seniority: {row.get("Seniority") or ""}
Founded: {row.get("Company Founded Year") or ""}
Kimi News: {truncate(row.get("kimi_news_enriched"), 800)}
Service context: {row.get("Service") or DEFAULT_SERVICE_CONTEXT}
"""
        inputs_text.append(company_block)

    user_prompt = BATCH_PROMPT_RULES + "\n\n" + "\n\n".join(inputs_text)
    messages = [{"role": "user", "content": user_prompt}]

    # --- API call ---
    start_time = time.time()
    resp = deepseek_client.chat.completions.create(
        model="deepseek-reasoner",
        messages=messages,
        max_tokens=13000
    )
    duration = time.time() - start_time

    usage = resp.usage
    DEEPSEEK_TIME += duration
    DEEPSEEK_INPUT += usage.prompt_tokens
    DEEPSEEK_OUTPUT += usage.completion_tokens
    print(f"[Openers Batch] {len(batch_rows)} companies | Time: {duration:.2f}s | In: {usage.prompt_tokens} Out: {usage.completion_tokens}")

    raw_output = (resp.choices[0].message.content or "").strip()
    print("\n[DeepSeek Raw Output]\n", raw_output, "\n---")

    lines = []
    pattern = r'^\s*(\d+)[\.\)]\s*(.+)$'
    for line in raw_output.split("\n"):
        m = re.match(pattern, line.strip())
        if m:
            lines.append(m.group(2).strip())

    if not lines:  # fallback
        lines = [l.strip() for l in raw_output.split("\n") if l.strip()]

    return lines


# ------------------------------------------------------------------
# Batch processor
# ------------------------------------------------------------------
def process_excel_in_batches(file_path, batch_size=6, output_file="output.xlsx"):
    df = pd.read_excel(file_path)
    total_rows = len(df)
    batch_count = 0

    for start in range(0, total_rows, batch_size):
        batch = df.iloc[start:start+batch_size]
        batch_count += 1
        print(f"\n=== Processing Batch {batch_count} ({len(batch)} rows) ===")

        rows_as_dicts = batch.to_dict(orient="records")

        # Step 1: Kimi enrichment
        kimi_outputs = kimi_batch_enrich(rows_as_dicts)
        for i, row in enumerate(batch.index):
            df.at[row, "kimi_news_enriched"] = kimi_outputs[i]

        # Refresh batch
        batch = df.iloc[start:start+batch_size]
        enriched_rows = batch.to_dict(orient="records")

        # Step 2: DeepSeek openers
        outputs = generate_openers_batch(enriched_rows)
        while len(outputs) < len(batch):
            outputs.append("")

        for i, row in enumerate(batch.index):
            df.at[row, "Personalized Opener"] = outputs[i]

        # Save after each batch
        df.to_excel(output_file, index=False)
        print(f"[Batch {batch_count}] Results written to {output_file}")

    # Summary
    print("\n=== Job Summary ===")
    print(f"DeepSeek input tokens: {DEEPSEEK_INPUT}")
    print(f"DeepSeek output tokens: {DEEPSEEK_OUTPUT}")
    print(f"Kimi input tokens: {KIMI_INPUT}")
    print(f"Kimi output tokens: {KIMI_OUTPUT}")
    print(f"DeepSeek time: {DEEPSEEK_TIME:.2f}s")
    print(f"Kimi time: {KIMI_TIME:.2f}s")
    print(f"Grand Total time: {DEEPSEEK_TIME+KIMI_TIME:.2f}s")
    print(f"Results saved to: {output_file}")


if __name__ == "__main__":
    process_excel_in_batches("p3.xlsx", batch_size=6, output_file="p3_with_kimi2.xlsx")
