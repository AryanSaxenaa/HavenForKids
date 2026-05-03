# HavenForKids — Architecture Reference

This document describes the data flow, component boundaries, and design decisions in the HavenForKids wellness platform. Read this before contributing.

---

## System Overview

HavenForKids is a three-tier wellness platform: a child-facing game, a parent-facing dashboard, and a shared serverless backend. All emotional wellness data flows through the Convex backend — neither frontend ever communicates directly with the LLM provider.

```
┌──────────────────────────────────────────────────────────────────┐
│  CHILD BROWSER                                                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Wellness Game  (Vite 6, React 18, PixiJS)               │    │
│  │  Deployed: Google Cloud Run                              │    │
│  │                                                          │    │
│  │  LoginScreen.tsx      — username + PIN authentication    │    │
│  │  App.tsx              — auth gate, session management    │    │
│  │  Game.tsx             — pixel-art wellness village       │    │
│  │  PlayerDetails.tsx    — companion info panel             │    │
│  │  MessageInput.tsx     — chat input with Send button      │    │
│  │                                                          │    │
│  │  localStorage:                                           │    │
│  │    haven_session      { username, displayName, ... }     │    │
│  │    haven_client_token username (stable across sessions)  │    │
│  │    haven_player_name  displayName                        │    │
│  └───────────────────────┬──────────────────────────────────┘    │
│                          │ VITE_CONVEX_URL                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
┌──────────────────────────────────────────────────────────────────┐
│  PARENT BROWSER                                                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Wellness Dashboard  (Vite 6, React 18, Recharts)        │    │
│  │  Deployed: Google Cloud Run (Dockerised)                 │    │
│  │                                                          │    │
│  │  ParentDashboard.tsx  — Family Code input, data display  │    │
│  │  useDashboardData.ts  — code → username → data pipeline  │    │
│  │  WeekSummary          — wellness engagement overview     │    │
│  │  CharacterChart       — per-companion bar chart          │    │
│  │  ToneBreakdown        — emotional tone distribution      │    │
│  │  WeeklyTrend          — wellness activity over time      │    │
│  │  Suggestion           — context-aware parenting insight  │    │
│  └───────────────────────┬──────────────────────────────────┘    │
│                          │ VITE_CONVEX_URL                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
              ┌────────────▼───────────────────┐
              │   Convex Serverless Backend    │
              │   (impartial-goldfinch-622)    │
              │                               │
              │   convex/auth.ts              │
              │     registerUser              │
              │     loginUser                 │
              │     getUserByFamilyCode       │
              │     checkUsername             │
              │                               │
              │   convex/world.ts             │
              │     joinWorld                 │
              │     leaveWorld                │
              │     userStatus                │
              │                               │
              │   convex/dashboard.ts         │
              │     getDashboardData          │
              │     computeSentimentScore     │
              │     70+ DISTRESS_KEYWORDS     │
              │                               │
              │   convex/agent/               │
              │     conversation.ts           │
              │     memory.ts                 │
              │                               │
              │   convex/aiTown/              │
              │     agent.ts    (human-aware) │
              │     agentInputs.ts (guards)   │
              │     agentOperations.ts        │
              │     player.ts  (idle protect) │
              └────────────┬──────────────────┘
                           │
              ┌────────────▼──────────────────┐
              │   Convex Database             │
              │                               │
              │   havenUsers                  │
              │   worlds                      │
              │   messages                    │
              │   memories                    │
              │   playerDescriptions          │
              │   agentDescriptions           │
              │   participatedTogether        │
              │   archivedConversations       │
              └────────────┬──────────────────┘
                           │
              ┌────────────▼──────────────────┐
              │   LLM Provider                │
              │   Mistral AI (mistral-large)  │
              │   via OpenAI-compatible SDK   │
              │                               │
              │   Wellness conversations      │
              │   Memory summarisation        │
              │   Wellness reflection         │
              │   Shared intuition rewrites   │
              └───────────────────────────────┘
```

---

## Authentication Model

### Child Login

