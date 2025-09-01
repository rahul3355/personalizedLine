import os
import json
from openai import OpenAI

# --- Monkeypatch for openai==1.40.2 proxies bug (keep consistent) ---
from openai._base_client import SyncHttpxClientWrapper
class CustomWrapper(SyncHttpxClientWrapper):
    def __init__(self, *args, **kwargs):
        kwargs.pop("proxies", None)
        super().__init__(*args, **kwargs)
import openai
openai._base_client.SyncHttpxClientWrapper = CustomWrapper
# -------------------------------------------------------------------

# Initialize client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Input/Output files
INPUT_FILE = "pains_master.json"
OUTPUT_FILE = "pain_embeddings_2.json"

def embed_text(text: str):
    """Generate embedding for a given text using OpenAI embeddings API."""
    resp = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return resp.data[0].embedding

def main():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    output = []

    # pains_master.json is structured as role/industry/size -> pain lists
    # We'll flatten into entries: {role, industry, size, pain, embedding}
    def process_entry(role="", industry="", size="", pains=None):
        if not pains:
            return
        for pain in pains:
            vector = embed_text(pain)
            output.append({
                "role": role,
                "industry": industry,
                "size": size,
                "pain": pain,
                "embedding": vector
            })

    # If file is dict with nested structure
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, list):
                # Flat list of pains (maybe size buckets like "1-10", "11-50")
                process_entry(size=key, pains=value)
            elif isinstance(value, dict):
                # Nested dict (role → {service_relevant, general_pains}, or industry → pains)
                for subkey, subvalue in value.items():
                    if isinstance(subvalue, list):
                        process_entry(role=key, pains=subvalue)
                    elif isinstance(subvalue, dict):
                        # Could be industry-level or deeper
                        for subsubkey, subsubvalue in subvalue.items():
                            if isinstance(subsubvalue, list):
                                process_entry(role=key, industry=subkey, pains=subsubvalue)
                            else:
                                # unexpected shape
                                continue

    else:
        raise ValueError("Unexpected JSON structure in pains_master.json")

    # Save embeddings
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"✅ Saved {len(output)} pain embeddings to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
