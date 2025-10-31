# Personalized Outreach Platform - Codebase Architecture Analysis

## 1. PROJECT OVERVIEW

This is a **SaaS application for AI-powered personalized email outreach line generation**. It helps go-to-market teams turn raw prospect data (CSV/XLSX) into tailored, research-backed outreach messages for channels like LinkedIn.

### Key Components:
- **Frontend**: Next.js (TypeScript/TSX) - Modern React interface
- **Backend**: FastAPI (Python) - REST API with JWT authentication
- **Database**: Supabase (PostgreSQL) - User profiles, jobs, logs, file metadata, credit ledger
- **Storage**: Supabase Storage (S3-compatible) - Input files, chunks, output results
- **Job Queue**: Redis + RQ (Redis Queue) - Background job processing
- **External APIs**: 
  - **Stripe**: Billing and subscriptions
  - **Serper**: Search API for prospect research
  - **Groq**: LLM for research synthesis and personalization

---

## 2. ARCHITECTURE PATTERN: CHUNKED ASYNC JOB PROCESSING

The system follows a **distributed chunking pattern** for scalable outreach generation:

```
User Upload → Parse Headers → Job Creation → Worker Loop →
  Chunking → RQ Tasks (Parallel Chunk Processing) → 
  Finalization (Merge) → Download
```

### Key Design Pattern:
- **Atomic Credit Reservation**: Jobs reserve credits before processing with Redis locks
- **Optimistic Concurrency**: Progress updates use atomic compare-and-swap on Supabase
- **RQ-Based Queueing**: Background jobs are enqueued in Redis Queue for parallel chunk processing
- **Graceful Degradation**: Missing Serper/Groq keys result in fallback messages, not crashes

---

## 3. DATA FLOW & WORKFLOWS

### 3.1 Upload & Job Creation Flow

**File: `/backend/app/main.py`** (FastAPI endpoints)

```
POST /parse_headers
  ├─ Stream file from Supabase storage to temp
  ├─ Extract headers (CSV/XLSX)
  ├─ Count rows (memory-efficient streaming)
  ├─ Check user credits
  └─ Return headers, row count, email column guess

POST /jobs (Create Job)
  ├─ Acquire Redis lock (credits_lock:{user_id})
  ├─ Reserve credits atomically (optimistic concurrency)
  ├─ Append ledger entry (audit trail)
  ├─ Insert job record (status: "queued")
  └─ Return job_id
```

### 3.2 Job Processing Pipeline

**File: `/backend/app/jobs.py`** (Worker logic)

```
worker_loop (Continuous)
  └─ Polls DB for status="queued" jobs
     └─ process_job(job_id)
        ├─ Download input file from storage
        ├─ Acquire credits lock + claim job (status: "in_progress")
        ├─ Split file into chunks based on WORKER_COUNT
        ├─ For each chunk:
        │  └─ Enqueue process_subjob RQ task
        ├─ Enqueue finalize_job dependent task
        └─ Return (subjobs run in parallel in RQ)

process_subjob(job_id, chunk_id, ...)
  ├─ Download raw chunk from storage
  ├─ For each row in chunk:
  │  ├─ perform_research(email)
  │  │  ├─ Call Serper API (2 queries: username+domain, domain-only)
  │  │  └─ Call Groq API with research findings → JSON struct
  │  ├─ generate_sif_personalized_line(research_json, service_context)
  │  │  └─ Call Groq API → personalized opener line
  │  └─ Write enriched row to output CSV
  ├─ Upload chunk CSV to storage
  ├─ Record file metadata in DB
  ├─ Update job progress (atomic optimistic concurrency)
  └─ Delete raw chunk from storage

finalize_job(job_id, total_chunks, ...)
  ├─ Download all chunk CSVs (from local cache or storage)
  ├─ Merge into final DataFrame
  ├─ Convert to XLSX format
  ├─ Upload final result
  ├─ Mark job as "succeeded"
  └─ Cleanup local chunk directory
```

### 3.3 Research & Personalization Pipeline

**File: `/backend/app/research.py`**

```
perform_research(email: str) → str (JSON or fallback message)
  1. Validate email format
  2. Split into username and domain
  3. Call Serper API twice:
     - Query 1: "username domain"
     - Query 2: "domain"
  4. Extract top results
  5. Call Groq to synthesize research:
     Input: Search findings
     Output: JSON with structure:
       {
         "person": {
           "name": "string",
           "info": ["insight1", "insight2"]
         },
         "company": {
           "name": "string",
           "info": ["insight1", "insight2"],
           "moat": "unique advantage"
         }
       }
```

**File: `/backend/app/gpt_helpers.py`**

