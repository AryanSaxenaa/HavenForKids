# HAVEN — Build Order

Step-by-step sequence for building the project. Follow this order exactly.
Each step is a discrete, testable unit. Do not skip ahead.

---

## Step 0 — Repo & Tooling Bootstrap

```bash
# Init monorepo
mkdir haven && cd haven
git init
echo "node_modules\n.env\n.env.local\ndist\n*.db" > .gitignore

# Create workspace structure
mkdir -p game/src dashboard/src server/src shared/src

# Root package.json (workspaces)
npm init -y
# Add: "workspaces": ["game", "dashboard", "server", "shared"]

# Shared types package first — everything depends on it
cd shared && npm init -y && npm i -D typescript
# Create shared/src/types.ts (full content in project-spec.md section 10)

# Server
cd ../server && npm init -y
npm i express @mistralai/mistralai @libsql/client resend zod cors helmet pino pino-pretty dotenv mitt
npm i -D typescript ts-node @types/express @types/cors @types/node

# Game
cd ../game && npm init -y
npm i phaser phaser3-rex-plugins mitt
npm i -D vite typescript

# Dashboard
cd ../dashboard && npm init -y
npm i react react-dom recharts framer-motion lucide-react mitt
npm i -D vite @vitejs/plugin-react typescript tailwindcss postcss autoprefixer @types/react @types/react-dom
npx tailwindcss init -p
```

**Checkpoint**: `shared/src/types.ts` exists and compiles cleanly.

---

## Step 1 — Database Setup

1. Install Turso CLI and create database (see `ENV.md` → Turso Setup Checklist)
2. Create `server/src/db/schema.sql` (content in `project-spec.md` section 4)
3. Run schema against Turso: `turso db shell haven-db < server/src/db/schema.sql`
4. Create `server/src/db/client.ts`:
   ```typescript
   import { createClient } from '@libsql/client'
   import { env } from '../config/env'
   export const db = createClient({
     url: env.TURSO_DATABASE_URL,
     authToken: env.TURSO_AUTH_TOKEN,
   })
   ```

**Checkpoint**: `db.execute('SELECT 1')` succeeds without error.

---

## Step 2 — Server Skeleton

1. `server/src/config/env.ts` — Zod env validation (content in `ENV.md`)
2. `server/src/index.ts` — Express app with:
   - `helmet()`, `cors()`, `express.json()`
   - `pino-http` request logging
   - Health route: `GET /api/v1/health → { status: 'ok', timestamp }`
   - 404 handler
   - Global error handler
3. `server/src/middleware/validate.ts` — Zod validation middleware factory
4. `server/src/middleware/rateLimit.ts` — basic rate limiter (use `express-rate-limit` package)

**Checkpoint**: Server starts on `PORT=3000`, health endpoint returns 200.

---

## Step 3 — Session Route

1. `server/src/routes/session.ts`
   - `POST /api/v1/session`
   - Zod schema: `{ childName, age, preferredCharacter, parentEmail? }`
   - Generate UUID (`crypto.randomUUID()`)
   - INSERT into `sessions` table
   - Return `{ sessionId }`
2. Mount route in `index.ts`

**Checkpoint**: POST to `/api/v1/session` creates a row in Turso and returns a sessionId.

---

## Step 4 — Mistral Services

Build services in this order. Test each independently before moving on.

### 4a — Character Chat
`server/src/services/mistral.ts`
```typescript
async function chatWithCharacter(
  character: Character,
  message: string,
  history: Message[]
): Promise<{ message: string; crisis: boolean; tone: Tone }>
```
- Uses `@mistralai/mistralai` SDK
- Model: `mistral-large-2512`
- `response_format: { type: 'json_object' }`
- Prepend character system prompt from `prompts.ts`
- Parse JSON response, validate shape with Zod
- Return `{ message, crisis, tone }`

