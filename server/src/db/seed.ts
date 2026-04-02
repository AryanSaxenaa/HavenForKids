/**
 * Dev seed script — inserts test data into Turso DB.
 * Run with: ts-node src/db/seed.ts
 * Requires a .env file with TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.
 */
import 'dotenv/config'
import { db } from './client'

async function seed(): Promise<void> {
  const sessionId = 'seed-session-001'
  const now = new Date().toISOString()

  // Insert a test session
  await db.execute({
    sql: `INSERT OR IGNORE INTO sessions (id, child_name, age, preferred_character, parent_email, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [sessionId, 'TestChild', 9, 'Pip', 'parent@example.com', now],
  })

  // Insert some test conversation scores
  const scores = [
    { character: 'Pip', tone_score: 3 },
    { character: 'Pip', tone_score: 4 },
    { character: 'Bramble', tone_score: 4 },
    { character: 'Cleo', tone_score: 1 },
    { character: 'Luna', tone_score: 2 },
  ]

  for (const s of scores) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    await db.execute({
      sql: `INSERT OR IGNORE INTO conversation_scores (id, session_id, character_name, tone_score, visit_count, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), sessionId, s.character, s.tone_score, 1, weekAgo],
    })
  }

  console.log('✅ Seed complete. Session ID:', sessionId)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
