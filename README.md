# HavenForKids

### A Children's Emotional Health & Wellness Platform Powered by AI

> **Live:** [Open HavenForKids](https://havenforkids-game-708818914032.us-central1.run.app) &nbsp;·&nbsp; [Parent Wellness Dashboard](https://havenforkids-dashboard-708818914032.us-central1.run.app)

---

HavenForKids is a **digital health and wellness platform** designed to support the emotional development of children aged 7–12. Through a warm, browser-based pixel-art village, children engage with AI wellness companions that help them process feelings, build emotional vocabulary, and develop healthy coping habits — all through natural conversation. A real-time parent wellness dashboard surfaces emotional patterns, sentiment trends, and early distress signals — **without ever exposing conversation text**.

HavenForKids sits at the intersection of **preventive mental health**, **child development**, and **responsible AI** — giving families an accessible, stigma-free tool for emotional wellbeing long before a clinical intervention is needed.

<br>

## Quick Start — No Setup Required

HavenForKids is fully live and ready to use. No installation, no app store, no account required for parents.

### For the Child
1. Open **[HavenForKids](https://havenforkids-game-708818914032.us-central1.run.app)** in any modern browser
2. Click **"I'm new here"** to create an account — choose a username and a 4-digit PIN
3. Note the **Family Code** shown after registration — share it with a parent
4. Click **"Enter HavenForKids"** then **"Interact"** to enter the wellness village
5. Explore the village — a wellness companion will walk over and start a conversation within ~2 minutes
6. Chat naturally — there are no right or wrong answers

### For the Parent
1. Open the **[Parent Wellness Dashboard](https://havenforkids-dashboard-708818914032.us-central1.run.app)**
2. Enter the **Family Code** your child received at registration
3. View your child's emotional wellness patterns — companion engagement, tone trends, and any distress alerts
4. The dashboard updates in real time as your child uses the platform

> **Privacy note:** The dashboard never shows conversation text — only pattern-level wellness insights.

<br>

## The Wellness Gap We're Closing

Emotional health is the foundation of a child's overall wellbeing — yet it is the most consistently under-served dimension of children's health. The numbers are stark:

- **1 in 5 children** experiences a diagnosable mental health condition before age 18
- The average delay between first symptoms and first professional support is **12 years**
- Most children lack the vocabulary, confidence, or trusted channel to express what they are feeling
- Existing tools are either clinical instruments built for professionals, or consumer apps that ask children to self-diagnose before they are developmentally ready

**HavenForKids takes a wellness-first approach.** Rather than treating emotional health as a clinical problem to be solved, we treat it as a daily practice to be supported — the same way physical health apps support exercise and nutrition. Children don't talk *about* their feelings. They explore a cosy village, meet friendly companions, and feel genuinely heard. The wellness insights emerge naturally from those conversations.

---

## Core Wellness Features

| Feature | Wellness Benefit |
|---------|-----------------|
| **AI wellness companions** | Three companions (Sunny, Sage, Keeper) each specialising in a distinct emotional domain — anxiety, stress, and fear — providing targeted, age-appropriate support |
| **Proactive check-ins** | Companions initiate conversations every 2–3 minutes, modelling healthy emotional check-in habits and reducing the barrier for children to open up |
| **Persistent emotional memory** | Companions remember previous conversations using vector-embedded semantic memory, building a continuous, trusting relationship over time |
| **Real-time sentiment tracking** | Dual-layer keyword-based scoring monitors emotional tone across every conversation, surfacing trends before they become crises |
| **70+ distress detectors** | Early-warning system covering bullying (physical, verbal, social), school avoidance, self-harm ideation, and social isolation |
| **Parent wellness dashboard** | Gives parents pattern-level emotional health insights — conversation frequency, tone trends, companion engagement, distress alerts — with zero exposure of conversation text |
| **Family Code access** | Privacy-first parent authentication via a 6-character code — no accounts, no surveillance, no data sharing |
| **Child-safe design** | 4-digit PIN login for ages 7–12, Grade 5 reading level responses, browser-based with no installation required |
| **Privacy by design** | No third-party analytics, no advertising SDKs, no data sharing — all data stays in your own Convex deployment |

---

## How HavenForKids Supports Wellness

### For the Child — Building Emotional Fitness

The child opens a browser and enters a small, safe village. They choose a character, name themselves, and explore freely. When they walk close to a wellness companion, a conversation begins naturally. The child types in their own words. The companion responds warmly, validates what the child shares, asks gentle follow-up questions, and models healthy emotional processing — always in simple language, always without judgement or diagnosis.

| Companion | Wellness Domain | Approach |
|-----------|----------------|---------|
| **Sunny** | Anxiety & worry | Normalises worry by sharing small concerns of their own; builds confidence through gentle validation |
| **Sage** | Stress & overwhelm | Teaches grounding and mindfulness through calm, structured conversation |
| **Keeper** | Fear & uncertainty | Builds resilience by breaking large problems into small, manageable steps |

Each companion maintains **persistent emotional memory**. When a child returns the next day, the companion picks up naturally from where they left off — reinforcing the sense of a trusted, ongoing relationship that is central to emotional wellness.

### For the Parent — Informed Without Intrusive

Parents access a separate wellness dashboard using a **six-character Family Code** generated at registration. The dashboard provides:

- Which wellness companions the child has engaged with, and how often (interactive charts)
- **Real-time emotional tone scoring** across conversations (1–5 scale, keyword-based NLP)
- Context-aware wellness suggestions that adapt to detected emotional patterns
- **Early distress alerts** when language associated with crisis, bullying, or school avoidance is detected
- Engagement trends over time — last active timestamp, total conversations, weekly activity

> **The parent dashboard never displays conversation text.** Parents receive wellness-level pattern insights, not surveillance. This boundary is enforced at the data architecture level — not just policy.

### Safety & Crisis Response

Every message is evaluated by **two independent wellness safety layers** running in parallel:

1. **AI-level analysis** — Each companion is instructed to flag language indicating self-harm, abuse, or severe distress, and respond with warmth and safety
2. **Keyword matching** — A backend layer scans against 70+ distress phrases covering:
   - Self-harm and suicidal ideation
   - Physical bullying ("punched me", "kicked me", "hit me")
   - Verbal and social bullying ("calls me names", "making fun of me", "laughed at me")
   - School avoidance ("don't want to go to school", "hate school", "scared of school")
   - Isolation and loneliness ("nobody likes me", "have no friends", "feel alone")

If either layer triggers, the parent dashboard immediately surfaces a distress alert. The child's experience is never interrupted or alarmed.

---

## Platform Architecture

```
           Child Browser                    Parent Browser
                │                                │
    ┌───────────────────────┐       ┌──────────────────────────┐
    │  Wellness Game (Vite) │       │  Parent Dashboard (Vite) │
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
               │   Wellness reflection          │
               └────────────────────────────────┘
```

### Key Design Decisions

| Decision | Wellness Rationale |
|----------|--------------------|
| **Username as stable identity** | Agent memories are permanently tied to a specific child — companions build a genuine, continuous relationship rather than starting fresh each session |
| **Family Code, not username** | Parents access wellness insights without being able to identify or surveil individual conversations |
| **Memory isolation** | Each child has a completely separate memory graph — siblings or classmates using the same deployment never share emotional context |
| **Proactive engagement** | Companions initiate check-ins every 2–3 minutes, modelling the healthy habit of regular emotional check-ins rather than waiting for a child to reach out in distress |
| **Conversation-aware idle protection** | The idle-kick timer is suspended during active conversations — a child is never disconnected mid-disclosure |
| **Agent leave guard** | Companions cannot leave a conversation while a child is talking — reinforcing the safety and reliability of the relationship |
| **Real sentiment scoring** | Tone analysis uses genuine keyword-based NLP rather than placeholder values — wellness insights are grounded in real data |

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Wellness game engine | AI Town (Convex-native pixel-art village simulation) |
| Rendering | PixiJS |
| Game UI | React 18, Vite 6, Tailwind CSS |
| Dashboard UI | React 18, Vite 6, Framer Motion, Recharts, Lucide |
| Backend | Convex (serverless TypeScript functions, real-time subscriptions) |
| Database | Convex integrated database (indexed tables, vector search) |
| LLM provider | Mistral AI (mistral-large-latest) via OpenAI-compatible SDK |
| AI memory | Vector embeddings with semantic search (Convex vector store) |
| Child auth | Custom username + 4-digit PIN system |
| Wellness analytics | Dual-layer keyword-based scoring (70+ distress phrases, positive/negative word lists) |
| Game hosting | Google Cloud Run |
| Dashboard hosting | Google Cloud Run (Dockerised) |

---

## Live Deployments

| Service | Platform | URL |
|---------|----------|-----|
| Wellness Game | Google Cloud Run | [havenforkids-game-708818914032.us-central1.run.app](https://havenforkids-game-708818914032.us-central1.run.app) |
| Parent Dashboard | Google Cloud Run | [havenforkids-dashboard-708818914032.us-central1.run.app](https://havenforkids-dashboard-708818914032.us-central1.run.app) |
| Convex Backend | Convex Cloud | `impartial-goldfinch-622.convex.cloud` |

---

## Project Structure

```
HavenForKids/
├── ai-town/                         # Child-facing wellness game
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginScreen.tsx              # Username + PIN auth UI
│   │   │   ├── MessageInput.tsx             # Chat input with Send button
│   │   │   └── PlayerDetails.tsx            # Companion info panel
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
│       └── characters.ts                    # Companion identities and wellness prompts
│
├── dashboard/                       # Parent wellness dashboard
│   ├── Dockerfile                           # Multi-stage Docker build (node:20.19)
│   └── src/
│       ├── hooks/
│       │   └── useDashboardData.ts          # Family Code → wellness data pipeline
│       └── pages/
│           └── ParentDashboard.tsx          # Wellness dashboard UI with alerts
│
├── ARCHITECTURE.md                  # Detailed technical architecture
├── DEPLOYMENT.md                    # Production deployment guide
└── README.md                        # This file
```

---

## Wellness Companion Design

Each companion is defined by a unique identity, an emotional wellness archetype, and a set of behavioural constraints that prioritise the child's safety and development. Key principles enforced across all companions:

- Responses are limited to **2–3 sentences** in simple language appropriate for ages 7–12
- Companions **validate feelings before offering any guidance** — emotional validation is the first step in healthy emotional processing
- Companions never diagnose, never refer to professional help unprompted, and never dismiss what a child shares
- When companions reference shared awareness of a child, they frame it as natural intuition ("I've been thinking about that kind of feeling lately") — preserving the child's sense of privacy while enabling coordinated wellness support
- **Companions never leave a conversation with a child** — message limits and duration timeouts only apply to agent-to-agent conversations

---

## Privacy & Ethical Wellness Design

**Privacy First.** The parent dashboard provides pattern-level wellness visibility — frequency, tone score, distress flags — and does not expose any conversation transcripts. No third-party analytics, advertising SDKs, or tracking of any kind. Family Codes (not usernames) are the parent access mechanism. This is enforced at the data architecture level.

**Do No Harm.** Companion prompts explicitly prohibit medical advice, diagnosis, and unsolicited referrals. A dual-layer distress detection system (AI flag + 70+ keyword matching) alerts parents when crisis-associated language appears — without interrupting or alarming the child.

**Inclusive Wellness Design.** Four-digit PIN authentication accessible to young children. Visible Send button alongside keyboard submission. Grade 5 reading level for all companion responses. Browser-based — no installation, no app store, no device restrictions.

**Transparency.** Companions are presented as storybook characters, never as real beings or therapists. System prompts instruct companions never to claim personhood or professional expertise. This documentation describes the full technical architecture openly.

**Zero Token Waste.** AI calls are gated behind human-presence detection — no compute is consumed when no child is actively using the platform.

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
cd ai-town && npm install && cd ..
cd dashboard && npm install && cd ..
```

### 3. Configure the Convex backend

```bash
cd ai-town
npx convex dev --once
```

This creates your Convex deployment and generates API types. Note the deployment URL printed.

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
npx convex env set OPENAI_API_KEY your-mistral-api-key-here
```

### 5. Run the development servers

```bash
# Terminal 1 — Convex backend
cd ai-town && npx convex dev

# Terminal 2 — Wellness game
cd ai-town && npm run dev

# Terminal 3 — Parent dashboard
cd dashboard && npm run dev
```

| Service | URL |
|---------|-----|
| Wellness game (child) | http://localhost:5173 |
| Parent dashboard | http://localhost:5174 |
| Convex dashboard | https://dashboard.convex.dev |

### 6. First run

1. Open `http://localhost:5173`
2. Click **"I'm new here"** to create an account
3. Note the **Family Code** displayed after registration
4. Click **"Enter HavenForKids"** to enter the wellness village
5. Click **"Interact"** to join the world as a player
6. Wait ~2 minutes — a wellness companion will walk over and start a check-in
7. Open `http://localhost:5174` and enter the Family Code to view the parent dashboard

---

## Configuration Reference

### Behaviour Constants (`ai-town/convex/constants.ts`)

| Constant | Default | Description |
|----------|---------|-------------|
| `HAVEN_CHECKIN_INTERVAL` | 2 min | Base interval between proactive wellness check-ins |
| `HAVEN_CHECKIN_JITTER` | 60 sec | Random offset per companion to stagger arrivals |
| `AWKWARD_CONVERSATION_TIMEOUT` | 3 min | Companion initiates if child is silent |
| `MAX_CONVERSATION_DURATION` | 20 min | Maximum agent-to-agent conversation (does **not** apply to child conversations) |
| `MAX_CONVERSATION_MESSAGES` | 12 | Maximum agent-to-agent messages (does **not** apply to child conversations) |
| `HUMAN_IDLE_TOO_LONG` | 5 min | Idle-kick timer (suspended during active conversations) |

---

## Deployment

The platform is deployed across three services:

- **Convex Cloud** — Backend functions + wellness database → `npx convex deploy`
- **Google Cloud Run** — Wellness game (Dockerised) → `gcloud run deploy havenforkids-game --source .`
- **Google Cloud Run** — Parent dashboard (Dockerised) → `gcloud run deploy havenforkids-dashboard --source .`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full step-by-step guide.

---

## Acknowledgements

HavenForKids is built on top of [AI Town](https://github.com/a16z-infra/ai-town), an open-source framework for simulating AI agent worlds by a16z-infra (MIT License). The world simulation engine, agent tick loop, pathfinding, and memory infrastructure are derived from that work.

HavenForKids' original contributions include: the wellness-focused authentication system, companion identities with ethically constrained prompts, human-presence-gated token management, proactive wellness check-in behaviour, conversation-aware idle protection, agent leave guards, shared companion memory with intuition rewrites, keyword-based sentiment analysis, 70+ phrase distress detection, and the parent wellness dashboard.

**Additional credits:**
- [Convex](https://convex.dev) — Serverless database and real-time backend
- [Mistral AI](https://mistral.ai) — LLM provider
- [Kenney](https://kenney.nl) — CC0-licensed pixel art assets

---

## License

HavenForKids is released under the MIT License. See [LICENSE](./LICENSE).

The underlying AI Town framework is also MIT licensed. Copyright 2023 a16z-infra. See `ai-town/LICENSE`.
