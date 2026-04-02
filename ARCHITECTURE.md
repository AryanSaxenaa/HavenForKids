# HAVEN — Architecture Reference

A quick-reference for AI tools. When generating code, always check this file first to understand
data flow, boundaries, and responsibilities between layers.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  BROWSER                                                            │
│                                                                     │
│  ┌──────────────────────────┐   ┌──────────────────────────────┐   │
│  │  GAME  (Vercel)          │   │  DASHBOARD  (Vercel)         │   │
│  │  Phaser 3 + plain Vite   │   │  React 18 + Vite             │   │
│  │  route: /                │   │  route: /parent              │   │
│  │                          │   │                              │   │
│  │  - VillageScene          │   │  - CharacterChart            │   │
│  │  - ConversationScene     │   │  - WeekSummary               │   │
│  │  - CrisisScene (React)   │   │  - ToneBreakdown             │   │
│  │  - OnboardingScene       │   │  - Suggestion                │   │
│  │                          │   │                              │   │
│  │  localStorage:           │   │  reads: sessionId from URL   │   │
│  │    sessionId, childName  │   │  param or manual entry       │   │
│  │    age, memory, tree     │   │                              │   │
│  └──────────┬───────────────┘   └───────────────┬──────────────┘   │
│             │ VITE_API_BASE_URL                  │                  │
└─────────────┼──────────────────────────────────-─┼──────────────────┘
              │ HTTPS                              │ HTTPS
              ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  SERVER  (Railway hobby plan)                                       │
│  Express 4 + TypeScript                                             │
│                                                                     │
│  /api/v1/session        POST  → creates session in Turso DB         │
│  /api/v1/chat           POST  → calls Mistral (parallel moderation) │
│  /api/v1/conversation/end POST → tone scoring, stores score in DB   │
│  /api/v1/dashboard/:id  GET  → aggregates data + Mistral suggestion │
│  /api/v1/health         GET  → Railway healthcheck                  │
│                                                                     │
│  services/mistral.ts    ← all Mistral SDK calls live here           │
│  services/moderation.ts ← Mistral Moderation API calls live here    │
│  services/crisis.ts     ← DB log + Resend email                     │
│  services/toneScorer.ts ← mistral-small-3-2 scoring                 │
│                                                                     │
└──────────┬──────────────────────┬───────────────────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐   ┌──────────────────────────────────────────────┐
│  Turso DB        │   │  Mistral API (api.mistral.ai)                │
│  (libSQL/SQLite) │   │                                              │
│                  │   │  mistral-large-2512   — character chat       │
│  sessions        │   │  mistral-moderation-latest — safety check    │
│  conversation_   │   │  mistral-small-3-2    — tone scoring         │
│    scores        │   │                                              │
│  crisis_events   │   └──────────────────────────────────────────────┘
│                  │
└──────────────────┘
           │
           ▼
┌──────────────────┐
│  Resend          │
│  (crisis emails) │
└──────────────────┘
```

---

## Data Flow: Child Sends a Message

```
1. Child types message in HTML <input> over Phaser canvas
2. game/src/api/client.ts  →  POST /api/v1/chat
   body: { sessionId, character, message, history[] }

3. server/routes/chat.ts
   ├── Zod validates body
   ├── Launches PARALLEL:
   │   ├── services/mistral.ts  →  mistral-large-2512
   │   │   system: prompts[character]
   │   │   response_format: json_object
   │   │   returns: { message, crisis, tone }
   │   │
   │   └── services/moderation.ts  →  mistral-moderation-latest
   │       input: child's raw message
   │       checks: self_harm > 0.7, violence > 0.7
   │
   ├── await Promise.all([chatCall, moderationCall])
   │
   ├── If crisis (either source):
   │   ├── services/crisis.ts → INSERT crisis_events, Resend email
   │   └── return { message: safeResponse, crisis: true, tone: "heavy" }
   │
   └── return { message, crisis: false, tone }

4. game/src/scenes/ConversationScene.ts
   ├── If crisis: true → launch CrisisScene
   └── Else: typewriter-animate response in ChatPanel
