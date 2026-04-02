import { db } from './client'
import { logger } from '../utils/logger'

/**
 * Runs all DDL statements at server startup.
 * Safe to call on every boot — all statements are idempotent (CREATE IF NOT EXISTS).
 * Also enables SQLite foreign-key enforcement, which is OFF by default.
 */
export async function migrate(): Promise<void> {
  logger.info('Running DB migrations...')

  // Enable FK enforcement for this connection.
  // Turso uses HTTP so each request is technically a new connection, but setting
  // this here ensures any batch that follows respects FK constraints.
  await db.execute('PRAGMA foreign_keys = ON')

  await db.batch([
    // ── sessions ──────────────────────────────────────────────────
    {
      sql: `CREATE TABLE IF NOT EXISTS sessions (
        id                  TEXT PRIMARY KEY,
        child_name          TEXT NOT NULL,
        age                 INTEGER NOT NULL CHECK (age BETWEEN 7 AND 12),
        preferred_character TEXT CHECK (preferred_character IN ('Pip','Bramble','Flint','Luna','Cleo')),
        parent_email        TEXT,
        created_at          TEXT NOT NULL
      )`,
      args: [],
    },

    // ── conversation_scores ───────────────────────────────────────
    // visit_count column removed — it was always 1 and never used by queries.
    // The dashboard uses COUNT(*) to count rows, not SUM(visit_count).
    {
      sql: `CREATE TABLE IF NOT EXISTS conversation_scores (
        id             TEXT PRIMARY KEY,
        session_id     TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        character_name TEXT NOT NULL CHECK (character_name IN ('Pip','Bramble','Flint','Luna','Cleo')),
        tone_score     INTEGER NOT NULL CHECK (tone_score BETWEEN 1 AND 5),
        timestamp      TEXT NOT NULL
      )`,
      args: [],
    },

    // ── crisis_events ─────────────────────────────────────────────
    {
      sql: `CREATE TABLE IF NOT EXISTS crisis_events (
        id              TEXT PRIMARY KEY,
        session_id      TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        character_name  TEXT,
        timestamp       TEXT NOT NULL,
        alerted_parent  INTEGER DEFAULT 0
      )`,
      args: [],
    },

    // ── indexes ───────────────────────────────────────────────────
    { sql: 'CREATE INDEX IF NOT EXISTS idx_scores_session   ON conversation_scores(session_id)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_scores_timestamp ON conversation_scores(timestamp)',  args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_crisis_session   ON crisis_events(session_id)',       args: [] },
  ])

  logger.info('DB migrations complete')
}
