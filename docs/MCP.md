# Mission Control Plan (MCP) — Personalized Outreach Platform

## 1. Product North Star
- **Outcome we enable:** Turn raw prospect data (CSV/XLSX) into launch-ready personalized outreach lines within minutes, giving go-to-market teams a fast "upload → preview → full run" loop that replaces manual research.【F:info1.md†L3-L27】【F:outreach-frontend/pages/upload.tsx†L180-L360】【F:backend/app/main.py†L360-L520】
- **Revenue focus for the next 30 days:** Blend concierge "Personalized Pipeline Sprint" packages with tiered self-serve subscriptions and VIP intensives to reach $15K+ in first-month revenue, while pushing trial-to-paid conversion above 80% and activating 90% of new users on a full job.【F:info1.md†L9-L52】

## 2. Architecture Snapshot
| Layer | Responsibilities | Key Assets |
| --- | --- | --- |
| **Customer App (Next.js)** | Authenticated user experience for uploads, credit management, billing, and job monitoring powered by Supabase auth. | Multi-step upload wizard with drag-and-drop, credit banners, and job creation flow in `pages/upload.tsx`; shared API helpers in `lib/api.ts`; Supabase-backed `AuthProvider`.【F:outreach-frontend/pages/upload.tsx†L1-L220】【F:outreach-frontend/pages/upload.tsx†L400-L620】【F:outreach-frontend/lib/api.ts†L1-L94】【F:outreach-frontend/lib/AuthProvider.tsx†L1-L191】 |
| **Backend API (FastAPI)** | Handles Supabase-authenticated file parsing, credit reservation, job creation, billing, and webhook processing. | FastAPI endpoints for header parsing, job creation, and Stripe checkout in `main.py`; Redis queue bootstrap in `worker.py`.【F:backend/app/main.py†L360-L520】【F:backend/app/main.py†L780-L1020】【F:backend/app/worker.py†L1-L8】 |
| **Workers & Queue** | Offline processing of large files + AI generation using DeepSeek. | RQ worker bootstrap in `worker.py`; queue producer in `producer.py`; job executor/streaming helpers coordinating Supabase storage chunks and DeepSeek completions in `jobs.py` & `file_streaming.py`; DeepSeek wrapper in `gpt_helpers.py`.【F:backend/app/worker.py†L1-L8】【F:backend/app/producer.py†L1-L36】【F:backend/app/jobs.py†L1-L200】【F:backend/app/file_streaming.py†L1-L127】【F:backend/app/gpt_helpers.py†L1-L107】 |
| **Infrastructure** | Containerized dev runtime with Redis + FastAPI + worker processes. | `docker-compose.yml` orchestrates Redis, API, worker, and producer containers; backend dependencies pinned in `backend/app/requirements.txt`; Next.js dependencies/scripts in `outreach-frontend/package.json`.【F:docker-compose.yml†L1-L56】【F:backend/app/requirements.txt†L1-L36】【F:outreach-frontend/package.json†L1-L42】 |

## 3. Critical Data Flows
1. **Authenticated upload (Next.js):** Supabase-authenticated session from `AuthProvider` drives the upload wizard, which stores files in Supabase storage, parses headers, surfaces credit availability, and posts to `/jobs` with JWT auth.【F:outreach-frontend/lib/AuthProvider.tsx†L47-L191】【F:outreach-frontend/pages/upload.tsx†L180-L360】【F:outreach-frontend/pages/upload.tsx†L400-L620】【F:backend/app/main.py†L360-L520】【F:backend/app/main.py†L780-L880】
2. **Background processing:** Worker pulls queued jobs, streams raw chunks from Supabase `inputs`, performs research + DeepSeek generation per row, and uploads partial + final results back to storage while logging progress and timings.【F:backend/app/jobs.py†L520-L760】【F:backend/app/jobs.py†L840-L1110】【F:backend/app/file_streaming.py†L1-L127】【F:backend/app/research.py†L1-L200】【F:backend/app/gpt_helpers.py†L1-L120】
3. **Billing & credit sync:** Stripe checkout and webhook endpoints reserve credits, write ledger entries, and synchronize Supabase `profiles`, while frontend helpers trigger checkout and refresh account data.【F:backend/app/main.py†L980-L1240】【F:outreach-frontend/lib/api.ts†L37-L94】【F:outreach-frontend/lib/AuthProvider.tsx†L109-L191】

## 4. Environment & Configuration
- **Core secrets:** `.env` must provide Supabase service key/URL, DeepSeek API key, Stripe API keys, and allowed frontend origins consumed by FastAPI during startup.【F:backend/app/main.py†L33-L149】【F:backend/app/supabase_client.py†L13-L21】【F:backend/app/gpt_helpers.py†L12-L56】
- **Local services:** Run `docker-compose up redis web worker` for API + worker stack; include `producer` if you need a queue seed process.【F:docker-compose.yml†L1-L56】 Frontend starts independently via `npm run dev` inside `outreach-frontend`.【F:outreach-frontend/package.json†L5-L11】
- **Python setup (manual):** Install requirements with `pip install -r backend/app/requirements.txt`, export `PYTHONPATH=/workspace/personalizedLine`, then start API using `uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000`. Workers run through `python backend/app/worker.py` with Redis reachable at `redis://localhost:6379`.【F:backend/app/requirements.txt†L1-L36】【F:backend/app/main.py†L37-L44】【F:backend/app/worker.py†L1-L8】
- **Next.js env:** Expose `NEXT_PUBLIC_API_URL` and Supabase keys in `.env.local` for the upload wizard and AuthProvider to contact the API and Supabase project.【F:outreach-frontend/lib/api.ts†L1-L33】【F:outreach-frontend/lib/AuthProvider.tsx†L47-L191】

