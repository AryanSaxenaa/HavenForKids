# HAVEN — Deployment Guide

This document covers deploying HAVEN to production. The system consists of two frontend applications and one Convex serverless backend.

## Current Live Deployments

| Service | Platform | URL |
|---------|----------|-----|
| AI Town Game | Vercel (free tier) | [ai-town-lxo1tyv1v-aryan-saxenas-projects-691b9d9c.vercel.app](https://ai-town-lxo1tyv1v-aryan-saxenas-projects-691b9d9c.vercel.app) |
| Parent Dashboard | Railway (hobby tier) | [haven-dashboard-production.up.railway.app](https://haven-dashboard-production.up.railway.app) |
| Convex Backend | Convex Cloud | `lovely-quail-205.convex.cloud` |

---

## Prerequisites

- A Convex account: [convex.dev](https://convex.dev) (free tier sufficient)
- A Vercel account: [vercel.com](https://vercel.com) (free tier sufficient)
- A Railway account: [railway.app](https://railway.app) (hobby tier — $5/month, includes free usage credits)
- An LLM API key (Mistral AI recommended, or any OpenAI-compatible provider)
- Node.js 20+ installed locally

---

## Step 1: Deploy the Convex Backend

The Convex backend serves both frontend applications. Deploy it first.

```bash
cd ai-town

# Log in to Convex
npx convex login

# Deploy to production
npx convex deploy --yes
```

Save the deployment URL printed (format: `https://[deployment-name].convex.cloud`).

### Set the LLM API key

```bash
npx convex env set OPENAI_API_KEY your-api-key-here
```

If using Mistral AI, update the base URL in `ai-town/convex/util/llm.ts` to `https://api.mistral.ai/v1`.

### Verify

Visit [dashboard.convex.dev](https://dashboard.convex.dev) and confirm:
- The `havenUsers` table exists under Data
- The `auth`, `dashboard`, and `world` functions are listed under Functions

---

## Step 2: Deploy the AI Town Game (Vercel)

### Option A: Vercel CLI (recommended)

```bash
cd ai-town

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Then set the environment variable:

```bash
vercel env add VITE_CONVEX_URL production
# Enter: https://your-deployment.convex.cloud
```

Redeploy to pick up the env var:

```bash
vercel --prod
```

### Option B: Vercel Web UI

1. Push your repository to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository
3. Set **Root Directory** to `ai-town`
4. Set **Build Command** to `npm run build`
5. Set **Output Directory** to `dist`
6. Add environment variable: `VITE_CONVEX_URL` = `https://your-deployment.convex.cloud`
7. Click Deploy

---

## Step 3: Deploy the Parent Dashboard (Railway)

The dashboard uses a multi-stage Dockerfile (`dashboard/Dockerfile`) that builds with `node:20.19-alpine` and serves static files via `serve`.

### Option A: Railway CLI (recommended)

```bash
cd dashboard

# Install Railway CLI
npm i -g @railway/cli

# Log in
railway login

# Create a new project
railway init

# Link to a service
railway service

# Set environment variable
railway variables set VITE_CONVEX_URL=https://your-deployment.convex.cloud

# Deploy
railway up

# Generate a public domain
railway domain
```

### Option B: Railway Web Dashboard

1. Go to [railway.app/new](https://railway.app/new)
2. Create a new project from your GitHub repo
3. Set **Root Directory** to `dashboard`
4. Railway auto-detects the Dockerfile
5. Add variable: `VITE_CONVEX_URL` = `https://your-deployment.convex.cloud`
6. Deploy and generate a domain under Settings → Networking

### Dashboard Dockerfile Details

The Dockerfile bakes the `VITE_CONVEX_URL` at build time (required for Vite static builds). If you change your Convex deployment, update the `ENV VITE_CONVEX_URL` line in `dashboard/Dockerfile` and redeploy.

---

## Environment Variable Reference

### AI Town Game (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_CONVEX_URL` | Yes | Convex deployment URL |

### Dashboard (Railway / Dockerfile)

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_CONVEX_URL` | `ENV` in Dockerfile | Baked into the static build at build time |
| `VITE_CONVEX_URL` | Railway variable | Also set as runtime var for reference |

### Convex Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | API key for the LLM provider (set via `npx convex env set`) |

---

## Initialising Game World Data

On first deployment, the game world needs initial data:

```bash
cd ai-town
npx convex run init:main
```

Alternatively, the world initialises automatically when you first run `npx convex dev` locally.

---

## Verifying the Deployment

1. **Game** — Open the game URL. You should see the HAVEN login screen.
2. **Register** — Click "I'm new here", create an account, note the Family Code.
3. **Enter world** — Click "Interact" to join. Your character appears on the map.
4. **Companion check-in** — Wait ~2 minutes. A companion should walk over and start a conversation.
5. **Dashboard** — Open the dashboard URL, enter the Family Code. Data appears after at least one completed conversation.
6. **Distress detection** — Send a test message containing a distress phrase (e.g., "someone hit me"). Confirm the dashboard surfaces an alert.

---

## Custom LLM Provider

HAVEN uses the OpenAI SDK format. To switch providers:

1. Open `ai-town/convex/util/llm.ts`
2. Update the `baseURL` to your provider's endpoint
3. Set the API key via `npx convex env set OPENAI_API_KEY your-key`

**Confirmed compatible providers:** Mistral AI (`https://api.mistral.ai/v1`), Together AI, Anyscale, and any OpenAI-compatible API.

---

## Production Checklist

- [ ] Convex backend deployed; all functions visible in Convex dashboard
- [ ] `OPENAI_API_KEY` set in Convex environment
- [ ] AI Town game deployed on Vercel with `VITE_CONVEX_URL` set
- [ ] Parent dashboard deployed on Railway with Dockerfile build succeeding
- [ ] Public domains generated for both Vercel and Railway
- [ ] Registration flow tested: create account → receive Family Code → enter game
- [ ] Companion check-in verified: companion approaches player within ~2 minutes
- [ ] Dashboard tested: Family Code lookup returns data after a conversation
- [ ] Distress detection tested: flagged keyword triggers dashboard alert
- [ ] Conversation persistence tested: companion does not leave mid-conversation with a child

---

## Troubleshooting

**"Cannot find module convex/_generated/api"**
Run `npx convex dev` once to generate the API types, then rebuild.

**Dashboard shows "Family Code not found"**
Codes use only `A–Z` and `2–9` (no `0`, `O`, `1`, `I`). Ensure correct case.

**Companions do not approach the player**
The check-in interval is 2–3 minutes. Confirm the player clicked "Interact" and their character is visible on the map.

**Railway build fails with Node version error**
The Dockerfile uses `node:20.19-alpine`. Ensure you're using the Dockerfile builder (not Nixpacks). Check `railway.toml` has `builder = "dockerfile"`.

**Dashboard build fails with tsconfig/import errors**
The dashboard is self-contained — it has its own `tsconfig.json` (no extends) and its own copy of `convex/_generated/api`. If you regenerate Convex types, copy them into `dashboard/convex/_generated/` as well.
