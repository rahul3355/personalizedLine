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