1. Child enters username and four-digit PIN in `LoginScreen.tsx`
2. `loginUser` Convex mutation validates the PIN against the stored hash
3. On success, the session is stored in `localStorage`:
   - `haven_session` — full session object (username, displayName, familyCode, streak)
   - `haven_client_token` — set to the username (stable, permanent identity token)
   - `haven_player_name` — set to the displayName (shown in-game)
4. `App.tsx` renders the game; `InteractButton` uses `haven_client_token` when joining the world

### Why `clientToken = username`

The game engine identifies human players by a `clientToken` string stored in `localStorage`. By setting this to the username, wellness companion memories are permanently associated with the same child across all sessions and devices. A child who visits on Monday and returns on Friday is recognised as the same person — their companions genuinely remember them and can provide continuity of emotional support.

### Parent Access

Parents hold a six-character Family Code generated at child registration. The `getUserByFamilyCode` query resolves the code to a username, which is passed to `getDashboardData`. Parents cannot access a child's wellness data without the correct code. There are no parent accounts — the Family Code is the only access mechanism.

---

## Data Flow: Child Wellness Conversation

```
1. Child types in MessageInput.tsx → presses Enter or taps Send

2. writeMessage Convex mutation:
   { worldId, playerId, conversationId, text, messageUuid }

3. Message stored in messages table
   (author = playerId derived from haven_client_token = username)

4. Agent's tick() in agent.ts detects the new message
   → schedules agentGenerateMessage

5. agentGenerateMessage (Convex internalAction):
   a. Queries conversation history via queryPromptData
   b. Searches agent's wellness memory store (vector similarity search)
   c. Constructs system prompt: companion identity + memories + history
   d. Calls Mistral AI → receives wellness response
   e. Calls agentSendMessage to store the reply

6. Reply appears in conversation panel
   (real-time via Convex subscription — zero polling)
```

---

## Data Flow: Wellness Memory Formation

```
1. Agent or child leaves the conversation

2. conversation.stop() → sets agent.toRemember = conversationId

3. On next tick: agentRememberConversation is scheduled

4. rememberConversation (Convex internalAction):
   a. Loads all messages from the conversation
   b. LLM generates a first-person wellness summary from the companion's perspective
   c. Summary is vector-embedded
   d. Stored as a memory in the memories table

5. If the other participant was a human child:
   a. getAllAgents fetches all other wellness companions
   b. LLM rewrites the summary as a vague intuition (no direct attribution)
   c. The rewritten intuition is inserted as a low-importance memory
      in each other companion's memory store

   → Other companions develop a subtle awareness of the child's
     emotional state, enabling coordinated wellness support without
     revealing the source of that awareness.
```

---

## Data Flow: Parent Wellness Dashboard

```
1. Parent enters Family Code in ParentDashboard.tsx

2. useDashboardData hook:
   a. getUserByFamilyCode → resolves to { username, displayName }
   b. getDashboardData(childName, username)

3. getDashboardData (Convex query):
   a. Finds playerDescriptions matching the child
   b. Queries participatedTogether for all conversations
   c. For each conversation:
      - Fetches archived conversation + messages
      - Runs computeSentimentScore() on child's messages
      - Scans for DISTRESS_KEYWORDS (70+ phrases)
   d. Returns: characterVisits, weeklyTrend, toneDistribution,
      suggestion, distressFlags, lastActive, totalMessages

4. Dashboard renders with live Convex subscription
   (updates in real time as the child engages with companions)
```

### Wellness Sentiment Scoring

`computeSentimentScore()` uses keyword-based NLP to produce genuine wellness signals — not placeholder values:

- **NEGATIVE_WORDS** (40+): sad, scared, bullied, punched, lonely, miserable, etc.
- **POSITIVE_WORDS** (35+): happy, good, amazing, friend, brave, proud, etc.
- Score maps to **1–5 wellness scale**: all negative → 1, all positive → 5, neutral → 3

### Early Distress Detection

**70+ distress phrases** organised by wellness risk category:

