# Key Files Quick Reference

## Backend Architecture

### API & Job Management
- **/backend/app/main.py** (900+ lines)
  - FastAPI app initialization
  - POST /parse_headers - Stream & parse CSV/XLSX, count rows
  - POST /jobs - Create job with atomic credit reservation
  - GET /jobs, GET /jobs/{id} - List & fetch jobs with progress
  - Stripe integration (webhook, checkout, sync)
  - JWT authentication guard
  - Credit reservation/rollback logic

### Job Processing Pipeline
- **/backend/app/jobs.py** (1200+ lines)
  - worker_loop() - Polls DB for queued jobs continuously
  - process_job() - Main job dispatcher
    - Downloads input file
    - Chunks data based on WORKER_COUNT
    - Enqueues subjobs to RQ
    - Enqueues finalize_job
  - process_subjob() - Individual chunk processor
    - For each row: perform_research() → generate_sif_personalized_line()
    - Write enriched CSV
    - Upload to storage
    - Track progress atomically
  - finalize_job() - Merge chunks & upload final XLSX
  - Credit management (deduct, refund, reserve)
  - Atomic progress updates with optimistic concurrency

### Research & AI Services
- **/backend/app/research.py** (150+ lines)
  - perform_research(email) - Serper API + Groq synthesis
  - Calls Serper API twice (username+domain, domain)
  - Calls Groq to structure findings as JSON
  - Validates JSON structure (person/company/moat)
  - Returns JSON string or fallback message

- **/backend/app/gpt_helpers.py** (90+ lines)
  - generate_sif_personalized_line() - Groq personalization
  - Takes research JSON + service context
  - System prompt for quality (25 words/sentence, pain-focused)
  - Returns personalized opener or fallback

### Infrastructure
- **/backend/app/supabase_client.py** (20 lines)
  - Initialize Supabase client with service role key
  - Monkeypatch httpx (remove unsupported proxy arg)

- **/backend/app/file_streaming.py** (130 lines)
  - stream_input_to_tempfile() - Async download via signed URL
  - extract_csv_headers() / extract_xlsx_headers()
  - count_csv_rows() / count_xlsx_rows() - Memory-efficient
  - No full file loading (critical for 100k rows)

- **/backend/app/producer.py** (40 lines)
  - enqueue_job() - RQ task enqueueing

- **/backend/app/worker.py** (10 lines)
  - Standalone RQ worker (runs process_job, process_subjob, finalize_job)

---

## Frontend Architecture

### Pages
- **/pages/upload.tsx** (1000+ lines)
  - 3-step wizard (upload → email column → service context)
  - Drag & drop file upload
  - Header parsing & row counting
  - Email column auto-detection
  - Service context fields (6 inputs with defaults)
  - Credit check & cost display
  - Job creation & redirect to /jobs

- **/pages/jobs/index.tsx** (600+ lines)
  - Job listing with grouping (month/day)
  - Status pills, progress bars
  - Download & retry buttons
  - Detail panel with job metrics
  - Mobile-responsive design

- **/pages/billing.tsx** (400+ lines)
  - 3 subscription plans (Starter, Growth, Pro)
  - Add-on purchases
  - Stripe Checkout integration
  - Current subscription display

- **/pages/index.tsx** (160 lines)
  - Dashboard with account overview
  - Credits remaining & renewal date
  - Recent transaction history
  - Buy credits button

### Authentication & API
- **/lib/AuthProvider.tsx**
  - Supabase Auth context provider
  - JWT token management
  - Session & user info state
  - useAuth() hook for components

- **/lib/api.ts** (100+ lines)
  - Fetch helpers with Bearer token
  - fetchUserInfo(), fetchJobs(), createJob()
  - buyCredits() - Stripe integration

### Components
- **AnimatedDownloadButton.tsx** - Animated download
- **UploadProgress.tsx** - Job progress tracking
- **LoadingBar.tsx** - Linear progress bar
- **InlineLoader.tsx** - Spinner component
- **Navbar.tsx** - Header with auth menu
- **AuthorityPointLoader.tsx** - Custom loader

---

## Database & Storage (Supabase)

### Tables
1. **profiles** - User accounts with billing info
2. **jobs** - Job metadata, status, progress, timing
3. **job_logs** - Step-by-step progress messages
4. **ledger** - Credit transaction audit trail
5. **files** - Output file metadata (chunks & finals)

### Storage Buckets
- **inputs** - Raw CSV/XLSX uploads + raw chunks
- **outputs** - Processed chunks + final XLSX results

---

## Configuration & Deployment

### Key Environment Variables
**Backend:**
- SUPABASE_* (URL, keys, JWT settings)
- STRIPE_* (API keys, webhook secret, price IDs)
- SERPER_API_KEY, GROQ_API_KEY
- REDIS_URL, WORKER_COUNT, SUBJOB_TIMEOUT

**Frontend:**
- NEXT_PUBLIC_API_URL, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

### Docker Compose Services
- redis (port 6379) - RQ job queue
- fastapi - Backend API
- outreach-frontend - Next.js frontend
- postgres - Database (managed separately via Supabase)

---

## Testing
- **/backend/app/tests/** - Test suite
  - test_auth.py, test_job_dispatch.py
  - test_gpt_helpers.py, test_research.py
  - test_file_authorization.py, test_xlsx_endpoints.py
  - test_streaming_helpers.py, test_progress_updates.py

---

## Line Counts & Complexity
- jobs.py: 1202 lines (core processing logic)
- main.py: 900+ lines (API endpoints & Stripe)
- upload.tsx: 1000+ lines (UI wizard)
- jobs/index.tsx: 600+ lines (job management UI)
- billing.tsx: 400+ lines (subscription management)
- gpt_helpers.py: 93 lines (personalization)
- research.py: 150+ lines (research synthesis)
- file_streaming.py: 128 lines (memory-efficient parsing)

