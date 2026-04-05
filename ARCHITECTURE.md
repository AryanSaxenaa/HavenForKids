# HAVEN — Architecture Reference

This document describes the data flow, component boundaries, and design decisions in the HAVEN system. When contributing, read this document first.

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  CHILD BROWSER                                                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  AI Town  (Vite, React, Pixi.js)                         │    │
│  │                                                          │    │
│  │  LoginScreen.tsx      — username + PIN authentication     │    │
│  │  App.tsx              — auth gate, session management     │    │
│  │  Game.tsx             — pixel-art village renderer        │    │
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
│  │  Dashboard  (Vite, React)                                │    │
│  │                                                          │    │
│  │  ParentDashboard.tsx  — Family Code input, data display  │    │
│  │  useDashboardData.ts  — code → username → data pipeline  │    │
│  │  WeekSummary          — visit frequency overview         │    │
│  │  CharacterChart       — per-companion bar chart          │    │
│  │  ToneBreakdown        — emotional tone distribution      │    │
│  │  WeeklyTrend          — activity over time               │    │
│  │  Suggestion           — AI-generated parenting insight   │    │
│  └───────────────────────┬──────────────────────────────────┘    │
│                          │ VITE_CONVEX_URL                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
              ┌────────────▼───────────────────┐
              │   Convex Serverless Backend    │
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
              │                               │
              │   convex/agent/               │
              │     conversation.ts           │
              │     memory.ts                 │
              │                               │
              │   convex/aiTown/              │
              │     agent.ts                  │
              │     agentOperations.ts        │
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
              │   (OpenAI-compatible API)     │
              │                               │
              │   Character conversations     │
              │   Memory summarisation        │
              │   Reflection generation       │
              │   Shared intuition rewrites   │
              └───────────────────────────────┘
```

---

## Authentication Model

### Child login

1. Child enters username and four-digit PIN in `LoginScreen.tsx`
2. `loginUser` Convex mutation validates the PIN against the stored hash
3. On success, the session is stored in `localStorage`:
   - `haven_session` — full session object (username, displayName, familyCode, streak)
   - `haven_client_token` — set to the username (stable, permanent identity token)
   - `haven_player_name` — set to the displayName (shown in-game)
4. App.tsx renders the game; `InteractButton` uses `haven_client_token` when joining the world

### Why `clientToken = username`

The game engine identifies human players by their `clientToken` (a string stored in `localStorage`). By setting this to the username, agent memories accumulated across all sessions are permanently associated with the same child. A child who visits on Monday and returns on Friday is recognised as the same person. Their companions remember them.

Previously, this token was a random UUID generated on first visit. This meant memories were lost on every browser clear or new device.

### Parent access

Parents do not have accounts. They hold a six-character Family Code generated at child registration. The `getUserByFamilyCode` query resolves the code to a username, which is then passed to `getDashboardData`. Parents cannot access a child's data without the correct Family Code.

---

## Data Flow: Child Sends a Message

```
1. Child types in MessageInput.tsx and presses Enter or the Send button

2. writeMessage Convex mutation called:
   { worldId, playerId, conversationId, text, messageUuid }

3. Convex stores the message in the messages table
   (author = playerId derived from haven_client_token = username)

4. The active agent's tick() function in agent.ts detects the new message
   and schedules a reply via agentGenerateMessage

5. agentGenerateMessage (Convex internalAction):
   a. Queries conversation history via queryPromptData
   b. Searches agent's memory store for relevant memories (vector search)
   c. Constructs a system prompt: identity + memories + conversation history
   d. Calls LLM provider → receives reply text
   e. Calls agentSendMessage to store the reply

6. Reply appears in the conversation panel
   (real-time via Convex subscription — no polling required)
```

---

## Data Flow: Conversation Ends

```
1. Agent or child leaves the conversation

2. conversation.stop() → sets agent.toRemember = conversationId

3. On next agent tick: agentRememberConversation is scheduled

