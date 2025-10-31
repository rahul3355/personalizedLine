# Workflow & System Diagrams

## 1. User Journey: Upload to Download

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         USER FRONTEND (Next.js)                          │
└──────────────────────────────────────────────────────────────────────────┘
                                    ↓
                    ┌─ Step 0: File Upload ─┐
                    │ Drag & drop CSV/XLSX   │
                    └──────────────┬──────────┘
                                    ↓
                   POST /parse_headers (Stream to temp)
                   ← Headers, row_count, email_guess
                                    ↓
                    ┌─ Step 1: Select Email Column ─┐
                    │ Confirm or change column       │
                    └──────────────┬──────────────────┘
                                    ↓
                    ┌─ Step 2: Service Context ─┐
                    │ 6 fields (core_offer, etc) │
                    └──────────────┬─────────────┘
                                    ↓
            POST /jobs (Create job, reserve credits atomically)
            ← job_id, status="queued"
                                    ↓
         ┌────────────────────────────────────────────────┐
         │                BACKEND WORKER LOOP             │
         │ (Polls DB every 5 seconds for queued jobs)     │
         └────────────────────┬───────────────────────────┘
                              ↓
          process_job(job_id)
          ├─ Download input from Supabase storage
          ├─ Split into N chunks (WORKER_COUNT)
          ├─ For each chunk:
          │  └─ RQ Enqueue process_subjob(chunk_id)
          │     (Runs in parallel if multiple workers)
          └─ RQ Enqueue finalize_job(depends_on=[all subjobs])
                              ↓
    process_subjob(chunk_id) — RUNS IN PARALLEL
    ├─ For each row:
    │  ├─ perform_research(email) → call Serper, call Groq
    │  ├─ generate_sif_personalized_line(research) → call Groq
    │  └─ Write enriched CSV row
    ├─ Upload chunk CSV to outputs bucket
    └─ Update progress atomically
                              ↓
    finalize_job (Starts when ALL subjobs complete)
    ├─ Download all chunk CSVs
    ├─ Merge into final DataFrame
    ├─ Convert to XLSX
    ├─ Upload to storage
    └─ Mark job_status="succeeded"
                              ↓
         ┌────────────────────────────────────────┐
         │    USER FRONTEND POLLS /jobs/{id}      │
         │  (Every 2 seconds checks progress %)   │
         └────────────────────┬───────────────────┘
                              ↓
                  ┌─ Job Complete ─┐
                  │ Download XLSX  │
                  └────────────────┘
```

---

## 2. Credit System Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│               USER STARTS JOB CREATION                      │
│  (1000 rows, user has 800 credits remaining)                │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
    POST /jobs (with Redis lock acquisition)
                        ↓
    ┌──────────────────────────────────────────────────────┐
    │ Atomic Credit Reservation (Optimistic Concurrency)   │
    │                                                       │
    │ 1. Read: credits_remaining = 800                      │
    │ 2. Compare: 800 < 1000 rows needed                    │
    │ 3. Reject with 402 (insufficient credits)            │
    │                                                       │
    │ Response:                                             │
    │   {                                                   │
    │     "error": "insufficient_credits",                  │
    │     "credits_remaining": 800,                         │
    │     "missing_credits": 200                            │
    │   }                                                   │
    └──────────────────────────────────────────────────────┘
                        ↓
        User buys 1000 credits via Stripe
                        ↓
        Stripe Webhook: invoice.paid
        → Append ledger entry (change: +1000)
        → Update profiles: credits_remaining = 1800
                        ↓
        User retries job creation with same file
                        ↓
    ┌──────────────────────────────────────────────────────┐
    │ Atomic Credit Reservation (SUCCESS)                   │
    │                                                       │
    │ 1. Read: credits_remaining = 1800                     │
    │ 2. Compare: 1800 >= 1000 rows needed                  │
    │ 3. CAS Update:                                        │
    │    UPDATE profiles                                    │
    │    SET credits_remaining = 800                        │
    │    WHERE id = user_id                                 │
    │      AND credits_remaining = 1800                     │
    │ 4. If conflict, retry up to 5 times                   │
    │ 5. If success:                                        │
    │    ├─ Append ledger (change: -1000, reason: "job...")│
    │    ├─ Insert job (status: "queued")                   │
    │    └─ Return job_id                                   │
    └──────────────────────────────────────────────────────┘
                        ↓
    Job enters processing pipeline...
                        ↓
    ┌──────────────────────────────────────────────────────┐
    │ If Chunk Processing Fails:                            │
    │                                                       │
    │ refund_job_credits(job_id, user_id)                   │
    │   ├─ Check meta_json.credits_deducted = true          │
    │   ├─ Check meta_json.credits_refunded = false         │
    │   ├─ CAS refund: credits_remaining += 1000            │
    │   ├─ Append ledger (change: +1000, reason: "refund") │
    │   └─ Set meta_json.credits_refunded = true            │
    │                                                       │
    │ Final: credits_remaining = 1800 (restored)            │
    └──────────────────────────────────────────────────────┘
```

