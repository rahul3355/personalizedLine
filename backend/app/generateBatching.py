import os
import time
import pandas as pd
from openai import OpenAI

# --- Client (DeepSeek API not OpenAI API) ---
client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

DEFAULT_SERVICE_CONTEXT = "Mental health and therapy"

# --- Prompt rules for batching ---
BATCH_PROMPT_RULES = (
    "You are writing the opening sentence of a cold email.\n"
    "Process each input independently.\n\n"
    "Steps for EACH input:\n"
    "1. Skim the company details and service context.\n"
    "2. Use team size (if provided) only as hidden context: "
    " - Small teams → emphasize limited resources, fatigue, tight deadlines.\n"
    " - Medium teams → emphasize balancing growth with focus.\n"
    " - Large teams → emphasize coordination, complexity, communication stress.\n"
    "3. Write exactly one natural, conversational sentence (18–25 words) that directly references the company by name.\n\n"
    "Style requirements:\n"
    "- Always include the exact company name as written in the input.\n"
    "- Do not mention numbers or employee counts directly. Use them only to shape tone and implied challenges.\n"
    "- Use a natural, human tone, like you’re making an observation in conversation.\n"
    "- Vary phrasing across outputs (sometimes start with the company name, sometimes with context, sometimes with 'I imagine').\n"
    "- Keep the tone confident and observational, not generic or robotic.\n"
    "- Do not explain reasoning, only output the sentences.\n\n"
    "Output format:\n"
    "Return exactly one numbered sentence per input (1., 2., 3., …).\n"
)

USER_TEMPLATE = """Company: {company}
Description: {description}
Industry: {industry}
Team size: {size}
Service context: {service}"""

def generate_openers_batch(batch_rows):
    inputs_text = []
    for idx, row in enumerate(batch_rows, start=1):
        company_value = row.get("Company Name") or row.get("Cleaned Company Name") or ""
        description_value = row.get("Company Short Description") or row.get("Company SEO Description") or ""
        industry_value = row.get("Industry") or ""
        size_value = str(row.get("Employee Count") or "")

        service_value = row.get("Service") or DEFAULT_SERVICE_CONTEXT

        inputs_text.append(
            f"Input {idx}:\n" + USER_TEMPLATE.format(
                company=company_value,
                description=description_value,
                industry=industry_value,
                size=size_value,
                service=service_value
            )
        )

    user_prompt = "\n\n".join(inputs_text)

    messages = [{"role": "user", "content": BATCH_PROMPT_RULES + "\n\n" + user_prompt}]

    # --- Start timing for this batch ---
    start_time = time.time()

    resp = client.chat.completions.create(
        model="deepseek-reasoner",
        messages=messages,
        max_tokens=4000
    )

    # --- End timing and calculate duration ---
    end_time = time.time()
    duration = end_time - start_time

    # --- Get usage stats ---
    usage = resp.usage
    prompt_tokens = usage.prompt_tokens
    completion_tokens = usage.completion_tokens
    total_tokens = usage.total_tokens

    raw_output = (resp.choices[0].message.content or "").strip()
    lines = [line.strip() for line in raw_output.split("\n") if line.strip()]

    clean_outputs = []
    for line in lines:
        if line[0].isdigit():
            sentence = line.split(".", 1)[-1].strip()
            clean_outputs.append(sentence)
        else:
            clean_outputs.append(line)

    return clean_outputs, duration, prompt_tokens, completion_tokens, total_tokens

def process_excel_in_batches(file_path, batch_size=10):
    df = pd.read_excel(file_path)

    grand_total_time = 0.0
    grand_total_tokens = 0

    for start in range(0, len(df), batch_size):
        batch = df.iloc[start:start+batch_size]
        rows_as_dicts = batch.to_dict(orient="records")

        print(f"\n--- Batch {start // batch_size + 1} ---\n")

        outputs, duration, prompt_tokens, completion_tokens, total_tokens = generate_openers_batch(rows_as_dicts)

        # Print outputs
        for out in outputs:
            print(out)
            print()

        # Print batch stats
        print(f"Time taken for batch: {duration:.2f} seconds")
        print(f"Tokens used (prompt: {prompt_tokens}, completion: {completion_tokens}, total: {total_tokens})")

        # Accumulate totals
        grand_total_time += duration
        grand_total_tokens += total_tokens

    # Print overall totals
    print("\n=== Job Summary ===")
    print(f"Total time for job: {grand_total_time:.2f} seconds")
    print(f"Total tokens for job: {grand_total_tokens}")

if __name__ == "__main__":
    process_excel_in_batches("p3.xlsx", batch_size=10)
