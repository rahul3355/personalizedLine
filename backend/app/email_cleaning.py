"""
Email cleaning pipeline using LLM to post-process generated emails.
Removes first names, em dashes, hyphens, and improves readability.
"""

import os
import requests
from typing import Optional

# Groq API configuration for cleaning
GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
CLEANING_MODEL = "llama-3.1-8b-instant"


def clean_email_body(email_body: str) -> str:
    """
    Clean the email body using LLM:
    - Remove first names from the email body
    - Remove em dashes (—) and replace with regular spaces or punctuation
    - Remove unnecessary hyphens
    - Improve readability

    Args:
        email_body: The raw email body text to clean

    Returns:
        Cleaned email body text
    """
    if not email_body or not email_body.strip():
        return email_body

    groq_key = os.environ.get("GROQ_API_KEY")
    if not groq_key:
        print("Warning: GROQ_API_KEY not found, skipping email cleaning")
        return email_body

    # Build the cleaning prompt
    cleaning_prompt = f"""You are an email cleaning assistant. Your job is to clean and improve the email text below.

Follow these rules strictly:
1. Remove any first names used in the email body (like "Chris," or "Sarah,")
2. Replace em dashes (—) with regular spaces or appropriate punctuation
3. Remove unnecessary hyphens that break readability
4. Improve overall readability while keeping the same meaning and tone
5. DO NOT change the core message or content
6. DO NOT add new information
7. Keep the email professional and concise

Original email:
{email_body}

Return ONLY the cleaned email text, nothing else."""

    try:
        headers = {
            "Authorization": f"Bearer {groq_key}",
            "Content-Type": "application/json",
        }

        json_payload = {
            "model": CLEANING_MODEL,
            "messages": [{"role": "user", "content": cleaning_prompt}],
            "temperature": 0.3,  # Lower temperature for more consistent cleaning
            "max_completion_tokens": 2000,
        }

        response = requests.post(
            GROQ_ENDPOINT,
            headers=headers,
            json=json_payload,
            timeout=30,
        )

        if response.status_code != 200:
            print(f"Email cleaning API error: {response.status_code}")
            return email_body

        data = response.json()

        if not data.get("choices") or len(data["choices"]) == 0:
            print("No choices returned from cleaning API")
            return email_body

        cleaned_content = data["choices"][0].get("message", {}).get("content", "")

        if not cleaned_content or not cleaned_content.strip():
            print("Empty response from cleaning API")
            return email_body

        return cleaned_content.strip()

    except requests.exceptions.Timeout:
        print("Email cleaning request timed out, returning original")
        return email_body
    except requests.exceptions.RequestException as e:
        print(f"Email cleaning request failed: {e}")
        return email_body
    except Exception as e:
        print(f"Unexpected error during email cleaning: {e}")
        return email_body


def quick_clean_email_body(email_body: str) -> str:
    """
    Faster rule-based cleaning without LLM call.
    Use this as a fallback or for faster processing.

    Args:
        email_body: The raw email body text to clean

    Returns:
        Cleaned email body text
    """
    if not email_body or not email_body.strip():
        return email_body

    cleaned = email_body

    # Replace em dashes with regular dashes or spaces
    cleaned = cleaned.replace('—', ' - ')
    cleaned = cleaned.replace('–', ' - ')  # en dash

    # Remove common first name patterns at start of sentences
    # This is a simple regex-based approach
    import re

    # Pattern: name followed by comma at start of line or after period
    # Example: "Chris, I saw..." -> "I saw..."
    cleaned = re.sub(r'(?:^|\. )([A-Z][a-z]+),\s+', r'\1', cleaned)

    # Clean up multiple spaces
    cleaned = re.sub(r'\s+', ' ', cleaned)

    # Clean up spacing around punctuation
    cleaned = re.sub(r'\s+([.,!?])', r'\1', cleaned)

    return cleaned.strip()
