# HAVEN — Architecture Reference

This document describes the data flow, component boundaries, and design decisions in the HAVEN system. Read this before contributing.

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  CHILD BROWSER                                                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  AI Town  (Vite 6, React 18, PixiJS)                     │    │
│  │  Deployed: Google Cloud Run                              │    │
│  │                                                          │    │
│  │  LoginScreen.tsx      — username + PIN authentication     │    │
│  │  App.tsx              — auth gate, session management     │    │
│  │  Game.tsx             — pixel-art village renderer        │    │
│  │  PlayerDetails.tsx    — companion info panel              │    │
│  │  MessageInput.tsx     — chat input with Send button       │    │
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
│  │  Dashboard  (Vite 6, React 18, Recharts, Framer Motion) │    │
│  │  Deployed: Google Cloud Run (Dockerised)                 │    │
│  │                                                          │    │
│  │  ParentDashboard.tsx  — Family Code input, data display  │    │
│  │  useDashboardData.ts  — code → username → data pipeline  │    │
│  │  WeekSummary          — visit frequency overview         │    │
│  │  CharacterChart       — per-companion bar chart          │    │
│  │  ToneBreakdown        — emotional tone distribution      │    │
│  │  WeeklyTrend          — activity over time               │    │
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
              │   Character conversations     │
              │   Memory summarisation        │
              │   Reflection generation       │
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

The game engine identifies human players by a `clientToken` string stored in `localStorage`. By setting this to the username, agent memories are permanently associated with the same child across all sessions and devices. A child who visits on Monday and returns on Friday is recognised as the same person — their companions genuinely remember them.

### Parent Access

Parents hold a six-character Family Code generated at child registration. The `getUserByFamilyCode` query resolves the code to a username, which is passed to `getDashboardData`. Parents cannot access a child's data without the correct code. There are no parent accounts.

---

## Data Flow: Child Sends a Message

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
   b. Searches agent's memory store (vector similarity search)
   c. Constructs system prompt: identity + memories + history
   d. Calls Mistral AI → receives reply text
   e. Calls agentSendMessage to store the reply

6. Reply appears in conversation panel
   (real-time via Convex subscription — zero polling)
```

---

## Data Flow: Conversation Ends

```
1. Agent or child leaves the conversation

2. conversation.stop() → sets agent.toRemember = conversationId

3. On next tick: agentRememberConversation is scheduled

4. rememberConversation (Convex internalAction):
   a. Loads all messages from the conversation
   b. LLM generates a first-person summary from the agent's perspective
   c. Summary is vector-embedded
   d. Stored as a memory in the memories table

5. If the other participant was a human child:
   a. getAllAgents fetches all other companions
   b. LLM rewrites the summary as a vague intuition (no direct attribution)
   c. The rewritten intuition is inserted as a low-importance memory
      in each other companion's memory store

   → Other companions develop a subtle awareness of what the child
     has been experiencing, without revealing their source.
```

---

## Data Flow: Parent Dashboard

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
   (updates in real time as the child chats)
```

### Sentiment Scoring

`computeSentimentScore()` uses keyword-based NLP — not placeholder values:

- **NEGATIVE_WORDS** (40+): sad, scared, bullied, punched, lonely, miserable, etc.
- **POSITIVE_WORDS** (35+): happy, good, amazing, friend, brave, proud, etc.
- Score maps to **1–5 scale**: all negative → 1, all positive → 5, neutral → 3

### Distress Detection

**70+ distress phrases** organised by category:

| Category | Example Phrases |
|----------|----------------|
| Self-harm | "hurt myself", "want to die", "hate myself" |
| Physical bullying | "punched me", "kicked me", "hit me" |
| Verbal/social bullying | "calls me names", "making fun of me", "laughed at me" |
| School avoidance | "don't want to go to school", "hate school", "scared of school" |
| Isolation | "nobody likes me", "have no friends", "feel alone" |

---

## Agent Behaviour

### Proactive Check-in (`agentOperations.ts`)

Each idle agent evaluates whether it's time to check in on the human player:

```
myInterval = HAVEN_CHECKIN_INTERVAL + (agentIdHash % 5) * (HAVEN_CHECKIN_JITTER / 5)
```

The hash-derived jitter spreads three companions across the base interval so they arrive at staggered times rather than all at once.

If a human player is free (not in a conversation) and the interval has elapsed, the agent walks directly to the human and initiates a conversation.

### Conversation Protection

Three layers prevent companions from abandoning a child mid-conversation:

1. **`agent.ts` — Timeout bypass**: `MAX_CONVERSATION_DURATION` and `MAX_CONVERSATION_MESSAGES` are skipped when the other participant is human (`!!otherPlayer.human`)
2. **`agentInputs.ts` — Leave guard**: When an agent finishes sending a message, the system blocks it from leaving the conversation if the other player is human
3. **`player.ts` — Idle-kick protection**: The `HUMAN_IDLE_TOO_LONG` timer (5 min) is suspended when the player is in an active conversation — no accidental disconnects

### Shared Memory (Subtle Awareness)

When a child finishes a conversation with one companion, all other companions receive a rewritten, vague intuition derived from that conversation. The LLM rewrites it to sound like a feeling or observation, not a report.

A companion will never say *"I heard from Sunny that you were worried about school"* — they may say *"I've been thinking about the kinds of worries that can feel really big lately."*

---

## Boundary Rules

| Data | Stored Where | Never |
|------|-------------|-------|
| LLM API key | Convex environment variable | Any frontend |
| PIN | Hashed + salted in `havenUsers` | Plaintext anywhere |
| Family Code | `havenUsers` table | Exposed in URL or logs |
| Conversation text | `messages` table (Convex) | Third-party services |
| Memory summaries | `memories` table (Convex) | Accessible via parent dashboard |
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

| Table | Purpose |
|-------|---------|
| `havenUsers` | Child accounts: username, PIN hash, family code, streak |
| `worlds` | Game world state: players, agents, conversations |
| `messages` | Chat messages (text stored for dashboard distress detection) |
| `memories` | Agent memory summaries with vector embeddings |
| `playerDescriptions` | Display name and description for each player |
| `agentDescriptions` | Identity and plan for each AI agent |
| `participatedTogether` | Index of which players have conversed |
| `archivedConversations` | Completed conversation metadata |

---

## Error Handling

### Agent Failures
If an LLM call fails, the agent's operation times out and the agent returns to idle. The child sees the companion simply not responding — no error is surfaced. The agent retries on its next tick.

### Authentication Failures
PIN validation errors return child-appropriate messages ("Wrong PIN! Check again."). After three failed attempts, a 30-second lockout is applied. Error messages never expose internal system state.

### Dashboard Data Gaps
If a child has not yet had any conversations, the dashboard shows a helpful message rather than empty charts. The `useDashboardData` hook handles the loading, error, and idle states independently.
