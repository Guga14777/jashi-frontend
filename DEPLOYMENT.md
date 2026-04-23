# Deployment — jashilogistics.com

Frontend (Vite + React) is hosted on **Vercel** (`jashilogistics.com`).
Backend (Express + Prisma) is a separate Node service on **Railway**.

```
                       ┌────────────────────────────┐
 Browser ──HTTPS──▶    │ Vercel (jashilogistics.com) │
                       │   - serves SPA (index.html) │
                       │   - rewrites /api/* ───────┼──▶ Railway (Express)
                       └────────────────────────────┘         │
                                                              ▼
                                                        Postgres (Supabase)
```

---

## The 405 bug (root cause)

Before this fix, `vercel.json` had a single catch-all rewrite:

```json
{ "source": "/(.*)", "destination": "/index.html" }
```

That rewrote **every** request — including `POST /api/auth/login` — to
`/index.html`. Static HTML only serves `GET`/`HEAD`, so Vercel responded
`HTTP 405 Method Not Allowed` and the request never reached the Railway
backend. `GET` requests also silently returned HTML, which the browser
parsed as a failure.

**Fix:** a second rewrite placed **before** the SPA catch-all, which proxies
`/api/*` to the Railway backend. See [`vercel.json`](./vercel.json).

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://<railway-host>/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Vercel evaluates rewrites top-to-bottom — the first match wins — so `/api/*`
is always routed to Railway, and everything else falls through to the SPA.

---

## ACTION REQUIRED before the next deploy

### 1. Paste your Railway backend host into `vercel.json`

The placeholder is `jashi-backend-production.up.railway.app`. Find your
real host:

1. Open the Railway dashboard → the **backend** service.
2. **Settings → Domains** → copy the public domain (looks like
   `something-production.up.railway.app`).
3. In this repo, open `vercel.json` and replace the placeholder.

Then commit + push — Vercel will redeploy with the new rewrite.

### 2. Confirm Railway has the right env vars

In Railway → your backend service → **Variables**:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | your Supabase Postgres URL |
| `JWT_SECRET` | a long random string |
| `GOOGLE_MAPS_API_KEY` | your key |
| `ALLOWED_ORIGINS` | `https://jashilogistics.com,https://www.jashilogistics.com` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_BUCKET` | optional, for cloud docs |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` | for password-reset email |

> `ALLOWED_ORIGINS` is **belt-and-braces**. `server.cjs` now also has
> `jashilogistics.com` and `www.jashilogistics.com` in its default allow-list,
> so requests work even if you forget to set it. `*.vercel.app` preview
> deployments are also auto-allowed.

### 3. Vercel env vars (optional)

If you'd rather skip the Vercel rewrite and call Railway directly from the
browser (cross-origin), set **one** variable in Vercel:

| Variable | Value | Example |
| --- | --- | --- |
| `VITE_API_BASE` | your Railway public URL (no trailing slash) | `https://jashi-backend-production.up.railway.app` |

Leave `VITE_API_BASE` unset if you use the rewrite (recommended — same-origin
means no CORS preflight cost and the user-facing domain is always
`jashilogistics.com`).

---

## Verifying after deploy

From a terminal (no browser, so no CORS):

```bash
# Health
curl -i https://jashilogistics.com/api/health
# expect: HTTP/2 200 and {"status":"ok","timestamp":"..."}

# Login endpoint must accept POST (even with empty body returns 400 not 405)
curl -i -X POST https://jashilogistics.com/api/auth/login \
  -H 'Content-Type: application/json' -d '{}'
# expect: HTTP/2 400 with {"error":"..."}, NEVER 405

# Register endpoint
curl -i -X POST https://jashilogistics.com/api/auth/register \
  -H 'Content-Type: application/json' -d '{}'
# expect: HTTP/2 400 with {"error":"..."}, NEVER 405
```

If you see `HTTP/2 405` the Vercel rewrite is missing or the Railway host
is wrong. If you see `HTTP/2 502` the Railway service is down.

Then in the browser console on `https://jashilogistics.com`:

```
[api-url] mode: relative (Vercel rewrite → Railway backend)
```

(If you chose the cross-origin route instead, it should say
`cross-origin → https://…railway.app`.)

---

## Local dev

Nothing changes. `.env` already has `PORT=5182` for the backend, and the
Vite dev server (port 5177) proxies `/api/*` to `http://localhost:5182`.

```bash
npm run dev            # API + Vite concurrently
# Frontend → http://localhost:5177
# Backend  → http://localhost:5182
```

`VITE_API_BASE` should stay **unset** in `.env` so the proxy handles it.
