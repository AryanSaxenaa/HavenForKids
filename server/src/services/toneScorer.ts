import { Mistral } from '@mistralai/mistralai'
import { z } from 'zod'
import { env } from '../config/env'
import { type Character, type Tone } from '../../../shared/src/types'
import { logger } from '../utils/logger'

const mistral = new Mistral({ apiKey: env.MISTRAL_API_KEY })

const SMALL_TIMEOUT_MS = 8_000

const toneScoreSchema = z.object({
  score: z.number().int().min(1).max(5),
})

const CHARACTER_DESCRIPTIONS: Record<Character, string> = {
  Pip: 'anxiety/worry character',
  Bramble: 'sadness/loss character',
  Flint: 'anger/frustration character',
  Luna: 'loneliness character',
  Cleo: 'joy/gratitude character',
}

/**
 * Scores a completed conversation on a 1–5 scale.
 * Uses mistral-small-3-2 (cheaper, simpler task).
 * Returns the integer score (1 = very light, 5 = very heavy).
 */
export async function scoreConversation(
  character: Character,
  messageCount: number,
  tones: Tone[],
): Promise<number> {
  const toneList = tones.join(', ')
  const summary = `Child visited ${character} (${CHARACTER_DESCRIPTIONS[character]}). Tone labels from messages: ${toneList}. Message count: ${messageCount}.`

  const systemPrompt = `You are a conversation analyser. You will be given a summary of a child's conversation.
Rate the emotional weight of the conversation on a scale of 1 to 5:
1 = very light, playful, happy
2 = mostly light with some thoughtful moments
3 = balanced mix of light and heavier feelings
4 = mostly heavy, sad, or worried
5 = very heavy, distressing content

Return ONLY valid JSON with exactly this structure. Nothing else.
{"score": 1}`

  try {
    const response = await mistral.chat.complete({
      model: 'mistral-small-3-2',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: summary },
      ],
      responseFormat: { type: 'json_object' },
      maxTokens: 50,
      temperature: 0.3,
    }, { fetchOptions: { signal: AbortSignal.timeout(SMALL_TIMEOUT_MS) } })

    const rawContent = response.choices?.[0]?.message?.content
    if (typeof rawContent !== 'string' || !rawContent) {
      logger.warn({ character }, 'Tone scorer returned empty content — defaulting to 3')
      return 3
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(rawContent)
    } catch {
      logger.warn({ character, rawContent }, 'Tone scorer returned non-JSON — defaulting to 3')
      return 3
    }

    const validated = toneScoreSchema.safeParse(parsed)
    if (!validated.success) {
      logger.warn({ character, parsed }, 'Tone scorer response failed validation — defaulting to 3')
      return 3
    }

    return validated.data.score
  } catch (err) {
    logger.error({ err, character }, 'Tone scorer API call failed — defaulting to 3')
    return 3
  }
}
