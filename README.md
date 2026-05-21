# IG AI Command Center

Real-time / near real-time Instagram data ingestion for the **Ayres**, **Ava**, and **Saifenu** brands.

This phase focuses on **data ingestion only**:

- Connect Instagram Business Accounts via Meta OAuth
- Encrypt & store Page / User access tokens
- Pull profile, media, comments, insights from the Instagram Graph API
- Receive Meta webhooks (with HMAC signature verification)
- Persist everything to **MySQL (XAMPP)** via raw SQL through `mysql2`
- Provide a simple, polling-based monitoring dashboard

AI analysis (Ollama), auto-posting, and approval workflow are intentionally **not** in scope yet — placeholders are in place for future phases.

---

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **React 19**
- **mysql2** driver — raw parameterised SQL via a connection pool. No ORM.
- **MySQL / MariaDB** from **XAMPP**
- **Tailwind CSS 4**
- **Zod** for validation
- **node:crypto** for AES-256-GCM token encryption + HMAC webhook signature
- **Native fetch** for Meta Graph API calls
- **Ollama** placeholder for future AI analysis

---

## Local XAMPP setup

1. Open **XAMPP Control Panel** and start **MySQL** (Apache is optional — Next.js serves the app).
2. Open **phpMyAdmin** at `http://localhost/phpmyadmin/`.
3. Create a new database: **`ig_ai_command_center`** (collation `utf8mb4_unicode_ci`).
4. From this repo root:
   ```bash
   cp .env.example .env
   ```
5. Edit `.env` — at minimum set:
   - `DATABASE_URL="mysql://root:@localhost:3306/ig_ai_command_center"`
     (add `:password` after `root` if your XAMPP MySQL has one, e.g. `mysql://root:secret@localhost:3306/...`)
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET`
   - `TOKEN_ENCRYPTION_KEY` — must be **base64-encoded 32 bytes**. Generate one:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
     ```
   - `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN` (filled in once you create the Meta App — see below)
6. Install deps and create the tables:
   ```bash
   npm install
   npm run db:init
   ```
   `npm run db:init` runs `scripts/init-db.mjs`, which executes `db/init.sql` against `DATABASE_URL`. The SQL is idempotent (`CREATE TABLE IF NOT EXISTS`), so re-running is safe.

   You can also apply the schema manually:
   - Open **phpMyAdmin**, select the database, click **Import**, choose `db/init.sql`.
7. Start the dev server:
   ```bash
   npm run dev
   ```
8. Open <http://localhost:3000> — you will be redirected to `/login`.

---

## Meta Developer setup

1. Go to <https://developers.facebook.com/> -> **My Apps** -> **Create App**.
2. App name: **ai-medsos**.
3. Use case: **Kelola pesan & konten di Instagram** (Manage Instagram messages & content).
4. From **App Settings -> Basic**, copy **App ID** and **App Secret** into `.env`:
   ```ini
   META_APP_ID="..."
   META_APP_SECRET="..."
   META_GRAPH_VERSION="v25.0"
   ```
5. Add the **Facebook Login for Business** product and configure the redirect URI:
   ```
   http://localhost:3000/api/instagram/oauth/callback
   ```
6. Request these permissions (scopes):
   - `instagram_basic`
   - `instagram_manage_insights`
   - `instagram_manage_comments`
   - `pages_show_list`
   - `pages_read_engagement`

   `instagram_content_publish` is **intentionally not used yet** in this phase.
7. Ensure the Instagram account is:
   - **Business** or **Creator**
   - Connected to a **Facebook Page**
   - The Facebook user has **admin / full control** over that Page (and the Page sits inside the **AYRES Apparel Business Portfolio**).
8. Visit:
   ```
   http://localhost:3000/api/instagram/oauth/start?brand=Ayres
   ```
   to start the OAuth flow. Use `brand=Ava` or `brand=Saifenu` for the other brands.
