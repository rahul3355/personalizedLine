# System Data Flow Graph

```mermaid
flowchart TD
    subgraph Client["Client Applications"]
        Browser["Browser / Frontend"]
    end

    subgraph Auth["Authentication"]
        authGuard["get_current_user (JWT validation)"]
    end

    subgraph FastAPI["FastAPI Backend (backend/app/main.py)"]
        parseHeaders["POST /parse_headers"]
        createJob["POST /jobs"]
        listJobs["GET /jobs"]
        getJob["GET /jobs/{id}\nGET /jobs/{id}/progress"]
        downloadJob["GET /jobs/{id}/download"]
        meEndpoint["GET /me"]
        stripeCheckout["POST /create_checkout_session"]
        stripeSync["POST /stripe/sync"]
        stripeWebhook["POST /stripe/webhook"]
    end

    subgraph Workers["Worker Routines (backend/app/jobs.py)"]
        workerLoop["worker_loop"]
        processJob["process_job"]
        processSubjob["process_subjob"]
        finalizeJob["finalize_job"]
    end

    subgraph Supabase["Supabase"]
        profiles["profiles table"]
        jobsTable["jobs table"]
        jobLogs["job_logs table"]
        ledger["ledger table"]
        filesTable["files table"]
        storageInputs["Storage: inputs bucket"]
        storageRawChunks["Storage: inputs/raw_chunks"]
        storageOutputs["Storage: outputs bucket"]
    end

    subgraph RedisRQ["Redis / RQ"]
        redisLock["Redis lock\ncredits_lock:<user>"]
        rqQueue["RQ queue"]
    end

    subgraph ExternalAPIs["External APIs"]
        stripeAPI["Stripe API"]
        stripeWebhookSource["Stripe Webhook Events"]
        serperAPI["Serper Search API"]
        groqResearch["Groq (research)"]
        groqSIF["Groq (SIF personalization)"]
    end

    subgraph LocalFS["Local File System"]
        tempFiles["Temporary streamed file"]
        rawChunkLocal["/data/raw_chunks/<job>/chunk_*.csv"]
        chunkCSVs["/data/chunks/<job>/chunk_*.csv"]
        finalResult["Final CSV/XLSX"]
    end

    subgraph Helpers["Helper Modules"]
        headerUtils["file_streaming: header extraction & row counting"]
    end

    %% Client to FastAPI
    Browser -->|JWT + payload| parseHeaders
    Browser -->|JWT + payload| createJob
    Browser -->|JWT| listJobs
    Browser -->|JWT| getJob
    Browser -->|JWT| downloadJob
    Browser -->|JWT| meEndpoint
    Browser -->|JWT + plan request| stripeCheckout
    Browser -->|JWT| stripeSync

    %% Authentication guard usage
    parseHeaders --> authGuard
    createJob --> authGuard
    listJobs --> authGuard
    getJob --> authGuard
    downloadJob --> authGuard
    meEndpoint --> authGuard
    stripeCheckout --> authGuard
    stripeSync --> authGuard

    %% Parse headers flow
    parseHeaders -->|create signed URL + download| storageInputs
    parseHeaders --> tempFiles
    tempFiles --> headerUtils
    headerUtils --> parseHeaders
    parseHeaders -->|select credits| profiles
    parseHeaders -->|headers + row count + credit status| Browser

    %% Job creation flow
    createJob -->|stream input| storageInputs
    createJob --> tempFiles
    createJob --> redisLock
    createJob -->|reserve credits / rollback| profiles
    createJob -->|append ledger entry| ledger
    createJob -->|insert job row| jobsTable
    createJob -->|job id + status| Browser

    %% Read-only job queries
    listJobs -->|fetch| jobsTable
    listJobs -->|fetch latest progress| jobLogs
    listJobs -->|jobs list| Browser

    getJob -->|fetch job| jobsTable
    getJob -->|latest log| jobLogs
    getJob -->|job + progress| Browser

    downloadJob -->|lookup result path| jobsTable
    downloadJob -->|download XLSX| storageOutputs
    downloadJob -->|stream file| Browser

    meEndpoint -->|select profile| profiles
    meEndpoint -->|profile data| Browser

    %% Worker startup loop
    workerLoop -->|poll queued jobs| jobsTable
    workerLoop --> processJob

    %% process_job flow
    processJob -->|download source file| storageInputs
    processJob --> tempFiles
    tempFiles --> processJob
    processJob -->|deduct credits| profiles
    processJob -->|ledger entry| ledger
    processJob --> redisLock
    processJob -->|claim + update status| jobsTable
    processJob -->|write raw chunk csv| rawChunkLocal
    rawChunkLocal --> storageRawChunks
    processJob -->|enqueue chunk jobs| rqQueue
    processJob -->|enqueue finalizer| rqQueue
    processJob -->|timing update| jobsTable

    %% process_subjob flow
    rqQueue --> processSubjob
    processSubjob -->|download raw chunk| storageRawChunks
    processSubjob --> rawChunkLocal
    processSubjob -->|for each row invoke research| serperAPI
    processSubjob -->|for each row synthesize| groqResearch
    processSubjob -->|generate personalization| groqSIF
    processSubjob -->|write processed chunk| chunkCSVs
    chunkCSVs --> storageOutputs
    processSubjob -->|record file metadata| filesTable
    processSubjob -->|log progress| jobLogs
    processSubjob -->|update progress| jobsTable
    processSubjob -->|delete raw chunk| storageRawChunks

    %% finalize_job flow
    rqQueue --> finalizeJob
    finalizeJob --> chunkCSVs
    finalizeJob -->|download missing chunk| storageOutputs
    finalizeJob --> finalResult
    finalResult --> storageOutputs
    finalizeJob -->|mark succeeded + timings| jobsTable

    %% Stripe flows
    stripeCheckout -->|ensure customer id| profiles
    stripeCheckout --> stripeAPI
    stripeAPI --> stripeWebhookSource
    stripeWebhookSource --> stripeWebhook
    stripeWebhook -->|map metadata| profiles
    stripeWebhook -->|credit ledger entries| ledger
    stripeWebhook -->|sync subscription| stripeAPI
    stripeWebhook -->|update plan / credits| profiles
    stripeWebhook -->|log purchases| ledger
    stripeSync --> stripeAPI
    stripeSync -->|update subscription snapshot| profiles

    %% Research helper dependencies
    serperAPI --> groqResearch

    %% Styling helpers
    classDef hidden fill=none,stroke=none
```