---

## 3. Atomic Progress Update Pattern (Optimistic Concurrency)

```
┌─────────────────────────────────────────────────────────┐
│     Multiple process_subjob tasks updating same job      │
│  (e.g., Chunk 1, Chunk 2, Chunk 3 processing in parallel) │
└────────────┬────────────────────────────────────────────┘
             ↓
┌──────────────────────────────────────────────────────────┐
│ _update_job_progress(job_id, total_rows, processed)      │
│                                                          │
│ Loop (max 5 attempts with 50ms backoff):                 │
│                                                          │
│ 1. READ:   SELECT rows_processed FROM jobs WHERE id=..   │
│    Result: rows_processed = 250                          │
│                                                          │
│ 2. CALC:   new_done = min(1000, 250 + 150) = 400       │
│            percent = (400 / 1000) * 100 = 40%           │
│                                                          │
│ 3. CAS:    UPDATE jobs                                   │
│            SET rows_processed = 400,                      │
│                progress_percent = 40.0                    │
│            WHERE id = job_id                             │
│              AND rows_processed = 250  ← MUST MATCH!     │
│                                                          │
│ 4a. If CAS succeeded (rows updated = 1):                 │
│     ✅ Return new_done=400, percent=40                   │
│                                                          │
│ 4b. If CAS failed (rows updated = 0):                    │
│     ⚠️  Conflict! Another task updated it.                │
│     Retry from step 1 (read current value)              │
│                                                          │
│ 5. If 5 attempts fail:                                   │
│     🚫 FATAL: Progress update failed, chunk fails         │
└──────────────────────────────────────────────────────────┘

Example of concurrent updates:
┌────────────────────────────────────────────────────────┐
│ Chunk 1: rows_processed=250 → attempt 1st update       │
│          CAS: 250→400 ✅ SUCCESS                        │
│                                                        │
│ Chunk 2: rows_processed=250 → attempt 1st update       │
│          CAS: 250→??? ❌ CONFLICT (Chunk1 changed it!)  │
│          Retry: READ rows_processed → now 400           │
│          CAS: 400→550 ✅ SUCCESS                        │
│                                                        │
│ Chunk 3: rows_processed=250 → attempt 1st update       │
│          CAS: 250→??? ❌ CONFLICT                        │
│          Retry: READ rows_processed → now 550           │
│          CAS: 550→700 ✅ SUCCESS                        │
└────────────────────────────────────────────────────────┘
```

---

## 4. Research & Personalization Pipeline (Per Row)