4. rememberConversation (Convex internalAction):
   a. Loads all messages from the conversation
   b. Calls LLM to generate a first-person summary from the agent's perspective
   c. Embeds the summary (vector embedding)
   d. Stores as a memory in the memories table

5. If the other participant was a human child:
   a. getAllAgents fetches all other companions
   b. LLM rewrites the summary as a vague intuition (no direct attribution)
   c. The rewritten intuition is inserted as a low-importance memory
      in each other companion's memory store

   This allows other companions to have a subtle awareness of what the child
   has been experiencing, without any companion revealing their source.
```

---

## Data Flow: Parent Dashboard Loads

```
1. Parent enters Family Code in ParentDashboard.tsx

2. useDashboardData hook:
   a. calls getUserByFamilyCode → resolves to { username, displayName }
   b. calls getDashboardData with the resolved username

3. getDashboardData (Convex query):
   a. Finds playerDescriptions matching username (= displayName stored at join time)
   b. Queries participatedTogether for all conversations involving the child's playerId
   c. For each conversation: fetches archivedConversations, aggregates visit counts and tone
   d. Scans messages authored by the child's playerId for distress keywords
   e. Returns: characterVisits, weeklyTrend, suggestion, distressFlags, lastActive, totalMessages

4. Dashboard renders with live Convex subscription
   (data updates in real time as child is actively chatting)
```

---

## Agent Behaviour

### Proactive check-in (`agentOperations.ts`)

Each idle agent evaluates whether it is time to check in on the human player:

```
myCheckInInterval = HAVEN_CHECKIN_INTERVAL + (agentIdHash % 5) * (HAVEN_CHECKIN_JITTER / 5)
```

The hash-derived jitter ensures that with five companions and a base interval of two minutes, companions arrive approximately every 24 seconds rather than all at once.

If a human player is free (not already in a conversation) and the interval has elapsed, the agent skips its normal wander/activity cycle and walks directly to the human to invite them to a conversation.

### Conversation protection (`agent.ts`)

The standard conversation exit conditions — `MAX_CONVERSATION_DURATION` and `MAX_CONVERSATION_MESSAGES` — are bypassed when the other participant is a human player (`!!otherPlayer.human`). An agent will never unilaterally leave a conversation with a child due to a time or message limit.

These limits remain in effect for agent-to-agent conversations.

### Shared memory (subtle awareness)

When a child finishes a conversation with one companion, all other companions receive a rewritten, vague intuition derived from that conversation. The rewording is performed by the LLM with the instruction to produce something that sounds like a feeling or an observation, not a report. Companions will never say "I heard from Sunny that you were worried about school" — they may say "I've been thinking about the kinds of worries that can feel really big lately."

---

## Boundary Rules

| Data | Stored where | Never |
|------|-------------|-------|
| LLM API key | Convex environment variable | Any frontend |
| PIN | Hashed + salted in havenUsers | Plaintext anywhere |
| Family Code | havenUsers table | Exposed in URL or logs |
| Conversation text | messages table (Convex) | Third-party services |
| Memory summaries | memories table (Convex) | Accessible via parent dashboard |
| Distress flags | Computed at query time from messages | Stored separately |
| clientToken | localStorage (= username) | Random UUID |

---

## LocalStorage Keys

| Key | Type | Contents |
|-----|------|----------|
| `haven_session` | JSON | `{ username, displayName, familyCode, loginStreak, isFirstVisitToday }` |
| `haven_client_token` | string | Username (used as game engine identity token) |
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

### Agent failures
If an LLM call fails, the agent's operation times out and the agent returns to idle. The child's view shows the companion as simply not responding — no error is surfaced. The agent will attempt to respond again on its next tick.

### Authentication failures
PIN validation errors return user-facing messages appropriate for children ("Wrong PIN! Check again."). After three failed attempts, a 30-second lockout is applied. Error messages never expose internal system state.

### Dashboard data gaps
If a child has not yet had any conversations, `getDashboardData` returns an object with empty arrays rather than null. The dashboard renders an appropriate empty state message.
