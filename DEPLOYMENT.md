# HavenForKids — Deployment Guide

This document covers deploying HavenForKids to production. The system consists of two frontend applications and one Convex serverless backend.

## Current Live Deployments

| Service | Platform | URL |
|---------|----------|-----|
| AI Town Game | Google Cloud Run | [havenforkids-game-kmj4z2oxfa-uc.a.run.app](https://havenforkids-game-kmj4z2oxfa-uc.a.run.app) |
| Parent Dashboard | Google Cloud Run | [havenforkids-dashboard-kmj4z2oxfa-uc.a.run.app](https://havenforkids-dashboard-kmj4z2oxfa-uc.a.run.app) |
| Convex Backend | Convex Cloud | `impartial-goldfinch-622.convex.cloud` |

---

## Prerequisites

- A Convex account: [convex.dev](https://convex.dev) (free tier sufficient)
- A Google Cloud account with billing enabled: [cloud.google.com](https://cloud.google.com)
- Google Cloud CLI installed and authenticated: `gcloud auth login`
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

## Step 2: Deploy the AI Town Game (Google Cloud Run)

The game is built as a static site and served via `serve` inside a Docker container.

```bash
cd ai-town

# Set your GCP project
gcloud config set project YOUR_PROJECT_ID
gcloud config set run/region us-central1

# Deploy from source (Cloud Build handles the Docker build)
gcloud run deploy havenforkids-game \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
```

The `VITE_CONVEX_URL` is baked into the image at build time via the Dockerfile `ENV` directive.
If you use a different Convex deployment, update `ENV VITE_CONVEX_URL` in `ai-town/Dockerfile` before deploying.

---

## Step 3: Deploy the Parent Dashboard (Google Cloud Run)

```bash
cd dashboard

# Deploy from source
gcloud run deploy havenforkids-dashboard \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
```

Same as the game — `VITE_CONVEX_URL` is baked in via `dashboard/Dockerfile`.

---

## Dockerfile Details

Both services use a two-stage Docker build:

1. **Build stage** (`node:20.19-bullseye` for game, `node:20.19-alpine` for dashboard) — installs dependencies and runs `vite build`
2. **Serve stage** (`node:20.19-alpine`) — installs `serve` and serves the `dist/` folder

Cloud Run injects the `PORT` environment variable at runtime; both containers respect it via:
```
CMD ["sh", "-c", "serve dist -s -l tcp://0.0.0.0:${PORT:-8080}"]
```

---

## Environment Variable Reference

### AI Town Game (Dockerfile)

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_CONVEX_URL` | `ENV` in `ai-town/Dockerfile` | Baked into the static build at build time |

### Dashboard (Dockerfile)

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_CONVEX_URL` | `ENV` in `dashboard/Dockerfile` | Baked into the static build at build time |

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

---

## Verifying the Deployment

1. **Game** — Open the game URL. You should see the HavenForKids login screen.
2. **Register** — Click "I'm new here", create an account, note the Family Code.
3. **Enter world** — Click "Interact" to join. Your character appears on the map.
4. **Companion check-in** — Wait ~2 minutes. A companion should walk over and start a conversation.
5. **Dashboard** — Open the dashboard URL, enter the Family Code. Data appears after at least one completed conversation.
6. **Distress detection** — Send a test message containing a distress phrase (e.g., "someone hit me"). Confirm the dashboard surfaces an alert.

---

## Redeploying After Changes

```bash
# Redeploy game
cd ai-town
gcloud run deploy havenforkids-game --source . --platform managed --region us-central1 --allow-unauthenticated --port 8080

# Redeploy dashboard
cd dashboard
gcloud run deploy havenforkids-dashboard --source . --platform managed --region us-central1 --allow-unauthenticated --port 8080
```

---

## Custom LLM Provider

HavenForKids uses the OpenAI SDK format. To switch providers:

1. Open `ai-town/convex/util/llm.ts`
2. Update the `baseURL` to your provider's endpoint
3. Set the API key via `npx convex env set OPENAI_API_KEY your-key`

**Confirmed compatible providers:** Mistral AI (`https://api.mistral.ai/v1`), Together AI, Anyscale, and any OpenAI-compatible API.

---

## Production Checklist

- [ ] Convex backend deployed; all functions visible in Convex dashboard
- [ ] `OPENAI_API_KEY` set in Convex environment
- [ ] `VITE_CONVEX_URL` updated in both Dockerfiles to point to your Convex deployment
- [ ] AI Town game deployed on Cloud Run — service URL accessible
- [ ] Parent dashboard deployed on Cloud Run — service URL accessible
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

**Cloud Run build fails with gyp/Python error**
The `ai-town` Dockerfile uses `node:20.19-bullseye` which includes Python and build tools needed for `hnswlib-node`. If you change the base image to alpine, add: `RUN apk add --no-cache python3 make g++`

**Dashboard build fails with vite/plugin-react peer dependency error**
The `dashboard/package.json` pins `@vitejs/plugin-react` to `^4.3.0` (compatible with vite 6). Do not change this to `latest` — v6+ of the plugin requires vite 8.

**Cloud Run container not starting**
Ensure the `PORT` env var is respected. Both containers use `${PORT:-8080}` so Cloud Run's injected port is honoured automatically.