The diagram captures how authenticated clients drive FastAPI endpoints, how those endpoints manage credits and jobs through Supabase, how background workers orchestrate chunked processing with Redis/RQ, and how external providers (Stripe, Serper, Groq) participate in the data flow.

## Security Assessment by Flow

### Authentication Guard
- **Entry point**: Every user-initiated endpoint invokes `get_current_user` before touching application state. The guard must validate the JWT signature, issuer, and expiration and enforce revocation lists where applicable. Failure points include unsigned/forged tokens, replay attacks, and privilege escalation if the guard does not reject downgraded scopes. Pairing the guard with per-request rate limits mitigates brute-force attempts.

### Parse Headers Flow (`POST /parse_headers`)
- **Data path**: Browser → FastAPI → Supabase storage (inputs bucket) and temporary local files → helper utilities → Browser response.
- **Risks**:
  - Unsanitized filenames or content in uploaded CSVs could trigger path traversal when persisted to `/tmp` or `/data`. Enforce strict filename normalization and store uploads with generated UUIDs.
  - Temporary files remain on disk until cleanup; sensitive data could leak if the container crashes. Enable automatic deletion on success/failure and run the worker with minimal filesystem permissions.
  - Signed URL generation for Supabase storage must expire quickly and be scoped to the exact object to avoid lateral movement. Monitor for abuse by correlating URL issuance with download logs.
  - Credits selection touches the `profiles` table; verify authorization checks ensure a user can only debit their own credits to prevent enumeration attacks.

### Job Creation Flow (`POST /jobs`)
- **Data path**: Browser → FastAPI → Supabase storage (inputs), Redis lock, `profiles`, `ledger`, and `jobs` tables.
- **Risks**:
  - The Redis `credits_lock:<user>` should be namespaced and configured with a TTL to avoid deadlocks that prevent legitimate credit usage.
  - Credit reservation and ledger writes must be transactional. If Supabase operations are not wrapped atomically, an attacker could force inconsistencies (e.g., double spending) by racing requests. Use database transactions or compensating rollback logic.
  - Uploaded input files should be scanned for malware before workers download them. Integrating an antivirus step (e.g., ClamAV) reduces propagation risks.
  - User-provided metadata in job creation should be validated to prevent SQL injection or logging-based attacks.

