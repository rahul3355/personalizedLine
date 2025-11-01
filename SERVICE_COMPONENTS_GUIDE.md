# Service Components API Guide

## Overview

The email outreach pipeline now supports structured service components for better email generation quality.

## API Format

### NEW FORMAT (Recommended) - Structured Components

Send a structured JSON object with all service details:

```json
POST /jobs
{
  "file_path": "user-123/uploads/leads.csv",
  "email_col": "Email",
  "service": {
    "core_offer": "AI-powered personalized email outreach at scale",
    "key_differentiator": "Researches prospect data in depth, writes human-sounding emails",
    "cta": "Demo invitation",
    "timeline": "Next Thursday at 2pm or 5pm",
    "goal": "Get meeting OR forward to right person",
    "fallback_action": "Forward if not right person"
  }
}
```

### LEGACY FORMAT (Still Supported)

Plain string format still works for backward compatibility:

```json
POST /jobs
{
  "file_path": "user-123/uploads/leads.csv",
  "email_col": "Email",
  "service": "AI-powered email outreach service"
}
```

Note: Legacy format will use default values for CTA, timeline, goal, and fallback action.

## Service Components Fields

| Field | Description | Example |
|-------|-------------|---------|
| `core_offer` | Main value proposition | "AI-powered personalized email outreach at scale" |
| `key_differentiator` | What makes your service unique | "Researches prospect data in depth, writes human-sounding emails" |
| `cta` | Call to action type | "Demo invitation" |
| `timeline` | Specific times/dates for CTA | "Next Thursday at 2pm or 5pm" |
| `goal` | Primary objective | "Get meeting OR forward to right person" |
| `fallback_action` | What to do if wrong person | "Forward if not right person" |

## Why Use Structured Components?

**Better Email Quality**: The LLM receives clear context about:
- What you're offering
- Why it's different
- What action to request
- When to schedule it
- What the goal is

This results in more focused, conversational, and effective cold emails.

## Example Comparison

### Using Plain String (Legacy)
```
"service": "Email outreach tool"
```
Result: Generic email with default CTAs

### Using Structured Components (New)
```json
"service": {
  "core_offer": "Email outreach tool that books meetings",
  "key_differentiator": "AI-researched personalization at scale",
  "cta": "Demo invitation",
  "timeline": "This Friday at 11am or 2pm",
  "goal": "Schedule 15-minute demo",
  "fallback_action": "Forward to marketing team"
}
```
Result: Highly targeted email mentioning specific times and clear next steps

## Migration Path

1. **No immediate action required** - Legacy format continues to work
2. **Recommended**: Update your job creation calls to use structured format
3. **Test**: Use the `/test_service_components.py` script to verify output quality
4. **Roll out**: Gradually migrate existing integrations

## Questions?

Contact support or check the test script for working examples.