```
┌────────────────────────────────────────────────────────────┐
│ Row: {name: "John", company: "Acme", email: "john@..."}   │
└─────────────────────┬──────────────────────────────────────┘
                      ↓
    ┌─ perform_research("john@acme.com") ─┐
    │                                      │
    │ 1. Validate: "@" present ✓           │
    │                                      │
    │ 2. Split: "john" + "acme.com"        │
    │                                      │
    │ 3. Serper API Call #1:               │
    │    Query: "john acme.com"            │
    │    Response: [{title, snippet}, ...] │
    │                                      │
    │ 4. Serper API Call #2:               │
    │    Query: "acme.com"                 │
    │    Response: [{title, snippet}, ...] │
    │                                      │
    │ 5. Extract findings:                 │
    │    findings = [                      │
    │      "John is VP at Acme...",        │
    │      "Acme raised Series B...",      │
    │      "Acme works in SaaS..."         │
    │    ]                                 │
    │                                      │
    │ 6. Groq API Call (synthesis):        │
    │    Prompt: "You are a sales...       │
    │    Findings: [above]                 │
    │    Email: john@acme.com              │
    │    Response:                         │
    │    {                                 │
    │      "person": {                     │
    │        "name": "John Smith",         │
    │        "info": [                     │
    │          "VP of Sales at Acme",      │
    │          "15+ years B2B SaaS exp"    │
    │        ]                             │
    │      },                              │
    │      "company": {                    │
    │        "name": "Acme Inc",           │
    │        "info": [                     │
    │          "Raised $50M Series B",     │
    │          "300+ enterprise customers" │
    │        ],                            │
    │        "moat": "Strong brand & team" │
    │      }                               │
    │    }                                 │
    │                                      │
    │ 7. Validate JSON structure ✓         │
    │                                      │
    │ 8. Return: (full JSON string)        │
    └──────────┬───────────────────────────┘
               ↓
    ┌─ generate_sif_personalized_line(...) ─┐
    │                                        │
    │ Input: research_json (from above)      │
    │        service_context = {             │
    │          "core_offer": "AI email...",  │
    │          "key_differentiator": "...",  │
    │          "timeline": "Next Thursday"   │
    │        }                               │
    │                                        │
    │ 1. Parse research JSON ✓               │
    │                                        │
    │ 2. Build system prompt:                │
    │    "Generate human-written...          │
    │     Focus on pain point...             │
    │     Keep < 25 words per sentence"      │
    │                                        │
    │ 3. Build user prompt:                  │
    │    "{system_prompt}                    │
    │     Person info: {research JSON}       │
    │     Service: {core_offer...}"          │
    │                                        │
    │ 4. Groq API Call (personalization):    │
    │    model: "openai/gpt-oss-120b"        │
    │    temperature: 0.6                    │
    │    Response:                           │
    │    "Noticed Acme just hit 300          │
    │     customers—congrats! We help        │
    │     SaaS teams scale outreach in       │
    │     half the time. Demo next Thu?"     │
    │                                        │
    │ 5. Extract content ✓                   │
    │                                        │
    │ 6. Return: (personalized line string)  │
    └──────────┬───────────────────────────┘
               ↓
    Write to CSV:
    ┌─────────────────────────────────────┐
    │ name | company | email | sif_research │ sif_personalized │
    ├─────────────────────────────────────┤
    │ John │ Acme | john@... │ {full JSON} │ "Noticed Acme..." │
    └─────────────────────────────────────┘
```

---

## 5. Stripe Webhook Flow