### Read-Only Job Queries (`GET /jobs`, `GET /jobs/{id}`, downloads)
- **Data path**: Browser → FastAPI → Supabase tables/storage → Browser.
- **Risks**:
  - Ensure row-level security on Supabase tables so users cannot access other users’ jobs via ID guessing.
  - Download endpoints should enforce ownership checks before streaming from `storageOutputs`. Consider streaming through the backend instead of returning signed URLs to limit exposure windows.
  - Progress logs might contain sensitive personalization data; apply output filtering or redaction before responding to avoid leaking data across tenants.

### Worker Processing (`worker_loop`, `process_job`)
- **Data path**: Workers poll Supabase, claim jobs, download inputs, and enqueue subjobs.
- **Risks**:
  - Workers require a service account with elevated Supabase privileges; scope credentials to the minimal set of tables/buckets. Rotate keys regularly.
  - When writing raw chunk CSVs to the local filesystem, restrict POSIX permissions (e.g., `chmod 600`) to prevent other processes from reading intermediate data.
  - Deducting credits and updating ledgers must be idempotent. Network retries could double-charge if not guarded by unique constraints.
  - Enqueueing RQ tasks should use signed payloads or at least validate task parameters to prevent malicious job injections if Redis is compromised.

### Subjob Processing (`process_subjob`)
- **Data path**: RQ → Worker → Supabase storage/files → External APIs (Serper, Groq) → Supabase tables and storage.
- **Risks**:
  - External API calls expose user-provided data. Review privacy agreements and encrypt PII when possible. Consider hashing sensitive identifiers before transmission.
  - Rate limiting and error handling should prevent partial failures from leaving orphaned chunks or unlogged credits. Implement retry policies with exponential backoff and circuit breakers to mitigate API abuse.
  - Each chunk write to `filesTable` and `jobLogs` should include per-user ownership metadata. Without it, an attacker who gains Supabase read access might correlate data across tenants.
  - After deleting raw chunks, verify the deletion succeeded to avoid residual sensitive data in `storageRawChunks`.

### Finalization (`finalize_job`)
- **Data path**: RQ → Worker → chunk outputs → Supabase storage (`outputs`) → jobs table.
- **Risks**:
  - When downloading missing chunks, validate checksums to detect tampering or corruption before merging into the final artifact.
  - The final result persisted in Supabase storage should be encrypted at rest (Supabase manages this) and optionally encrypted per tenant for defense in depth.
  - Marking jobs succeeded should only occur after verifying that all subjobs completed and no errors remain in the logs; otherwise, users could download incomplete data.

### Stripe and Billing Flows
- **Data path**: Browser → FastAPI → Stripe API/Webhooks → Supabase (`profiles`, `ledger`).
- **Risks**:
  - Webhook endpoint must verify Stripe signatures and reject replays using `idempotency` keys or event log deduplication.
  - Plan metadata from Stripe should be sanitized to avoid injecting unexpected state into Supabase records.
  - If webhook processing fails mid-flight, credits might be partially updated. Implement idempotent handlers and reconcile against Stripe’s canonical state on a schedule.
  - Stripe Checkout sessions must bind the current user ID in metadata; otherwise, a malicious user could pay for another user’s account to gain credit.

### Cross-Cutting Concerns
- **Secrets management**: API keys for Supabase, Stripe, Groq, Serper, and Redis should reside in a centralized secret manager with periodic rotation. Never log secrets during debug output from workers or FastAPI.
- **Observability**: Instrument logs with trace IDs spanning frontend requests, FastAPI handlers, and RQ jobs to audit data flow. Ensure logs redact PII before shipping to external systems.
- **Network controls**: Restrict outbound egress for worker containers to only the required external APIs to reduce exfiltration channels.
- **Incident response**: Implement anomaly detection on credit usage, job volume, and external API call rates to surface compromised accounts quickly.