| Risk Category | Example Phrases |
|--------------|----------------|
| Self-harm ideation | "hurt myself", "want to die", "hate myself" |
| Physical bullying | "punched me", "kicked me", "hit me" |
| Verbal/social bullying | "calls me names", "making fun of me", "laughed at me" |
| School avoidance | "don't want to go to school", "hate school", "scared of school" |
| Social isolation | "nobody likes me", "have no friends", "feel alone" |

---

## Wellness Companion Behaviour

### Proactive Check-in (`agentOperations.ts`)

Each idle wellness companion evaluates whether it's time to check in on the child:

```
myInterval = HAVEN_CHECKIN_INTERVAL + (agentIdHash % 5) * (HAVEN_CHECKIN_JITTER / 5)
```

The hash-derived jitter spreads three companions across the base interval so they arrive at staggered times rather than all at once — modelling natural, organic wellness check-ins.

If a child is free (not in a conversation) and the interval has elapsed, the companion walks directly to the child and initiates a wellness conversation.

### Conversation Protection

Three layers prevent companions from abandoning a child mid-conversation — a critical wellness safety guarantee:

1. **`agent.ts` — Timeout bypass**: `MAX_CONVERSATION_DURATION` and `MAX_CONVERSATION_MESSAGES` are skipped when the other participant is human (`!!otherPlayer.human`)
2. **`agentInputs.ts` — Leave guard**: When a companion finishes sending a message, the system blocks it from leaving the conversation if the other player is human
3. **`player.ts` — Idle-kick protection**: The `HUMAN_IDLE_TOO_LONG` timer (5 min) is suspended when the child is in an active conversation — no accidental disconnects mid-disclosure

### Shared Wellness Memory (Subtle Awareness)

When a child finishes a conversation with one companion, all other companions receive a rewritten, vague intuition derived from that conversation. The LLM rewrites it to sound like a feeling or observation, not a report — preserving the child's sense of privacy while enabling coordinated wellness support.

A companion will never say *"I heard from Sunny that you were worried about school"* — they may say *"I've been thinking about the kinds of worries that can feel really big lately."*

---

## Data Privacy Boundaries

| Data | Stored Where | Never |
|------|-------------|-------|
| LLM API key | Convex environment variable | Any frontend |
| PIN | Hashed + salted in `havenUsers` | Plaintext anywhere |
| Family Code | `havenUsers` table | Exposed in URL or logs |
| Conversation text | `messages` table (Convex) | Third-party services |
| Wellness memory summaries | `memories` table (Convex) | Accessible via parent dashboard |
| Distress flags | Computed at query time from messages | Stored separately |
| clientToken | localStorage (= username) | Random UUID |

---

## LocalStorage Keys

| Key | Type | Contents |
|-----|------|----------|
| `haven_session` | JSON | `{ username, displayName, familyCode, loginStreak, isFirstVisitToday }` |
| `haven_client_token` | string | Username (game engine identity token) |
| `haven_player_name` | string | Display name (shown in-game) |

---

## Database Schema Summary

| Table | Wellness Purpose |
|-------|----------------|
| `havenUsers` | Child accounts: username, PIN hash, family code, engagement streak |
| `worlds` | Game world state: players, companions, conversations |
| `messages` | Chat messages (stored for wellness distress detection) |
| `memories` | Companion wellness memory summaries with vector embeddings |
| `playerDescriptions` | Display name and description for each child |
| `agentDescriptions` | Identity and wellness plan for each AI companion |
| `participatedTogether` | Index of which children have conversed with which companions |
| `archivedConversations` | Completed conversation metadata |

---

## Error Handling

### Companion Failures
If an LLM call fails, the companion's operation times out and the companion returns to idle. The child sees the companion simply not responding — no error is surfaced. The companion retries on its next tick.

### Authentication Failures
PIN validation errors return child-appropriate messages ("Wrong PIN! Check again."). After three failed attempts, a 30-second lockout is applied. Error messages never expose internal system state.

### Dashboard Data Gaps
If a child has not yet had any wellness conversations, the dashboard shows a helpful message rather than empty charts. The `useDashboardData` hook handles the loading, error, and idle states independently.
