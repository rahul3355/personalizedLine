import os
import sys
import time
import re
import pandas as pd
from openai import OpenAI

# === API KEYS ===
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
KIMI_API_KEY = "sk-hY4kxGp1xcEuIPSxcVSqKVYV6H7yCqwKgKM09zbssLieiObh"  # replace if rotated

# === Clients ===
deepseek_client = OpenAI(
    api_key=DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com"
)
kimi_client = OpenAI(
    api_key=KIMI_API_KEY,
    base_url="https://api.moonshot.ai/v1"  # CORRECT endpoint
)

# === Default service context ===
DEFAULT_SERVICE_CONTEXT = (
    "I help you book qualified appointments through LinkedIn content and outreach. "
    "I guarantee 10+ appointments a month."
)

# === Prompt rules ===
BATCH_PROMPT_RULES = (
    "You are a specialized B2B cold email strategist.\n\n"
    "Task:\n"
    "Generate one hyper-personalized cold email opening for each company using their specific data.\n\n"
    "Rules:\n"
    "- Write exactly two sentences.\n"
    "- Mention the company by name.\n"
    "- First sentence: reference the Kimi-provided news snippet.\n"
    "- Second sentence: highlight a subtle implication or pain point this creates, framed in a way that aligns with the service context provided, but do not mention the service itself.\n"
    "- Conversational, natural, human-like tone.\n"
    "- Avoid stiff corporate phrasing, compliments, or flattery.\n"
    "- Do not invent specific numbers or fake data.\n\n"
    "Output format:\n"
    "Numbered list (1., 2., 3., …) with exactly one opener per input company."
)

# === Logging globals ===
DEEPSEEK_INPUT = 0
DEEPSEEK_OUTPUT = 0
KIMI_INPUT = 0
KIMI_OUTPUT = 0
DEEPSEEK_TIME = 0.0
KIMI_TIME = 0.0

# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def safe_output(text: str) -> str:
    if not text:
        return ""
    lowered = text.lower()
    if lowered.startswith(("i'm unable", "i cannot", "sorry")):
        return ""
    return re.sub(r"<[^>]+>", " ", str(text)).strip()

# ------------------------------------------------------------------
# Kimi batched enrichment
# ------------------------------------------------------------------

def kimi_batch_enrich(batch_rows):
    """Fetch latest news for a batch of companies in one Kimi call"""
    global KIMI_INPUT, KIMI_OUTPUT, KIMI_TIME
    companies = [row.get("Company Name") or row.get("Cleaned Company Name") or "" for row in batch_rows]
    query = "Give me one concise, company-specific, 1–2 sentence news update for each of these companies:\n"
    query += "\n".join([f"{i+1}. {c}" for i, c in enumerate(companies)])

    try:
        start = time.time()
        resp = kimi_client.chat.completions.create(
            model="kimi-k2-0905-preview",
            messages=[
                {"role": "system", "content": "Return a numbered list. One update per company. Strictly 1–2 sentences each. Always include the company name."},
                {"role": "user", "content": query}
            ],
            max_tokens=2500
        )
        duration = time.time() - start
        usage = resp.usage
        KIMI_TIME += duration
        KIMI_INPUT += usage.prompt_tokens
        KIMI_OUTPUT += usage.completion_tokens
        print(f"[Kimi Batch] {len(companies)} companies | Time: {duration:.2f}s | In: {usage.prompt_tokens} Out: {usage.completion_tokens}")

        content = safe_output(resp.choices[0].message.content.strip())
        lines = []
        pattern = r'^\s*(\d+)\.\s*(.+)$'
        for line in content.split("\n"):
            m = re.match(pattern, line.strip())
            if m:
                lines.append(m.group(2).strip())

        # pad if fewer outputs than inputs
        while len(lines) < len(companies):
            lines.append("")
        return lines
    except Exception as e:
        print(f"[Kimi ERROR]: {e}")
        sys.exit(1)

# ------------------------------------------------------------------
# DeepSeek opener generator
# ------------------------------------------------------------------

def generate_openers_batch(batch_rows):
    global DEEPSEEK_INPUT, DEEPSEEK_OUTPUT, DEEPSEEK_TIME
    inputs_text = []
    for idx, row in enumerate(batch_rows, start=1):
        context = f"""Company: {row.get("Company Name") or row.get("Cleaned Company Name") or ""}
Description: {row.get("Company Short Description") or row.get("Company SEO Description") or ""}
Kimi News: {row.get("kimi_news_enriched") or ""}
Service context: {row.get("Service") or DEFAULT_SERVICE_CONTEXT}"""
        inputs_text.append(f"Input {idx}:\n{context}")

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

def process_excel_in_batches(file_path, batch_size=6, output_file="output.xlsx"):
    df = pd.read_excel(file_path)
    total_rows = len(df)
    batch_count = 0

    for start in range(0, total_rows, batch_size):
        batch = df.iloc[start:start+batch_size]
        batch_count += 1

        rows_as_dicts = batch.to_dict(orient="records")

        # Step 1: Kimi once per batch
        kimi_outputs = kimi_batch_enrich(rows_as_dicts)
        for i, row in enumerate(batch.index):
            df.at[row, "kimi_news_enriched"] = kimi_outputs[i]

        # Step 2: DeepSeek for openers
        enriched_rows = batch.to_dict(orient="records")
        outputs = generate_openers_batch(enriched_rows)

        # Save outputs
        while len(outputs) < len(batch):
            outputs.append("")
        for i, row in enumerate(batch.index):
            df.at[row, "Personalized Opener"] = outputs[i]

    df.to_excel(output_file, index=False)

    # Final summary
    print("\n=== Job Summary ===")
    print(f"DeepSeek input tokens: {DEEPSEEK_INPUT}")
    print(f"DeepSeek output tokens: {DEEPSEEK_OUTPUT}")
    print(f"Kimi input tokens: {KIMI_INPUT}")
    print(f"Kimi output tokens: {KIMI_OUTPUT}")
    print(f"Total DeepSeek tokens: {DEEPSEEK_INPUT+DEEPSEEK_OUTPUT}")
    print(f"Total Kimi tokens: {KIMI_INPUT+KIMI_OUTPUT}")
    print(f"DeepSeek time: {DEEPSEEK_TIME:.2f}s")
    print(f"Kimi time: {KIMI_TIME:.2f}s")
    print(f"Grand Total time: {DEEPSEEK_TIME+KIMI_TIME:.2f}s")
    print(f"Results saved to: {output_file}")


if __name__ == "__main__":
    process_excel_in_batches("p4.xlsx", batch_size=6, output_file="p4_with_kimi_batched.xlsx")