9. After the redirect lands on `/dashboard/accounts?connected=success`, run sync jobs:
   - **Sync Profile**, **Sync Media**, **Sync Comments**, **Sync Insights**, or **Sync All**.

---

## Testing with Graph API Explorer

While you're still wiring up the Meta app dashboard, you can shortcut the OAuth dance and import a token by hand.

1. Open <https://developers.facebook.com/tools/explorer/>.
2. Pick app **ai-medsos**.
3. **Generate Access Token** with these permissions checked:
   - `instagram_basic`
   - `instagram_manage_insights`
   - `instagram_manage_comments`
   - `pages_show_list`
   - `pages_read_engagement`
4. Quick checks:
   - `me?fields=id,name` -> your FB user
   - `me/accounts?fields=id,name,access_token` -> list of Pages you manage. Copy **PAGE_ID** and **PAGE_ACCESS_TOKEN**.
   - `PAGE_ID?fields=instagram_business_account{id,username,name,profile_picture_url}` -> grab **IG_USER_ID**.
   - `IG_USER_ID?fields=id,username,followers_count,follows_count,media_count`
   - `IG_USER_ID/media?fields=id,caption,media_type,media_product_type,permalink,thumbnail_url,timestamp,like_count,comments_count`
5. To use that token in this app, log in to the dashboard, open **Accounts**, and use **DEV: Manual token import** (only visible when `DEV_ALLOW_MANUAL_TOKEN_IMPORT="true"` in `.env`). Or hit the API directly:
   ```bash
   curl -X POST http://localhost:3000/api/instagram/dev/import-token \
     -H "Content-Type: application/json" \
     -b "igacc_session=YOUR_SESSION_COOKIE" \
     -d '{
       "brandName": "Ayres",
       "pageId": "PAGE_ID",
       "pageName": "Ayres Apparel",
       "igUserId": "IG_USER_ID",
       "igUsername": "ayres",
       "pageAccessToken": "PAGE_ACCESS_TOKEN"
     }'
   ```
6. To quickly test a token without persisting it:
   ```bash
   curl -X POST http://localhost:3000/api/instagram/dev/test-token \
     -H "Content-Type: application/json" \
     -b "igacc_session=YOUR_SESSION_COOKIE" \
     -d '{ "accessToken": "PAGE_ACCESS_TOKEN", "igUserId": "IG_USER_ID" }'
   ```

> **Never commit tokens. Never share tokens in chat.** Tokens from Graph API Explorer are for testing only; production traffic must come through the real OAuth flow. The DEV endpoints are gated by `DEV_ALLOW_MANUAL_TOKEN_IMPORT` and must be disabled in production.

---

## Webhook local testing