### 4b — Moderation
`server/src/services/moderation.ts`
```typescript
async function moderateMessage(text: string): Promise<boolean>
// returns true if crisis detected (self_harm or violence > 0.7)
```
- Uses Mistral Moderation API endpoint
- Check `self_harm` and `violence` category scores

### 4c — Tone Scorer
`server/src/services/toneScorer.ts`
```typescript
async function scoreConversation(
  character: Character,
  messageCount: number,
  tones: Tone[]
): Promise<number>
// returns 1–5
```
- Uses `mistral-small-3-2`
- Prompt from `PROMPTS.md → Tone Scorer Prompt`

### 4d — Parent Suggestion
Add to `server/src/services/mistral.ts`:
```typescript
async function generateParentSuggestion(
  visits: CharacterVisit[],
  childAge: number
): Promise<string>
```
- Uses `mistral-small-3-2`
- Prompt from `PROMPTS.md → Parent Suggestion Prompt`

**Checkpoint**: Call each function from a test script, verify output shapes are correct.

---

## Step 5 — Chat Route

`server/src/routes/chat.ts`

1. `POST /api/v1/chat`
   - Validate input with Zod
   - Run `Promise.all([chatWithCharacter(...), moderateMessage(...)])`
   - If either returns crisis: call `crisis.ts` handler, return `{ ..., crisis: true }`
   - Else return `{ message, crisis: false, tone }`

2. `POST /api/v1/conversation/end`
   - Validate input with Zod
   - Call `scoreConversation(...)` → INSERT into `conversation_scores`

3. Mount routes in `index.ts`

**Checkpoint**: POST to `/api/v1/chat` with a test message returns a valid character response.

---

## Step 6 — Crisis Handler

`server/src/services/crisis.ts`
```typescript
async function handleCrisis(sessionId: string, character: string): Promise<void>
// 1. INSERT into crisis_events
// 2. SELECT parent_email from sessions where id = sessionId
// 3. If email exists: send Resend email
```

- Resend `from`: value of `RESEND_FROM_EMAIL` env var
- Subject: "HAVEN — Important notification about your child"
- Body: brief, calm, non-alarming message that a safety system was triggered, advising parent to check in

**Checkpoint**: Trigger a crisis via the chat endpoint, verify DB row + email (use Resend test mode).

---

## Step 7 — Dashboard Route

`server/src/routes/dashboard.ts`
1. `GET /api/v1/dashboard/:sessionId`
   - SELECT character visits + tone scores from `conversation_scores`
   - Aggregate `characterVisits[]` and `weeklyTrend[]`
   - Call `generateParentSuggestion(visits, childAge)`
   - Return full `DashboardData`

**Checkpoint**: Seed some test data, hit the endpoint, verify all three response fields are populated.

---

## Step 8 — Game Bootstrap

1. Create `game/index.html` with:
   - `<div id="app"></div>` (React root for overlays)
   - `<div id="game-container"></div>` (Phaser mounts here)
   - `<input id="chat-input" type="text" />` (absolutely positioned, hidden by default)

2. `game/src/main.ts` — Phaser game config (content in `project-spec.md` section 12)

3. `game/src/events/bus.ts` — `mitt` event bus (content in `ARCHITECTURE.md`)

4. `game/src/api/client.ts` — fetch wrapper:
   ```typescript
   const BASE = import.meta.env.VITE_API_BASE_URL
   export async function chatRequest(body: ChatRequest): Promise<ChatResponse> { ... }
   export async function createSession(body: SessionCreateRequest): Promise<SessionCreateResponse> { ... }
   export async function endConversation(body: ConversationEndRequest): Promise<void> { ... }
   ```

**Checkpoint**: Phaser game boots showing a blank canvas with the correct dimensions.

---

## Step 9 — BootScene

`game/src/scenes/BootScene.ts`
- Load all assets (keys listed in `SCENES.md → BootScene`)
- Show progress bar
- On complete: check `localStorage.haven_session`, emit `bus.emit('game:ready')` if no session

