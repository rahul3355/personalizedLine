import os
import time
import re
import requests
import feedparser
import pandas as pd
from openai import OpenAI

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

def lookup_recent_news(company_name: str) -> str:
    """Fetch top Google News headline for a company."""
    try:
        url = f"https://news.google.com/rss/search?q={company_name}"
        feed = feedparser.parse(requests.get(url, timeout=10).text)
        if feed.entries:
            entry = feed.entries[0]
            headline = entry.title
            link = entry.link
            published = entry.get("published", "")
            return f"{headline} ({published}) {link}"
        return f"No recent news found for {company_name}"
    except Exception as e:
        return f"Error fetching news for {company_name}: {e}"

import base64
import requests
import feedparser

COMPANIES_HOUSE_KEY = "210ef790-d957-4724-9a76-83b9f38e1be8"

def lookup_funding_news(company_name, country="United Kingdom"):
    """
    Returns a string summarizing funding/financial info for a given company.
    Order of preference:
    1. Companies House (UK companies)
    2. SEC EDGAR (US companies)
    3. Google News RSS fallback for all others
    """
    try:
        # --- 1. UK Companies → Companies House API ---
        if country.lower() in ["united kingdom", "uk", "england", "scotland", "wales", "northern ireland"]:
            try:
                # Encode API key for Basic Auth
                key_bytes = f"{COMPANIES_HOUSE_KEY}:".encode("utf-8")
                b64_key = base64.b64encode(key_bytes).decode("utf-8")
                headers = {"Authorization": f"Basic {b64_key}"}

                # Search by name
                search_url = f"https://api.company-information.service.gov.uk/search/companies?q={company_name}"
                resp = requests.get(search_url, headers=headers, timeout=10)
                if resp.status_code == 200 and "items" in resp.json() and len(resp.json()["items"]) > 0:
                    company_number = resp.json()["items"][0]["company_number"]

                    # Get filing history
                    filings_url = f"https://api.company-information.service.gov.uk/company/{company_number}/filing-history"
                    filings_resp = requests.get(filings_url, headers=headers, timeout=10)
                    if filings_resp.status_code == 200:
                        filings = filings_resp.json().get("items", [])
                        # Look for capital/funding relevant filings
                        for f in filings[:10]:
                            desc = f.get("description", "")
                            date = f.get("date", "")
                            if "capital" in desc.lower() or "allotment" in desc.lower():
                                return f"Companies House filing: {desc} on {date}"
                        return f"No explicit funding filings found for {company_name} (Companies House)."
                else:
                    return f"No Companies House record found for {company_name}."
            except Exception as e:
                return f"Companies House lookup failed: {str(e)}"

        # --- 2. US Companies → SEC EDGAR ---
        if country.lower() in ["united states", "usa", "us"]:
            try:
                query = company_name.replace(" ", "+")
                search_url = f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company={query}&owner=exclude&count=10"
                # We’re not parsing filings deeply here (would need EDGAR XML), just returning the search URL
                return f"SEC EDGAR filings available: {search_url}"
            except Exception as e:
                return f"SEC lookup failed: {str(e)}"

        # --- 3. Global fallback → Google News RSS (funding-specific search) ---
        try:
            query = f"{company_name} funding OR investment OR raised"
            rss_url = f"https://news.google.com/rss/search?q={query}"
            feed = feedparser.parse(rss_url)
            if feed.entries:
                top = feed.entries[0]
                return f"{top.title} ({top.published}) {top.link}"
            return f"No funding news found for {company_name}."
        except Exception as e:
            return f"Google News funding fallback failed: {str(e)}"

    except Exception as e:
        return f"Funding lookup error: {str(e)}"


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
    process_excel_in_batches("p3.xlsx", batch_size=10, output_file="p3_with_openers.xlsx")