## 5. Operational Runbooks
- **Onboarding a new workspace/customer:**
  1. Create Supabase user manually or via marketing site, ensuring `profiles` table is populated (AuthProvider backfills defaults on first login).【F:outreach-frontend/lib/AuthProvider.tsx†L68-L123】
  2. Seed starter credits by updating the customer's Supabase `profiles` row so FastAPI's reservation logic can deduct balances safely.【F:backend/app/main.py†L620-L760】
  3. Walk the customer through the Next.js upload wizard to show header mapping, credit banners, and job creation flow.【F:outreach-frontend/pages/upload.tsx†L180-L360】【F:outreach-frontend/pages/upload.tsx†L400-L620】

- **Investigating stuck jobs:**
  1. Check Supabase `jobs` records or call `GET /jobs` to confirm status, progress, and latest log message for the affected user.【F:backend/app/main.py†L520-L700】
  2. Inspect Redis queue via `rq info` or logs; worker bootstrap lives in `worker.py` (ensure container running).【F:backend/app/worker.py†L1-L8】
  3. Review Supabase storage for partial chunks in `inputs` bucket and error logs printed by `_upload_to_storage` safeguards.【F:backend/app/jobs.py†L66-L142】
  4. If DeepSeek returned empty responses, examine worker stdout for `[DeepSeek][Empty opener]` payloads and retry job after adjusting prompt context.【F:backend/app/gpt_helpers.py†L52-L85】

- **Stripe issue triage:**
  1. Inspect Stripe webhook logs alongside the `stripe_webhook` handler to ensure plan/add-on metadata writes credits and ledger entries as expected.【F:backend/app/main.py†L1100-L1240】
  2. Confirm `STRIPE_PRICE_*` environment variables align with plan map in FastAPI; mismatches leave `PRICE_TO_PLAN` empty, blocking sync.【F:backend/app/main.py†L80-L149】
  3. Reconcile Supabase `profiles` and ledger balances by re-running `sync_stripe_customer` or replaying the webhook when discrepancies appear.【F:backend/app/main.py†L1000-L1120】

## 6. Quality, Testing & Release Gates
- **Automated coverage:** Pytest suite lives in `backend/app/tests/` covering auth, job dispatch, streaming, progress, and XLSX parsing; run `pytest backend/app/tests -q` before merges.【F:backend/app/tests/test_job_dispatch.py†L1-L40】
- **Front-end checks:** Run `npm run lint` and `npm test` in `outreach-frontend` for UI regressions and jest-based unit tests.【F:outreach-frontend/package.json†L5-L11】
- **Manual smoke checklist:**
  1. Upload CSV via Next.js wizard, map columns, and confirm credit deduction + job creation.
  2. Validate Stripe checkout session creation for each tier and confirm ledger entries update credits.
  3. Monitor worker logs for chunk processing and verify `/jobs/{id}/download` returns the generated XLSX.

## 7. Security & Compliance Guardrails
- **Auth enforcement:** FastAPI endpoints rely on Supabase JWT validation via `HTTPBearer`; ensure `JWT_SECRET` aligns across services when rotating keys.【F:backend/app/main.py†L1-L88】
- **Secrets handling:** Never commit `.env` or Supabase service keys; local development should load through `python-dotenv` as seen in `supabase_client.py` and `main.py`.【F:backend/app/supabase_client.py†L13-L21】【F:backend/app/main.py†L33-L125】
- **Data residency:** Supabase storage buckets (`inputs`, `outputs`) hold uploaded files and generated lines—schedule lifecycle policies or periodic cleanup via `_remove_from_storage` to limit retention.【F:backend/app/jobs.py†L105-L142】

## 8. Observability & Metrics
- **Core KPIs:** Track upload-to-job conversion rate, job success vs failure, credits consumed per plan, and revenue per offer tier (aligning with playbook goals).【F:info1.md†L9-L52】
- **Operational telemetry:**
  - Worker and API logs already emit job state transitions (e.g., `[ParseHeaders]`, `[Worker]`), so route container stdout to centralized logging.【F:backend/app/main.py†L360-L440】【F:backend/app/jobs.py†L600-L760】
  - Add health endpoints or Prometheus exporters to monitor Redis depth, worker throughput, and DeepSeek latency; foundation exists in queue helpers for instrumentation.【F:backend/app/jobs.py†L20-L120】

## 9. Roadmap Next Steps
1. **Automate credit sync:** Backfill Supabase `profiles` with ledger deltas or schedule reconciliations based on FastAPI's credit reservation + Stripe webhook flows.【F:backend/app/main.py†L620-L880】【F:backend/app/main.py†L980-L1240】
2. **Improve worker resilience:** Add retry policies around DeepSeek calls and Supabase uploads to handle transient failures observed in `_upload_to_storage`.【F:backend/app/jobs.py†L66-L142】【F:backend/app/gpt_helpers.py†L52-L85】
3. **Tighten onboarding metrics:** Instrument Next.js wizard to emit step completion analytics (Upload → Map → Context) supporting activation goals.【F:outreach-frontend/pages/upload.tsx†L38-L199】
4. **Expose job retries in-app:** Extend the Next.js jobs list to surface failure reasons and allow requeueing through the FastAPI endpoints.【F:outreach-frontend/pages/jobs/index.tsx†L1-L200】【F:backend/app/main.py†L700-L880】

---
This MCP centralizes how the product promise, technical systems, and go-to-market execution interlock so teams can ship confidently and hit the first-month monetization targets.
