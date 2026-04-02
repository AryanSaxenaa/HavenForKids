# HAVEN — Environment Variables Reference

All environment variables used across the monorepo.
Never commit real values. Use `.env.local` for local dev (git-ignored).

---

## Server (`server/.env`)

```env
# ── Mistral ──────────────────────────────────────────────
MISTRAL_API_KEY=sk-...

# ── Turso Database ───────────────────────────────────────
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=eyJ...

# ── Resend Email ─────────────────────────────────────────
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=haven@yourdomain.com

# ── CORS ─────────────────────────────────────────────────
# Comma-separated list of allowed origins
FRONTEND_ORIGIN=https://haven-game.vercel.app,https://haven-dashboard.vercel.app

# ── Server ───────────────────────────────────────────────
PORT=3000
NODE_ENV=production
```

---

## Game (`game/.env.local`)

```env
VITE_API_BASE_URL=http://localhost:3000
```

Production (Vercel env var):
```
VITE_API_BASE_URL=https://<railway-service>.up.railway.app
```

---

## Dashboard (`dashboard/.env.local`)

```env
VITE_API_BASE_URL=http://localhost:3000
```

Production (Vercel env var):
```
VITE_API_BASE_URL=https://<railway-service>.up.railway.app
```

---

## Validation at Server Startup

`server/src/config/env.ts` must validate all required vars with Zod at startup.
If any required var is missing the process must exit with a clear error message.

```typescript
import { z } from 'zod'

const envSchema = z.object({
  MISTRAL_API_KEY: z.string().min(1),
  TURSO_DATABASE_URL: z.string().url(),
  TURSO_AUTH_TOKEN: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),
  FRONTEND_ORIGIN: z.string().min(1),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export const env = envSchema.parse(process.env)
```

---

## Railway Setup Checklist

1. Create Railway project → add service → connect GitHub repo
2. Set root directory: `/server`  (or use `railway.toml` at repo root)
3. Add all server env vars in Railway dashboard → Variables tab
4. Add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` from Turso dashboard
5. Set healthcheck path: `/api/v1/health`
6. After first deploy, copy the Railway public URL into Vercel env vars for both game and dashboard

---

## Turso Setup Checklist

1. `npm install -g @turso/cli`
2. `turso auth login`
3. `turso db create haven-db`
4. `turso db show haven-db` — copy the URL
5. `turso db tokens create haven-db` — copy the token
6. Paste both into Railway env vars
7. Run `server/src/db/schema.sql` to initialise tables:
   `turso db shell haven-db < server/src/db/schema.sql`
