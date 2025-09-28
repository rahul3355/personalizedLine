import os
import requests

KIMI_API_KEY = "sk-hY4kxGp1xcEuIPSxcVSqKVYV6H7yCqwKgKM09zbssLieiObh"
BASE_URL = "https://api.moonshot.ai/v1/chat/completions"

def test_kimi():
    headers = {
        "Authorization": f"Bearer {KIMI_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "kimi-k2-0905-preview",
        "messages": [
            {"role": "system", "content": "Answer in one sentence."},
            {"role": "user", "content": "Latest funding of OpenAI"}
        ],
        "tools": [
            {
                "type": "function",
                "function": {
                    "name": "web_search",
                    "description": "Search the web for up-to-date company news.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "Search query"}
                        },
                        "required": ["query"]
                    }
                }
            }
        ],
        "max_tokens": 200
    }

    resp = requests.post(BASE_URL, headers=headers, json=payload)
    print("Status:", resp.status_code)
    print("Response:", resp.text)

if __name__ == "__main__":
    test_kimi()