```
generate_sif_personalized_line(research_json: str, service_context: str) → str
  Input: 
    - research_json: Structured JSON from research step
    - service_context: User-provided service description
  Process:
    1. Parse research JSON
    2. Build prompt: System + research + service context
    3. Call Groq with model="openai/gpt-oss-120b"
    4. Extract personalized opener (1-2 sentences, <25 words each)
  Output:
    - Plain English personalized line (e.g., "I noticed your company just raised Series A...")
    - Fallback if any error: "SIF personalized line unavailable: ..."
```

---

## 4. DATABASE SCHEMA (Supabase Tables)

### profiles
```
id (uuid, PK)
email (text)
credits_remaining (int)
max_credits (int)
plan_type (text) - "free" | "starter" | "growth" | "pro"
subscription_status (text) - "active" | "inactive" | "paused"
renewal_date (timestamp)
stripe_customer_id (text, nullable)
stripe_subscription_id (text, nullable)
stripe_price_id (text, nullable)
stripe_payment_brand (text, nullable)
stripe_payment_last4 (text, nullable)
```

### jobs
```
id (uuid, PK)
user_id (uuid, FK → profiles.id)
status (text) - "queued" | "in_progress" | "succeeded" | "failed"
filename (text)
rows (int)
rows_processed (int, default=0)
progress_percent (float, default=0.0)
created_at (timestamp)
started_at (timestamp, nullable)
finished_at (timestamp, nullable)
result_path (text, nullable) - S3 storage path to final XLSX
error (text, nullable)
meta_json (jsonb) - stores:
  {
    "file_path": "user_id/job_id/input.csv",
    "email_col": "email",
    "service": "{ core_offer, key_differentiator, cta, timeline, goal, fallback_action }",
    "credit_cost": 150,
    "credits_deducted": true,
    "credits_refunded": false,
    "output_columns": ["name", "company", "email"],
  }
timing_json (jsonb) - performance metrics
```

### job_logs
```
id (serial, PK)
job_id (uuid, FK)
step (int) - row number processed or chunk number
total (int) - total rows in job
message (text) - progress message (e.g., "Chunk 1 completed")
created_at (timestamp, default=now())
```

### ledger (Audit Trail)
```
id (serial, PK)
user_id (uuid, FK)
change (int) - credit delta (negative for deduction, positive for refund/purchase)
amount (float) - transaction amount in USD
reason (text) - "job deduction: {job_id}" | "job refund: {job_id}" | "purchase: {plan}"
ts (timestamp)
```

### files (Metadata)
```
id (uuid, PK)
user_id (uuid, FK)
job_id (uuid, FK)
original_name (text)
storage_path (text) - path in outputs bucket
file_type (text) - "partial_output" | "final_output"
created_at (timestamp, default=now())
```

### Supabase Storage Buckets
- **inputs**: Raw CSV/XLSX uploads from users
  - Structure: `{user_id}/{job_id}/{filename}`
  - Sub: `{user_id}/{job_id}/raw_chunks/chunk_{id}.csv`
- **outputs**: Final and intermediate results
  - Structure: `{user_id}/{job_id}/chunk_{id}.csv` (partial)
  - Structure: `{user_id}/{job_id}/result.xlsx` (final)

---

## 5. SERVICE ORGANIZATION & API INTEGRATION PATTERNS

### 5.1 Research Service (Serper + Groq)
**Pattern: Sequential Pipeline with Fallbacks**

```python
# research.py: perform_research()
1. Validate email
2. Split into username + domain
3. HTTP POST to Serper (search findings extraction)
4. Parse search results
5. HTTP POST to Groq (structured synthesis)
6. Validate JSON response
7. Return JSON or fallback message string
```

**Error Handling:**
- Missing API key → Return "Research unavailable: missing {service} API key."
- Network timeout → Log exception, return fallback
- Invalid JSON response → Log and return "Research unavailable: invalid research JSON."

### 5.2 Personalization Service (Groq SIF)
**Pattern: System Prompt + Context Injection**

```python
# gpt_helpers.py: generate_sif_personalized_line()
1. Parse research JSON
2. Build system prompt (predefined instructions for quality)
3. Inject research block (structured JSON) into user prompt
4. Inject service context (user-defined offering details)
5. Call Groq API with temperature=0.6
6. Extract content from first choice
7. Validate and return plain text
```

**System Prompt Focus:**
- "Generate a human-written, well-researched, conversational, highly personalized opening line"
- "Focus on a pain this person/company might face"
- "Reference how our service context relates to that pain"
- "Keep every sentence short (25 words or fewer)"