**Checkpoint**: BootScene completes, all assets loaded, no 404s in console.

---

## Step 10 — Onboarding (React Overlay)

`game/src/components/OnboardingOverlay.tsx`
- 3-step wizard: name → age → favourite character
- Framer Motion step transitions
- On complete: call `createSession(...)`, save to `localStorage.haven_session`, bus.emit `onboarding:complete`

`game/src/main.tsx` (React root):
- Listen for `bus.on('game:ready')` → show `<OnboardingOverlay>` if no session
- Listen for `bus.on('onboarding:complete')` → hide overlay, start `VillageScene`

**Checkpoint**: Full onboarding flow works, sessionId in localStorage after completion.

---

## Step 11 — VillageScene

`game/src/scenes/VillageScene.ts`
- Background image
- Player sprite + movement + camera follow
- 5 character sprites at zone positions
- Proximity detection (Phaser overlap or manual distance check in update())
- Speech bubble when in range
- Launch ConversationScene on Space/click

**Checkpoint**: Player can walk around, approaches characters, speech bubble appears.

---

## Step 12 — ConversationScene

`game/src/scenes/ConversationScene.ts`
- Slide-in chat panel
- Character portrait + name
- Chat history display (BBCodeText, scrollable)
- HTML input positioned over canvas
- API call on submit
- Typewriter animation on response
- Crisis detection → bus.emit
- Close / end conversation

`game/src/components/CrisisOverlay.tsx`
- React portal, triggered by bus event

**Checkpoint**: Full conversation flow works end-to-end. Crisis overlay triggers on test crisis message.

---

## Step 13 — Parent Dashboard

`dashboard/src/App.tsx` → routes to `/parent`
`dashboard/src/pages/ParentDashboard.tsx` → fetches data, renders components
`dashboard/src/components/CharacterChart.tsx` → Recharts bar chart
`dashboard/src/components/WeekSummary.tsx`
`dashboard/src/components/ToneBreakdown.tsx`
`dashboard/src/components/Suggestion.tsx`

**Checkpoint**: Dashboard loads for a valid sessionId, all three sections render with data.

---

## Step 14 — Deploy

1. Push to GitHub
2. Railway: connect repo, set env vars, deploy server
3. Vercel: deploy game/ subdirectory, set `VITE_API_BASE_URL`
4. Vercel: deploy dashboard/ subdirectory, set `VITE_API_BASE_URL`
5. Verify health endpoint on Railway URL
6. Verify full flow: onboarding → village → chat → dashboard

---

## Step 15 — Bonus Features (only after Step 14 is fully stable)

- **Memory between sessions**: `localStorage.haven_memory`, prepend to first message of each conversation
- **Emotion Weather**: VillageScene reads recent tones from localStorage, applies particle effect
- **Feelings Tree**: VillageScene reads `localStorage.haven_tree`, renders leaves on tree sprite

---

## Debugging Reference

| Symptom | Likely cause | Fix |
|---|---|---|
| Mistral returns non-JSON | Model ignoring `response_format` | Ensure `response_format: { type: 'json_object' }` is in the SDK call, not just in the prompt |
| Turso connection timeout | Wrong URL format | Must start with `libsql://`, not `https://` |
| CORS error in game | `FRONTEND_ORIGIN` not set | Add localhost:5173 to FRONTEND_ORIGIN in dev |
| Phaser canvas wrong size | Scale mode misconfigured | Use `Phaser.Scale.FIT` + `CENTER_BOTH` |
| Chat input invisible | HTML input z-index | Set `z-index: 1000`, position `absolute` on `#chat-input` |
| TypeScript errors in shared | Module resolution | Use `"moduleResolution": "bundler"` in tsconfig |
| Railway healthcheck failing | Wrong healthcheck path | Must be `/api/v1/health`, not `/health` |
