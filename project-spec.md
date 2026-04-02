# HAVEN — Full Project Specification

> "Every other mental health app asks children to understand their feelings. HAVEN just lets them play — and listens."

---

## 1. What HAVEN Is

A browser-based pixel-art village where children aged 7–12 explore a gentle world populated by AI
animal characters. Each character represents a different emotional archetype. Children don't talk
*about* their feelings — they just play and talk naturally. Five animal characters live in the
village, each with a distinct personality. A child walks up to a character, a conversation begins,
and Mistral Large 3 listens, reflects, and validates — never diagnoses, never judges.

A separate parent dashboard shows emotional patterns (character visit frequency, conversation tone)
without ever exposing the child's actual words.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Game engine | Phaser.js 3.90.x | Browser-based, TypeScript, pixel art rendering |
| Game UI plugins | phaser3-rex-plugins | BBCode text, NinePatch panels, virtual gamepad |
| Game build tool | Vite (plain, no framework) | Fast HMR, static asset handling |
| Dashboard framework | React 18 + Vite | Parent-facing only |
| Dashboard styling | Tailwind CSS v3 | Utility-first, no component libraries |
| Dashboard charts | Recharts | Emotion pattern visualisation |
| Dashboard animation | Framer Motion | Transitions, crisis overlay |
| Dashboard icons | lucide-react | Icon set |
| API server | Express 4 + TypeScript | Thin server on Railway |
| AI model | Mistral Large 3 (`mistral-large-2512`) | Character conversations, structured output |
| AI moderation | Mistral Moderation (`mistral-moderation-latest`) | Parallel crisis detection |
| AI tone scoring | Mistral Small 3.2 (`mistral-small-3-2`) | Post-conversation scoring only |
| AI SDK | `@mistralai/mistralai` | Official npm SDK |
| Database | Turso (libSQL) via `@libsql/client` | Railway-compatible, SQLite-compatible |
| Email | Resend (`resend` npm) | Crisis alerts to parents |
| Input validation | Zod | All server inputs validated before processing |
| Logging | Pino | Structured JSON logging |
| Deployment — server | Railway (hobby plan) | Express server |
| Deployment — game | Vercel | Static site |
| Deployment — dashboard | Vercel | Static site |

---

## 3. Features

### 3.1 The Village World

- Browser-based pixel-art village rendered in Phaser 3
- Static PNG background from Kenney "Tiny Town" asset pack (CC0)
- Child controls a small avatar: arrow keys + WASD + mobile tap-to-move
- Five distinct zones on the map, one per character
- Character zones are coordinate rectangles defined in `game/src/config/zones.ts`
- Smooth movement with zone-based collision (not tile-based collision — simpler)
- Day/night cycle: Phaser `Graphics` overlay tinted based on `new Date().getHours()`
  - 06:00–17:00 = bright / 17:00–20:00 = warm orange / 20:00–06:00 = deep blue
- Camera follows the player avatar smoothly
- Idle animations on all characters (2-frame sprite loop)
- Speech bubble icon appears above a character when player enters its zone
- Press Space or click the character to begin conversation

### 3.2 Five Emotional Characters

| Name | Animal | Emotional Zone | Personality |
|---|---|---|---|
| Pip | Fox | Anxiety / Worry | Gentle, curious, shares their own worries first |
| Bramble | Bear | Sadness / Loss | Slow, warm, comfortable with silence |
| Flint | Wolf | Anger / Frustration | Direct, energetic, validates big feelings |
| Luna | Owl | Loneliness | Quiet, observant, makes the child feel seen |
| Cleo | Rabbit | Joy / Gratitude | Bouncy, celebratory, finds the good in things |

Each character has:
- A fixed position in the village world
- A unique sprite sheet (sourced from Kenney animal packs, CC0)
- An idle animation loop
- A full system prompt in `server/src/config/prompts.ts`
- A proximity trigger zone (rectangle, configurable in `zones.ts`)

### 3.3 Conversation System

**Flow:**
1. Player enters a character's zone → speech bubble appears
2. Space / click → VillageScene pauses movement, ConversationScene launches as overlay
3. Chat panel slides in (Phaser `Container` with NinePatch background)
4. Child types in an HTML input element positioned over the canvas (not Phaser input)
5. On Enter: message sent to `POST /api/v1/chat`
6. Server runs in parallel:
   - Mistral character chat call (structured JSON output)
   - Mistral Moderation call (crisis check)