### 5.3 Billing Service (Stripe)
**Pattern: Webhook-Driven Reconciliation**

```python
# main.py: Stripe integration
- POST /create_checkout_session → Stripe API → Redirect to Checkout
- Stripe Webhook → POST /stripe/webhook (signature verified)
  ├─ "checkout.session.completed" → Create Stripe customer, sync subscription
  ├─ "customer.subscription.updated" → Update plan_type, credits, renewal_date
  ├─ "invoice.paid" → Add credit ledger entry
  ├─ "customer.subscription.deleted" → Mark subscription_status="inactive"
  └─ Idempotent handling via event log deduplication
```

### 5.4 File Streaming Service
**Pattern: Memory-Efficient Streaming**

```python
# file_streaming.py
- stream_input_to_tempfile(): Async httpx streaming to temp file
- extract_csv_headers() / extract_xlsx_headers(): Read-only mode for headers
- count_csv_rows() / count_xlsx_rows(): Iterator-based row counting
- No full file loading into memory (critical for 100k row files)
```

---

## 6. CREDIT SYSTEM & ATOMICITY

### Credit Reservation (Optimistic Concurrency)
```python
# main.py: _reserve_credits_for_job()
1. Read current credits_remaining
2. Compare (credits >= row_count)
3. CAS Update: UPDATE profiles SET credits_remaining = new_balance 
               WHERE id = user_id AND credits_remaining = old_balance
4. If CAS fails (conflict), retry up to 5 times with 100ms backoff
5. If success, append ledger entry
6. If ledger fails, rollback profile update
```

### Credit Deduction (Per-Job)
```python
# jobs.py: _deduct_job_credits()
- Reuses same CAS pattern
- Called before process_job starts (within Redis lock)
- If failure: Job marked as failed, no refund needed (credits never deducted)
```

### Credit Refund (On Error)
```python
# jobs.py: refund_job_credits()
- Checks meta_json: credits_deducted=true AND credits_refunded=false
- Applies reverse ledger entry
- Uses same atomic CAS pattern
- Called on chunk error, finalize error, or process_job failure
```

---

## 7. FRONTEND ARCHITECTURE (Next.js/React)

### Key Pages

#### `/pages/upload.tsx` - 3-Step Upload Wizard
```
Step 0: File Upload
  - Drag & drop or browse
  - Parse headers (calls /parse_headers)
  - Show row count & credit cost estimate
  - Display email column guess

Step 1: Email Column Selection
  - Dropdown of all headers
  - Pre-selected if email-like column detected

Step 2: Service Context
  - 6 text fields (core_offer, key_differentiator, cta, timeline, goal, fallback_action)
  - Defaults provided
  - Job creation (calls POST /jobs)
  - Redirect to /jobs on success
```

#### `/pages/jobs/index.tsx` - Job History
```
Features:
- List all jobs grouped by month/day
- Status pills: "Completed" | "Failed" | "In Progress"
- Progress bars with percentage
- Download button for succeeded jobs
- Retry button for failed jobs
- Detail panel with error messages & timings
```

#### `/pages/jobs/[id].tsx` - Job Detail (re-exports from index)

#### `/pages/billing.tsx` - Subscription Management
```
Features:
- 3 base plans (Starter, Growth, Pro) with pricing
- Add-on purchases (additional credits)
- Display current subscription status
- Stripe Checkout integration
- Renewal date display
```

#### `/pages/index.tsx` - Home Dashboard
```
Features:
- Account overview (plan, credits, renewal date)
- Credit balance
- Transaction history (ledger entries)
- Buy credits button if balance = 0
```

### Authentication
**File: `/lib/AuthProvider.tsx`**
- Supabase Auth (JWT-based)
- Context provider for session & user info
- Auto-refresh on mount
- Protected routes with `useAuth()` hook

### API Client
**File: `/lib/api.ts`**
```
- fetchUserInfo(token)
- fetchJobs(token, offset, limit)
- createJob(token, formData)
- buyCredits(token, payload)
```

### UI Components
```
- BlackUploadButton.tsx - Styled upload trigger
- AnimatedDownloadButton.tsx - Download with animation
- UploadProgress.tsx - Progress bar during processing
- LoadingBar.tsx - Thin linear progress
- InlineLoader.tsx - Spinner
- Navbar.tsx - Header with auth menu
- AuthorityPointLoader.tsx - Custom loader animation
```

---

## 8. EXISTING WORKFLOW PATTERNS

### Job Status Flow
```
queued → in_progress → (succeeded | failed)
  └─ Progress tracked via rows_processed, progress_percent, and job_logs
  └─ On success: result_path populated with XLSX location
  └─ On failure: error message and credits refunded
```

