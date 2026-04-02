import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../middleware/validate'
import { db } from '../db/client'
import { logger } from '../utils/logger'
import { sessionRateLimit } from '../middleware/rateLimit'

export const sessionRouter = Router()

const sessionBodySchema = z.object({
  childName: z.string().min(1).max(20),
  age: z.number().int().min(7).max(12),
  preferredCharacter: z.enum(['Pip', 'Bramble', 'Flint', 'Luna', 'Cleo']),
  parentEmail: z.string().email().optional(),
})

sessionRouter.post('/', sessionRateLimit, validate(sessionBodySchema), async (req, res, next) => {
  try {
    const { childName, age, preferredCharacter, parentEmail } = req.body as z.infer<typeof sessionBodySchema>

    const sessionId = crypto.randomUUID()
    const createdAt = new Date().toISOString()

    await db.execute({
      sql: `INSERT INTO sessions (id, child_name, age, preferred_character, parent_email, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [sessionId, childName, age, preferredCharacter, parentEmail ?? null, createdAt],
    })

    logger.info({ sessionId, preferredCharacter }, 'Session created')

    res.status(201).json({ sessionId })
  } catch (err) {
    next(err)
  }
})
