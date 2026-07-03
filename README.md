# IG AI Command Center

Real-time / near real-time Instagram data ingestion **and AI-assisted analysis**
for three brands — **Ayres**, **Ava**, and **Saifenu** — built on Next.js, raw
SQL over MySQL, the Instagram Graph API, and an Ollama-powered AI agent.

The app connects each brand's Instagram Business account via OAuth, pulls
profile/media/comments/insights on demand, receives real-time webhook events,
stores everything in MySQL, and lets an admin chat with an AI agent that reads
that same database to answer questions in plain language.

> **Status:** ingestion + AI agent are live. Auto-posting and scheduled
> auto-sync are intentionally not built yet — see [Roadmap](#roadmap).

---

## Table of contents

- [What it does](#what-it-does)
- [Architecture at a glance](#architecture-at-a-glance)
- [Core flows](#core-flows)
  - [1. Admin authentication](#1-admin-authentication)
  - [2. Connect a brand (OAuth)](#2-connect-a-brand-oauth)
  - [3. DEV manual token import](#3-dev-manual-token-import)
  - [4. Sync (profile / media / insights / comments)](#4-sync-profile--media--insights--comments)
  - [5. Meta webhook ingestion](#5-meta-webhook-ingestion)
  - [6. AI Agent chat](#6-ai-agent-chat)
- [Database schema (ERD)](#database-schema-erd)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started (local / XAMPP)](#getting-started-local--xampp)
- [Environment variables](#environment-variables)
- [Meta / Instagram Developer setup](#meta--instagram-developer-setup)
- [Testing with Graph API Explorer](#testing-with-graph-api-explorer)
- [Webhook local testing](#webhook-local-testing)
- [AI Agent / Ollama setup](#ai-agent--ollama-setup)
- [Dashboard pages guide](#dashboard-pages-guide)
- [API reference](#api-reference)
- [Data layer conventions](#data-layer-conventions)
- [API response envelope](#api-response-envelope)
- [Security model](#security-model)
- [Deployment (Hostinger)](#deployment-hostinger)
- [Known gotchas / troubleshooting](#known-gotchas--troubleshooting)
- [Roadmap](#roadmap)

---

## What it does

1. **Admin login** — single-admin session auth (no NextAuth), httpOnly signed cookie.
2. **Connect Instagram** — real OAuth (Instagram-direct API, not the old Facebook
   Login flow) per brand, or a DEV-only manual token import for testing with
   Graph API Explorer tokens.
3. **Sync on demand** — profile, media (paginated, no item cap in practice),
   insights (metric snapshots per media), and comments (with nested replies)
   — each independently triggerable per account, or all at once.
4. **Receive webhooks** — Meta sends comment/mention events to a signed
   endpoint; events are stored immediately and processed (enriched via the
   Graph API) in a separate, manually-triggered step.
5. **Realtime dashboard** — polls every 5 seconds: connected accounts, latest
   media/comments/metrics, sync job history, webhook queue, audit log.
6. **AI Agent** — a ChatGPT-style page that snapshots the current database
   (accounts, recent media, comments, metrics, sync jobs, webhook events,
   audit log) into a system prompt and answers questions about it via an
   Ollama-compatible chat API (Ollama Cloud by default, local Ollama also
   supported). Conversations persist per admin session.
7. **Brand filtering** — Content and Comments pages filter by brand
   (Ayres / Ava / Saifenu / All) with live per-brand counts.

---

## Architecture at a glance

```mermaid
flowchart TB
    Browser["Browser<br/>Login / Dashboard / AI Agent"]

    subgraph NextApp["Next.js App Router (Node.js runtime)"]
        Pages["Pages<br/>src/app/dashboard/**"]
        API["API routes<br/>src/app/api/**"]
        ServerLib["Server modules<br/>src/server/instagram/*<br/>src/server/ai/*"]
        Repo["Repo layer<br/>src/server/repo/*<br/>raw SQL via mysql2"]
    end

    subgraph External["External services"]
        IGAPI["Instagram Graph API<br/>graph.instagram.com"]
        IGOAuth["Instagram OAuth<br/>instagram.com / api.instagram.com"]
        MetaSender["Meta webhook sender"]
        Ollama["Ollama Cloud / local<br/>/api/chat"]
    end

    MySQL[("MySQL<br/>12 tables")]

    Browser <--> Pages
    Browser <--> API
    Pages --> Repo
    API --> ServerLib
    API --> Repo
    ServerLib --> Repo
    ServerLib <--> IGAPI
    ServerLib <--> IGOAuth
    MetaSender --> API
    ServerLib <--> Ollama
    Repo <--> MySQL
```

Three layers, always in this order — pages/routes never write raw SQL directly:

- **`src/app/**`** — pages (Server Components) and API route handlers. Thin;
  parse input with Zod, call server/repo functions, wrap output in the
  [response envelope](#api-response-envelope).
- **`src/server/**`** — business logic: Graph API client, OAuth exchange,
  sync orchestration, webhook parsing, the AI agent's prompt + database
  snapshot builder.
- **`src/server/repo/**`** — one file per table. Every SQL string lives here.
  Uses `?` placeholders exclusively (see [Data layer conventions](#data-layer-conventions)).

---

## Core flows

### 1. Admin authentication

Simple, single-admin, no third-party auth library.

```mermaid
sequenceDiagram
    participant B as Browser
    participant L as /dashboard/layout.tsx
    participant A as POST /api/auth/login
    participant DB as MySQL (adminsession)

    B->>A: { email, password }
    A->>A: timingSafeEqual(email/password vs ADMIN_EMAIL/ADMIN_PASSWORD)
    alt valid
        A->>A: random 32-byte token → HMAC-SHA256 sign with SESSION_SECRET
        A->>DB: INSERT adminsession(sessionToken, email, expiresAt = now+12h)
        A-->>B: Set-Cookie igacc_session, httpOnly + sameSite=lax
        A-->>B: 200 OK
        B->>L: navigate to /dashboard/*
        L->>DB: SELECT adminsession WHERE sessionToken = HMAC(cookie)
        DB-->>L: row found, not expired
        L-->>B: render page
    else invalid
        A-->>B: 401 Unauthorized
    end
```

- Cookie stores the **raw random token**; only its HMAC (signed with
  `SESSION_SECRET`) is stored in `adminsession.sessionToken`, so a leaked DB
  row alone can't be replayed as a cookie.
- Every dashboard page and every non-webhook API route calls
  `requireAdmin()` / checks `getAdminFromRequest()` — see
  [`src/lib/auth.ts`](src/lib/auth.ts).
- Session TTL: 12 hours (`SESSION_TTL_MS` in `auth.ts`).

### 2. Connect a brand (OAuth)

Uses the **Instagram API with Instagram Login** ("IG-direct") flow — the
Instagram App ID/Secret from Meta's "Kelola pesan & konten di Instagram" use
case, **not** the classic Facebook Login / Pages flow. There is no "Page"
concept in this flow; the Instagram user token *is* the credential.

```mermaid
sequenceDiagram
    participant U as Admin (Browser)
    participant App as This app
    participant DB as MySQL
    participant IG as instagram.com / api.instagram.com / graph.instagram.com

    U->>App: GET /api/instagram/oauth/start?brand=Ayres
    App->>DB: INSERT oauthstate(state, brandName, expiresAt = now+10min)
    App-->>U: 302 → instagram.com/oauth/authorize?client_id&redirect_uri&scope&state

    U->>IG: Log in + approve permissions
    IG-->>U: 302 → META_REDIRECT_URI?code=...&state=...

    U->>App: GET /api/instagram/oauth/callback?code&state
    App->>DB: SELECT oauthstate WHERE state=? (must be unused & not expired)
    App->>DB: UPDATE oauthstate SET usedAt = NOW()
    App->>IG: POST api.instagram.com/oauth/access_token (code) → short-lived token
    App->>IG: GET graph.instagram.com/access_token (ig_exchange_token) → long-lived token (~60d)
    App->>IG: GET graph.instagram.com/me → profile (id, username, ...)
    App->>App: encryptSecret(token) — AES-256-GCM
    App->>DB: UPSERT socialaccount (igUserId unique key, brandName, encrypted tokens, tokenStatus=ACTIVE)
    App->>DB: INSERT auditlog(oauth.callback, OK/WARN/ERROR)
    App-->>U: 302 → /dashboard/accounts?connected=success&brand=Ayres&count=1
```

Failure paths (missing code/state, expired/used state, token exchange
failure, empty profile) all redirect to
`/dashboard/accounts?connected=error&reason=...` and log an `auditlog` entry
— see [`src/server/instagram/oauth.ts`](src/server/instagram/oauth.ts) and
[`src/app/api/instagram/oauth/callback/route.ts`](src/app/api/instagram/oauth/callback/route.ts).

### 3. DEV manual token import

For testing with a token copy-pasted from Graph API Explorer or the Meta
"Kelola pesan & konten di Instagram" API setup screen — skips the OAuth
dance entirely. **Must be disabled in production.**

```mermaid
sequenceDiagram
    participant U as Admin (Browser)
    participant App as POST /api/instagram/dev/import-token
    participant IG as graph.instagram.com
    participant DB as MySQL

    U->>App: { brandName, igUserId, igUsername?, igAccessToken }
    App->>App: guard: DEV_ALLOW_MANUAL_TOKEN_IMPORT must be "true"
    App->>IG: GET /{igUserId}?fields=... (probe the token)
    IG-->>App: profile, or error
    App->>App: encryptSecret(igAccessToken)
    App->>DB: UPSERT socialaccount (tokenStatus = ACTIVE if probe ok, else UNVERIFIED)
    App->>DB: INSERT auditlog(dev.import-token)
    App-->>U: { account: {...} } — token itself is never echoed back
```

See [`src/app/api/instagram/dev/import-token/route.ts`](src/app/api/instagram/dev/import-token/route.ts)
and the sibling `dev/test-token` route (probes a token without persisting
anything).

### 4. Sync (profile / media / insights / comments)

Triggered from the Accounts page (per-step buttons or "Sync All"), or via
`POST /api/instagram/accounts/[id]/sync-all`. All four steps are
independent and individually resilient — one failing media item doesn't
abort the whole run.

```mermaid
sequenceDiagram
    participant U as Admin
    participant App as sync-all route → src/server/instagram/sync.ts
    participant DB as MySQL
    participant IG as graph.instagram.com

    U->>App: POST /api/instagram/accounts/:id/sync-all
    App->>DB: INSERT syncjob(status=RUNNING)
    App->>DB: SELECT socialaccount, decryptSecret(encryptedPageAccessToken)

    rect rgb(235,240,255)
    Note over App,IG: Step 1 — Profile
    App->>IG: GET /{igUserId}?fields=username,followers_count,...
    App->>DB: UPDATE socialaccount SET followersCount, mediaCount, lastProfileSyncAt=NOW()
    end

    rect rgb(235,255,240)
    Note over App,IG: Step 2 — Media (paginated)
    loop while paging.next present (cap 5,000 items)
        App->>IG: GET /{igUserId}/media?fields=...&limit=100
        App->>DB: UPSERT instagrammedia per item (ON DUPLICATE KEY igMediaId)
    end
    App->>DB: UPDATE lastMediaSyncAt=NOW()
    end

    rect rgb(255,250,235)
    Note over App,IG: Step 3 — Insights (up to 1,000 most recent media)
    loop each media
        App->>IG: GET /{mediaId}/insights?metric=reach,impressions,saved,...
        alt bulk request fails
            App->>IG: retry metric-by-metric, collect partial results
        end
        App->>App: parseInsightResponse + computeEngagementRate
        App->>DB: INSERT mediametricsnapshot
    end
    App->>DB: UPDATE lastInsightSyncAt=NOW()
    end

    rect rgb(255,240,245)
    Note over App,IG: Step 4 — Comments (up to 1,000 most recent media)
    loop each media
        App->>IG: GET /{mediaId}/comments?fields=...,replies{...} (paginated)
        App->>DB: UPSERT instagramcomment (recursively for nested replies)
    end
    App->>DB: UPDATE lastCommentSyncAt=NOW()
    end

    App->>DB: UPDATE syncjob SET status=DONE|ERROR, payload=steps, finishedAt=NOW()
    App-->>U: { ok, steps: { profile, media, insights, comments } }
```

Engagement rate: `totalInteractions / reach * 100` when both are available,
otherwise `(likes + comments + shares + saves) / impressions * 100` — see
`computeEngagementRate` in [`src/server/instagram/sync.ts`](src/server/instagram/sync.ts).

Every step writes an `auditlog` row (`sync.profile`, `sync.media`,
`sync.insights`, `sync.comments`) with status `OK` / `WARN` (partial
failures) / `ERROR`.

### 5. Meta webhook ingestion

Two-phase by design: the public endpoint only **verifies + stores** (fast,
Meta gets `200 OK` quickly); a **separate, admin-triggered** step does the
actual Graph API enrichment. Nothing heavy — no AI, no long Graph API
chains — happens inside the webhook POST handler itself.

```mermaid
sequenceDiagram
    participant Meta as Meta
    participant App as /api/meta/webhook
    participant DB as MySQL
    participant Admin as Admin (Browser)
    participant IG as graph.instagram.com

    Note over Meta,App: One-time setup
    Meta->>App: GET ?hub.mode=subscribe&hub.verify_token&hub.challenge
    App-->>Meta: 200 text/plain, echoes hub.challenge (if token matches)

    Note over Meta,App: Every event, forever
    Meta->>App: POST body + header X-Hub-Signature-256: sha256=...
    App->>App: verifyMetaSignature(rawBody, header, META_APP_SECRET) via crypto.timingSafeEqual
    alt signature invalid
        App-->>Meta: 401
    else valid
        App->>DB: INSERT igwebhookevent(rawPayload, rawBody, status=PENDING)
        App-->>Meta: 200 OK  (fast — no processing here)
    end

    Note over Admin,App: Later — manual (button) or your own cron hitting this route
    Admin->>App: POST /api/webhook/process-pending
    App->>DB: SELECT igwebhookevent WHERE status=PENDING LIMIT 20
    loop each event
        App->>App: extractPossibleIdsFromWebhook(payload) - defensive, Meta payload shapes vary
        App->>DB: find socialaccount by extracted igUserId (fallback: first ACTIVE account)
        App->>IG: GET media / comment detail with that account's decrypted token
        App->>DB: UPSERT instagrammedia / instagramcomment
        App->>DB: UPDATE igwebhookevent SET status=DONE|ERROR
        App->>DB: INSERT auditlog(webhook.processed)
    end
    App-->>Admin: { scanned, done, errored, details[] }
```

See [`src/lib/meta-signature.ts`](src/lib/meta-signature.ts),
[`src/app/api/meta/webhook/route.ts`](src/app/api/meta/webhook/route.ts), and
[`src/server/instagram/webhook.ts`](src/server/instagram/webhook.ts).

### 6. AI Agent chat

The agent doesn't have tool-calling / function-calling into the database —
instead, **every turn** it builds a fresh JSON snapshot of the most relevant
tables and stuffs it into the system prompt, then asks the model to answer
using only that snapshot. Simple, predictable, and easy to audit (the whole
prompt is just JSON + instructions, no hidden state).

```mermaid
sequenceDiagram
    participant U as Admin (Browser)
    participant App as POST /api/ai-agent/chat
    participant DB as MySQL
    participant Ollama as Ollama Cloud (or local)

    U->>App: { conversationId?, message }
    alt no conversationId
        App->>DB: INSERT aiagentconversation(title = first ~64 chars of message)
    else has conversationId
        App->>DB: SELECT aiagentconversation WHERE id=? AND deletedAt IS NULL
    end
    App->>DB: SELECT last 20 aiagentmessage for this conversation (history)
    App->>DB: INSERT aiagentmessage(role=user, content=message)

    App->>DB: gather snapshot - accounts, 30 recent media, 30 recent comments, 20 metric snapshots, 15 sync jobs, 15 webhook events, 20 audit log rows, plus total counts
    App->>App: build system prompt = house rules + compact JSON snapshot - never mention tokens or secrets, no hallucinated numbers
    App->>Ollama: POST /api/chat { model, messages: [system, ...history], stream:false }
    Ollama-->>App: { message: { content }, model }
    App->>DB: INSERT aiagentmessage(role=assistant, content, model, metadata)
    App-->>U: { conversation, messages:[user,assistant], model, requestModel, contextGeneratedAt }
```

Notes:
- Conversations are **soft-deleted** (`deletedAt`), never hard-deleted.
- `OLLAMA_MODEL` ending in `-cloud` (e.g. `gpt-oss:120b-cloud`) is
  automatically stripped of the suffix when the host resolves to
  `ollama.com` (Ollama Cloud's `/api/chat` expects the bare model name) —
  see `modelForHost()` in [`src/server/ai/instagram-agent.ts`](src/server/ai/instagram-agent.ts).
- The system prompt explicitly instructs the model to answer in Indonesian,
  never invent numbers not present in the snapshot, and never guess at
  tokens/secrets/env vars.
- UI: [`src/components/ai-agent/AiAgentChat.tsx`](src/components/ai-agent/AiAgentChat.tsx)
  — conversation sidebar, markdown-ish rendering (tables, lists, links),
  starter prompts, streaming-style "thinking" indicator (response itself is
  non-streaming).

---

## Database schema (ERD)

12 tables, plain `mysql2` + hand-written SQL (no ORM). **Table names are
stored lowercase** — see [Known gotchas](#known-gotchas--troubleshooting).

```mermaid
erDiagram
    SOCIALACCOUNT ||--o{ INSTAGRAMMEDIA : "has"
    SOCIALACCOUNT ||--o{ INSTAGRAMCOMMENT : "has (nullable FK)"
    INSTAGRAMMEDIA ||--o{ MEDIAMETRICSNAPSHOT : "has"
    INSTAGRAMMEDIA ||--o{ INSTAGRAMCOMMENT : "has (nullable FK)"
    AIAGENTCONVERSATION ||--o{ AIAGENTMESSAGE : "has"

    SOCIALACCOUNT {
        int id PK
        varchar brandName "Ayres / Ava / Saifenu"
        varchar platform "default INSTAGRAM"
        varchar igUserId UK
        varchar username
        text encryptedPageAccessToken "AES-256-GCM, at rest"
        text encryptedUserAccessToken
        varchar tokenStatus "ACTIVE/UNVERIFIED/EXPIRED"
        datetime tokenExpiresAt
        int followersCount
        datetime lastProfileSyncAt
        datetime lastMediaSyncAt
        datetime lastInsightSyncAt
        datetime lastCommentSyncAt
    }
    INSTAGRAMMEDIA {
        int id PK
        int socialAccountId FK
        varchar igMediaId UK
        varchar mediaType "IMAGE/VIDEO/CAROUSEL_ALBUM"
        varchar mediaProductType "FEED/REELS/STORY"
        text caption
        text permalink
        datetime timestamp
        int likeCount
        int commentsCount
        json rawJson
    }
    MEDIAMETRICSNAPSHOT {
        int id PK
        int instagramMediaId FK
        int views
        int plays
        int reach
        int impressions
        int likes
        int comments
        int shares
        int saves
        int totalInteractions
        double engagementRate
        datetime collectedAt
    }
    INSTAGRAMCOMMENT {
        int id PK
        int socialAccountId FK
        int instagramMediaId FK
        varchar igCommentId UK
        varchar parentCommentId "nested reply support"
        varchar username
        text text
        varchar sentiment "UNKNOWN by default"
        varchar intent "UNKNOWN by default"
        boolean needsHumanReview
        datetime aiAnalyzedAt "reserved for future AI use"
    }
    IGWEBHOOKEVENT {
        int id PK
        varchar eventId
        varchar objectType
        varchar fieldName
        json rawPayload
        longtext rawBody
        varchar processingStatus "PENDING/PROCESSING/DONE/ERROR"
        datetime receivedAt
        datetime processedAt
    }
    SYNCJOB {
        int id PK
        varchar jobType "sync.all"
        int socialAccountId FK
        varchar status "PENDING/RUNNING/DONE/ERROR"
        json payload "per-step outcomes"
        datetime startedAt
        datetime finishedAt
    }
    AUDITLOG {
        int id PK
        varchar actor "sync/webhook/oauth/dev.import-token"
        varchar action
        varchar entityType
        varchar entityId
        varchar status "OK/WARN/ERROR"
        text message
        json metadataJson
    }
    ADMINSESSION {
        int id PK
        varchar sessionToken UK "HMAC of cookie value"
        varchar email
        datetime expiresAt
    }
    OAUTHSTATE {
        int id PK
        varchar state UK
        varchar brandName
        datetime expiresAt "10 min TTL"
        datetime usedAt "single-use"
    }
    AIAGENTCONVERSATION {
        int id PK
        varchar title "from first user message"
        varchar createdByEmail
        datetime updatedAt
        datetime deletedAt "soft delete"
    }
    AIAGENTMESSAGE {
        int id PK
        int conversationId FK
        varchar role "user/assistant"
        longtext content
        varchar model
        json metadataJson
    }
```

Full DDL: [`db/init.sql`](db/init.sql) (idempotent — every table uses
`CREATE TABLE IF NOT EXISTS`).

---

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript** + **React 19**
- **mysql2** — raw parameterised SQL via a connection pool; no ORM, no Prisma
- **MySQL / MariaDB** — XAMPP locally, any MySQL host in production
- **Tailwind CSS 4** — dark olive/gold design system (see `src/app/globals.css`)
- **Zod** — request body validation on every API route
- **node:crypto** — AES-256-GCM token encryption, HMAC-SHA256 for both
  session signing and webhook signature verification
- **Native fetch** — all Instagram Graph API + Ollama HTTP calls
- **Ollama-compatible chat API** — Ollama Cloud (`ollama.com`) by default,
  local Ollama also supported via `OLLAMA_BASE_URL`

---

## Project structure

```
db/
  init.sql                       # full DDL — all 12 tables, idempotent
scripts/
  init-db.mjs                    # creates the DB (if missing) + applies db/init.sql
server.js                        # Passenger-compatible startup file (Hostinger Node.js apps)
DEPLOY.md                        # step-by-step Hostinger Cloud deploy guide

src/
  app/
    login/                       # admin login (dark olive/gold theme)
    dashboard/
      layout.tsx                 # auth guard + Sidebar/Header shell
      page.tsx                   # overview: stat cards, connected brands, recent activity
      accounts/
        page.tsx                 # connect buttons, DEV import form, account cards
        [id]/page.tsx            # single account: profile hero, media grid, comments, metrics
      ai-agent/page.tsx           # AI Agent chat (see AiAgentChat.tsx)
      realtime/page.tsx           # 5s-polling live monitor
      content/page.tsx            # all media, brand filter
      comments/page.tsx           # all comments, brand filter, sentiment badges
      settings/page.tsx           # env readiness checklist (secrets masked)
    api/
      auth/{login,logout,me}/route.ts
      instagram/
        oauth/{start,callback}/route.ts
        accounts/route.ts                    # GET list
        accounts/[id]/route.ts               # GET detail
        accounts/[id]/sync-{profile,media,insights,comments,all}/route.ts
        dev/{import-token,test-token}/route.ts   # DEV-only, gated by env
      meta/webhook/route.ts                  # GET verify + POST receive
      webhook/process-pending/route.ts       # drains PENDING → Graph API enrich
      dashboard/realtime/route.ts            # JSON feed for /dashboard/realtime
      content/route.ts, comments/route.ts    # JSON feeds (brand filter support)
      ai-agent/
        chat/route.ts                        # POST — the whole AI Agent turn
        conversations/route.ts               # GET list / POST new
        conversations/[id]/route.ts          # GET messages / DELETE (soft)
  components/
    layout/          # Sidebar, Header
    accounts/        # BrandConnectButtons, DevImportTokenForm, AccountActions, ConnectStatus
    realtime/        # RealtimeDashboard (client component, polling)
    ai-agent/        # AiAgentChat (client component)
    ui/              # EmptyState, BrandFilter (shared across pages)
  lib/
    db.ts            # mysql2 pool + query/queryOne/execute/transaction helpers
    env.ts            # Zod-validated env, fails fast with a readable error
    auth.ts            # admin session (create/verify/destroy)
    encryption.ts       # AES-256-GCM encryptSecret/decryptSecret
    meta-signature.ts    # HMAC webhook signature verification
    api-response.ts       # ok()/fail()/unauthorized()/... envelope helpers
    utils.ts               # formatDateTime, relativeTime, VALID_BRANDS, etc.
  server/
    instagram/
      client.ts        # Graph API HTTP client (profile/media/comments/insights + pagination)
      oauth.ts          # OAuth state, token exchange, account upsert
      sync.ts            # syncProfile/Media/Insights/Comments/All orchestration
      webhook.ts          # defensive payload parsing + pending-event processor
      types.ts             # Graph API response shapes
    ai/
      instagram-agent.ts   # AI Agent: DB snapshot builder + Ollama chat call
      ollama.ts             # earlier placeholder helpers (comment/media analysis stubs)
    repo/
      admin-session.ts, oauth-state.ts, social-account.ts,
      instagram-media.ts, instagram-comment.ts, media-metric.ts,
      webhook-event.ts, sync-job.ts, audit-log.ts, ai-agent-chat.ts
      # one file per table; every SQL string lives here
```

---

## Getting started (local / XAMPP)

1. Start **XAMPP → MySQL** (Apache not required — Next.js serves the app).
2. Copy the env template:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` — at minimum:
   - `DATABASE_URL="mysql://root:@localhost:3306/ig_ai_command_center"`
     (add a password after `root:` if your XAMPP MySQL has one)
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET`
   - `TOKEN_ENCRYPTION_KEY` — **base64, must decode to exactly 32 bytes**:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
     ```
   - `META_APP_ID`, `META_APP_SECRET` (see [Meta setup](#meta--instagram-developer-setup))
4. Install deps and create the schema:
   ```bash
   npm install
   npm run db:init
   ```
   `db:init` runs [`scripts/init-db.mjs`](scripts/init-db.mjs), which
   **creates the database if it doesn't exist**, then applies
   [`db/init.sql`](db/init.sql). Safe to re-run any time.

   Alternative: open phpMyAdmin → your database → **Import** → pick
   `db/init.sql`.
5. Start the dev server:
   ```bash
   npm run dev
   ```
6. Open <http://localhost:3000> → redirected to `/login`.

---

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | `mysql://user:pass@host:3306/dbname` |
| `NEXT_PUBLIC_APP_URL` | ✅ | Base URL of this app (used in OAuth redirects) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | ✅ | Single admin login, compared with `timingSafeEqual` |
| `SESSION_SECRET` | ✅ | ≥16 chars; HMAC-signs the session cookie |
| `TOKEN_ENCRYPTION_KEY` | ✅ | base64, **must decode to exactly 32 bytes** (AES-256-GCM key) |
| `META_APP_ID` / `META_APP_SECRET` | ✅ for OAuth | From Meta's Instagram API app (IG-direct), not the outer Meta app |
| `META_GRAPH_VERSION` | — | Cosmetic only; IG-direct URLs are unversioned (`graph.instagram.com`) |
| `META_REDIRECT_URI` | ✅ for OAuth | Must exactly match what's registered in Meta (HTTPS in production) |
| `META_OAUTH_SCOPES` | — | Default: `instagram_business_basic,instagram_manage_comments,instagram_business_manage_messages` |
| `META_WEBHOOK_VERIFY_TOKEN` | ✅ for webhooks | Must match what you enter in the Meta webhook subscription |
| `OLLAMA_HOST` | — | Default `https://ollama.com` (Ollama Cloud) |
| `OLLAMA_BASE_URL` | — | Fallback if `OLLAMA_HOST` unset; use for local Ollama (`http://localhost:11434`) |
| `OLLAMA_KEY` (or `OLLAMA_API_KEY`) | ✅ if using Ollama Cloud | Bearer token for `ollama.com` |
| `OLLAMA_MODEL` | — | Default `gpt-oss:120b-cloud`; `-cloud` suffix auto-stripped for Ollama Cloud requests |
| `DEV_ALLOW_MANUAL_TOKEN_IMPORT` | — | `"true"` locally to enable DEV token import; **must be `"false"` in production** |

Full template with inline comments: [`.env.example`](.env.example).

---

## Meta / Instagram Developer setup

This app uses **"Instagram API with Instagram Login"** (the use case
labelled **"Kelola pesan & konten di Instagram"** in Meta's dashboard) — a
direct Instagram OAuth flow, distinct from the classic Facebook Login /
Pages flow. There is no Facebook Page involved.

1. <https://developers.facebook.com/> → **My Apps** → **Create App**.
2. Use case: **Kelola pesan & konten di Instagram**.
3. Open **Kasus penggunaan → Sesuaikan → Penyiapan API dengan login
   Instagram**. Copy the **Instagram App ID** and **Instagram App Secret**
   shown there into `.env` as `META_APP_ID` / `META_APP_SECRET` (these are
   *not* the same as the outer Meta App ID/Secret on the app's Basic
   Settings page).
4. In the same screen, click **"Add all required permissions"** — this adds:
   - `instagram_business_basic`
   - `instagram_manage_comments`
   - `instagram_business_manage_messages`
5. Add each Instagram account as an **Instagram Tester**:
   **Peran aplikasi → Peran → Penguji Instagram → Tambahkan Penguji
   Instagram**, enter the IG username. Then, **from that Instagram
   account**, accept the invite: Instagram → Settings → *Apps and websites*
   → *Tester invites* → Accept.
6. Register the **redirect URI** (must exactly match `META_REDIRECT_URI`):
   ```
   http://localhost:3000/api/instagram/oauth/callback     (dev)
   https://yourdomain.com/api/instagram/oauth/callback    (production, HTTPS required)
   ```
7. Test the flow:
   ```
   http://localhost:3000/api/instagram/oauth/start?brand=Ayres
   ```
   (`brand` must be one of `Ayres`, `Ava`, `Saifenu`). Successful connect
   redirects to `/dashboard/accounts?connected=success`.
8. Run **Sync All** on the connected account.

> **Note on insights permission:** the scopes above do not include a
> dedicated insights permission. `syncInsights` is defensive — it tries a
> bulk metrics request, falls back to per-metric requests, and logs
> failures to `auditlog` without aborting the whole sync. If your Meta app
> surfaces an `instagram_business_manage_insights`-style permission, add it
> to `META_OAUTH_SCOPES` for fuller insights coverage.

---

## Testing with Graph API Explorer

Useful for testing before OAuth is fully wired up, or for quickly checking
what a token can see.

1. <https://developers.facebook.com/tools/explorer/> → pick your app.
2. Switch the host selector to **`.instagram.com`** (not `.facebook.com` —
   this app's use case does not support classic Facebook Login scopes and
   will return `Invalid Scopes` if you try).
3. Set **"Pengguna atau Halaman"** to **"Dapatkan Token Akses Pengguna"**,
   add the 3 permissions listed above, click **Generate Instagram Access
   Token**, log in with the Instagram account, approve.
4. Quick checks:
   ```
   me?fields=id,username,name,followers_count,follows_count,media_count
   ```
   Copy the `id` → this is your **IG_USER_ID**.
5. Import into the app: **Dashboard → Accounts → DEV: Manual token
   import** (only visible when `DEV_ALLOW_MANUAL_TOKEN_IMPORT="true"`), or:
   ```bash
   curl -X POST http://localhost:3000/api/instagram/dev/import-token \
     -H "Content-Type: application/json" \
     -b "igacc_session=YOUR_SESSION_COOKIE" \
     -d '{
       "brandName": "Ayres",
       "igUserId": "IG_USER_ID",
       "igUsername": "ayresapparel",
       "igAccessToken": "IGAA..."
     }'
   ```
6. Test a token without persisting it:
   ```bash
   curl -X POST http://localhost:3000/api/instagram/dev/test-token \
     -H "Content-Type: application/json" \
     -b "igacc_session=YOUR_SESSION_COOKIE" \
     -d '{ "accessToken": "IGAA...", "igUserId": "IG_USER_ID" }'
   ```

> **Never commit tokens. Never share tokens in chat.** DEV endpoints are
> gated by `DEV_ALLOW_MANUAL_TOKEN_IMPORT` and must be `"false"` in
> production.

---

## Webhook local testing

Meta requires a public **HTTPS** URL. Locally, tunnel with ngrok:

```bash
ngrok http 3000
```

In the Meta app dashboard's Webhooks section:

- **Callback URL:** `https://<your-id>.ngrok-free.app/api/meta/webhook`
- **Verify token:** must equal `META_WEBHOOK_VERIFY_TOKEN` in `.env`
- Subscribe to the fields you care about (e.g. `comments`, `live_comments`, `mentions`)

Then:

1. Meta calls `GET /api/meta/webhook` once to verify — the app echoes back
   `hub.challenge` if the verify token matches.
2. Every subsequent event arrives as `POST /api/meta/webhook`, gets
   signature-checked, and stored with `processingStatus = PENDING`.
3. Open **/dashboard/realtime** → click **Process Webhook Events** to drain
   the queue (fetches the referenced media/comment via the Graph API and
   upserts it).

---

## AI Agent / Ollama setup

Two supported backends — pick one via env:

**Ollama Cloud (default):**
```ini
OLLAMA_HOST="https://ollama.com"
OLLAMA_KEY="your_ollama_api_key"
OLLAMA_MODEL="gpt-oss:120b-cloud"
```

**Local Ollama:**
```ini
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.1"
```
(Leave `OLLAMA_HOST` unset or empty so the app falls back to `OLLAMA_BASE_URL`.)

Once configured, open **/dashboard/ai-agent** and ask things like:

- "Ringkas kondisi akun Instagram yang terhubung."
- "Post mana yang paling viral dan paling sepi?"
- "Apakah ada masalah sync atau webhook terbaru?"

The agent only knows what's in the live database snapshot built at request
time (see [flow #6](#6-ai-agent-chat)) — it does not have general internet
access or long-term memory beyond the current conversation's stored
messages.

---

## Dashboard pages guide

| Page | Purpose |
|---|---|
| `/dashboard` | Stat cards (accounts/media/comments/pending webhooks), connected-brands summary, recent media, recent webhook events, latest metric snapshots |
| `/dashboard/accounts` | Connect buttons (OAuth) per brand, DEV manual import (if enabled), account cards with per-step sync buttons |
| `/dashboard/accounts/[id]` | Single account: profile hero (followers/following/media/account type), recent media grid, recent comments, recent metric snapshots |
| `/dashboard/ai-agent` | AI Agent chat — conversation history sidebar, starter prompts, markdown-ish rendering (tables/lists/links) |
| `/dashboard/realtime` | Auto-refreshes every 5s: connected accounts + sync status table, webhook events, sync jobs, latest comments/media, metric snapshots table, audit log. "Process Webhook Events" button lives here |
| `/dashboard/content` | All media across brands, filterable by brand (All/Ayres/Ava/Saifenu with live counts) |
| `/dashboard/comments` | All comments across brands, same brand filter, sentiment badges |
| `/dashboard/settings` | Env readiness checklist grouped by category (Database, Auth, Meta, AI/Ollama, Dev) — every secret is masked |

---

## API reference

All routes except `/api/meta/webhook` require an admin session cookie and
return the [standard envelope](#api-response-envelope).

**Auth**
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Log in, sets session cookie |
| POST | `/api/auth/logout` | Destroy session |
| GET | `/api/auth/me` | Current admin (email, expiry) |

**Instagram — OAuth & accounts**
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/instagram/oauth/start?brand=Ayres\|Ava\|Saifenu` | Begin OAuth, redirects to Instagram |
| GET | `/api/instagram/oauth/callback` | OAuth redirect target, exchanges code → stores account |
| GET | `/api/instagram/accounts` | List connected accounts |
| GET | `/api/instagram/accounts/[id]` | Account detail + recent media/comments/metrics |
| POST | `/api/instagram/accounts/[id]/sync-profile` | Sync profile fields only |
| POST | `/api/instagram/accounts/[id]/sync-media` | Sync media only (paginated) |
| POST | `/api/instagram/accounts/[id]/sync-insights` | Sync metric snapshots only |
| POST | `/api/instagram/accounts/[id]/sync-comments` | Sync comments only (with replies) |
| POST | `/api/instagram/accounts/[id]/sync-all` | Run all four in sequence, tracked as a `syncjob` |
| POST | `/api/instagram/dev/import-token` | **DEV only** — store a hand-provided token |
| POST | `/api/instagram/dev/test-token` | **DEV only** — probe a token without storing it |

**Webhooks**
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/meta/webhook` | Meta's subscription verification (no auth) |
| POST | `/api/meta/webhook` | Receive + store events (HMAC-verified, no auth cookie — Meta can't send one) |
| POST | `/api/webhook/process-pending` | Drain up to 20 `PENDING` events, enrich via Graph API |

**Dashboard data feeds**
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/dashboard/realtime` | Everything the realtime page polls, in one call |
| GET | `/api/content?brand=&limit=` | Media list, optional brand filter |
| GET | `/api/comments?brand=&limit=` | Comment list, optional brand filter |

**AI Agent**
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/ai-agent/conversations` | List conversations (most recent first) |
| POST | `/api/ai-agent/conversations` | Create an empty conversation |
| GET | `/api/ai-agent/conversations/[id]` | Conversation + full message history |
| DELETE | `/api/ai-agent/conversations/[id]` | Soft-delete a conversation |
| POST | `/api/ai-agent/chat` | Send a message, get an AI reply (creates conversation if needed) |

---

## Data layer conventions

Every DB call goes through [`src/lib/db.ts`](src/lib/db.ts):

- `query<T>(sql, params)` — returns all rows
- `queryOne<T>(sql, params)` — first row or `null`
- `execute(sql, params)` — INSERT/UPDATE/DELETE, returns `{ affectedRows, insertId }`
- `transaction(fn)` — borrows a pooled connection, begins/commits/rolls back

Rules followed throughout `src/server/repo/**`:

- **Always** `?` placeholders — never string-concatenate user input into SQL.
- One file per table in `src/server/repo/`; the SQL string never leaves that file.
- JSON columns: write with `toJsonParam(v)`, read with `parseJsonColumn(v)`
  (handles both already-parsed objects and stringified JSON from some
  MariaDB versions).
- Dates: `toDate(v)` normalises MySQL's `DATETIME` output (Date object or
  string) into a JS `Date`; the pool is configured `timezone: "local"` so
  `NOW()`-based timestamps line up with `Date.now()` on the same machine.
- Booleans: `toBool(v)` normalises `TINYINT(1)`.

---

## API response envelope

Success:
```json
{ "success": true, "data": { }, "error": null }
```

Failure:
```json
{
  "success": false,
  "data": null,
  "error": { "code": "ERROR_CODE", "message": "Human readable message", "details": {} }
}
```

Built with helpers in [`src/lib/api-response.ts`](src/lib/api-response.ts)
(`ok`, `badRequest`, `unauthorized`, `forbidden`, `notFound`, `serverError`).
`/api/meta/webhook` is the one exception — it returns plain text + bare HTTP
status codes, because that's what Meta's webhook contract requires.

---

## Security model

- **Tokens encrypted at rest** — AES-256-GCM, key from `TOKEN_ENCRYPTION_KEY`.
  The key is validated on first use (must be base64 decoding to exactly 32
  bytes) and the app throws a clear error otherwise — see
  [`src/lib/encryption.ts`](src/lib/encryption.ts).
- **Tokens never reach the browser** and are **never logged** — API routes
  strip encrypted fields before returning account objects.
- **OAuth state** is single-use (`usedAt`) and time-limited (10 minutes),
  stored server-side in `oauthstate`.
- **Webhook signatures** verified with `crypto.timingSafeEqual` against
  `META_APP_SECRET` (constant-time comparison — no timing side-channel).
- **Admin credentials** compared with `timingSafeEqual`, not `===`.
- **Session cookie** is httpOnly, `sameSite=lax`, and `secure` in production;
  the cookie value itself is never stored server-side — only its HMAC.
- **DEV token import** is fully gated behind `DEV_ALLOW_MANUAL_TOKEN_IMPORT`
  and must be `"false"` in production.
- **Settings page** masks every secret value (shows only a few trailing
  characters).

---

## Deployment (Hostinger)

Full step-by-step guide: [`DEPLOY.md`](DEPLOY.md). Summary:

1. **Database** — create a MySQL database in hPanel, import `db/init.sql`
   via phpMyAdmin (or run `npm run db:init` pointed at the production
   `DATABASE_URL`).
2. **Code** — deploy from GitHub (hPanel → Advanced → GIT) or clone via SSH.
3. **Node.js app** (hPanel → Advanced → Node.js) — set the **Application
   startup file to `server.js`** (this repo's Passenger-compatible custom
   server — Hostinger doesn't run `next start` directly), then
   `npm install && npm run build`.
4. **Environment variables** — set every var from
   [Environment variables](#environment-variables) in the hPanel Node.js
   app screen. **Reuse the same `TOKEN_ENCRYPTION_KEY`** if you're importing
   a database dump that already has encrypted tokens in it — a different
   key makes existing tokens permanently undecryptable, and those accounts
   would need to be reconnected via OAuth.
5. **Meta dashboard** — register the production redirect URI
   (`https://yourdomain.com/api/instagram/oauth/callback`, HTTPS required).
6. Restart/redeploy, then log in and reconnect/sync accounts as needed.

Hostinger's managed "Deploy from GitHub" flow (auto-detects Next.js, runs
its own build) also works — in that case you don't need `server.js` at all;
it's only required for the manual Passenger/"Setup Node.js App" path.

---

## Known gotchas / troubleshooting

- **`Table 'xxx' doesn't exist` in production, but not locally.** Windows
  MySQL (XAMPP) is case-insensitive for table names; Linux MySQL
  (Hostinger and most cloud hosts) is case-sensitive. This repo's tables
  are all defined **lowercase** in `db/init.sql` and in every
  `src/server/repo/*.ts` query — if you ever see mixed-case table names
  creep back in (e.g. from a merge or a copy-pasted snippet), they will
  work fine against XAMPP and then break in production. Keep every table
  identifier lowercase.
- **`Invalid environment configuration` on boot.** `src/lib/env.ts`
  validates `process.env` with Zod at first use and throws a itemised list
  of what's missing/invalid — read the error message, it names the exact
  variable.
- **`TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes`.** Generate a
  fresh one with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
  Changing this key after tokens are already stored makes those tokens
  unreadable — accounts must be reconnected.
- **OAuth `Invalid Scopes` error in Graph API Explorer.** You're on the
  `.facebook.com` host selector — switch to `.instagram.com`. This app's
  Meta use case doesn't support the classic Facebook Login scopes
  (`pages_show_list`, `instagram_basic`, etc.) at all.
  `Invalid Scopes` for a scope like `manage_pages` means the app is
  IG-direct only, not a routing mistake.
- **Rate limits during a big first sync.** Instagram Graph API allows
  roughly 200 calls/hour/token. `syncInsights` and `syncComments` each make
  one call per media item (up to 1,000 media per run) — a brand with
  hundreds of posts can exhaust the hourly limit on the first full sync.
  Failures are logged per-item to `auditlog` and don't abort the run; just
  re-run the sync later.
- **Long-lived tokens expire (~60 days).** There's no refresh flow yet —
  when a token expires, reconnect the brand via OAuth (or DEV import a
  fresh token).

---

## Roadmap

Ingestion + AI Agent chat are done. Not yet built:

- Sentiment/intent classification written back onto `instagramcomment`
  (`sentiment`, `intent`, `suggestedReply` columns already exist, unused)
- Scheduled auto-sync (currently manual button / your own external cron
  hitting the sync routes)
- Draft-reply + human-approval workflow
- Auto-posting / scheduling (would require the `instagram_content_publish`
  permission, intentionally not requested yet)
- Per-brand/period report generation
- WebSocket/SSE instead of 5-second polling on the realtime dashboard
- Token refresh automation before the ~60-day expiry