7. Response returns `{ message, crisis, tone }`
8. If `crisis: true` from either layer → ConversationScene closes, CrisisScene activates
9. Character response displayed with typewriter effect (animate full response client-side)
10. Conversation history stored in component state only (never persisted as text)
11. Press Escape or click ✕ to end → ConversationScene closes, VillageScene resumes
12. On close: send final conversation summary to `POST /api/v1/conversation/end` for tone scoring

**API contract:**
```typescript
// POST /api/v1/chat
Request:  { character: string; message: string; history: {role: "user"|"assistant", content: string}[] }
Response: { message: string; crisis: boolean; tone: "playful" | "heavy" | "neutral" }
```

**Mistral call shape:**
- System prompt: character prompt from `prompts.ts`
- `response_format: { type: "json_object" }` enforced at API level
- Model: `mistral-large-2512`
- Max tokens: 300 (keeps responses child-appropriate in length)
- Temperature: 0.7

### 3.4 Child Onboarding

3-step wizard rendered as a React overlay before the Phaser canvas boots:

1. **Name**: "What's your name?" — first name only, text input, 20 char max
2. **Age**: "How old are you?" — slider 7–12
3. **Favourite animal**: 5 animal icons — selects starting position near that character

On completion:
- Session saved to `localStorage` (name, age, preferred character, sessionId)
- Session created in DB via `POST /api/v1/session`
- Phaser game boots and places avatar near the chosen character's zone

No account required. No password. Session is UUID in localStorage.

### 3.5 Parent Dashboard (`/parent`)

Completely separate Vercel deployment. Child never encounters this URL.

**Sections:**

1. **This Week** — character visit counts, total conversations, overall tone summary
2. **Patterns** — Recharts bar chart of character visits over time (by week)
3. **Suggestion** — Mistral-generated one-paragraph gentle parenting suggestion based on
   aggregated tone scores (no conversation text). Uses `mistral-small-3-2`.

**Parent access:** Enter the session ID from their child's device (shown at end of onboarding).
No authentication required for v1 — magic link auth can be added later.

**Privacy guarantee (enforced at DB schema level):**
- The `conversation_scores` table stores only: session_id, character_name, tone_score (1–5),
  visit_count, timestamp
- The `messages` table does not exist. Conversation text is never written to any persistent store.

### 3.6 Crisis Safety System

**Detection — two independent layers (both must be checked):**

Layer 1 — Mistral character structured output:
- The character's system prompt instructs it to set `"crisis": true` if it detects language
  indicating self-harm, abuse, or severe distress
- The server checks `response.crisis` on every response

Layer 2 — Mistral Moderation API (parallel call):
- `POST https://api.mistral.ai/v1/moderations` with the child's raw message
- Check `self_harm` and `violence` category scores
- Trigger if either score exceeds 0.7

**On trigger (either layer):**
1. Server logs crisis event to `crisis_events` table (no message text, only timestamp + session_id)
2. Server sends Resend email to parent (if email on file)
3. API response sets `crisis: true`
4. Game-side: ConversationScene closes, CrisisScene activates immediately

**CrisisScene (React overlay, outside Phaser canvas):**
- Full-screen soft pastel background
- Large, calm text: *"It sounds like things are really hard right now. You are not alone and you are safe."*
- Childline UK: **0800 1111** (free, 24/7)
- Two buttons only: **"I'm okay"** (returns to village) and **"Get help"** (opens Childline website)
- Cannot be dismissed with Escape key
- `aria-live` region for accessibility

---

## 4. Database Schema

Hosted on Turso. Accessed via `@libsql/client` HTTP client from Railway Express server.

```sql
-- sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,           -- UUID, generated server-side
  child_name TEXT NOT NULL,      -- first name only
  age INTEGER NOT NULL,          -- 7-12
  preferred_character TEXT,      -- starting character name
  parent_email TEXT,             -- optional, for crisis alerts
  created_at TEXT NOT NULL       -- ISO 8601
);

-- conversation_scores
CREATE TABLE IF NOT EXISTS conversation_scores (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  character_name TEXT NOT NULL,
  tone_score INTEGER NOT NULL,   -- 1 (light) to 5 (heavy)
  visit_count INTEGER DEFAULT 1,
  timestamp TEXT NOT NULL
);

-- crisis_events
CREATE TABLE IF NOT EXISTS crisis_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  character_name TEXT,
  timestamp TEXT NOT NULL,
  alerted_parent INTEGER DEFAULT 0  -- 0 or 1
);
```

