import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db/client'
import { generateParentSuggestion } from '../services/mistral'
import { logger } from '../utils/logger'
import { type Character, type CharacterVisit, type WeeklyEntry, type DashboardData } from '../../../shared/src/types'
import { dashboardRateLimit } from '../middleware/rateLimit'

export const dashboardRouter = Router()

// GET /api/v1/dashboard/:sessionId
dashboardRouter.get('/:sessionId', dashboardRateLimit, async (req, res, next) => {
  try {
    const sessionIdSchema = z.string().uuid()
    const parsed = sessionIdSchema.safeParse(req.params['sessionId'])
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid sessionId' })
      return
    }
    const sessionId = parsed.data

    // Verify session exists
    const sessionResult = await db.execute({
      sql: 'SELECT id, age FROM sessions WHERE id = ?',
      args: [sessionId],
    })
    if (!sessionResult.rows[0]) {
      res.status(404).json({ error: 'Session not found' })
      return
    }
    const childAge = Number(sessionResult.rows[0]?.['age'] ?? 9)

    // Run both DB queries in parallel — they are independent of each other
    const [scoresResult, weeklyResult] = await Promise.all([
      db.execute({
        sql: `SELECT character_name, COUNT(*) as visit_count, AVG(tone_score) as avg_tone
              FROM conversation_scores
              WHERE session_id = ?
              GROUP BY character_name`,
        args: [sessionId],
      }),
      db.execute({
        sql: `SELECT
                character_name,
                strftime('%Y-W%W', timestamp, 'weekday 1', '-6 days') as week,
                COUNT(*) as count
              FROM conversation_scores
              WHERE session_id = ?
              GROUP BY week, character_name
              ORDER BY week DESC
              LIMIT 50`,
        args: [sessionId],
      }),
    ])

    const characterVisits: CharacterVisit[] = scoresResult.rows.map((row) => ({
      character: row['character_name'] as Character,
      count: Number(row['visit_count']),
      avgTone: Number(row['avg_tone'] ?? 0),
    }))

    const weeklyTrend: WeeklyEntry[] = weeklyResult.rows.map((row) => ({
      week: String(row['week']),
      character: row['character_name'] as Character,
      count: Number(row['count']),
    }))

    // Generate parent suggestion via Mistral (skip if no data yet).
    // This can run as soon as characterVisits is ready — no need to wait for weeklyTrend.
    const suggestion = characterVisits.length > 0
      ? await generateParentSuggestion(characterVisits, childAge)
      : 'No conversations yet this week. Once your child visits Haven, you\'ll see patterns and suggestions here.'

    const dashboardData: DashboardData = {
      characterVisits,
      weeklyTrend,
      suggestion,
    }

    logger.info({ sessionId }, 'Dashboard data served')
    res.json(dashboardData)
  } catch (err) {
    next(err)
  }
})
