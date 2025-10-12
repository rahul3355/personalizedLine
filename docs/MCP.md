# Mission Control Plan (MCP) — Personalized Outreach Platform

## 1. Product North Star
- **Outcome we enable:** Turn raw prospect data (CSV/XLSX) into launch-ready personalized outreach lines within minutes, giving go-to-market teams a fast "upload → preview → full run" loop that replaces manual research.【F:info1.md†L3-L27】【F:create_new.py†L9-L57】
- **Revenue focus for the next 30 days:** Blend concierge "Personalized Pipeline Sprint" packages with tiered self-serve subscriptions and VIP intensives to reach $15K+ in first-month revenue, while pushing trial-to-paid conversion above 80% and activating 90% of new users on a full job.【F:info1.md†L9-L52】

## 2. Architecture Snapshot
| Layer | Responsibilities | Key Assets |
| --- | --- | --- |
| **Acquisition & Legacy UI** | Legacy Streamlit workflow still supported for demos and concierge jobs. | `create_new.py` streamlit flow that writes uploads, previews AI copy, and enqueues jobs for processing.【F:create_new.py†L1-L57】 |
| **Customer App (Next.js)** | Authenticated user experience for uploads, credit management, billing, and job monitoring. Uses Supabase Auth + REST API calls. | Upload wizard with stepper, credit checks, and Supabase session enforcement in `pages/upload.tsx`; shared API helpers in `lib/api.ts`; Supabase-backed `AuthProvider`.【F:outreach-frontend/pages/upload.tsx†L1-L200】【F:outreach-frontend/lib/api.ts†L1-L94】【F:outreach-frontend/lib/AuthProvider.tsx†L1-L191】 |
| **Backend API (FastAPI)** | Handles auth, billing, file parsing, and job orchestration. Integrates Stripe, Supabase, Redis, and SQLite credit ledger. | FastAPI app with Stripe plans, Supabase profile sync, Redis queue client in `main.py`; SQLite schema + credit helpers in `db.py`; background execution pipeline in `jobs.py`.【F:backend/app/main.py†L1-L200】【F:backend/app/db.py†L1-L162】【F:backend/app/jobs.py†L1-L200】 |
| **Workers & Queue** | Offline processing of large files + AI generation using DeepSeek. | RQ worker bootstrap in `worker.py`; queue producer in `producer.py`; job executor/streaming helpers coordinating Supabase storage chunks and DeepSeek completions in `jobs.py` & `file_streaming.py`; DeepSeek wrapper in `gpt_helpers.py`.【F:backend/app/worker.py†L1-L8】【F:backend/app/producer.py†L1-L36】【F:backend/app/jobs.py†L1-L200】【F:backend/app/file_streaming.py†L1-L127】【F:backend/app/gpt_helpers.py†L1-L107】 |
| **Infrastructure** | Containerized dev runtime with Redis + FastAPI + worker processes. | `docker-compose.yml` orchestrates Redis, API, worker, and producer containers; backend dependencies pinned in `backend/app/requirements.txt`; Next.js dependencies/scripts in `outreach-frontend/package.json`.【F:docker-compose.yml†L1-L56】【F:backend/app/requirements.txt†L1-L36】【F:outreach-frontend/package.json†L1-L42】 |

