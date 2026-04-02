import { Mistral } from '@mistralai/mistralai'
import { z } from 'zod'
import { env } from '../config/env'
import { CHARACTER_PROMPTS } from '../config/prompts'
import { type Character, type Message, type ChatResponse } from '../../../shared/src/types'
import { logger } from '../utils/logger'

const mistral = new Mistral({ apiKey: env.MISTRAL_API_KEY })

// Timeout helpers — abort any Mistral call that takes longer than the limit
const CHAT_TIMEOUT_MS    = 15_000  // 15 s for main chat (mistral-large)
const SMALL_TIMEOUT_MS   =  8_000  // 8 s for small-model tasks

const chatResponseSchema = z.object({
  message: z.string().min(1).max(400),  // ~3 sentences max; matches maxTokens: 300
  crisis: z.boolean(),
  tone: z.enum(['playful', 'heavy', 'neutral']),
})

// Per-character fallback messages — used when the API fails or returns invalid JSON.
// Each fallback sounds like the character so the voice stays consistent even on errors.
const CHARACTER_FALLBACKS: Record<Character, string> = {
  Pip:     "I'm right here. Take a breath — you can tell me anything.",
  Bramble: "I'm not going anywhere. Take your time.",
  Flint:   "Hey. Still here. Say whatever's on your mind.",
  Luna:    "I'm listening. Whatever it is, you can say it.",
  Cleo:    "Oh, I'm here! No rush — tell me when you're ready.",
}

export async function chatWithCharacter(
  character: Character,
  message: string,
  history: Message[],
): Promise<ChatResponse> {
  const systemPrompt = CHARACTER_PROMPTS[character]

  // Greetings are simple one-shot prompts — use the lighter model to reduce latency.
  // All other turns use the full mistral-large model for richer, safer responses.
  const isGreeting = message.startsWith('GREETING:')
  const model = isGreeting ? 'mistral-small-3-2' : 'mistral-large-2512'
  const timeout = isGreeting ? SMALL_TIMEOUT_MS : CHAT_TIMEOUT_MS

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: message },
  ]

  const response = await mistral.chat.complete({
    model,
    messages,
    responseFormat: { type: 'json_object' },
    maxTokens: 300,
    temperature: 0.7,
  }, { fetchOptions: { signal: AbortSignal.timeout(timeout) } })

  const rawContent = response.choices?.[0]?.message?.content
  if (typeof rawContent !== 'string' || !rawContent) {
    logger.error({ character }, 'Mistral returned empty content')
    return { message: CHARACTER_FALLBACKS[character], crisis: false, tone: 'neutral' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawContent)
  } catch {
    logger.error({ character, rawContent }, 'Mistral returned non-JSON content')
    return { message: CHARACTER_FALLBACKS[character], crisis: false, tone: 'neutral' }
  }

  const validated = chatResponseSchema.safeParse(parsed)
  if (!validated.success) {
    logger.error({ character, parsed, errors: validated.error.flatten() }, 'Mistral response failed schema validation')
    return { message: CHARACTER_FALLBACKS[character], crisis: false, tone: 'neutral' }
  }

  return validated.data
}

const parentSuggestionSchema = z.object({
  suggestion: z.string().min(1).max(600),  // 2–3 sentences; matches maxTokens: 200
})

export async function generateParentSuggestion(
  visits: Array<{ character: Character; count: number; avgTone: number }>,
  childAge: number,
): Promise<string> {
  const visitSummary = visits
    .map((v) => `${v.character} visited ${v.count} times, avg tone ${v.avgTone.toFixed(1)}/5`)
    .join('. ')

  const prompt = `This week: ${visitSummary}. Child age: ${childAge}.`

  const systemPrompt = `You are a warm, supportive advisor helping a parent understand their child's emotional week.
You will be given data about which emotional characters a child visited and how heavy the conversations were.
You must NOT see any actual conversation text — only these aggregate numbers.

Write ONE short paragraph (2–3 sentences maximum) with a gentle, specific suggestion for the parent.
Do not alarm. Do not diagnose. Do not use clinical language.
Write as if you are a kind, experienced friend.

Return ONLY valid JSON with exactly this structure. Nothing else.
{"suggestion": "your paragraph here"}`

  const response = await mistral.chat.complete({
    model: 'mistral-small-3-2',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    responseFormat: { type: 'json_object' },
    maxTokens: 200,
    temperature: 0.5,
  }, { fetchOptions: { signal: AbortSignal.timeout(SMALL_TIMEOUT_MS) } })

  const rawContent = response.choices?.[0]?.message?.content
  if (typeof rawContent !== 'string' || !rawContent) {
    return 'Your child has been spending time with the Haven characters this week. Consider checking in with them about how they are feeling.'
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawContent)
  } catch {
    return 'Your child has been spending time with the Haven characters this week. Consider checking in with them about how they are feeling.'
  }

  const validated = parentSuggestionSchema.safeParse(parsed)
  if (!validated.success) {
    return 'Your child has been spending time with the Haven characters this week. Consider checking in with them about how they are feeling.'
  }

  return validated.data.suggestion
}
