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
    """
    Fetch latest news for a batch of companies (up to 20) using Kimi's $web_search tool.
    One API call per batch instead of one per company.
    """
    global KIMI_INPUT, KIMI_OUTPUT, KIMI_TIME
    companies = [row.get("Company Name") or row.get("Cleaned Company Name") or "" for row in batch_rows]

    # Build user query with all companies listed
    query = "Please search the internet and provide one reliable, company-specific news update " \
            "(1–2 sentences, last 30 days) for each of these companies:\n\n"
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
                    # Echo the arguments back so Kimi executes its search
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

    # Parse numbered list back into separate lines
    outputs = []
    pattern = r'^\s*(\d+)[\.\)]\s*(.+)$'
    for line in resp_text.split("\n"):
        m = re.match(pattern, line.strip())
        if m:
            outputs.append(m.group(2).strip())

    # Fallback: split on non-empty lines if regex fails
    if not outputs:
        outputs = [l.strip() for l in resp_text.split("\n") if l.strip()]

    # Ensure length matches company count
    while len(outputs) < len(companies):
        outputs.append("")

    print("[Kimi] Parsed outputs:")
    for i, l in enumerate(outputs):
        print(f"   {companies[i]} -> {l}")

    # Sleep 20 seconds to stay under 6 RPM
    print("[Kimi] Sleeping 20 seconds to respect rate limits...")
    time.sleep(20)

    return outputs



# ------------------------------------------------------------------
# DeepSeek opener generator
# ------------------------------------------------------------------

def generate_openers_batch(batch_rows):
    global DEEPSEEK_INPUT, DEEPSEEK_OUTPUT, DEEPSEEK_TIME
    inputs_text = []

    print("\n[DeepSeek] Preparing batch context...")
    for idx, row in enumerate(batch_rows, start=1):
        company = row.get("Company Name") or row.get("Cleaned Company Name") or ""
        kimi_news = row.get("kimi_news_enriched") or ""
        description = row.get("Company Short Description") or row.get("Company SEO Description") or ""

        context = f"""Company: {company}
Description: {description}
Kimi News: {kimi_news}
Service context: {row.get("Service") or DEFAULT_SERVICE_CONTEXT}"""

        print(f"[DeepSeek] Input {idx} for {company}:\n{context}\n---")
        inputs_text.append(f"Input {idx}:\n{context}")

    user_prompt = "\n\n".join(inputs_text)
    messages = [{"role": "user", "content": BATCH_PROMPT_RULES + "\n\n" + user_prompt}]

    print("\n[DeepSeek] Final prompt:\n", messages[0]["content"][:1000], "...\n")

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
    print(f"[DeepSeek Batch] {len(batch_rows)} companies | Time: {duration:.2f}s | In: {usage.prompt_tokens} Out: {usage.completion_tokens}")

    raw_output = (resp.choices[0].message.content or "").strip()
    print("\n[DeepSeek Raw Output]\n", raw_output, "\n---")

    lines = []
    pattern = r'^\s*(\d+)[\.\)]\s*(.+)$'
    for line in raw_output.split("\n"):
        m = re.match(pattern, line.strip())
        if m:
            lines.append(m.group(2).strip())

    if not lines:
        print("[DeepSeek] Regex parse failed, falling back to raw splitting")
        lines = [l.strip() for l in raw_output.split("\n") if l.strip()]

    print("[DeepSeek] Parsed outputs:")
    for i, l in enumerate(lines):
        company = batch_rows[i].get("Company Name") or batch_rows[i].get("Cleaned Company Name") or f"Row {i}"
        print(f"   {company} -> {l}")

    return lines

# ------------------------------------------------------------------
# Batch processor
# ------------------------------------------------------------------

def process_excel_in_batches(file_path, batch_size=19, output_file="output.xlsx"):
    """
    Process an Excel file in batches of companies.
    For each batch:
      1. Fetch Kimi news snippets via a single $web_search call.
      2. Generate personalized openers with DeepSeek.
      3. Sleep 20s to respect Kimi’s 6 RPM limit.
    """
    df = pd.read_excel(file_path)
    total_rows = len(df)
    batch_count = 0

    for start in range(0, total_rows, batch_size):
        batch = df.iloc[start:start+batch_size]
        batch_count += 1
        print(f"\n=== Processing Batch {batch_count} ({len(batch)} rows) ===")

        rows_as_dicts = batch.to_dict(orient="records")

        # Step 1: Enrich rows with Kimi news (one request for the batch)
        kimi_outputs = kimi_batch_enrich(rows_as_dicts)
        for i, row in enumerate(batch.index):
            df.at[row, "kimi_news_enriched"] = kimi_outputs[i]

        # Step 2: Generate personalized openers using DeepSeek
        enriched_rows = batch.to_dict(orient="records")
        outputs = generate_openers_batch(enriched_rows)

        while len(outputs) < len(batch):
            outputs.append("")

        for i, row in enumerate(batch.index):
            df.at[row, "Personalized Opener"] = outputs[i]

        # Save progress after each batch (important for long runs)
        df.to_excel(output_file, index=False)
        print(f"[Batch {batch_count}] Results written to {output_file}")

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
    process_excel_in_batches("p3.xlsx", batch_size=19, output_file="p3_with_kimi_batched2.xlsx")
