"""
Clay-like enrichment (no paid APIs) – full drop-in
- TechCrunch RSS → VentureBeat RSS → SEC Form D XML → UK CH Statement
- Currency normalised to USD
- Investor name appended
- DeepSeek called **after** enrichment → returns only final 2-sentence opener
- PersonalizedOpener is **LAST** column
"""
import os, json, re, time, httpx, xmltodict, pandas as pd
from datetime import datetime, timedelta
from openai import OpenAI

client = OpenAI(api_key=os.getenv("DEEPSEEK_API_KEY"), base_url="https://api.deepseek.com")

BATCH_SIZE   = 10
SERVICE_CTX  = ("I help you book qualified appointments through LinkedIn content and outreach. "
                "I guarantee 10+ appointments a month.")
FUNDING_RE   = re.compile(r"(?i)(Series|Seed|Pre-Seed|Bridge|IPO)\s+\$?([\d.]+[BMk]?)\s*(Series\s+[A-Z])?")
ECB_USD_URL  = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"

# ---------- 1.  USD FX CACHE ----------
fx_cache = {}
def usd_rate(ccy: str) -> float:
    if ccy == "USD": return 1.0
    if ccy in fx_cache: return fx_cache[ccy]
    try:
        r = httpx.get(ECB_USD_URL, timeout=10)
        doc = xmltodict.parse(r.text)
        for c in doc["gesmes:Envelope"]["Cube"]["Cube"]["Cube"]:
            if c["@currency"] == ccy:
                fx_cache[ccy] = float(c["@rate"])
                return fx_cache[ccy]
    except Exception:
        pass
    return 1.0

# ---------- 2.  RSS WATERFALL (TechCrunch + VentureBeat) ----------
RSS_FEEDS = [
    "https://techcrunch.com/category/startups/feed/",
    "https://venturebeat.com/news/feed/",
]
def rss_funding_headline(company: str, days: int = 90) -> dict:
    after = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    out = {"news": "", "amount": "", "round": "", "date": "", "investor": ""}
    for feed in RSS_FEEDS:
        url = f'https://news.google.com/rss/search?q="{company}"+site:{feed.split("/")[2]}+after:{after}&hl=en-US&gl=US&ceid=US:en'
        try:
            r = httpx.get(url, timeout=10)
            if r.status_code != 200: continue
            root = xmltodict.parse(r.text)
            for item in root.get("rss", {}).get("channel", {}).get("item", []) or []:
                title = item.get("title", "")
                pub   = item.get("pubDate", "")
                m = FUNDING_RE.search(title)
                if m:
                    out["news"]   = title
                    out["amount"] = m.group(2)
                    out["round"]  = m.group(1)
                    out["date"]   = pub
                    # crude investor grab
                    led = re.search(r"led by ([A-Z]\w+)", title, re.I)
                    if led: out["investor"] = led.group(1)
                    # normalise to USD
                    if "£" in out["amount"]:
                        out["amount"] = str(float(out["amount"].replace("£", "").replace("M", "")) * usd_rate("GBP")) + "000000"
                    elif "€" in out["amount"]:
                        out["amount"] = str(float(out["amount"].replace("€", "").replace("M", "")) * usd_rate("EUR")) + "000000"
                    else:
                        out["amount"] = out["amount"].replace("$", "").replace("M", "") + "000000"
                    return out
        except Exception:
            continue
    return out

# ---------- 3.  SEC FORM D XML (US companies) ----------
SEC_BASE = "https://www.sec.gov/Archives/edgar/daily-index/form-d/"
def sec_funding(company: str) -> dict:
    out = {"news": "", "amount": "", "round": "", "date": "", "investor": ""}
    today = datetime.utcnow()
    qtr   = (today.month - 1) // 3 + 1
    idx_url = f"{SEC_BASE}{today.year}/QTR{qtr}/index.json"
    try:
        idx = httpx.get(idx_url, timeout=10).json()
        for entry in idx.get("directory", {}).get("item", []):
            if entry.get("name", "").endswith(".json"):
                day_json = f"{SEC_BASE}{today.year}/QTR{qtr}/{entry['name']}"
                day = httpx.get(day_json, timeout=10).json()
                for form in day.get("directory", {}).get("item", []):
                    if form.get("name", "").endswith(".xml"):
                        xml_url = f"https://www.sec.gov/Archives/{form['name']}"
                        xml = httpx.get(xml_url, timeout=10).text
                        if company.lower() not in xml.lower(): continue
                        try:
                            doc = xmltodict.parse(xml)
                            d = doc.get("edgar:submission", {}).get("edgar:formData", {})
                            amt = d.get("edgar:totalOfferingAmount", {}).get("#text", "")
                            sold = d.get("edgar:totalSold", {}).get("#text", "")
                            date = d.get("edgar:signatureDate", {}).get("#text", "")
                            if amt or sold:
                                out["news"]   = f"SEC Form D filed – {company}"
                                out["amount"] = amt or sold
                                out["round"]  = "Form D"
                                out["date"]   = date
                                return out
                        except Exception:
                            continue
    except Exception:
        pass
    return out

