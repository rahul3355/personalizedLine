# Codebase Documentation Index

This directory contains comprehensive documentation of the Personalized Outreach Platform architecture and implementation.

## Documents Included

### 1. **CODEBASE_ARCHITECTURE.md** (Primary Reference)
   - Complete system overview and design patterns
   - Detailed description of all major components:
     - Project overview (tech stack, key APIs)
     - Architecture pattern (chunked async job processing)
     - Data flow and workflows (upload, job processing, research/personalization)
     - Database schema (all tables and relationships)
     - Service organization (research, personalization, billing, file streaming)
     - Credit system and atomicity guarantees
     - Frontend architecture (pages, components, authentication)
     - Existing workflow patterns
     - Deployment architecture
     - **CRITICAL:** Integration points for email outreach workflow
     - Architectural strengths and future enhancements

**Use this document for:**
- Understanding the complete system architecture
- Learning how services are organized
- Understanding API integration patterns
- Planning email outreach workflow integration
- Database and schema reference

---

### 2. **KEY_FILES_REFERENCE.md** (Quick Navigation)
   - File-by-file breakdown of key implementation files
   - Code locations with line counts
   - Quick summaries of what each file does
   - Organized by backend/frontend/database/deployment

**Use this document for:**
- Finding specific code files
- Understanding code organization
- Navigating to implementation details
- Quick reference for file purposes

---

### 3. **WORKFLOW_DIAGRAMS.md** (Visual Reference)
   - ASCII flowcharts and state diagrams
   - 7 detailed workflow visualizations:
     1. User journey (Upload → Download)
     2. Credit system lifecycle
     3. Atomic progress updates (optimistic concurrency)
     4. Research & personalization pipeline (per row)
     5. Stripe webhook integration flow
     6. File storage structure
     7. Job status state machine

**Use this document for:**
- Understanding data flow visually
- Learning job processing pipeline
- Understanding credit system mechanics
- Following research/personalization process
- Understanding billing flow

---

### 4. **docs/data_flow_graph.md** (System-Generated)
   - Mermaid flowchart of all data flows
   - Security assessment by flow
   - Network topology
   - Existing in the repo (referenced for completeness)

---

## Key Findings Summary

### System Architecture
- **Scalable Job Processing**: Chunked processing allows handling 100k+ row files
- **Atomic Credit System**: Optimistic concurrency prevents double-charging
- **Graceful Degradation**: External API failures don't crash jobs
- **Full Audit Trail**: Complete ledger of all credit transactions

### Core Technologies
```
Frontend:    Next.js + React + TypeScript + Tailwind CSS
Backend:     FastAPI + Python + async/await
Database:    Supabase (PostgreSQL) + Storage (S3-compatible)
Job Queue:   Redis + RQ (Redis Queue)
APIs:        Stripe, Serper, Groq
Auth:        JWT via Supabase Auth
```

### Processing Pipeline
1. **Upload** → Parse headers, stream to temp, count rows (memory-efficient)
2. **Reserve Credits** → Atomic CAS (compare-and-swap) with retries
3. **Create Job** → Insert into DB with status="queued"
4. **Process Job** → Worker polls for queued jobs
5. **Chunk Data** → Split based on WORKER_COUNT
6. **Parallel Subjobs** → RQ tasks process chunks concurrently
   - For each row: research (Serper + Groq) → personalization (Groq)
7. **Finalize** → Merge chunks, convert to XLSX, upload
8. **Download** → User downloads final XLSX with enriched data

### Current Workflow Outputs
The system generates two columns:
- **sif_research**: Structured JSON with person/company insights
- **sif_personalized**: Human-written personalized opening line

### Missing for Full Email Outreach
To implement complete email outreach:
1. Email template engine (Jinja2 or similar)
2. Email service integration (SendGrid, Mailgun, Instantly API)
3. Sequencing logic (follow-ups, scheduling)
4. Event webhooks (track delivery, opens, clicks)
5. Analytics dashboard
6. A/B testing framework
7. CRM integrations

---

## Quick Navigation

### I want to understand...

**How jobs are processed?**
→ WORKFLOW_DIAGRAMS.md (section 1) + CODEBASE_ARCHITECTURE.md (section 3.2)

**How credits work?**
→ WORKFLOW_DIAGRAMS.md (section 2) + CODEBASE_ARCHITECTURE.md (section 6)

**Where is the research/personalization code?**
→ KEY_FILES_REFERENCE.md (research.py, gpt_helpers.py) + /backend/app/research.py

**How does the frontend work?**
→ CODEBASE_ARCHITECTURE.md (section 7) + KEY_FILES_REFERENCE.md (Frontend section)

**What's the database schema?**
→ CODEBASE_ARCHITECTURE.md (section 4) + /backend/app/main.py

**How to integrate email sending?**
→ CODEBASE_ARCHITECTURE.md (section 10) for architecture patterns

