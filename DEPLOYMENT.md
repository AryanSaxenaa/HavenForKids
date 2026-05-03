# HavenForKids — Deployment Guide

This document covers deploying the HavenForKids wellness platform to production. The system consists of two frontend applications (wellness game + parent dashboard) and one Convex serverless backend.

## Current Live Deployments

| Service | Platform | URL |
|---------|----------|-----|
| Wellness Game | Google Cloud Run | [havenforkids-game-708818914032.us-central1.run.app](https://havenforkids-game-708818914032.us-central1.run.app) |
| Parent Wellness Dashboard | Google Cloud Run | [havenforkids-dashboard-708818914032.us-central1.run.app](https://havenforkids-dashboard-708818914032.us-central1.run.app) |
| Convex Backend | Convex Cloud | `impartial-goldfinch-622.convex.cloud` |

---

## Prerequisites

- A Convex account: [convex.dev](https://convex.dev) (free tier sufficient)
- A Google Cloud account with billing enabled: [cloud.google.com](https://cloud.google.com)
- Google Cloud CLI installed and authenticated: `gcloud auth login`
- An LLM API key — Mistral AI recommended ([console.mistral.ai](https://console.mistral.ai)), or any OpenAI-compatible provider
- Node.js 20+ installed locally

---

## Step 1: Deploy the Convex Backend

The Convex backend powers both frontend applications — deploy it first.

```bash
cd ai-town

# Log in to Convex
npx convex login

# Deploy to production
npx convex deploy
```

Save the production deployment URL printed (format: `https://[name].convex.cloud`).

### Set the LLM API key

```bash
npx convex env set OPENAI_API_KEY your-mistral-api-key --prod
```

If using Mistral AI, confirm the base URL in `ai-town/convex/util/llm.ts` is set to `https://api.mistral.ai/v1`.

### Initialise the wellness world

```bash
npx convex run init:main
```

This seeds the game world with the three wellness companions (Sunny, Sage, Keeper).

### Verify

Visit [dashboard.convex.dev](https://dashboard.convex.dev) and confirm:
- The `havenUsers` table exists under Data
- The `auth`, `dashboard`, and `world` functions are listed under Functions

---

## Step 2: Deploy the Wellness Game (Google Cloud Run)

The game is built as a static site and served via `serve` inside a Docker container. The `VITE_CONVEX_URL` is baked into the image at build time.

```bash
cd ai-town

# Update the Convex URL in the Dockerfile first
# Edit: ENV VITE_CONVEX_URL=https://your-deployment.convex.cloud

# Set your GCP project and region
gcloud config set project YOUR_PROJECT_ID
gcloud config set run/region us-central1

# Deploy from source — Cloud Build handles the Docker build automatically
gcloud run deploy havenforkids-game \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
```

---

## Step 3: Deploy the Parent Wellness Dashboard (Google Cloud Run)

```bash
cd dashboard

# Update the Convex URL in the Dockerfile first
# Edit: ENV VITE_CONVEX_URL=https://your-deployment.convex.cloud

# Deploy from source
gcloud run deploy havenforkids-dashboard \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
```

---

## Dockerfile Details

Both services use a two-stage Docker build:

1. **Build stage** — installs dependencies and runs `vite build` with `VITE_CONVEX_URL` baked in
   - Wellness game: `node:20.19-bullseye` (Debian — required for `hnswlib-node` native compilation)
   - Dashboard: `node:20.19-alpine` (lightweight)
2. **Serve stage** (`node:20.19-alpine`) — installs `serve` and serves the `dist/` folder

Cloud Run injects the `PORT` environment variable at runtime; both containers respect it:
```
CMD ["sh", "-c", "serve dist -s -l tcp://0.0.0.0:${PORT:-8080}"]
```

---

## Environment Variable Reference

### Wellness Game (`ai-town/Dockerfile`)

| Variable | Where set | Description |
|----------|-----------|-------------|
| `VITE_CONVEX_URL` | `ENV` directive in Dockerfile | Baked into the static build at build time — update before redeploying |

### Parent Dashboard (`dashboard/Dockerfile`)

| Variable | Where set | Description |
|----------|-----------|-------------|
| `VITE_CONVEX_URL` | `ENV` directive in Dockerfile | Baked into the static build at build time — update before redeploying |

### Convex Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Mistral AI (or compatible) API key — set via `npx convex env set` |

---

## Verifying the Wellness Platform

1. **Game** — Open the game URL. You should see the HavenForKids login screen.
2. **Register** — Click "I'm new here", create an account, note the **Family Code**.
3. **Enter the wellness village** — Click "Interact" to join. Your character appears on the map.
4. **Companion check-in** — Wait ~2 minutes. A wellness companion will walk over and start a conversation.
5. **Parent dashboard** — Open the dashboard URL, enter the Family Code. Wellness data appears after at least one completed conversation.
6. **Distress detection** — Send a test message containing a distress phrase (e.g., "someone hit me"). Confirm the dashboard surfaces an alert.

---

## Redeploying After Changes

```bash
# Redeploy wellness game
cd ai-town
gcloud run deploy havenforkids-game --source . --platform managed --region us-central1 --allow-unauthenticated --port 8080

# Redeploy parent dashboard
cd dashboard
gcloud run deploy havenforkids-dashboard --source . --platform managed --region us-central1 --allow-unauthenticated --port 8080
```

---

## Custom LLM Provider

HavenForKids uses the OpenAI SDK format. To switch providers:

1. Open `ai-town/convex/util/llm.ts`
2. Update the `baseURL` to your provider's endpoint
3. Set the API key: `npx convex env set OPENAI_API_KEY your-key --prod`

**Confirmed compatible providers:** Mistral AI (`https://api.mistral.ai/v1`), Together AI, Anyscale, and any OpenAI-compatible API.

---

## Production Checklist

- [ ] Convex backend deployed; all functions visible in Convex dashboard
- [ ] `OPENAI_API_KEY` set in Convex prod environment
- [ ] Wellness world initialised via `npx convex run init:main`
- [ ] `VITE_CONVEX_URL` updated in both Dockerfiles to point to your Convex deployment
- [ ] Wellness game deployed on Cloud Run — service URL accessible
- [ ] Parent dashboard deployed on Cloud Run — service URL accessible
- [ ] Registration flow tested: create account → receive Family Code → enter wellness village
- [ ] Companion check-in verified: companion approaches child within ~2 minutes
- [ ] Dashboard tested: Family Code lookup returns wellness data after a conversation
- [ ] Distress detection tested: flagged keyword triggers dashboard alert
- [ ] Conversation persistence tested: companion does not leave mid-conversation with a child

---

## Troubleshooting

**"Cannot find module convex/_generated/api"**
Run `npx convex dev` once to generate the API types, then rebuild.

**Dashboard shows "Family Code not found"**
Codes use only `A–Z` and `2–9` (no `0`, `O`, `1`, `I`). Ensure correct case.

**Wellness companions do not approach the child**
The check-in interval is 2–3 minutes. Confirm the player clicked "Interact" and their character is visible on the map.

**Cloud Run build fails with gyp/Python error**
The `ai-town` Dockerfile uses `node:20.19-bullseye` which includes Python and build tools needed for `hnswlib-node`. If you change the base image to alpine, add: `RUN apk add --no-cache python3 make g++`

**Dashboard build fails with vite/plugin-react peer dependency error**
The `dashboard/package.json` pins `@vitejs/plugin-react` to `^4.3.0` (compatible with vite 6). Do not change this to `latest` — v6+ of the plugin requires vite 8.

**Cloud Run container not starting**
Both containers use `${PORT:-8080}` so Cloud Run's injected `PORT` is honoured automatically. Ensure you are not hardcoding a port in the serve command.