```
┌───────────────────────────────────────────────────────┐
│ User clicks "Upgrade to Starter" on /billing         │
└─────────────────┬───────────────────────────────────┘
                  ↓
    POST /create_checkout_session
    ├─ Ensure Stripe customer exists
    ├─ Create Stripe Checkout session
    │  (redirects to Stripe-hosted form)
    └─ Return: { "id": "cs_..." }
                  ↓
    Browser redirects to Stripe Checkout
    (user enters card, completes payment)
                  ↓
    Stripe sends webhooks to POST /stripe/webhook
                  ↓
┌─────────────────────────────────────────────────────────┐
│ Event: checkout.session.completed                      │
├─────────────────────────────────────────────────────────┤
│ 1. Verify webhook signature (STRIPE_WEBHOOK_SECRET)    │
│ 2. Extract customer_id & subscription_id from metadata │
│ 3. Create/sync Stripe customer                         │
│ 4. sync_stripe_customer(customer_id)                   │
│    └─ Fetch subscription details from Stripe          │
│ 5. Update profiles table:                              │
│    ├─ plan_type = "starter"                            │
│    ├─ credits_remaining += 2000                        │
│    ├─ subscription_status = "active"                   │
│    └─ renewal_date = (30 days from now)               │
│ 6. Append ledger:                                      │
│    change: +2000, reason: "purchase: starter"         │
│ 7. Return 200 OK (idempotent)                          │
└─────────────────────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────────────────┐
│ Event: customer.subscription.updated                │
├──────────────────────────────────────────────────────┤
│ (e.g., user downgrades from Pro → Starter)           │
│ 1. Verify webhook signature                         │
│ 2. sync_stripe_customer()                            │
│ 3. Update profiles:                                  │
│    ├─ plan_type = "starter"                         │
│    ├─ subscription_status = "active"                │
│    └─ renewal_date = (next period end)              │
│ 4. Return 200 OK                                     │
└──────────────────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────────────────┐
│ Event: customer.subscription.deleted                │
├──────────────────────────────────────────────────────┤
│ (user cancelled subscription)                       │
│ 1. Verify webhook signature                         │
│ 2. Update profiles:                                 │
│    └─ subscription_status = "inactive"              │
│ 3. Don't touch credits (already spent)              │
│ 4. Return 200 OK                                    │
└──────────────────────────────────────────────────────┘
                  ↓
    Frontend: user sees updated:
    ├─ credits_remaining
    ├─ plan_type
    ├─ subscription_status
    └─ renewal_date
```

---

## 6. File Storage Structure

```
Supabase Storage
├── inputs/ (Raw uploads)
│   └── {user_id}/
│       └── {job_id}/
│           ├── input.csv (Original upload)
│           └── raw_chunks/
│               ├── chunk_1.csv (500 rows)
│               ├── chunk_2.csv (500 rows)
│               └── chunk_3.csv (50 rows)
│
└── outputs/ (Processing results)
    └── {user_id}/
        └── {job_id}/
            ├── chunk_1.csv (enriched chunk)
            ├── chunk_2.csv (enriched chunk)
            ├── chunk_3.csv (enriched chunk)
            └── result.xlsx (final merged)

Local Filesystem (Worker nodes)
├── /data/raw_chunks/
│   └── {job_id}/
│       ├── chunk_1.csv (temp during chunking)
│       ├── chunk_2.csv
│       └── chunk_3.csv
│
└── /data/chunks/
    └── {job_id}/
        ├── chunk_1.csv (temp during processing)
        ├── chunk_2.csv
        ├── chunk_3.csv
        └── (cleaned up after finalize)
```

---

## 7. Job Status State Machine

```
                    ┌──────────────────┐
                    │     QUEUED       │
                    │ (waiting in DB)  │
                    └────────┬─────────┘
                             ↓
                  ┌──────────────────────┐
                  │   IN_PROGRESS        │
                  │ (process_job started)│
                  └──────────┬───────────┘
                             ↓
        ┌────────────────────────────────────────┐
        ↓                                         ↓
    ┌─────────────┐                        ┌──────────────┐
    │ SUCCEEDED   │                        │   FAILED     │
    │ (all chunks │                        │ (error in    │
    │  processed) │                        │  any step)   │
    │ result_path │                        │ error: "..." │
    │ filled      │                        │ credits      │
    └─────────────┘                        │ refunded     │
                                           └──────────────┘

Error scenarios:
├─ Missing file_path → FAILED immediately
├─ Credit deduction fails → FAILED before processing
├─ Chunk process_subjob fails → FAILED + refund
├─ Finalize fails → FAILED + refund
└─ Unhandled exception → FAILED + refund
```

