# HAVEN — API Contract

Single source of truth for every request/response shape.
Copy nothing from here — import from `shared/src/types.ts` instead.
This file is for human reading and AI context only.

---

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://<railway-service>.up.railway.app`
- **Env var in game/dashboard**: `VITE_API_BASE_URL`

All routes prefixed: `/api/v1/`

---

## Headers (all requests)

```
Content-Type: application/json
```

---

## POST /api/v1/session

Creates a new child session. Called once at the end of onboarding.

**Request**
```json
{
  "childName": "string, 1–20 chars, letters only",
  "age": "integer, 7–12",
  "preferredCharacter": "Pip | Bramble | Flint | Luna | Cleo",
  "parentEmail": "string, valid email (optional)"
}
```

**Response 200**
```json
{
  "sessionId": "uuid-v4-string"
}
```

**Response 400** (Zod validation failure)
```json
{
  "error": "Validation failed",
  "issues": [{ "path": ["age"], "message": "Number must be between 7 and 12" }]
}
```

---

## POST /api/v1/chat

Send a child's message to a character. The server runs two parallel Mistral calls.

**Request**
```json
{
  "sessionId": "uuid-v4-string",
  "character": "Pip | Bramble | Flint | Luna | Cleo",
  "message": "string, 1–500 chars",
  "history": [
    { "role": "user", "content": "string" },
    { "role": "assistant", "content": "string" }
  ]
}
```

Notes:
- `history` is the conversation so far, max 20 entries (10 turns). Truncate oldest first.
- `message` is the NEW message from the child (not yet in history).

**Response 200**
```json
{
  "message": "string — the character's reply",
  "crisis": false,
  "tone": "playful | heavy | neutral"
}
```

**Response 200 (crisis detected)**
```json
{
  "message": "string — warm, safe response from character",
  "crisis": true,
  "tone": "heavy"
}
```

**Response 400** — validation failure  
**Response 502** — Mistral API unavailable (never expose Mistral error details)

---

## POST /api/v1/conversation/end

Called when a child closes the chat with a character.
Triggers tone scoring (async) and stores the score.

**Request**
```json
{
  "sessionId": "uuid-v4-string",
  "character": "Pip | Bramble | Flint | Luna | Cleo",
  "messageCount": "integer >= 1",
  "tones": ["playful", "heavy", "neutral"]
}
```

Notes:
- `tones` is the array of tone values from each assistant response in the conversation.
- Server uses this + `mistral-small-3-2` to produce a single 1–5 score stored in DB.

**Response 200**
```json
{
  "ok": true
}
```

**Response 400** — validation failure  
**Response 500** — DB write failure

---

## GET /api/v1/dashboard/:sessionId

Returns all parent dashboard data. Fetched once on dashboard load.

**Path param**: `sessionId` — UUID of the session to look up

**Response 200**
```json
{
  "characterVisits": [
    {
      "character": "Pip",
      "count": 3,
      "avgTone": 3.5
    }
  ],
  "weeklyTrend": [
    {
      "week": "2026-W08",
      "character": "Bramble",
      "count": 2
    }
  ],
  "suggestion": "string — 2-3 sentence gentle parenting suggestion"
}
```

**Response 404** — sessionId not found  
**Response 502** — Mistral unavailable (suggestion will be empty string `""`, other data still returns)

---

## GET /api/v1/health

Railway healthcheck endpoint. No auth required.

**Response 200**
```json
{
  "status": "ok",
  "timestamp": "2026-02-28T12:00:00.000Z"
}
```

---

## Error Shape (all errors)

```json
{
  "error": "Human readable message",
  "issues": []
}
```

- `issues` is only present on 400 Zod validation errors
- Never include stack traces, Mistral error details, or DB error details in responses

---

## Rate Limits

Applied per IP in `server/src/middleware/rateLimit.ts`:

| Route | Limit |
|---|---|
| POST /api/v1/chat | 30 requests / minute |
| POST /api/v1/session | 10 requests / minute |
| POST /api/v1/conversation/end | 20 requests / minute |
| GET /api/v1/dashboard/* | 20 requests / minute |
