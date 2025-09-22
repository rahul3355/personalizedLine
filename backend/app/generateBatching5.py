import os
import time
import pandas as pd
from openai import OpenAI
import requests, feedparser, re
from urllib.parse import quote


# --- API KEYS ---
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
COMPANIES_HOUSE_API_KEY = "210ef790-d957-4724-9a76-83b9f38e1be8"  # your key

# --- Clients ---
client = OpenAI(
    api_key=DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com"
)

# --- Service context: your actual offer ---
DEFAULT_SERVICE_CONTEXT = (
    "I help you book qualified appointments through LinkedIn content and outreach. "
    "I guarantee 10+ appointments a month."
)

# --- REFINED Prompt rules for batching ---
BATCH_PROMPT_RULES = (
    "You are a specialized B2B cold email strategist with deep expertise in analyzing company pain points.\n\n"
    "Task:\n"
    "Generate one hyper-personalized cold email opening line per company using their specific data.\n\n"
    "Hidden reasoning framework:\n"
    "1. Analyze Industry/Description: Identify core business operations and inherent challenges\n"
    "2. Extract Pain Signals: From keywords/technologies, infer specific operational bottlenecks\n"
    "3. Map to Service Context: Connect pain points to appointment booking solutions\n"
    "4. Structure Sentence: Craft a natural, observational statement focusing on their quantified challenges\n\n"
    "Research depth requirements:\n"
    "- Incorporate 1-2 specific keywords/technologies from provided data\n"
    "- Reference actual business context (e.g., 'API integrations' for SaaS companies)\n"
    "- Use industry-specific metrics where possible (conversion rates, lead volume, time spent)\n\n"
    "Pain point identification:\n"
    "- Focus on: Lead quality issues, outreach scalability, conversion bottlenecks, lengthy sales cycles\n"
    "- Avoid generic challenges; target operational inefficiencies specific to their model\n\n"
    "CRITICAL STYLE RULES:\n"
    "- 18-25 words; single sentence only.\n"
    "- MUST be an observational statement, NOT a question.\n"
    "- VARY the sentence structure for each company to avoid sounding formulaic.\n"
    "- Use active voice and contractions for a conversational tone (e.g., \"you're,\" \"it's\").\n"
    "- Avoid compliments and vague adjectives (e.g., 'impressive,' 'amazing').\n"
    "- Anchor the observation around a plausible challenge their company faces.\n\n"
    "Output format:\n"
    "Numbered list (1., 2., 3., …) with exactly one sentence per input company."
)

