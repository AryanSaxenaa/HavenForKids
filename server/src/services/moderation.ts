import { Mistral } from '@mistralai/mistralai'
import { env } from '../config/env'
import { logger } from '../utils/logger'

const mistral = new Mistral({ apiKey: env.MISTRAL_API_KEY })

const MODERATION_TIMEOUT_MS = 8_000

const CRISIS_THRESHOLD = 0.7

// Categories that trigger a full crisis response (self-harm or violence toward self/others)
const CRISIS_CATEGORIES = ['self_harm', 'violence'] as const

// Categories that are harmful for children but warrant a gentle deflection, not a full crisis.
// The character will still say something safe — the `harmful` flag routes to the same
// crisis path so the parent is still notified and the input is locked.
const HARMFUL_CATEGORIES = ['sexual', 'harassment_and_bullying'] as const

/**
 * Runs Mistral Moderation API on the child's raw message.
 * Returns true if crisis is detected (self_harm or violence > threshold).
 * This runs in PARALLEL with the chat call — never blocks the response.
 */
export async function moderateMessage(text: string): Promise<boolean> {
  try {
    const response = await mistral.classifiers.moderateChat({
      model: 'mistral-moderation-latest',
      inputs: [{ role: 'user', content: text }],
    }, { fetchOptions: { signal: AbortSignal.timeout(MODERATION_TIMEOUT_MS) } })

    const result = response.results?.[0]
    if (!result) {
      logger.warn('Moderation API returned no results')
      return false
    }

    const categories = result.categories as Record<string, boolean>
    const scores = result.categoryScores as Record<string, number>

    // Check crisis category flags first (self-harm, violence)
    for (const cat of CRISIS_CATEGORIES) {
      if (categories[cat] === true) {
        logger.warn({ text: '[REDACTED]', trigger: 'category_flag', category: cat }, 'Moderation crisis flag triggered')
        return true
      }
    }

    // Check crisis score thresholds
    for (const cat of CRISIS_CATEGORIES) {
      const score = scores[cat] ?? 0
      if (score > CRISIS_THRESHOLD) {
        logger.warn({ score, category: cat, threshold: CRISIS_THRESHOLD }, 'Moderation crisis score threshold exceeded')
        return true
      }
    }

    // Check harmful-but-not-crisis categories (sexual, harassment) — also trigger crisis
    // path to lock input and notify parent. Better to over-protect for a child audience.
    for (const cat of HARMFUL_CATEGORIES) {
      if (categories[cat] === true || (scores[cat] ?? 0) > CRISIS_THRESHOLD) {
        logger.warn({ text: '[REDACTED]', trigger: 'harmful_category', category: cat }, 'Harmful content detected for child audience')
        return true
      }
    }

    return false
  } catch (err) {
    logger.error({ err }, 'Moderation API call failed — defaulting to safe (false)')
    // Fail open: if moderation is down, still let the character response determine crisis
    return false
  }
}
