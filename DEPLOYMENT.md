# HAVEN — Deployment Guide

This document covers deploying HAVEN to production. The system consists of two frontend applications and one Convex backend deployment.

---

## Prerequisites

- A Convex account: [convex.dev](https://convex.dev) (free tier is sufficient)
- A Vercel account: [vercel.com](https://vercel.com) (free tier is sufficient)
- An OpenAI API key (or compatible provider key)
- Node.js 20+ installed locally

---

## Step 1: Deploy the Convex Backend

The Convex backend serves both frontend applications. It must be deployed first.

```bash
cd ai-town

# Log in to Convex (opens browser)
npx convex login

# Deploy to production
npx convex deploy --yes
```

The deployment URL will be printed, in the format `https://[deployment-name].convex.cloud`. Save this — it is needed for both frontend deployments.

### Set the LLM API key

```bash
npx convex env set OPENAI_API_KEY sk-your-key-here
```

If you are using a non-OpenAI provider, update the base URL in `ai-town/convex/util/llm.ts` to point to your provider's API endpoint.

### Verify the deployment

Visit `https://dashboard.convex.dev` and confirm:
- The `havenUsers` table is present under Data
- The `auth`, `dashboard`, and `world` functions are listed under Functions

---

## Step 2: Deploy the AI Town Game (Child-Facing)

### Option A: Vercel (recommended)

1. Push your repository to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository
3. Set the **Root Directory** to `ai-town`
4. Set the **Build Command** to `npm run build`
5. Set the **Output Directory** to `dist`
6. Add the environment variable:
   ```
   VITE_CONVEX_URL = https://your-deployment.convex.cloud
   ```
7. Click Deploy

### Option B: Manual build

```bash
cd ai-town

# Set production environment
echo "VITE_CONVEX_URL=https://your-deployment.convex.cloud" > .env.production

# Build
npm run build

# The dist/ directory is ready to serve as a static site
```

Upload `ai-town/dist/` to any static hosting provider (Netlify, Cloudflare Pages, S3 + CloudFront, etc.).

---

## Step 3: Deploy the Parent Dashboard

### Option A: Vercel

1. In Vercel, create a **second** project from the same repository
2. Set the **Root Directory** to `dashboard`
3. Set the **Build Command** to `npm run build`
4. Set the **Output Directory** to `dist`
5. Add the environment variable:
   ```
   VITE_CONVEX_URL = https://your-deployment.convex.cloud
   ```
6. Click Deploy

### Option B: Manual build

```bash
cd dashboard

echo "VITE_CONVEX_URL=https://your-deployment.convex.cloud" > .env.production

npm run build
```

Upload `dashboard/dist/` to any static hosting provider.

---

## Environment Variable Reference

### AI Town Game (`ai-town/.env.local` or Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_CONVEX_URL` | Yes | Your Convex deployment URL |

### Dashboard (`dashboard/.env.local` or Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_CONVEX_URL` | Yes | Your Convex deployment URL (same as game) |

### Convex Backend (set via `npx convex env set`)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | API key for the LLM provider |

---

## Initialising Game World Data

The AI Town world requires initial game data (companion characters and map configuration). On first deployment:

```bash
cd ai-town

# With the production Convex URL set
npx convex run init:main
```

If the `init` function does not exist in your build, start the game locally once with `npx convex dev` running — the world is initialised automatically on first run.

---

## Verifying the Deployment

Once all three are deployed:

1. Open the game URL — you should see the HAVEN landing screen with login and registration options
2. Register a new account and note the Family Code
3. Click "Interact" to enter the world — your character should appear on the map
4. Wait approximately two minutes — a companion should walk towards your character
5. Open the dashboard URL and enter the Family Code — the dashboard should load (initially empty, populating after the first completed conversation)

---

## Custom LLM Provider

HAVEN uses the OpenAI SDK format. To use an alternative provider:

1. Open `ai-town/convex/util/llm.ts`
2. Update the `baseURL` in the client configuration to your provider's endpoint
3. Set the appropriate API key via `npx convex env set`

Providers confirmed compatible with the OpenAI SDK format include Mistral AI (`https://api.mistral.ai/v1`), Together AI, and Anyscale.

---

## Production Checklist

Before sharing with real users:

- [ ] Convex backend deployed and all functions visible in dashboard
- [ ] `OPENAI_API_KEY` set in Convex environment
- [ ] Game deployed and accessible via public URL
- [ ] Dashboard deployed and accessible via public URL
- [ ] Registration flow tested end-to-end: create account, receive Family Code, enter game
- [ ] Companion check-in tested: after 2–3 minutes, a companion should approach the player
- [ ] Dashboard tested: enter Family Code, confirm data appears after a conversation
- [ ] Distress detection tested: send a test message containing a flagged keyword, confirm alert appears in dashboard

---

## Troubleshooting

**"Cannot find module convex/_generated/api"**
Run `npx convex dev` once to generate the API types, then rebuild.

**Dashboard shows "Family Code not found"**
Confirm the code is entered in uppercase. Codes use only the characters `A–Z` and `2–9` (no `0`, `O`, `1`, `I`) to avoid ambiguity.

**Companions do not approach the player**
The check-in interval is two to three minutes. Confirm the player has clicked "Interact" and their character is visible on the map. The `lastInviteAttempt` timestamp on each agent resets between sessions.

**Convex functions fail to deploy**
Run `npx convex deploy --typecheck=disable` to bypass TypeScript errors during rapid iteration. Resolve type errors before production release.