## 3. Critical Data Flows
1. **Authenticated upload (Next.js):** User signs in via Supabase; `AuthProvider` ensures profiles exist and pulls credit balances. Upload wizard streams files to backend, maps headers, collects service context, and posts to `/jobs` with JWT auth. Backend streams file via Supabase signed URLs, counts rows, checks credits, persists metadata in SQLite, and enqueues processing via Redis queue.【F:outreach-frontend/lib/AuthProvider.tsx†L53-L190】【F:outreach-frontend/pages/upload.tsx†L136-L199】【F:backend/app/main.py†L1-L149】【F:backend/app/db.py†L69-L101】
2. **Background processing:** Worker pulls job, streams raw chunks to Supabase `inputs` bucket, iterates rows, generates openers through DeepSeek, and uploads outputs back to Supabase while logging progress + credit usage in SQLite ledger. Failures surface via job logs and storage helpers.【F:backend/app/jobs.py†L39-L200】【F:backend/app/file_streaming.py†L1-L127】【F:backend/app/gpt_helpers.py†L12-L107】【F:backend/app/db.py†L113-L162】
3. **Billing & credit sync:** Stripe webhook + checkout endpoints in FastAPI maintain plan-to-price mappings, update Supabase `profiles`, and adjust local credit ledger ensuring usage cannot drop below zero. Frontend invokes `/create_checkout_session` through `buyCredits` helper and refreshes Supabase profile via AuthProvider to reflect balances.【F:backend/app/main.py†L75-L198】【F:backend/app/db.py†L135-L157】【F:outreach-frontend/lib/api.ts†L37-L94】【F:outreach-frontend/lib/AuthProvider.tsx†L109-L191】

## 4. Environment & Configuration
- **Core secrets:** `.env` must provide Supabase service key/URL, DeepSeek API key, Stripe API keys, and allowed frontend origins consumed by FastAPI during startup.【F:backend/app/main.py†L33-L149】【F:backend/app/supabase_client.py†L13-L21】【F:backend/app/gpt_helpers.py†L12-L56】
- **Local services:** Run `docker-compose up redis web worker` for API + worker stack; include `producer` if you need a queue seed process.【F:docker-compose.yml†L1-L56】 Frontend starts independently via `npm run dev` inside `outreach-frontend`.【F:outreach-frontend/package.json†L5-L11】
- **Python setup (manual):** Install requirements with `pip install -r backend/app/requirements.txt`, export `PYTHONPATH=/workspace/personalizedLine`, then start API using `uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000`. Workers run through `python backend/app/worker.py` with Redis reachable at `redis://localhost:6379`.【F:backend/app/requirements.txt†L1-L36】【F:backend/app/main.py†L37-L44】【F:backend/app/worker.py†L1-L8】
- **Next.js env:** Expose `NEXT_PUBLIC_API_URL` and Supabase keys in `.env.local` for the upload wizard and AuthProvider to contact the API and Supabase project.【F:outreach-frontend/lib/api.ts†L1-L33】【F:outreach-frontend/lib/AuthProvider.tsx†L47-L191】

## 5. Operational Runbooks
- **Onboarding a new workspace/customer:**
  1. Create Supabase user manually or via marketing site, ensuring `profiles` table is populated (AuthProvider backfills defaults on first login).【F:outreach-frontend/lib/AuthProvider.tsx†L68-L123】
  2. Assign starter credits by invoking `update_credits(user_id, change, reason)` via a maintenance script or admin endpoint; the ledger enforces non-negative balances.【F:backend/app/db.py†L135-L150】
  3. Walk customer through upload wizard or legacy Streamlit app depending on plan (concierge vs self-serve).【F:outreach-frontend/pages/upload.tsx†L38-L199】【F:create_new.py†L9-L57】

- **Investigating stuck jobs:**
  1. Query SQLite `jobs` table to confirm status and timestamps (`sqlite3 jobs.db`).【F:backend/app/db.py†L69-L112】
  2. Inspect Redis queue via `rq info` or logs; worker bootstrap lives in `worker.py` (ensure container running).【F:backend/app/worker.py†L1-L8】
  3. Review Supabase storage for partial chunks in `inputs` bucket and error logs printed by `_upload_to_storage` safeguards.【F:backend/app/jobs.py†L66-L142】
  4. If DeepSeek returned empty responses, examine worker stdout for `[DeepSeek][Empty opener]` payloads and retry job after adjusting prompt context.【F:backend/app/gpt_helpers.py†L52-L85】