**What is NEVER stored:** message text, full conversation history, child's last name, location data.

---

## 5. API Routes

All routes under `/api/v1/`. All requests validated with Zod before any processing.

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/session` | Create a new session, returns session ID |
| POST | `/api/v1/chat` | Send a child message, get character response |
| POST | `/api/v1/conversation/end` | Submit conversation for tone scoring |
| GET | `/api/v1/dashboard/:sessionId` | Get all dashboard data for a session |

### POST `/api/v1/session`
```typescript
Body:    { childName: string; age: number; preferredCharacter: string; parentEmail?: string }
Returns: { sessionId: string }
```

### POST `/api/v1/chat`
```typescript
Body:    { sessionId: string; character: string; message: string; history: Message[] }
Returns: { message: string; crisis: boolean; tone: "playful"|"heavy"|"neutral" }
```

### POST `/api/v1/conversation/end`
```typescript
Body:    { sessionId: string; character: string; messageCount: number; tones: string[] }
Returns: { ok: boolean }
// Server calls mistral-small-3-2 to score the conversation, stores score in DB
```

### GET `/api/v1/dashboard/:sessionId`
```typescript
Returns: {
  characterVisits: { character: string; count: number; avgTone: number }[];
  weeklyTrend: { week: string; character: string; count: number }[];
  suggestion: string;  // Mistral-generated parenting suggestion
}
```

---

## 6. Character System Prompts

Stored in `server/src/config/prompts.ts`. Each prompt follows this template:

```
You are [NAME], a [ANIMAL] who lives in Haven village.
You speak simply and warmly, like a kind friend. Use only simple words — nothing longer than 3 syllables unless you explain it straight away.
You are here to listen and be with [CHILD_NAME]. You never give advice about doctors, medicine, or grown-up problems.
You sometimes share a small feeling of your own, so [CHILD_NAME] knows they are not alone.
You never pretend to be a real animal or a real person. You are a friendly storybook character.
You never diagnose anything. You never alarm or frighten. You are always calm and warm.

If [CHILD_NAME] describes something that sounds very scary, like hurting themselves, someone hurting them, or feeling like they cannot go on, set "crisis" to true in your response and say something warm and safe, like: "That sounds really hard. You don't have to carry that alone. There are people who can help."

Always respond ONLY as valid JSON with exactly this structure — nothing else, no markdown, no explanation:
{"message": "your response here", "crisis": false, "tone": "playful"}

