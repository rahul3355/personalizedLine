# Personalized line generator

The `backend/app/personalized_line_generator.py` module adapts the
`e-o8.integrated.py` script into a reusable component that can be imported by
the rest of the backend.  Configuration is read from environment variables so
that no credentials live in the repository.

## Required environment variables

Set the following variables before running any code that imports the module:

| Variable | Description |
| --- | --- |
| `DEEPSEEK_API_KEY` | Secret key for calling the DeepSeek Chat Completions API. |
| `SERVICE_CONTEXT` | Human-readable clause describing how your service helps prospects; at least one three-word phrase from this text is copied verbatim into the final opener. |

## Optional environment variables

These values enable enrichment and control runtime behaviour.  Defaults are
shown in parentheses.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | Override the DeepSeek API base URL. |
| `DEEPSEEK_MODEL` | `deepseek-reasoner` | Name of the model used for chat completions. |
| `SERPER_API_KEY` | _none_ | API key for SERPer search/scrape endpoints; omit to disable SERP enrichment. |
| `SERPER_SEARCH_BASE` | `https://google.serper.dev/search` | Custom SERPer search endpoint. |
| `SERPER_SCRAPE_BASE` | `https://scrape.serper.dev/` | Custom SERPer scrape endpoint. |
| `SERPER_NEWS_BASE` | `https://google.serper.dev/news` | Custom SERPer news endpoint. |
| `GROQ_API_KEY` | _none_ | API key for Groq summarization; omit to disable summarization. |
| `GROQ_MODEL` | `llama-3.1-8b-instant` | Groq model name for enrichment summaries. |
| `PERSONALIZED_LINE_REQUEST_TIMEOUT` | `20` | Timeout (seconds) for HTTP requests. |
| `PERSONALIZED_LINE_PAUSE` | `0.6` | Pause (seconds) between SERPer calls. |
| `PERSONALIZED_LINE_MAX_SERP_ITEMS` | `8` | Maximum number of SERP results considered. |
| `PERSONALIZED_LINE_SCRAPE_MAX_CREDITS` | `2` | SERPer scrape credit limit. |
| `PERSONALIZED_LINE_MIN_WORDS` | `25` | Minimum word count enforced on the opener. |
| `PERSONALIZED_LINE_MAX_WORDS` | `30` | Maximum word count enforced on the opener. |
| `PERSONALIZED_LINE_MAX_ATTEMPTS` | `3` | Number of retries with different temperatures. |
| `PERSONALIZED_LINE_DISALLOWED_HOSTS` | `linkedin.com,crunchbase.com` | Comma-separated list of hosts excluded from scraping. |

## CLI usage

Run the module directly to trigger the end-to-end workflow:

```bash
python -m backend.app.personalized_line_generator --email prospect@example.com
```

Add `--dry-run` to print the final DeepSeek prompt or `--debug` for verbose
logging.

## Programmatic usage

Import the helper inside worker code to obtain a single opener without any
stdout side-effects:

```python
from backend.app.personalized_line_generator import generate_personalized_opener

line = generate_personalized_opener("prospect@example.com")
```

Pass `service_context="..."` to override the default context pulled from the
environment when generating per-job copy.