```

---

## Data Flow: Conversation Ends

```
1. Child closes chat (Escape / ✕ button)
2. ConversationScene collects: { character, messageCount, tones[] }
3. POST /api/v1/conversation/end
4. server/routes/chat.ts
   └── services/toneScorer.ts → mistral-small-3-2
       prompt: "Score this conversation 1-5 for emotional weight. Return JSON: {score: number}"
       INSERT INTO conversation_scores (session_id, character_name, tone_score, timestamp)
```

---

## Data Flow: Parent Dashboard Loads

```
1. Parent visits /parent?session=<sessionId>
2. dashboard/src/hooks/useDashboardData.ts → GET /api/v1/dashboard/:sessionId
3. server/routes/dashboard.ts
   ├── SELECT character_visits from conversation_scores
   ├── Aggregate weekly_trend
   ├── Call services/mistral.ts → mistral-small-3-2
   │   prompt: aggregated visit/tone data only (NO conversation text)
   │   returns: one-paragraph gentle parenting suggestion
   └── return { characterVisits, weeklyTrend, suggestion }
4. dashboard renders: CharacterChart, WeekSummary, ToneBreakdown, Suggestion
```

---

## Boundary Rules — Who Owns What

| Concern | Owner | Never |
|---|---|---|
| Mistral API key | server only | game or dashboard |
| Conversation text | nowhere (transient in browser memory only) | database |
| Session ID | localStorage (game) → URL param (dashboard) | hardcoded |
| Crisis detection | server (both layers) | client-only |
| Crisis UI | React overlay (CrisisScene) | Phaser scene |
| Tone scores | server → Turso | browser localStorage |
| Child name/age | localStorage + sessions table | Mistral prompts |
| Parent email | sessions table | any Mistral call |
| Phaser canvas | Phaser only | React should not re-render it |
| Overlays (onboarding, crisis) | React portals outside canvas | Phaser DOM elements |

---

## React ↔ Phaser Communication

The game and React overlays live in the same HTML page at `/`. Communication is via a
lightweight event bus — a simple `EventEmitter` singleton at `game/src/events/bus.ts`.

```typescript
// game/src/events/bus.ts
import mitt from 'mitt'
type Events = {
  'crisis:trigger': void
  'onboarding:complete': { childName: string; age: number; preferredCharacter: string }
  'conversation:open': { character: string }
  'conversation:close': void
  'game:ready': void
}
export const bus = mitt<Events>()
```

- React components `import { bus }` and listen with `bus.on(...)`
- Phaser scenes `import { bus }` and emit with `bus.emit(...)`
- `mitt` npm package (tiny, zero deps)

---

## LocalStorage Keys

All keys prefixed with `haven_` to avoid collisions.

| Key | Type | Contents |
|---|---|---|
| `haven_session` | JSON | `{ sessionId, childName, age, preferredCharacter }` |
| `haven_memory` | JSON | `{ [character]: { lastVisit: string, lastTopic: string } }` |
| `haven_tree` | JSON | `{ leaves: { character: string, timestamp: string }[] }` |
| `haven_weather` | JSON | `{ recentTones: string[] }` (last 10 conversation tones) |

---

## Error Handling Conventions

### Server
- All route handlers wrapped in `asyncHandler` middleware (catches async errors, passes to Express error handler)
- Zod validation failures → 400 with `{ error: string, issues: ZodIssue[] }`
- Mistral API errors → 502 with `{ error: "AI service unavailable" }` (never expose Mistral error details to client)
- Crisis detection failure → fail safe: treat as crisis detected, never swallow silently
- DB errors → 500 with generic message, full error logged via pino

### Game
- API call failures → show a friendly in-game message: "Hmm, [character] seems to be resting. Try again in a moment!"
- Never show raw error messages to children
- Network timeout → 8 second timeout on all fetch calls, graceful fallback

### Dashboard
- API failures → skeleton loading state, then gentle empty state message
- No raw error strings visible to parents
