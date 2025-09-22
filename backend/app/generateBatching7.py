import os
import time
import re
import requests
import feedparser
import pandas as pd
from urllib.parse import quote
from openai import OpenAI
import trafilatura  # for extracting clean article text

# === API KEYS ===
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

# === OpenAI Client (DeepSeek endpoint) ===
client = OpenAI(
    api_key=DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com"
)

# === Default service context for mapping pain points ===
DEFAULT_SERVICE_CONTEXT = (
    "I help you book qualified appointments through LinkedIn content and outreach. "
    "I guarantee 10+ appointments a month."
)

# === LLM Prompt Rules ===
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
Service context: {service}"""

# ------------------------------------------------------------------
# Enrichment helpers
# ------------------------------------------------------------------

def _fetch_rss(url: str):
    """Safely fetch RSS feed entries."""
    try:
        resp = requests.get(url, timeout=10)
        feed = feedparser.parse(resp.text)
        return feed.entries if feed.entries else []
    except Exception:
        return []

def lookup_recent_news(company_name: str, company_domain: str = None) -> str:
    """
    Get the most relevant recent news for a company.
    Priority order:
      1. Blog RSS (if domain provided)
      2. Google News restricted to domain
      3. Google News restricted to quoted company name
    """
    # 1. Blog RSS
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

    # 2. Google News by domain
    if company_domain:
        query = f"site:{company_domain}"
        url = f"https://news.google.com/rss/search?q={quote(query)}"
        entries = _fetch_rss(url)
        if entries:
            e = entries[0]
            return f"News: {e.title} ({e.get('published','')}) {e.link}"

    # 3. Google News by quoted company name
    query = f'"{company_name}"'
    url = f"https://news.google.com/rss/search?q={quote(query)}"
    entries = _fetch_rss(url)
    for e in entries[:5]:  # check top 5 for relevance
        if company_name.lower() in e.title.lower():
            return f"News: {e.title} ({e.get('published','')}) {e.link}"

    return ""

def lookup_funding_news(company_name: str) -> str:
    """
    Funding lookup with Google News.
    Only keeps entries explicitly naming the company and funding terms.
    """
    query = f'"{company_name}" (funding OR raised OR investment)'
    url = f"https://news.google.com/rss/search?q={quote(query)}"
    entries = _fetch_rss(url)
    for e in entries[:5]:
        if company_name.lower() in e.title.lower():
            return f"Funding: {e.title} ({e.get('published','')}) {e.link}"
    return ""

# ------------------------------------------------------------------
# Article fetch & summarization
# ------------------------------------------------------------------

def fetch_article_content(url: str) -> str:
    """Download and clean full article content from a URL."""
    try:
        downloaded = trafilatura.fetch_url(url)
        if downloaded:
            text = trafilatura.extract(downloaded)
            return text if text else ""
        return ""
    except Exception:
        return ""

def summarize_article(text: str) -> str:
    """Summarize article using LLM."""
    if not text.strip():
        return ""
    resp = client.chat.completions.create(
        model="deepseek-reasoner",
        messages=[
            {"role": "system", "content": "Summarize this news article in 3-4 sentences, focusing only on company context."},
            {"role": "user", "content": text[:6000]}  # truncate if too long
        ],
        max_tokens=500
    )
    return resp.choices[0].message.content.strip()

# ------------------------------------------------------------------
# LLM opener generator
# ------------------------------------------------------------------

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

    # Parse numbered outputs
    lines = []
    pattern = r'^\s*(\d+)\.\s*(.+)$'
    for line in raw_output.split("\n"):
        m = re.match(pattern, line.strip())
        if m:
            lines.append(m.group(2).strip())

    return lines, duration, usage.prompt_tokens, usage.completion_tokens, usage.total_tokens

# ------------------------------------------------------------------
# Batch processor
# ------------------------------------------------------------------

def process_excel_in_batches(file_path, batch_size=4, output_file="output.xlsx"):
    df = pd.read_excel(file_path)

    total_time = 0.0
    total_tokens = 0

    for start in range(0, len(df), batch_size):
        batch = df.iloc[start:start+batch_size]

        # Enrichment
        for i, row in batch.iterrows():
            company_name = row.get("Company Name") or row.get("Cleaned Company Name") or ""
            company_domain = None
            if "Company Website Short" in row and pd.notna(row["Company Website Short"]):
                company_domain = str(row["Company Website Short"]).replace("http://", "").replace("https://", "").strip("/")

            # News + Funding
            news_val = lookup_recent_news(company_name, company_domain)
            funding_val = lookup_funding_news(company_name)
            df.at[i, "Recent News"] = news_val
            df.at[i, "Funding News"] = funding_val

            # Scrape and summarize news
            summary = ""
            if "http" in str(news_val):
                url = news_val.split()[-1]  # last token should be link
                article_text = fetch_article_content(url)
                summary = summarize_article(article_text)
            df.at[i, "news_data"] = summary

        # Generate openers
        rows_as_dicts = batch.to_dict(orient="records")
        print(f"\n--- Batch {start // batch_size + 1} ---\n")

        outputs, duration, p_tokens, c_tokens, t_tokens = generate_openers_batch(rows_as_dicts)

        # Pad if fewer outputs than rows
        while len(outputs) < len(batch):
            outputs.append("")

        for out in outputs:
            print(out + "\n")

        df.loc[start:start+len(outputs)-1, "Personalized Opener"] = outputs

        print(f"Time: {duration:.2f}s | Tokens used: {t_tokens}")

        total_time += duration
        total_tokens += t_tokens

    df.to_excel(output_file, index=False)

    print("\n=== Job Summary ===")
    print(f"Total time: {total_time:.2f}s")
    print(f"Total tokens: {total_tokens}")
    print(f"Results saved to: {output_file}")


if __name__ == "__main__":
    process_excel_in_batches("p3.xlsx", batch_size=10, output_file="p3_with_openers5.xlsx")