Meta requires an **HTTPS public URL** for the webhook. For local development, expose `localhost:3000` with [ngrok](https://ngrok.com/) or Cloudflare Tunnel.

```bash
ngrok http 3000
```

Then, in **App Dashboard -> Webhooks -> Instagram**:

- **Callback URL**: `https://<your-ngrok-id>.ngrok-free.app/api/meta/webhook`
- **Verify Token**: must equal `META_WEBHOOK_VERIFY_TOKEN` in `.env`.
- Subscribe to the fields you want (e.g. `comments`, `live_comments`, `mentions`).

Flow:

- **GET** `/api/meta/webhook` -> Meta verifies your verify token and expects the `hub.challenge` echoed back.
- **POST** `/api/meta/webhook` -> every Meta event lands here.
  - Raw body is read with `request.text()`.
  - The `x-hub-signature-256` HMAC is verified against `META_APP_SECRET` using `timingSafeEqual`.
  - Valid events are stored to `IgWebhookEvent` with status `PENDING`. Meta gets a fast `200 OK`.
- Open **/dashboard/realtime** -> click **Process Webhook Events** to drain the pending queue.
- Each processed event will try to fetch and upsert the referenced media / comment via the Graph API.

---

## Project layout

```
db/
  init.sql                       # CREATE TABLE statements (run via `npm run db:init`)
scripts/
  init-db.mjs                    # applies db/init.sql against DATABASE_URL
src/
  app/
    login/                       # admin login page
    dashboard/
      page.tsx                   # overview
      accounts/                  # list + detail + actions
      realtime/                  # polling monitor
      content/                   # all media
      comments/                  # all comments
      settings/                  # env readiness
    api/
      auth/                      # login, logout, me
      instagram/
        oauth/start              # OAuth kick-off
        oauth/callback           # OAuth completion
        accounts/[id]/sync-*     # sync routes
        dev/import-token         # DEV: manual token import
        dev/test-token           # DEV: probe a token
      meta/webhook               # Meta GET verify + POST event
      webhook/process-pending    # drain PENDING webhook events
      dashboard/realtime         # JSON feed for /dashboard/realtime
      content                    # JSON feed of media
      comments                   # JSON feed of comments
  components/
    layout/                      # sidebar/header
    accounts/                    # account UI components
    realtime/                    # realtime monitor
  lib/
    db.ts                        # mysql2 pool + query/queryOne/execute helpers
    env.ts, auth.ts
    encryption.ts, meta-signature.ts
    api-response.ts, utils.ts
  server/
    instagram/                   # Graph API client, OAuth, sync, webhook
    repo/                        # raw-SQL repositories — one file per entity
    ai/ollama.ts                 # placeholder
```

---

## Data layer

Every DB call goes through one of three helpers in `src/lib/db.ts`:

- `query<T>(sql, params)` — returns rows.
- `queryOne<T>(sql, params)` — returns the first row or `null`.
- `execute(sql, params)` — for INSERT/UPDATE/DELETE; returns `{ affectedRows, insertId }`.

Always use `?` placeholders. Never string-concatenate user input into SQL.

Domain queries are grouped in `src/server/repo/<entity>.ts`, e.g. `social-account.ts`, `instagram-media.ts`. Pages/routes import these named functions; the SQL itself stays inside the repo.

JSON columns: pass values through `toJsonParam(v)` when writing (it `JSON.stringify`s and handles null), and through `parseJsonColumn(v)` when reading (handles both already-parsed objects and stringified JSON returned by some MariaDB versions).

---

## API response shape

All API endpoints follow the standard envelope.

Success:
```json
{ "success": true,  "data": { }, "error": null }
```

Failure:
```json
{
  "success": false,
  "data": null,
  "error": { "code": "ERROR_CODE", "message": "Readable msg", "details": { } }
}
```

The Meta webhook endpoint (`/api/meta/webhook`) intentionally returns plain text + correct HTTP statuses, because Meta requires that.

---

## Security

- **Access tokens are encrypted at rest** using AES-256-GCM (key from `TOKEN_ENCRYPTION_KEY`). The key must be base64 that decodes to exactly 32 bytes; the app fails fast with a clear error otherwise.
- Tokens are **never sent to the frontend** and **never logged**.
- OAuth uses a **single-use, time-limited `state`** stored in DB (`OAuthState`, 10-minute TTL).
- Webhook signatures are verified with `crypto.timingSafeEqual` against `META_APP_SECRET`.
- Admin dashboard + all sync APIs are behind a session cookie (httpOnly, signed with `SESSION_SECRET`).
- **DEV manual token import** is only active when `DEV_ALLOW_MANUAL_TOKEN_IMPORT="true"`.
- The Settings page masks all secrets.

---

## Useful scripts

```bash
npm run dev              # start Next dev server
npm run build            # production build
npm run start            # run built app

npm run db:init          # apply db/init.sql (CREATE TABLE IF NOT EXISTS)
```

---

## What's next (future phases)

- Ollama: sentiment + intent + niche classification on comments
- Draft replies with human-approval workflow
- Auto-posting / scheduling (requires `instagram_content_publish`)
- Report generation per brand / period
- WebSocket / Server-Sent Events instead of 5s polling

For now, the goal is reliable ingestion. Once Ayres / Ava / Saifenu data is flowing in cleanly, AI analysis activates on top of the same schema.
