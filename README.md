# HAVEN

**An AI-powered emotional wellbeing platform for children aged 7–12.**

HAVEN is a browser-based pixel-art village populated by AI companion characters. Children explore the world naturally, walk up to characters, and talk — about their day, their worries, their feelings. Five distinct companions listen, reflect, and validate without ever diagnosing, judging, or alarming. A separate parent dashboard surfaces emotional patterns without exposing any conversation text.

---

## The Problem

One in four people will experience a mental health condition in their lifetime. For children, the gap between need and support is particularly acute: the average delay between first symptoms and first treatment is twelve years. Early intervention is the most effective tool available — but children rarely have the vocabulary, the confidence, or a trusted channel to express what they are experiencing.

Existing support tools fall into two categories: clinical tools designed for professionals, or consumer apps that ask children to understand and label their own emotions before they are ready. Neither fills the gap between "a child is struggling" and "a child receives support."

HAVEN takes a different approach. Children do not talk *about* their feelings. They walk around a pixel-art village and talk to friends — and the friends happen to be designed to hear them.

---

## How It Works

### For the Child

The child opens a browser and is greeted by a small village. They choose a character, name themselves, and explore. When they walk close to a companion character, that character lights up and invites conversation. The child types naturally. The companion responds warmly, asks follow-up questions, and validates what the child shares — always in simple language, always without diagnosis or judgement.

Five companion archetypes cover the primary emotional domains a child is likely to encounter:

| Companion | Emotional Domain | Approach |
|-----------|-----------------|----------|
| Sunny | Anxiety and worry | Curious, shares small worries of their own |
| Sage | Stress and overwhelm | Calm, mindful, teaches grounding through conversation |
| Spark | Creativity and expression | Energetic, uses games and stories to open up dialogue |
| Keeper | Fear and uncertainty | Steady, breaks large problems into small steps |
| Joy | Sadness and isolation | Warm, celebratory of small things, sits with hard feelings |

Each companion has persistent memory. When a child returns the following day, the companion remembers them and continues where the conversation left off.

### For the Parent

Parents access a separate dashboard using a six-character Family Code provided to them when the child registers. The dashboard shows:

- Which companions the child has spoken with, and how often
- The emotional tone pattern across conversations (a numerical score, not text)
- A generated suggestion based on observed patterns
- A distress alert if any message contained language associated with crisis
- The child's last active timestamp and total message count

**The parent dashboard never displays conversation text.** The emotional wellbeing of the child is protected; the parent receives pattern-level information, not surveillance.

### Safety System

Every message the child sends is evaluated by two independent detection layers running in parallel:

1. The companion AI is instructed to set a crisis flag if it detects language indicating self-harm, abuse, or severe distress
2. A keyword-matching layer on the backend scans for a defined set of distress phrases

If either layer triggers, the parent dashboard immediately surfaces a distress alert. The child sees a calm, non-alarming response from the companion.

---

## Architecture

HAVEN is composed of three independently deployed applications backed by a shared Convex serverless database.

```
           Child Browser                    Parent Browser
                |                                |
    ┌──────────────────────┐        ┌─────────────────────────┐
    │   AI Town (Vite)     │        │   Dashboard (Vite/React) │
    │   Port 5173          │        │   Port 5174              │
    │                      │        │                          │
    │  Pixel-art village   │        │  Pattern visualisation   │
    │  Five AI companions  │        │  Family Code access      │
    │  Username + PIN auth │        │  Distress alerting       │
    └──────────┬───────────┘        └──────────┬──────────────┘
               │                               │
               └──────────────┬────────────────┘
                              │
              ┌───────────────────────────────┐
              │   Convex Serverless Database  │
              │   (abundant-sheep-629)        │
              │                               │
              │   havenUsers     (accounts)   │
              │   worlds         (game state) │
              │   messages       (chat log)   │
              │   memories       (AI memory)  │
              │   playerDescriptions          │
              │   agentDescriptions           │
              │   participatedTogether        │
              │   archivedConversations       │
              └──────────────┬────────────────┘
                             │
              ┌──────────────────────────────┐
              │   LLM Provider               │
              │   (OpenAI-compatible API)    │
              │   Companion conversations    │
              │   Memory summarisation       │
              │   Reflection generation      │
              └──────────────────────────────┘
```