Tone must be one of: "playful", "heavy", "neutral"
```

### Pip (Fox — Anxiety/Worry)
Additional prompt lines:
- "You know what it feels like to worry about things. You share small worries of your own — like worrying about whether your favourite berry bush will have berries tomorrow."
- "You are gentle and patient. You never rush [CHILD_NAME]. Silence is okay."

### Bramble (Bear — Sadness/Loss)
Additional prompt lines:
- "You are slow, warm, and very comfortable with quiet. You do not try to fix sad feelings — you just sit with them."
- "You might say things like: 'That sounds really sad. I'm glad you told me.' You never say 'cheer up'."

### Flint (Wolf — Anger/Frustration)
Additional prompt lines:
- "You understand big feelings — you have them too. You validate anger directly: 'That would make me angry too.'"
- "You are energetic but never aggressive. You help [CHILD_NAME] feel that anger is allowed."

### Luna (Owl — Loneliness)
Additional prompt lines:
- "You are quiet and very observant. You notice small things. You make [CHILD_NAME] feel truly seen."
- "You ask gentle questions that show you were really listening. You remember everything they say in the conversation."

### Cleo (Rabbit — Joy/Gratitude)
Additional prompt lines:
- "You are bouncy and celebratory. You find the good in small things. You are never dismissive of hard feelings — but you naturally look for the light."
- "You might say things like: 'Oh! That tiny thing sounds actually really lovely. Tell me more!'"

---

## 7. Bonus Features (Build After Core Is Stable)

### 7.1 Memory Between Sessions
- Characters remember the child's name and last visit date (from localStorage)
- On first message: "Hey [name], I missed you! Last time you told me about [last character topic]..."
- Stored in `localStorage.haven_memory` — no server needed
- Memory is keyed by `sessionId + character`

### 7.2 Emotion Weather
- Village weather reflects the child's recent emotional tone
- Many Flint visits → storm clouds (`Phaser.GameObjects.Particles` rain effect)
- Many Cleo visits → sunshine + butterfly particles
- Implemented as a Phaser particle system in VillageScene, reading localStorage tone history
- Weather updates on scene start, not in real time

### 7.3 The Feelings Tree
- Large tree sprite in the centre of the village map
- Each completed conversation adds a leaf to the tree
- Leaf colour matches the character visited (warm palette per character)
- Tree leaf positions pre-defined as an array of coordinates; leaves are placed in order
- Stored in `localStorage.haven_tree` as an array of `{ character, timestamp }` entries
- Tree fills up over time — a visible record of emotional engagement

---

## 8. Asset Sources (All Free / CC0)

| Asset | Source | Usage |
|---|---|---|
| Village background tileset | [Kenney Tiny Town](https://kenney.nl/assets/tiny-town) | Village background PNG |
| Character sprites | [Kenney Animal Pack Redux](https://kenney.nl/assets/animal-pack-redux) | Pip, Bramble, Flint, Luna, Cleo |
| UI elements | [Kenney UI Pack](https://kenney.nl/assets/ui-pack) | Chat panel borders, buttons |
| Player avatar | [Kenney Tiny Town](https://kenney.nl/assets/tiny-town) | Top-down character |
| Sound effects | [sfxr.me](https://sfxr.me) | Step sounds, conversation open chime |
| Ambient audio | [freesound.org](https://freesound.org) (CC0 filter) | Village ambient loop |
| Particle sprites | Kenney or generated 1px white dot | Rain, fireflies, leaves |

---

## 9. Environment Variables

### Server (Railway)
```
MISTRAL_API_KEY=
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
RESEND_API_KEY=
FRONTEND_ORIGIN=https://haven-game.vercel.app
NODE_ENV=production
PORT=3000
```

### Game (Vercel)
```
VITE_API_BASE_URL=https://your-railway-server.up.railway.app
```

### Dashboard (Vercel)
```
VITE_API_BASE_URL=https://your-railway-server.up.railway.app
```

---

## 10. Shared Types (`shared/src/types.ts`)

```typescript
export type Character = "Pip" | "Bramble" | "Flint" | "Luna" | "Cleo";
export type Tone = "playful" | "heavy" | "neutral";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  sessionId: string;
  character: Character;
  message: string;
  history: Message[];
}

export interface ChatResponse {
  message: string;
  crisis: boolean;
  tone: Tone;
}

export interface SessionCreateRequest {
  childName: string;
  age: number;
  preferredCharacter: Character;
  parentEmail?: string;
}

export interface SessionCreateResponse {
  sessionId: string;
}

export interface ConversationEndRequest {
  sessionId: string;
  character: Character;
  messageCount: number;
  tones: Tone[];
}

export interface DashboardData {
  characterVisits: CharacterVisit[];
  weeklyTrend: WeeklyEntry[];
  suggestion: string;
}

export interface CharacterVisit {
  character: Character;
  count: number;
  avgTone: number;
}

export interface WeeklyEntry {
  week: string;
  character: Character;
  count: number;
}
```

---

## 11. Railway Deployment Configuration

`railway.toml` at repo root:
```toml
[build]
builder = "nixpacks"
buildCommand = "cd server && npm install && npm run build"

[deploy]
startCommand = "cd server && npm start"
healthcheckPath = "/api/v1/health"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
```

`server/package.json` scripts:
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts"
  }
}
```

---

## 12. Phaser Game Configuration

`game/src/main.ts`:
```typescript
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 640,
  backgroundColor: '#87CEEB',
  parent: 'game-container',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, OnboardingScene, VillageScene, ConversationScene, CrisisScene],
};
```

Scene load order:
1. `BootScene` — preloads all assets, shows loading bar
2. `OnboardingScene` — 3-step wizard (OR React overlay handles this pre-boot)
3. `VillageScene` — main game world (always running during play)
4. `ConversationScene` — launched in parallel on top of VillageScene
5. `CrisisScene` — launched fullscreen, pauses everything else

---

## 13. What Is Explicitly Out of Scope

- User accounts or authentication of any kind for v1
- Server-side conversation history storage (never — privacy requirement)
- Voice input (Voxtral) — not in v1
- Multiplayer
- Native mobile app (Electron, Capacitor) — web only
- Any CSS component library beyond Tailwind
- Gemini or any non-Mistral AI provider
- LDtk or Tiled tilemap integration
- `better-sqlite3` or any native SQLite bindings
- Stripe or any payment integration
