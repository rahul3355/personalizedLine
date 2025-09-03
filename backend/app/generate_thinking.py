import os, re, random, pandas as pd
from openai import OpenAI

# --- Monkeypatch for proxies bug (safe to keep) ---
from openai._base_client import SyncHttpxClientWrapper
class CustomWrapper(SyncHttpxClientWrapper):
    def __init__(self, *args, **kwargs):
        kwargs.pop("proxies", None)
        super().__init__(*args, **kwargs)

import openai
openai._base_client.SyncHttpxClientWrapper = CustomWrapper

# --- Client ---
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ---------- PROMPTS ----------

# 1. Service Expander (unchanged)
SERVICE_EXPANDER_RULES = (
    "You are a service expander. Take a vague service description and rewrite it "
    "as 3–4 concrete business situations or pressures this service relates to. "
    "Rules: "
    "- Keep it plain and neutral. "
    "- Each situation should be 6–12 words. "
    "- Frame them as natural challenges companies often deal with. "
    "- Do not describe features of the service. "
    "- Output as a single paragraph, comma-separated list."
)

# 2. Helper (Input Cleaner) – FIXED
HELPER_RULES = (
    "You are a pre-processor. Summarize company details into a short, neutral snapshot.\n"
    "Rules:\n"
    "- Keep it 2–3 lines max.\n"
    "- Include company focus and industry traits.\n"
    "- Reframe the expanded service context into industry-specific pressures "
    "(e.g., travel → seasonal demand, SaaS → scaling user base, finance → compliance).\n"
    "- Output format:\n"
    "Company summary: ...\n"
    "Industry context: ...\n"
    "Service context (reframed): ..."
)

HELPER_TEMPLATE = """Company: {company}
Description: {description}
Industry: {industry}
Role: {role}
Size: {size}
Expanded service context: {service}"""

# 3. Reasoner – FIXED
REASONER_RULES = (
    "You are an analyst. Identify one pain this company is likely facing that ties to the reframed service context.\n"
    "Rules:\n"
    "- Phrase it the way a human SDR would casually note after skimming their site.\n"
    "- Use plain, conversational phrasing that feels natural to say out loud.\n"
    "- Keep it simple and direct, not formal or report-like.\n"
    "- Output only inside <final> tags.\n"
    "Examples:\n"
    "<final>Keeping outreach personal during peak season isn’t easy for a small travel team.</final>\n"
    "<final>Balancing rapid growth with consistent customer engagement can feel overwhelming.</final>"
)

REASONER_USER_TEMPLATE = """Inputs:
{helper_output}"""

# 4. Chat (Opener Generator) – UNTOUCHED
CHAT_RULES = (
    "Write a cold email opener.\n"
    "Rules: 1–2 sentences, 12–30 words.\n"
    "Conversational, natural tone.\n"
    "Mention the company name naturally.\n"
    "Highlight the friction point.\n"
    "Do not pitch, compliment, or mention AI/automation.\n"
    "Do not start with greetings.\n"
    "Use plain punctuation. No dashes or bullets."
)

CHAT_USER_TEMPLATE = """Company: {company}
Observation: {pain}"""

# 5. Rewriter – FIXED
REWRITE_RULES = (
    "Rewrite the opener so it sounds like a real SDR wrote it after a quick skim of the company website.\n"
    "Rules:\n"
    "- 1–2 sentences, 12–28 words.\n"
    "- Use plain punctuation (periods, commas).\n"
    "- No greetings, no questions, no pitches, no compliments.\n"
    "- Mention the company name naturally.\n"
    "- Make it feel spoken, not polished. Think: 'must be tough', 'not easy to keep up', 'a big lift'.\n"
    "Examples:\n"
    "Original: Maintaining customer engagement during the booking process often poses a challenge.\n"
    "Rewritten: At My Kind Of Cruise, keeping engagement personal during the long booking process must be tough."
)

REWRITE_TEMPLATE = """Original opener: {opener}"""

# ---------- HELPERS ----------

FINAL_RE = re.compile(r"<final>\s*(.*?)\s*</final>", re.DOTALL | re.IGNORECASE)

def _extract_final(text: str) -> str:
    if not text:
        return ""
    m = FINAL_RE.search(text)
    return m.group(1).strip() if m else text.strip()

def _clean(s: str) -> str:
    if not s:
        return ""
    return s.replace("“", "").replace("”", "").replace('"', "").strip()

# ---------- FALLBACKS ----------

FALLBACKS = [
    "{company} is growing fast, and keeping communications personal while scaling must be a constant challenge.",
    "At {company}, balancing growth with maintaining personalized connections is likely a tough challenge.",
    "{company} seems to be in a phase where keeping customer engagement authentic while scaling operations isn’t easy.",
    "For {company}, ensuring personalization doesn’t get lost while expanding quickly must take constant effort."
]

def fallback_opener(company: str) -> str:
    return random.choice(FALLBACKS).format(company=company)

# ---------- STAGES ----------

def preprocess_inputs(company, description, industry, role, size, service):
    user_prompt = HELPER_TEMPLATE.format(
        company=company or "",
        description=description or "",
        industry=industry or "",
        role=role or "",
        size=str(size or ""),
        service=service or ""
    )
    messages = [
        {"role": "system", "content": HELPER_RULES},
        {"role": "user", "content": user_prompt}
    ]
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.3,
        max_tokens=250
    )
    return (resp.choices[0].message.content or "").strip()

def identify_pain(helper_output):
    user_prompt = REASONER_RULES + "\n\n" + REASONER_USER_TEMPLATE.format(helper_output=helper_output)
    messages = [{"role": "user", "content": user_prompt}]
    resp = client.chat.completions.create(
        model="o1-mini",
        messages=messages,
        max_completion_tokens=2000
    )
    raw_text = (resp.choices[0].message.content or "").strip()
    return _clean(_extract_final(raw_text))

def generate_opener(company, pain):
    messages = [
        {"role": "system", "content": CHAT_RULES},
        {"role": "user", "content": CHAT_USER_TEMPLATE.format(company=company or "", pain=pain)}
    ]
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.7,
        max_tokens=200
    )
    return (resp.choices[0].message.content or "").strip()

def rewrite_opener(opener):
    user_prompt = REWRITE_TEMPLATE.format(opener=opener)
    messages = [
        {"role": "system", "content": REWRITE_RULES},
        {"role": "user", "content": user_prompt}
    ]
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.4,
        max_tokens=120
    )
    return _clean((resp.choices[0].message.content or "").strip())

# ---------- MAIN PIPELINE ----------

def generate_final_opener(company, description, industry, role, size, service):
    helper_output = preprocess_inputs(company, description, industry, role, size, service)
    pain = identify_pain(helper_output)
    if not pain:
        return fallback_opener(company)

    opener = generate_opener(company, pain)
    if not opener:
        return fallback_opener(company)

    rewritten = rewrite_opener(opener)
    if rewritten:
        return rewritten

    return fallback_opener(company)

if __name__ == "__main__":
    service_desc = "Lead generation services (appointment setting, outbound campaigns)."
    df = pd.read_excel("p3.xlsx")

    max_rows = 5
    for i, row in df.iterrows():
        if i >= max_rows:
            break
        company = row.get("Cleaned Company Name") or row.get("Company Name") or ""
        description = row.get("Company Short Description") or ""
        industry = row.get("Industry") or ""
        role = row.get("Title") or row.get("Seniority") or ""
        size = row.get("Employee Count") or ""

        opener = generate_final_opener(company, description, industry, role, size, service_desc)
        print("=" * 80)
        print(f"Company: {company}")
        print(f"Opener: {opener}")