# ---------- 4.  UK COMPANIES HOUSE (free tier) ----------
CH_BASE = "https://api.company-information.service.gov.uk"
def uk_funding(company: str, uk_number: str = "") -> dict:
    out = {"news": "", "amount": "", "round": "", "date": "", "investor": ""}
    if not uk_number:
        search = httpx.get(f"{CH_BASE}/search/companies?q={company}", timeout=10).json()
        if search.get("items"):
            uk_number = search["items"][0]["company_number"]
        else:
            return out
    try:
        history = httpx.get(f"{CH_BASE}/company/{uk_number}/filing-history", timeout=10).json()
        for item in history.get("items", []):
            if item.get("category") != "capital":
                continue
            date = item.get("date", "")
            for att in item.get("associations", []):
                if att.get("content_type") != "application/xml":
                    continue
                xml_url = att["links"]["self"]
                xml = httpx.get(xml_url, timeout=10).text
                try:
                    doc = xmltodict.parse(xml)
                    total = doc.get("statementOfCapital", {}).get("totalAmountUnpaidToDate", "")
                    if total:
                        out["news"]   = f"UK CH Statement of Capital – {company}"
                        out["amount"] = str(float(total) / 100)  # pence → £
                        out["round"]  = "Statement of Capital"
                        out["date"]   = date
                        out["amount"] = str(float(out["amount"]) * usd_rate("GBP"))  # → USD
                        return out
                except Exception:
                    continue
    except Exception:
        pass
    return out

# ---------- 5.  FUNDING WATERFALL ----------
def funding_waterfall(company: str, uk_number: str = "") -> dict:
    out = rss_funding_headline(company)
    if out["amount"]: return out
    out = sec_funding(company)
    if out["amount"]: return out
    out = uk_funding(company, uk_number)
    if out["amount"]: return out
    return {"news": "", "amount": "", "round": "", "date": "", "investor": ""}

# ---------- 6.  FINAL OPENER PROMPT (after enrichment) ----------
def build_final_prompt(batch):
    lines = []
    for idx, row in enumerate(batch, 1):
        fund = row["_funding"]
        lines.append(
            f"Input {idx}:\n"
            f"Company: {row.get('Cleaned Company Name') or row.get('Company Name') or ''}\n"
            f"Industry: {row.get('Industry','')}\n"
            f"Description: {row.get('Company Short Description') or row.get('Company SEO Description') or ''}\n"
            f"Keywords: {row.get('Company Keywords','')}\n"
            f"Technologies: {row.get('Company Technologies','')}\n"
            f"Title: {row.get('Title','')}\n"
            f"Seniority: {row.get('Seniority','')}\n"
            f"Founded: {row.get('Company Founded Year','')}\n"
            f"FundingNews: {fund['news'] or 'No recent funding news'}\n"
            f"FundingAmount: {fund['amount'] or ''}\n"
            f"Round: {fund['round'] or ''}\n"
            f"FundingDate: {fund['date'] or ''}\n"
            f"Service context: {SERVICE_CTX}\n"
        )
    rules = (
        "You are a senior SDR.\n"
        "For each block above return JSON only:\n"
        "{\n"
        "  \"opener\": \"18-25 words, 2 sentences. Sentence 1 MUST mention funding round + amount + date if non-empty. Sentence 2 bridges to our LinkedIn demo-booking service. Observational, no question.\"\n"
        "}\n"
        "Output a JSON array of 10 objects, no labels.\n"
    )
    return rules + "\n".join(lines)

def deepseek_final(batch):
    prompt = build_final_prompt(batch)
    resp = client.chat.completions.create(
        model="deepseek-reasoner",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=4000,
        temperature=0.7,
    )
    content = resp.choices[0].message.content or "[]"
    try:
        return json.loads(content)
    except Exception as e:
        print("DeepSeek JSON error:", e, content[:200])
        return [{"opener": ""} for _ in batch]

# ---------- 7.  MAIN LOOP ----------
def process_excel(in_file, out_file, batch_size=10):
    df = pd.read_excel(in_file)
    # create target columns (placeholders)
    for col in ["FundingNews", "FundingAmount", "Round", "FundingDate", "PersonalizedOpener"]:
        df[col] = ""

    total = len(df)
    for start in range(0, total, batch_size):
        end = min(start + batch_size, total)
        batch_df = df.iloc[start:end].copy()

        # 1. enrich funding first (company-level)
        company = batch_df.iloc[0].get("Cleaned Company Name") or batch_df.iloc[0].get("Company Name")
        uk_num  = batch_df.iloc[0].get("Company Number", "")  # optional
        fund = funding_waterfall(company, uk_num)
        batch_df["_funding"] = [fund] * len(batch_df)

        # 2. write funding columns back to main df
        for i, (_, row) in enumerate(batch_df.iterrows()):
            idx = start + i
            df.at[idx, "FundingNews"]   = fund["news"]
            df.at[idx, "FundingAmount"] = fund["amount"]
            df.at[idx, "Round"]         = fund["round"]
            df.at[idx, "FundingDate"]   = fund["date"]

        # 3. final opener call (after enrichment)
        batch_dict = batch_df.to_dict(orient="records")
        final_openers = deepseek_final(batch_dict)

        # 4. append opener as LAST column
        for i, res in enumerate(final_openers):
            if i < len(batch_df):
                df.at[start + i, "PersonalizedOpener"] = res.get("opener", "")

        print(f"batch {start//batch_size + 1} done")

    df.to_excel(out_file, index=False)
    print("Saved →", out_file)

if __name__ == "__main__":
    import sys
    in_file = sys.argv[1] if len(sys.argv) > 1 else "p3.xlsx"
    out_file = sys.argv[2] if len(sys.argv) > 2 else "p3_clay.xlsx"
    process_excel(in_file, out_file, batch_size=10)