import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../middleware/validate'
import { chatWithCharacter } from '../services/mistral'
import { moderateMessage } from '../services/moderation'
import { handleCrisis } from '../services/crisis'
import { scoreConversation } from '../services/toneScorer'
import { db } from '../db/client'
import { logger } from '../utils/logger'
import { chatRateLimit } from '../middleware/rateLimit'

export const chatRouter = Router()

const chatBodySchema = z.object({
  sessionId: z.string().uuid(),
  character: z.enum(['Pip', 'Bramble', 'Flint', 'Luna', 'Cleo']),
  message: z.string().min(1).max(500),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),  // guard against oversized history items
      }),
    )
    .max(50),
})

const conversationEndSchema = z.object({
  sessionId: z.string().uuid(),
  character: z.enum(['Pip', 'Bramble', 'Flint', 'Luna', 'Cleo']),
  messageCount: z.number().int().min(1),
  tones: z.array(z.enum(['playful', 'heavy', 'neutral'])).min(1),
})

// POST /api/v1/chat
chatRouter.post('/', chatRateLimit, validate(chatBodySchema), async (req, res, next) => {
  try {
    const { sessionId, character, message, history } = req.body as z.infer<typeof chatBodySchema>

    // Verify session exists before hitting Mistral
    const sessionCheck = await db.execute({
      sql: 'SELECT id FROM sessions WHERE id = ?',
      args: [sessionId],
    })
    if (!sessionCheck.rows[0]) {
      res.status(404).json({ error: 'Session not found' })
      return
    }

    // Run chat + moderation in parallel.
    // Skip moderation for greeting tokens — they are system-generated, not child input.
    const isGreeting = message.startsWith('GREETING:')
    const [chatResponse, isModerationCrisis] = await Promise.all([
      chatWithCharacter(character, message, history),
      isGreeting ? Promise.resolve(false) : moderateMessage(message),
    ])

    const isCrisis = chatResponse.crisis || isModerationCrisis

    if (isCrisis) {
      // Fire-and-forget crisis handler — do not await to unblock response
      handleCrisis(sessionId, character).catch((err) => {
        logger.error({ err, sessionId }, 'Crisis handler failed')
      })

      logger.warn({ sessionId, character, fromChat: chatResponse.crisis, fromModeration: isModerationCrisis }, 'Crisis triggered')

      res.json({
        message: chatResponse.message,
        crisis: true,
        tone: 'heavy' as const,
      })
      return
    }

    res.json(chatResponse)
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/conversation/end  (mounted separately — NOT under /chat)
export const conversationRouter = Router()

conversationRouter.post('/end', chatRateLimit, validate(conversationEndSchema), async (req, res, next) => {
  try {
    const { sessionId, character, messageCount, tones } = req.body as z.infer<typeof conversationEndSchema>

    // Verify session exists before scoring
    const sessionCheck = await db.execute({
      sql: 'SELECT id FROM sessions WHERE id = ?',
      args: [sessionId],
    })
    if (!sessionCheck.rows[0]) {
      res.status(404).json({ error: 'Session not found' })
      return
    }

    const toneScore = await scoreConversation(character, messageCount, tones)

    await db.execute({
      sql: `INSERT INTO conversation_scores (id, session_id, character_name, tone_score, timestamp)
            VALUES (?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), sessionId, character, toneScore, new Date().toISOString()],
    })

    logger.info({ sessionId, character, toneScore }, 'Conversation scored and saved')

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