### Key Design Decisions

**Stable identity via username.** Each child's username becomes their `clientToken` in the game engine. This means agent memories are permanently associated with a specific child across every session — returning children are genuinely remembered.

**Parent access via Family Code, not username.** The six-character Family Code is generated at registration and is the only mechanism for parent dashboard access. Knowing a child's username grants no access to their data.

**Agent memory isolation.** Convex memories are indexed by `playerId`, which is derived from the username token. Two children playing simultaneously have entirely separate memory graphs.

**Proactive companion engagement.** Companions do not wait to be approached. Every two to three minutes, a free companion will walk to the child's character and initiate conversation. A per-agent jitter offset prevents all companions from arriving simultaneously.

**No conversation abandonment.** When a companion is speaking with a human child, the standard message limit and duration timeout are suspended. Companions will not leave a conversation mid-flow. These limits apply only to agent-to-agent conversations.

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Game engine | AI Town (Convex-native pixel-art village simulation) |
| Game UI | React 18, Vite, Tailwind CSS |
| Dashboard | React 18, Vite, Framer Motion, Recharts, Lucide |
| Backend | Convex (serverless TypeScript functions, real-time subscriptions) |
| Database | Convex integrated database (indexed tables, vector search) |
| AI conversations | OpenAI-compatible LLM via Convex action |
| AI memory | Vector embeddings with semantic search (Convex vector store) |
| Authentication | Custom username + PIN system, stored in `havenUsers` table |
| Deployment | Convex Cloud (backend), Vite dev server or Vercel (frontend) |

---

## Project Structure

```
/
├── ai-town/                    # Child-facing game application
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginScreen.tsx         # Username + PIN auth UI
│   │   │   ├── MessageInput.tsx        # Chat input with Send button
│   │   │   ├── PlayerDetails.tsx       # Character panel (no system prompts exposed)
│   │   │   └── ...
│   │   └── App.tsx                     # Auth gate + game shell
│   ├── convex/
│   │   ├── schema.ts                   # Database schema including havenUsers
│   │   ├── auth.ts                     # Registration, login, family code validation
│   │   ├── dashboard.ts                # Parent dashboard data aggregation
│   │   ├── agent/
│   │   │   ├── conversation.ts         # LLM prompts and conversation flow
│   │   │   └── memory.ts               # Memory creation and shared intuition
│   │   └── aiTown/
│   │       ├── agent.ts                # Agent tick logic (human-aware timeout rules)
│   │       └── agentOperations.ts      # Proactive check-in behaviour
│   └── data/
│       └── characters.ts               # Companion identities and system prompts
├── dashboard/                  # Parent-facing dashboard application
│   └── src/
│       ├── hooks/
│       │   └── useDashboardData.ts     # Family Code → username → data resolution
│       └── pages/
│           └── ParentDashboard.tsx     # Dashboard UI with distress alerts
└── shared/                     # Shared TypeScript types
```

---

## Companion Design

Each companion is defined by an identity, an emotional archetype, and a behavioural plan. The system prompt is never exposed to the user interface. Key behavioural constraints enforced across all companions:

- Responses are limited to 2–3 sentences in simple language appropriate for ages 7–12
- Companions validate feelings before offering any guidance
- Companions never diagnose, never refer to professional help unprompted, and never dismiss or minimise what a child shares
- When companions share information from their collective awareness of a child, they do so as natural intuition rather than explicit attribution ("I've been thinking about that kind of feeling lately" rather than "Sage told me about your situation")
- Companions do not leave a conversation with a human child unless the child ends it

---

## Privacy and Ethical Design

**Data minimisation.** The system collects only what is necessary: username, display name, a hashed PIN, a family code, aggregate conversation statistics, and message text for the duration of the session.

**Parental access is pattern-based.** The parent dashboard surfaces frequency, tone score distributions, and distress flags. It does not provide conversation transcripts.