- **Stripe issue triage:**
  1. Verify webhook event deduplication via `webhook_events` table. If missing, run `init_db()` (import from `backend.app.db`).【F:backend/app/db.py†L16-L67】
  2. Confirm `STRIPE_PRICE_*` environment variables align with plan map in FastAPI; mismatches leave `PRICE_TO_PLAN` empty, blocking sync.【F:backend/app/main.py†L80-L149】
  3. Reconcile Supabase `profiles` with local ledger by forcing `_update_profile` (e.g., re-run webhook handler) if email/stripe_customer_id drift occurs.【F:backend/app/main.py†L152-L198】

## 6. Quality, Testing & Release Gates
- **Automated coverage:** Pytest suite lives in `backend/app/tests/` covering auth, job dispatch, streaming, progress, and XLSX parsing; run `pytest backend/app/tests -q` before merges.【F:backend/app/tests/test_job_dispatch.py†L1-L40】
- **Front-end checks:** Run `npm run lint` and `npm test` in `outreach-frontend` for UI regressions and jest-based unit tests.【F:outreach-frontend/package.json†L5-L11】
- **Manual smoke checklist:**
  1. Upload CSV via Next.js wizard, map columns, and confirm credit deduction + job creation.
  2. Validate Stripe checkout session creation for each tier and confirm ledger entries update credits.
  3. Open Streamlit legacy UI to ensure concierge teams can still run jobs.

## 7. Security & Compliance Guardrails
- **Auth enforcement:** FastAPI endpoints rely on Supabase JWT validation via `HTTPBearer`; ensure `JWT_SECRET` aligns across services when rotating keys.【F:backend/app/main.py†L1-L88】
- **Secrets handling:** Never commit `.env` or Supabase service keys; local development should load through `python-dotenv` as seen in `supabase_client.py` and `main.py`.【F:backend/app/supabase_client.py†L13-L21】【F:backend/app/main.py†L33-L125】
- **Data residency:** Supabase storage buckets (`inputs`, `outputs`) hold uploaded files and generated lines—schedule lifecycle policies or periodic cleanup via `_remove_from_storage` to limit retention.【F:backend/app/jobs.py†L105-L142】

## 8. Observability & Metrics
- **Core KPIs:** Track upload-to-job conversion rate, job success vs failure, credits consumed per plan, and revenue per offer tier (aligning with playbook goals).【F:info1.md†L9-L52】
- **Operational telemetry:**
  - Log ingestion already prints job state transitions (`[DB]`, `[DB LOG]`, `[Worker]`). Route container stdout to a centralized logger in production.【F:backend/app/db.py†L69-L112】【F:backend/app/jobs.py†L66-L112】
  - Add health endpoints or Prometheus exporters to monitor Redis depth, worker throughput, and DeepSeek latency; foundation exists in queue helpers for instrumentation.【F:backend/app/jobs.py†L22-L200】

## 9. Roadmap Next Steps
1. **Automate credit sync:** Backfill Supabase `profiles` with ledger deltas or move ledger to Supabase to reduce double writes.【F:backend/app/db.py†L135-L162】
2. **Improve worker resilience:** Add retry policies around DeepSeek calls and Supabase uploads to handle transient failures observed in `_upload_to_storage`.【F:backend/app/jobs.py†L66-L142】【F:backend/app/gpt_helpers.py†L52-L85】
3. **Tighten onboarding metrics:** Instrument Next.js wizard to emit step completion analytics (Upload → Map → Context) supporting activation goals.【F:outreach-frontend/pages/upload.tsx†L38-L199】
4. **Sunset Streamlit or convert to admin console:** Decide whether `create_new.py` remains for concierge work or should be folded into Next.js for a single UX surface.【F:create_new.py†L9-L57】

---
This MCP centralizes how the product promise, technical systems, and go-to-market execution interlock so teams can ship confidently and hit the first-month monetization targets.