### Output Columns
```
Input: {name, company, email, LinkedIn URL, ...}
Generated by worker:
  - sif_research (JSON string with person/company insights)
  - sif_personalized (Personalized opening line)
Output (XLSX):
  - All input columns (except sif_research/sif_personalized if in input)
  - sif_research (new)
  - sif_personalized (new)
  - Optional filtering: meta_json["output_columns"] restricts what's exported
```

### Error Handling
```
Parse Headers: 400 (bad input), 500 (streaming error)
Job Creation: 402 (insufficient credits), 403 (unauthorized), 500 (DB error)
Chunk Processing: Silent fallbacks for Serper/Groq (don't fail entire job)
Finalization: Refund credits if merge or upload fails
```

---

## 9. DEPLOYMENT ARCHITECTURE

### Docker Compose (`docker-compose.yml`)
```yaml
Services:
  - redis: Redis server (port 6379) for RQ jobs
  - postgres: Supabase database (managed separately)
  - fastapi: Backend API container
  - outreach-frontend: Next.js frontend container
```

### Environment Variables (Backend)
```
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET, SUPABASE_JWT_ISS, SUPABASE_JWT_AUD
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_STARTER, STRIPE_PRICE_GROWTH, STRIPE_PRICE_PRO
STRIPE_PRICE_ADDON_FREE, STRIPE_PRICE_ADDON_STARTER, ...
SERPER_API_KEY, GROQ_API_KEY
REDIS_URL (default: redis://redis:6379)
WORKER_COUNT (default: 1, number of parallel chunks)
SUBJOB_TIMEOUT (default: 600, seconds per chunk)
APP_BASE_URL, FRONTEND_BASE_URLS
ENV (dev | prod)
```

### Environment Variables (Frontend)
```
NEXT_PUBLIC_API_URL (Backend API endpoint)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

---

## 10. INTEGRATION POINTS FOR EMAIL OUTREACH WORKFLOW

### Current Outputs
The system **generates** two columns:
1. **sif_research**: Structured research insights (JSON)
2. **sif_personalized**: Personalized opening line (plain text)

### Missing for Full Email Outreach
To implement a complete email outreach workflow, you'd add:

1. **Email Template Engine**
   - Design email body (subject line, body, signature)
   - Variables: {name}, {company}, {sif_personalized}, etc.
   - Could use Jinja2 or similar template framework

2. **Email Service Integration**
   - SMTP provider (e.g., SendGrid, Mailgun)
   - OR Queue API (e.g., Instantly, Apollo API)
   - Track send/open/click events

3. **Sequencing & Automation**
   - Follow-up rules (e.g., send follow-up after 3 days if no response)
   - A/B testing of templates
   - Scheduling (send batches at optimal times)

4. **Analytics & Feedback Loop**
   - Track delivery, opens, clicks, replies
   - Measure personalization effectiveness
   - Iterate on research + personalization logic

5. **UI Enhancements**
   - Email preview pane (before sending)
   - Template builder
   - Sequence designer
   - Campaign analytics dashboard

### Architecture Pattern
- **Email Sending**: Could be a new RQ task (process_email_send) in the finalize step or post-finalization
- **Event Webhooks**: Listen to email provider webhooks for delivery/open/click tracking
- **Storage**: New table (email_events) to track outreach analytics
- **Configuration**: Extend service_context meta_json to include email template, send timing, etc.

---

## 11. KEY ARCHITECTURAL STRENGTHS

✅ **Scalability via Chunking**: 100k row jobs can be split across multiple workers  
✅ **Atomic Credit System**: No double-charging; optimistic concurrency prevents race conditions  
✅ **Resilient Error Handling**: Graceful degradation when external APIs fail  
✅ **Audit Trail**: Full ledger of all credit transactions  
✅ **Memory Efficiency**: Streaming file parsing (no loading entire files)  
✅ **Observability**: Detailed job logs, timing metrics, progress tracking  
✅ **Flexible Output**: Column filtering, header ordering, format options (CSV/XLSX)  

---

## 12. AREAS FOR FUTURE ENHANCEMENT

1. **Email Sending Integration** - Add SMTP or queue provider connection
2. **Template Engine** - Dynamic email body generation
3. **Sequencing Logic** - Multi-step outreach campaigns
4. **Webhook Event Tracking** - Delivery, open, click analytics
5. **A/B Testing Framework** - Experiment with variants
6. **Rate Limiting** - IP-based or account-based limits per provider
7. **Compliance Features** - GDPR consent tracking, unsubscribe handling
8. **CRM Integration** - Sync with HubSpot, Salesforce, etc.