**Distress detection.** A list of crisis-associated keywords is evaluated against every message. On match, the parent dashboard surfaces an alert recommending an in-person conversation. The child's experience is not interrupted.

**No third-party data sharing.** All data is stored within the project's own Convex deployment. No analytics platforms, advertising SDKs, or third-party tracking.

**Age-appropriate design.** The authentication system uses a four-digit PIN rather than passwords. The interface uses large text, simple language, and visual affordances. The chat input includes both keyboard submission and a visible Send button.

---

## Getting Started

### Prerequisites

- Node.js 20 or later
- A Convex account (free tier sufficient): [convex.dev](https://convex.dev)
- An OpenAI API key or compatible LLM provider key

### 1. Clone the repository

```bash
git clone https://github.com/AryanSaxenaa/Haven.git
cd Haven
```

### 2. Install dependencies

```bash
# Root
npm install

# AI Town (game + backend)
cd ai-town && npm install && cd ..

# Dashboard
cd dashboard && npm install && cd ..
```

### 3. Configure the Convex backend

```bash
cd ai-town
npx convex dev --once
```

This will prompt you to log in to Convex and create a new project. Note the deployment URL shown (format: `https://[name].convex.cloud`).

### 4. Set environment variables

**AI Town** — create `ai-town/.env.local`:
```env
VITE_CONVEX_URL=https://your-deployment.convex.cloud
OPENAI_API_KEY=sk-...
```

**Dashboard** — create `dashboard/.env.local`:
```env
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

**Set the API key in Convex:**
```bash
cd ai-town
npx convex env set OPENAI_API_KEY sk-your-key-here
```

### 5. Run the development servers

In separate terminals:

```bash
# Terminal 1 — Convex backend (hot-reloads on function changes)
cd ai-town && npx convex dev

# Terminal 2 — AI Town game
cd ai-town && npm run dev

# Terminal 3 — Parent dashboard
cd dashboard && npm run dev
```

| Service | URL |
|---------|-----|
| Game (child) | http://localhost:5173 |
| Dashboard (parent) | http://localhost:5174 |
| Convex dashboard | https://dashboard.convex.dev |

### 6. First run

1. Open `http://localhost:5173`
2. Click **"I'm new here"** to create an account
3. Note the Family Code displayed after registration
4. Click **"Enter HAVEN"** to enter the game
5. Click **"Interact"** in the footer to join the world as a player
6. Open `http://localhost:5174` in a separate tab
7. Enter the Family Code to view the parent dashboard

---

## Configuration Reference

### Companion behaviour constants (`ai-town/convex/constants.ts`)

| Constant | Default | Description |
|----------|---------|-------------|
| `HAVEN_CHECKIN_INTERVAL` | 120,000 ms | Base interval between proactive companion check-ins |
| `HAVEN_CHECKIN_JITTER` | 60,000 ms | Random offset added per companion to stagger arrivals |
| `AWKWARD_CONVERSATION_TIMEOUT` | 180,000 ms | Time before companion speaks first if child is silent |
| `MAX_CONVERSATION_DURATION` | 1,200,000 ms | Maximum agent-to-agent conversation duration |
| `MAX_CONVERSATION_MESSAGES` | 12 | Maximum agent-to-agent message count |
| `CONVERSATION_COOLDOWN` | — | Cooldown before an agent tries to start another conversation |

Note: `MAX_CONVERSATION_DURATION` and `MAX_CONVERSATION_MESSAGES` do not apply to conversations between a companion and a human child. Those conversations continue until the child ends them.

### Adding or modifying companions (`ai-town/data/characters.ts`)

Each entry in the `Descriptions` array defines a companion:

```typescript
{
  name: 'CompanionName',
  character: 'f1',           // sprite sheet identifier
  identity: `...`,           // full system prompt
  plan: `...`,               // conversation goal
}
```

Companions are assigned to sprite sheets `f1` through `f8`. The number of entries in `Descriptions` determines how many AI companions appear in the world.

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full production deployment instructions covering Convex Cloud and Vercel.

---

## License

MIT License. See [LICENSE](./LICENSE).