# --- Template with richer fields from Excel ---
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
Service context: {service}"""

# === Enrichment helpers ===

def lookup_recent_news(company_name: str, company_domain: str = None) -> str:
    """
    Get the most relevant recent news for a company.
    Priority:
      1. Company blog RSS (if domain provided)
      2. Google News RSS restricted to domain
      3. Google News RSS restricted to company name in quotes
    Filters out irrelevant/noisy headlines.
    """

    # 1. Blog RSS (most reliable)
    if company_domain:
        rss_candidates = [
            f"https://{company_domain}/feed",
            f"https://{company_domain}/rss",
            f"https://{company_domain}/blog/feed",
            f"https://{company_domain}/blog/rss",
        ]
        for rss_url in rss_candidates:
            try:
                feed = feedparser.parse(requests.get(rss_url, timeout=10).text)
                if feed.entries:
                    entry = feed.entries[0]
                    return f"Blog: {entry.title} ({entry.get('published','')}) {entry.link}"
            except Exception:
                continue

    # 2. Google News with domain restriction
    if company_domain:
        try:
            query = f"site:{company_domain}"
            url = f"https://news.google.com/rss/search?q={quote(query)}"
            feed = feedparser.parse(requests.get(url, timeout=10).text)
            if feed.entries:
                entry = feed.entries[0]
                return f"News: {entry.title} ({entry.get('published','')}) {entry.link}"
        except Exception:
            pass

    # 3. Google News with quoted company name
    try:
        query = f'"{company_name}"'
        url = f"https://news.google.com/rss/search?q={quote(query)}"
        feed = feedparser.parse(requests.get(url, timeout=10).text)
        for entry in feed.entries[:5]:  # scan first 5 to avoid irrelevant
            title = entry.title.lower()
            if company_name.lower() in title:
                return f"News: {entry.title} ({entry.get('published','')}) {entry.link}"
        return ""
    except Exception:
        return ""


def lookup_funding_news(company_name: str) -> str:
    """
    Funding is often irrelevant/noisy if not via Crunchbase/PitchBook.
    This now only uses Google News with funding-specific keywords.
    Filters out junk that doesn't mention the company.
    """
    try:
        query = f'"{company_name}" (funding OR raised OR investment)'
        url = f"https://news.google.com/rss/search?q={quote(query)}"
        feed = feedparser.parse(requests.get(url, timeout=10).text)
        for entry in feed.entries[:5]:
            title = entry.title.lower()
            if company_name.lower() in title:
                return f"Funding: {entry.title} ({entry.get('published','')}) {entry.link}"
        return ""
    except Exception:
        return ""

# === AI Batch Generator ===
def generate_openers_batch(batch_rows):
    inputs_text = []
    for idx, row in enumerate(batch_rows, start=1):
        inputs_text.append(
            f"Input {idx}:\n" + USER_TEMPLATE.format(
                company=row.get("Company Name") or row.get("Cleaned Company Name") or "",
                industry=row.get("Industry") or "",
                description=row.get("Company Short Description") or row.get("Company SEO Description") or "",
                keywords=row.get("Company Keywords") or "",
                technologies=row.get("Company Technologies") or "",
                title=row.get("Title") or "",
                seniority=row.get("Seniority") or "",
                founded=row.get("Company Founded Year") or "",
                funding=row.get("Company Total Funding") or "",
                recent_news=row.get("Recent News") or "",
                funding_news=row.get("Funding News") or "",
                service=row.get("Service") or DEFAULT_SERVICE_CONTEXT
            )
        )

    user_prompt = "\n\n".join(inputs_text)
    messages = [{"role": "user", "content": BATCH_PROMPT_RULES + "\n\n" + user_prompt}]

    start_time = time.time()
    resp = client.chat.completions.create(
        model="deepseek-reasoner",
        messages=messages,
        max_tokens=14000
    )
    duration = time.time() - start_time

    usage = resp.usage
    raw_output = (resp.choices[0].message.content or "").strip()

    # --- Robust parsing of numbered outputs ---
    pattern = r'^\s*(\d+)\.\s*(.+)$'
    lines = []
    for line in raw_output.split("\n"):
        match = re.match(pattern, line.strip())
        if match:
            lines.append(match.group(2).strip())

    return lines, duration, usage.prompt_tokens, usage.completion_tokens, usage.total_tokens

# === Batch Processor ===
def process_excel_in_batches(file_path, batch_size=10, output_file="output.xlsx"):
    df = pd.read_excel(file_path)

    grand_total_time = 0.0
    grand_total_tokens = 0

    for start in range(0, len(df), batch_size):
        batch = df.iloc[start:start+batch_size]

        # === Enrichment: Add Recent News + Funding News ===
        for i, row in batch.iterrows():
            company_name = row.get("Company Name") or row.get("Cleaned Company Name") or ""
            df.at[i, "Recent News"] = lookup_recent_news(company_name)
            df.at[i, "Funding News"] = lookup_funding_news(company_name)

        rows_as_dicts = batch.to_dict(orient="records")
        print(f"\n--- Batch {start // batch_size + 1} ---\n")

        outputs, duration, prompt_tokens, completion_tokens, total_tokens = generate_openers_batch(rows_as_dicts)

        # Ensure alignment: pad if fewer outputs than rows
        while len(outputs) < len(batch):
            outputs.append("")

        for out in outputs:
            print(out)
            print()

        # Save results into dataframe
        df.loc[start:start+len(outputs)-1, "Personalized Opener"] = outputs

        print(f"Time taken for batch: {duration:.2f} seconds")
        print(f"Tokens used (prompt: {prompt_tokens}, completion: {completion_tokens}, total: {total_tokens})")

        grand_total_time += duration
        grand_total_tokens += total_tokens

    df.to_excel(output_file, index=False)

    print("\n=== Job Summary ===")
    print(f"Total time for job: {grand_total_time:.2f} seconds")
    print(f"Total tokens for job: {grand_total_tokens}")
    print(f"Results saved to: {output_file}")

if __name__ == "__main__":
    process_excel_in_batches("p3.xlsx", batch_size=10, output_file="p3_with_openers2.xlsx")
