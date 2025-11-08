"""Test script to verify service components handling."""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.gpt_helpers import generate_full_email_body
import json

# Test research components (sample from your data)
RESEARCH_COMPONENTS = json.dumps({
    "prospect_info": {
        "name": "David Rowlinson",
        "title": "Co-Founder",
        "company": "My Kind of Cruise",
        "recent_activity": [
            "Cruising has been my passion for 30+ years",
            "Book your next cruise in 90 seconds",
            "Co-founder of the worlds first cruise app"
        ],
        "relevance_signals": [
            "30+ years of experience in travel and tourism"
        ]
    }
})

# Test 1: Structured service components (NEW FORMAT - should produce good output)
print("=" * 80)
print("TEST 1: Structured Service Components (NEW FORMAT)")
print("=" * 80)

SERVICE_COMPONENTS_STRUCTURED = json.dumps({
    "core_offer": "AI-powered personalized email outreach at scale",
    "key_differentiator": "Researches prospect data in depth, writes human-sounding emails",
    "cta": "Demo invitation",
    "include_fallback": True
})

print("\n📧 SERVICE COMPONENTS (Structured):")
print(SERVICE_COMPONENTS_STRUCTURED)

email_body = generate_full_email_body(RESEARCH_COMPONENTS, SERVICE_COMPONENTS_STRUCTURED)

print("\n✉️  GENERATED EMAIL:")
print(email_body)
print("\n")

# Test 1b: Structured service components without fallback (NEW FORMAT)
print("=" * 80)
print("TEST 1B: Structured Service Components without Fallback")
print("=" * 80)

SERVICE_COMPONENTS_NO_FALLBACK = json.dumps({
    "core_offer": "AI-powered personalized email outreach at scale",
    "key_differentiator": "Researches prospect data in depth, writes human-sounding emails",
    "cta": "Demo invitation",
    "include_fallback": False
})

print("\n📧 SERVICE COMPONENTS (Structured, No Fallback):")
print(SERVICE_COMPONENTS_NO_FALLBACK)

email_body_no_fallback = generate_full_email_body(RESEARCH_COMPONENTS, SERVICE_COMPONENTS_NO_FALLBACK)

print("\n✉️  GENERATED EMAIL:")
print(email_body_no_fallback)
print("\n")

# Test 2: Plain string service (LEGACY FORMAT - should still work with defaults)
print("=" * 80)
print("TEST 2: Plain String Service (LEGACY FORMAT)")
print("=" * 80)

SERVICE_PLAIN = "AI-powered email outreach service"

print("\n📧 SERVICE COMPONENTS (Plain String):")
print(SERVICE_PLAIN)

email_body_legacy = generate_full_email_body(RESEARCH_COMPONENTS, SERVICE_PLAIN)

print("\n✉️  GENERATED EMAIL:")
print(email_body_legacy)
print("\n")

print("=" * 80)
print("✅ Tests completed!")
print("=" * 80)
