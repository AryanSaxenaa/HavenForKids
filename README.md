# HavenForKids

### AI-Powered Emotional Wellbeing for Children, Real-Time Insights for Parents

> **Live:** [Play HavenForKids](https://havenforkids-game-kmj4z2oxfa-uc.a.run.app) &nbsp;·&nbsp; [Parent Dashboard](https://havenforkids-dashboard-kmj4z2oxfa-uc.a.run.app)

---

HAVEN is a browser-based pixel-art village where AI companion characters help children aged 7–12 express their feelings through natural conversation. Children don't fill out mood surveys or label emotions — they walk around a cosy village, chat with storybook friends, and feel heard. Behind the scenes, a real-time parent dashboard surfaces emotional patterns, sentiment trends, and distress alerts — **without ever exposing conversation text**.

<br>

## Why HAVEN Exists

One in four people will experience a mental health condition in their lifetime. For children, the gap between need and support is staggering: the average delay between first symptoms and first professional help is **twelve years**. Early intervention is the single most effective tool we have — but children rarely have the vocabulary, the confidence, or a trusted channel to express what they are going through.

Existing tools fall into two categories: clinical instruments designed for professionals, or consumer apps that ask children to understand and label their own emotions before they are developmentally ready. Neither fills the gap between *"a child is struggling"* and *"a child receives support."*

**HAVEN takes a different approach.** Children don't talk *about* their feelings. They walk around a pixel-art village and talk to friends — and the friends happen to be designed to hear them.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Pixel-art village** | A warm, explorable overworld powered by PixiJS — no downloads, runs in any modern browser |
| **AI companions** | Three distinct companions (Sunny, Sage, Keeper) each specialising in a different emotional domain |
| **Proactive check-ins** | Companions don't wait to be approached — they walk to the child and start conversations every 2–3 minutes |
| **Persistent memory** | Companions remember previous conversations across sessions using vector-embedded semantic memory |
| **Conversation safety** | Companions never leave mid-conversation with a child; idle-kick protections prevent accidental disconnects |
| **Real-time sentiment analysis** | Keyword-based dual-layer scoring tracks emotional tone across every conversation |
| **70+ distress detectors** | Expanded keyword set covering bullying (physical, verbal, social), school avoidance, self-harm ideation, isolation, and more |
| **Parent dashboard** | Visualises conversation frequency, tone trends, companion usage, and distress alerts — zero conversation text exposed |
| **Family Code access** | Parents authenticate via a 6-character code; no usernames, no passwords, no surveillance |
| **Child-safe auth** | 4-digit PIN login designed for ages 7–12 — no email, no passwords |
| **Privacy by design** | No third-party analytics, no ad SDKs, no data sharing — everything stays in your own Convex deployment |

---

## How It Works

### For the Child

The child opens a browser and enters a small village. They choose a character, name themselves, and explore. When they walk close to a companion, a conversation begins. The child types naturally. The companion responds warmly, asks follow-up questions, and validates what the child shares — always in simple language, always without diagnosis or judgement.

| Companion | Emotional Domain | Personality |
|-----------|-----------------|-------------|
| **Sunny** | Anxiety and worry | Curious and gentle; shares small worries of their own to normalise the feeling |
| **Sage** | Stress and overwhelm | Calm and mindful; teaches grounding through conversation |
| **Keeper** | Fear and uncertainty | Steady and patient; breaks large problems into small, manageable steps |

Each companion has **persistent memory**. When a child returns the next day, the companion remembers their previous conversations and picks up naturally.

### For the Parent

Parents access a separate dashboard using a **six-character Family Code** generated at registration. The dashboard shows:

- Which companions the child has spoken with, and how often (with interactive charts)
- **Real-time sentiment scoring** across conversations (1–5 scale, keyword-based — not a random number)
- Context-aware suggestions that adapt based on detected distress and emotional patterns
- **Distress alerts** if any message contains language associated with crisis, bullying, or school avoidance
- Last active timestamp and total message count

> **The parent dashboard never displays conversation text.** Parents receive pattern-level information, not surveillance.

### Safety System

Every message is evaluated by **two independent detection layers** running in parallel:

1. **LLM-level analysis** — The companion AI is instructed to flag language indicating self-harm, abuse, or severe distress
2. **Keyword matching** — A backend layer scans against 70+ distress phrases covering:
   - Self-harm and suicidal ideation
   - Physical bullying ("punched me", "kicked me", "hit me")
   - Verbal/social bullying ("calls me names", "making fun of me", "laughed at me")
   - School avoidance ("don't want to go to school", "hate school", "scared of school")
   - Isolation and loneliness ("nobody likes me", "have no friends", "feel alone")

If either layer triggers, the parent dashboard immediately surfaces a distress alert. The child sees nothing alarming.

---

## Architecture

```
           Child Browser                    Parent Browser
                │                                │
    ┌───────────────────────┐       ┌──────────────────────────┐
    │  AI Town Game (Vite)  │       │  Parent Dashboard (Vite) │
    │  Google Cloud Run     │       │  Google Cloud Run        │
    │                       │       │                          │
    │  PixiJS village       │       │  Recharts visualisation  │
    │  Three AI companions  │       │  Framer Motion UI        │
    │  Username + PIN auth  │       │  Family Code access      │
    └───────────┬───────────┘       └────────────┬─────────────┘
                │                                │
                └───────────────┬────────────────┘
                                │
               ┌────────────────────────────────┐
               │   Convex Serverless Backend    │
               │   Real-time subscriptions      │
               │                                │
               │   havenUsers    (accounts)     │
               │   worlds        (game state)   │
               │   messages      (chat log)     │
               │   memories      (AI memory)    │
               │   archivedConversations        │
               └────────────────┬───────────────┘
                                │
               ┌────────────────────────────────┐
               │   LLM Provider (Mistral AI)    │
               │   Companion conversations      │
               │   Memory summarisation         │
               │   Reflection generation        │
               └────────────────────────────────┘
```

### Design Decisions

| Decision | Why |
|----------|-----|
| **Username as stable identity** | Each child's username becomes their `clientToken` in the game engine — agent memories are permanently tied to a specific child across every session |
| **Family Code, not username** | The 6-character code is the only mechanism for parent dashboard access; knowing a username grants nothing |
| **Memory isolation** | Memories are indexed by `playerId` derived from username; two children playing simultaneously have entirely separate memory graphs |
| **Proactive engagement** | Companions walk to children every 2–3 minutes with per-agent jitter offsets to prevent simultaneous arrivals |
| **Conversation-aware idle protection** | The idle-kick timer (5 min) is suspended when a child is in an active conversation — no accidental disconnects |
| **Agent leave guard** | Companions are blocked from leaving a conversation while talking to a human child, even if internal message limits are reached |
| **Real sentiment scoring** | Tone analysis uses actual keyword-based NLP (positive/negative word counting) instead of placeholder values |

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Game engine | AI Town (Convex-native pixel-art village simulation) |
| Rendering | PixiJS |
| Game UI | React 18, Vite 6, Tailwind CSS |
| Dashboard UI | React 18, Vite 6, Framer Motion, Recharts, Lucide |
| Backend | Convex (serverless TypeScript functions, real-time subscriptions) |
| Database | Convex integrated database (indexed tables, vector search) |
| LLM provider | Mistral AI (mistral-large-latest) via OpenAI-compatible SDK |
| AI memory | Vector embeddings with semantic search (Convex vector store) |
| Child auth | Custom username + 4-digit PIN system |
| Sentiment analysis | Dual-layer keyword-based scoring (70+ distress phrases, positive/negative word lists) |
| Game hosting | Google Cloud Run |
| Dashboard hosting | Google Cloud Run (Dockerised) |

---

## Live Deployments

| Service | Platform | URL |
|---------|----------|-----|
| AI Town Game | Google Cloud Run | [havenforkids-game-kmj4z2oxfa-uc.a.run.app](https://havenforkids-game-kmj4z2oxfa-uc.a.run.app) |
| Parent Dashboard | Google Cloud Run | [havenforkids-dashboard-kmj4z2oxfa-uc.a.run.app](https://havenforkids-dashboard-kmj4z2oxfa-uc.a.run.app) |
| Convex Backend | Convex Cloud | `lovely-quail-205.convex.cloud` |

---

## Project Structure

```
Haven/
├── ai-town/                         # Child-facing game application
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginScreen.tsx              # Username + PIN auth UI
│   │   │   ├── MessageInput.tsx             # Chat input with Send button
│   │   │   └── PlayerDetails.tsx            # Character panel
│   │   └── App.tsx                          # Auth gate + game shell
│   ├── convex/
│   │   ├── schema.ts                        # Full database schema
│   │   ├── auth.ts                          # Registration, login, family code
│   │   ├── dashboard.ts                     # Sentiment scoring + distress detection
│   │   ├── constants.ts                     # Tunable behaviour constants
│   │   ├── agent/
│   │   │   ├── conversation.ts              # LLM prompts and conversation flow
│   │   │   └── memory.ts                    # Memory creation and recall
│   │   └── aiTown/
│   │       ├── agent.ts                     # Agent tick logic (human-aware)
│   │       ├── agentInputs.ts               # Agent leave guards
│   │       ├── agentOperations.ts           # Proactive check-in behaviour
│   │       └── player.ts                    # Conversation-aware idle protection
│   └── data/
│       └── characters.ts                    # Companion identities and prompts
│
├── dashboard/                       # Parent-facing dashboard application
│   ├── Dockerfile                           # Multi-stage Docker build (node:20.19)
│   └── src/
│       ├── hooks/
│       │   └── useDashboardData.ts          # Family Code → data resolution
│       └── pages/
│           └── ParentDashboard.tsx           # Dashboard UI with alerts
│
├── ARCHITECTURE.md                  # Detailed technical architecture
├── DEPLOYMENT.md                    # Production deployment guide
└── README.md                        # This file
```

---

## Companion Design

Each companion is defined by a unique identity, an emotional archetype, and a behavioural plan. The system prompt is never exposed in the UI. Key behavioural constraints enforced across all companions:

- Responses are limited to **2–3 sentences** in simple language appropriate for ages 7–12
- Companions **validate feelings before offering any guidance**
- Companions never diagnose, never refer to professional help unprompted, and never dismiss what a child shares
- When companions reference shared awareness of a child, they frame it as natural intuition ("I've been thinking about that kind of feeling lately") rather than inter-agent communication
- **Companions never leave a conversation with a human child** — message limits and duration timeouts only apply to agent-to-agent conversations

---

## Privacy and Ethical Design

**Privacy First.** The parent dashboard provides pattern-level visibility — frequency, tone score, distress flags — and does not expose any conversation transcripts. No third-party analytics, advertising SDKs, or tracking of any kind. Family Codes (not usernames) are the parent access mechanism.

**Do No Harm.** Companion prompts explicitly prohibit medical advice, diagnosis, and unsolicited referrals. A dual-layer distress detection system (LLM flag + 70+ keyword matching) alerts parents when crisis-associated language appears — without interrupting the child's experience.

**Inclusive Design.** Four-digit PIN authentication accessible to young children. Visible Send button alongside keyboard submission. Grade 5 reading level for all companion responses. Browser-based — no installation required.

**Transparency.** Companions are presented as storybook characters, never as real beings. System prompts instruct companions never to claim personhood. This documentation describes the full technical architecture openly.

**Zero Token Waste.** Agent LLM calls are gated behind human-presence detection — no tokens are consumed when no child is playing.

---

## Getting Started

### Prerequisites

- Node.js 20+
- A Convex account (free tier): [convex.dev](https://convex.dev)
- An LLM API key (Mistral AI recommended, or any OpenAI-compatible provider)

### 1. Clone the repository

```bash
git clone https://github.com/AryanSaxenaa/HavenForKids.git
cd HavenForKids
```

### 2. Install dependencies

```bash
npm install                              # Root
cd ai-town && npm install && cd ..       # Game
cd dashboard && npm install && cd ..     # Dashboard
```

### 3. Configure the Convex backend

```bash
cd ai-town
npx convex dev --once
```

This creates your Convex deployment and generates API types.

### 4. Set environment variables

**AI Town** — create `ai-town/.env.local`:
```env
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

**Dashboard** — create `dashboard/.env.local`:
```env
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

**Set the LLM key in Convex:**
```bash
cd ai-town
npx convex env set OPENAI_API_KEY your-api-key-here
```

### 5. Run the development servers

```bash
# Terminal 1 — Convex backend
cd ai-town && npx convex dev

# Terminal 2 — Game
cd ai-town && npm run dev

# Terminal 3 — Dashboard
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
3. Note the **Family Code** displayed after registration
4. Click **"Enter HAVEN"** to enter the game
5. Click **"Interact"** to join the world as a player
6. Wait ~2 minutes — a companion will walk over and start talking
7. Open `http://localhost:5174` and enter the Family Code

---

## Configuration Reference

### Behaviour Constants (`ai-town/convex/constants.ts`)

| Constant | Default | Description |
|----------|---------|-------------|
| `HAVEN_CHECKIN_INTERVAL` | 2 min | Base interval between proactive companion check-ins |
| `HAVEN_CHECKIN_JITTER` | 60 sec | Random offset per companion to stagger arrivals |
| `AWKWARD_CONVERSATION_TIMEOUT` | 3 min | Companion speaks first if child is silent |
| `MAX_CONVERSATION_DURATION` | 20 min | Maximum agent-to-agent conversation (does **not** apply to human conversations) |
| `MAX_CONVERSATION_MESSAGES` | 12 | Maximum agent-to-agent messages (does **not** apply to human conversations) |
| `HUMAN_IDLE_TOO_LONG` | 5 min | Idle-kick timer (suspended during active conversations) |

---

## Deployment

The system is deployed across three platforms:

- **Convex Cloud** — Backend functions + database → `npx convex deploy`
- **Google Cloud Run** — AI Town game (Dockerised) → `gcloud run deploy havenforkids-game --source .`
- **Google Cloud Run** — Parent dashboard (Dockerised) → `gcloud run deploy havenforkids-dashboard --source .`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full step-by-step guide.

---

## Acknowledgements

HAVEN is built on top of [AI Town](https://github.com/a16z-infra/ai-town), an open-source framework for simulating AI agent worlds by a16z-infra (MIT License). The world simulation engine, agent tick loop, pathfinding, and memory infrastructure are derived from that work.

HAVEN's original contributions include: the authentication system, companion identities with ethically constrained prompts, human-presence-gated token management, proactive check-in behaviour, conversation-aware idle protection, agent leave guards, shared companion memory with intuition rewrites, keyword-based sentiment analysis, 70+ phrase distress detection, and the parent dashboard.

**Additional credits:**
- [Convex](https://convex.dev) — Serverless database and real-time backend
- [Mistral AI](https://mistral.ai) — LLM provider
- [Kenney](https://kenney.nl) — CC0-licensed pixel art assets

---

## License

HAVEN is released under the MIT License. See [LICENSE](./LICENSE).

The underlying AI Town framework is also MIT licensed. Copyright 2023 a16z-infra. See `ai-town/LICENSE`.

