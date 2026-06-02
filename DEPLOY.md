# Deploy to Hostinger (Cloud / Node.js)

This app is a Next.js (App Router) server app that needs a **Node.js runtime**
and a **MySQL database**. Hostinger Cloud plans support both (the "Node.js apps"
feature + MySQL with phpMyAdmin). Hostinger runs Node apps via **Passenger**, so
the entry point is a **startup file** — this repo ships `server.js` for that.

---

## 1. Create the database (hPanel)

1. hPanel → **Databases → MySQL Databases**.
2. Create a new database + user (note them). You'll get names like:
   - DB name: `u123456789_igacc`
   - User: `u123456789_admin`
   - Password: (the one you set)
   - Host: usually `localhost`
3. Open **phpMyAdmin** for that database → **Import** → upload `db/init.sql`
   from this repo → Go. (It only creates tables, so import into the DB you just made.)

Your `DATABASE_URL` becomes:
```
mysql://u123456789_admin:YOUR_PASSWORD@localhost:3306/u123456789_igacc
```

> If a brand was already synced locally and you want that data too, export the
> tables from local phpMyAdmin and import the dump here as well.

---

## 2. Get the code onto Hostinger

Easiest: **Git**.
- hPanel → **Advanced → GIT** → deploy `https://github.com/EzraNahumury/ai-medsos.git`
  into a folder (e.g. `domains/yourdomain/ai-medsos`), branch `main`.
- Or SSH: `git clone https://github.com/EzraNahumury/ai-medsos.git`

> `.env` is **not** in git (by design). You'll set env vars in step 4.

---

## 3. Create the Node.js app (hPanel)

hPanel → **Advanced → Node.js** → **Create application**:
- **Node version:** 20 (or latest available ≥ 18.18)
- **Application root:** the folder you deployed to
- **Application startup file:** `server.js`
- **Application URL:** your domain / subdomain

Then, in the same screen (or via SSH terminal in that folder):
```bash
npm install
npm run build
```

> `npm run build` needs the dev dependencies (TypeScript, Tailwind) — that's
> fine, `npm install` installs them. If the build runs out of memory, set
> `NODE_OPTIONS=--max-old-space-size=2048` before building.

---

## 4. Environment variables

Set these in the Node.js app's **Environment variables** section (or create a
`.env` file in the app root — never commit it):

```ini
DATABASE_URL="mysql://u123456789_admin:YOUR_PASSWORD@localhost:3306/u123456789_igacc"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"

ADMIN_EMAIL="you@domain.com"
ADMIN_PASSWORD="a-strong-password"
SESSION_SECRET="<long random string>"

META_APP_ID="996151736693006"
META_APP_SECRET="<your instagram app secret>"
META_GRAPH_VERSION="v25.0"
META_REDIRECT_URI="https://yourdomain.com/api/instagram/oauth/callback"
META_OAUTH_SCOPES="instagram_business_basic,instagram_manage_comments,instagram_business_manage_messages"
META_WEBHOOK_VERIFY_TOKEN="<random token>"

# IMPORTANT: reuse the SAME key you encrypted tokens with, or stored tokens
# can no longer be decrypted.
TOKEN_ENCRYPTION_KEY="<your 32-byte base64 key>"

OLLAMA_HOST="https://ollama.com"
OLLAMA_KEY="<your ollama key>"
OLLAMA_MODEL="gpt-oss:120b-cloud"

# MUST be false in production
DEV_ALLOW_MANUAL_TOKEN_IMPORT="false"
```

---

## 5. Update Meta Developer settings

In the Meta App dashboard:
- Add the **production redirect URI** (Instagram OAuth requires HTTPS):
  `https://yourdomain.com/api/instagram/oauth/callback`
- If using webhooks, set the callback to:
  `https://yourdomain.com/api/meta/webhook`
  with the same `META_WEBHOOK_VERIFY_TOKEN`.

---

## 6. Start / restart

In the Node.js app screen, click **Restart**. Visit `https://yourdomain.com` —
you should see the login page.

---

## 7. After deploy

1. Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. Because `DEV_ALLOW_MANUAL_TOKEN_IMPORT="false"`, connect brands via the real
   **OAuth flow** (Connect button on /dashboard/accounts).
   - (If you need the DEV manual import on prod temporarily, set it to `true`,
     restart, import, then set back to `false`.)
3. Run **Sync All** per account to pull data into the production DB.

---

## Notes & limits

- **Tokens expire ~60 days** (Instagram long-lived). Re-generate when expired.
- **No auto-sync scheduler** yet — sync is manual (or trigger
  `/api/instagram/accounts/[id]/sync-all` from a cron).
- Keep `DEV_ALLOW_MANUAL_TOKEN_IMPORT="false"` in production.
- If you ever change `TOKEN_ENCRYPTION_KEY`, previously stored tokens become
  unreadable and accounts must be reconnected.
