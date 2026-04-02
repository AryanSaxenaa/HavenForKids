# HAVEN — Development Setup

## Prerequisites
- Node.js 20+
- npm 10+
- Turso CLI (`npm install -g @turso/cli`)
- A Mistral API key (https://console.mistral.ai)
- A Resend API key (https://resend.com)

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables

**Server:**
```bash
cp server/.env.example server/.env
# Edit server/.env with your real keys
```

**Game** — create `game/.env.local`:
```
VITE_API_BASE_URL=http://localhost:3000
```

**Dashboard** — create `dashboard/.env.local`:
```
VITE_API_BASE_URL=http://localhost:3000
```

### 3. Set up Turso database
```bash
turso auth login
turso db create haven-db
turso db show haven-db        # copy URL → TURSO_DATABASE_URL
turso db tokens create haven-db # copy token → TURSO_AUTH_TOKEN

# Apply schema
turso db shell haven-db < server/src/db/schema.sql
```

### 4. Start all services

In separate terminals:
```bash
npm run dev:server      # http://localhost:3000
npm run dev:game        # http://localhost:5173
npm run dev:dashboard   # http://localhost:5174
```

### 5. Add game assets
See `game/public/assets/ASSETS_README.md` for the CC0 Kenney assets needed.

## Deployment

### Server → Railway
1. Connect GitHub repo to Railway
2. Set env vars in Railway dashboard (all vars from `server/.env.example`)
3. The `railway.toml` at root handles build + deploy automatically

### Game → Vercel
1. New Vercel project → point at `game/` subdirectory
2. Set `VITE_API_BASE_URL` = your Railway server URL

### Dashboard → Vercel
1. New Vercel project → point at `dashboard/` subdirectory
2. Set `VITE_API_BASE_URL` = your Railway server URL

## Project Structure
```
/
├── game/          # Phaser 3 + Vite + React (child-facing game)
├── dashboard/     # React 18 + Vite + Tailwind (parent dashboard)
├── server/        # Express + TypeScript (API on Railway)
└── shared/        # Shared TypeScript types (no runtime deps)
```