**Where is Stripe integration?**
→ WORKFLOW_DIAGRAMS.md (section 5) + /backend/app/main.py (Stripe functions)

**How are files stored?**
→ WORKFLOW_DIAGRAMS.md (section 6) + CODEBASE_ARCHITECTURE.md (section 4)

**What are the API endpoints?**
→ /backend/app/main.py + CODEBASE_ARCHITECTURE.md (section 3.1)

**How does the job queue work?**
→ /backend/app/jobs.py + KEY_FILES_REFERENCE.md (producer.py, worker.py)

---

## File Locations

### Backend Implementation
```
/backend/app/
  ├── main.py                 # FastAPI, all endpoints
  ├── jobs.py                 # Job processing pipeline
  ├── research.py             # Serper + Groq research
  ├── gpt_helpers.py          # Groq personalization
  ├── file_streaming.py       # Memory-efficient file parsing
  ├── supabase_client.py      # DB client init
  ├── producer.py             # RQ job enqueueing
  ├── worker.py               # RQ worker runner
  ├── jwt_fallback.py         # Offline JWT support
  └── tests/                  # Test suite
```

### Frontend Implementation
```
/outreach-frontend/
  ├── pages/
  │   ├── upload.tsx          # 3-step upload wizard
  │   ├── jobs/
  │   │   ├── index.tsx       # Job listing & detail
  │   │   └── [id].tsx        # Re-exports index
  │   ├── billing.tsx         # Subscription management
  │   ├── index.tsx           # Home dashboard
  │   └── login.tsx           # Auth page
  ├── lib/
  │   ├── AuthProvider.tsx    # Auth context
  │   ├── api.ts              # API client
  │   └── supabaseClient.ts   # Supabase init
  └── components/             # UI components
```

### Documentation
```
/
  ├── CODEBASE_ARCHITECTURE.md     # This project (main reference)
  ├── KEY_FILES_REFERENCE.md       # File navigation guide
  ├── WORKFLOW_DIAGRAMS.md         # Visual flowcharts
  ├── DOCUMENTATION_INDEX.md       # This file
  ├── docs/
  │   ├── data_flow_graph.md       # System data flow (auto-generated)
  │   └── MCP.md                   # MCP documentation
  └── info1.md                     # Monetization playbook
```

---

## Key Architectural Patterns

### 1. Chunked Async Processing
- Split large files into chunks
- Process chunks in parallel via RQ
- Merge results atomically
- Enables 100k+ row jobs without OOM

### 2. Optimistic Concurrency Control
- No locks for reads
- CAS (Compare-And-Swap) for writes
- Retry on conflict with exponential backoff
- Prevents double-charging and lost updates

### 3. Graceful Degradation
- Missing API key → Fallback message instead of crash
- Network timeout → Retry with backoff
- Invalid response → Log and continue with defaults
- Job continues even if individual row fails

### 4. Atomicity Guarantees
- Credit reservation: All-or-nothing (CAS with ledger)
- Job creation: Atomic insert with status="queued"
- Progress updates: Atomic with optimistic locking
- Refunds: Idempotent with ledger trail

### 5. Audit Trail
- Every credit transaction logged in ledger table
- Every job's timeline tracked (created_at, started_at, finished_at)
- Every processing step logged in job_logs
- Full trace-ability for debugging and compliance

---

## Environment Variables (Quick Reference)

**Backend:**
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET
- STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_* (3 plans + 4 addons)
- SERPER_API_KEY, GROQ_API_KEY
- REDIS_URL, WORKER_COUNT, SUBJOB_TIMEOUT
- FRONTEND_BASE_URLS, APP_BASE_URL, ENV

**Frontend:**
- NEXT_PUBLIC_API_URL, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

---

## Testing
Located in `/backend/app/tests/`:
- test_auth.py - JWT authentication
- test_job_dispatch.py - Job creation and dispatch
- test_gpt_helpers.py - Personalization
- test_research.py - Research synthesis
- test_file_authorization.py - File access control
- test_xlsx_endpoints.py - XLSX parsing
- test_streaming_helpers.py - File streaming
- test_progress_updates.py - Progress tracking

Run tests:
```bash
pytest /backend/app/tests/
```

---

## Deployment

See docker-compose.yml for local development:
```
Services:
  - redis:6379 (job queue)
  - fastapi:8000 (backend API)
  - outreach-frontend:3000 (frontend)
  - postgres (via Supabase, managed separately)
```

---

## Support & Questions

For questions about specific areas, refer to:
- **Architecture**: CODEBASE_ARCHITECTURE.md
- **Implementation**: KEY_FILES_REFERENCE.md + specific files
- **Workflows**: WORKFLOW_DIAGRAMS.md
- **APIs**: /backend/app/main.py
- **Database**: CODEBASE_ARCHITECTURE.md section 4
- **Integration Points**: CODEBASE_ARCHITECTURE.md section 10

---

**Last Updated**: October 31, 2025
**Documentation Version**: 1.0
**Codebase Status**: Active Development

