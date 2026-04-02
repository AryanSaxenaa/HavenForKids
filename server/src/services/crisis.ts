import { Resend } from 'resend'
import { env } from '../config/env'
import { db } from '../db/client'
import { logger } from '../utils/logger'

const resend = new Resend(env.RESEND_API_KEY)

/**
 * Handles a crisis event:
 * 1. Inserts a crisis_events record (no message text — ever)
 * 2. Looks up parent email from sessions table
 * 3. If email exists, sends a calm Resend alert email
 */
export async function handleCrisis(sessionId: string, character: string): Promise<void> {
  const timestamp = new Date().toISOString()
  const eventId = crypto.randomUUID()

  // Step 1: Insert crisis event AND fetch parent email in a single batch.
  // Using a batch means both statements travel in one HTTP round-trip to Turso
  // and we can't end up with an inserted event but no email reference.
  let parentEmail: string | null = null
  try {
    const [, emailResult] = await db.batch([
      {
        sql: `INSERT INTO crisis_events (id, session_id, character_name, timestamp, alerted_parent)
              VALUES (?, ?, ?, ?, 0)`,
        args: [eventId, sessionId, character, timestamp],
      },
      {
        sql: 'SELECT parent_email FROM sessions WHERE id = ?',
        args: [sessionId],
      },
    ])
    const row = emailResult?.rows[0]
    if (row && typeof row['parent_email'] === 'string' && row['parent_email']) {
      parentEmail = row['parent_email']
    }
  } catch (err) {
    logger.error({ err, sessionId }, 'Failed to log crisis event or fetch parent email')
    // Do not return — still attempt email if we somehow have one from a prior lookup
  }

  // Step 3: Send email if we have one
  if (parentEmail) {
    try {
      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: parentEmail,
        subject: 'HAVEN — A gentle heads-up about your child',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #5b4fcf;">A note from HAVEN</h2>
            <p>Hi,</p>
            <p>HAVEN is the safe village game your child has been using to talk about their feelings with friendly animal characters.</p>
            <p>While your child was spending time in Haven today, our safety system noticed something in their conversation that we want to make sure you know about.</p>
            <p>We never store any conversation text — so we can't tell you exactly what was said. But we'd gently encourage you to check in with your child today. A simple, relaxed "How are you doing lately?" or doing something together can open a door.</p>
            <p>If you're worried about your child's wellbeing, please don't hesitate to reach out to a professional. In the UK:</p>
            <ul>
              <li><strong>Childline</strong> — 0800 1111 (free, 24/7, for children)</li>
              <li><strong>Young Minds Parent Line</strong> — 0808 802 5544 (free, for parents)</li>
            </ul>
            <p>Thank you for trusting Haven with your child. You're doing a great thing by paying attention.</p>
            <p style="color: #888; font-size: 12px; margin-top: 24px;">This is an automated message from HAVEN. If you have questions, visit our website for support resources.</p>
          </div>
        `,
      })

      // Update alerted_parent flag
      await db.execute({
        sql: 'UPDATE crisis_events SET alerted_parent = 1 WHERE id = ?',
        args: [eventId],
      })

      logger.info({ sessionId, character }, 'Crisis email sent to parent')
    } catch (err) {
      logger.error({ err, sessionId }, 'Failed to send crisis email via Resend')
    }
  } else {
    logger.info({ sessionId, character }, 'Crisis logged — no parent email on file')
  }
}
