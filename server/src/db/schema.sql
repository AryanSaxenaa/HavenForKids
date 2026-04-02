-- HAVEN Database Schema
-- This file is for reference / manual inspection only.
-- The server runs server/src/db/migrate.ts automatically on every boot.
-- Run against Turso manually: turso db shell haven-db < server/src/db/schema.sql

CREATE TABLE IF NOT EXISTS sessions (
  id                  TEXT PRIMARY KEY,
  child_name          TEXT NOT NULL,
  age                 INTEGER NOT NULL CHECK (age BETWEEN 7 AND 12),
  preferred_character TEXT CHECK (preferred_character IN ('Pip','Bramble','Flint','Luna','Cleo')),
  parent_email        TEXT,
  created_at          TEXT NOT NULL
);

-- visit_count removed: always 1, never used in queries (COUNT(*) used instead).
CREATE TABLE IF NOT EXISTS conversation_scores (
  id             TEXT PRIMARY KEY,
  session_id     TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  character_name TEXT NOT NULL CHECK (character_name IN ('Pip','Bramble','Flint','Luna','Cleo')),
  tone_score     INTEGER NOT NULL CHECK (tone_score BETWEEN 1 AND 5),
  timestamp      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crisis_events (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  character_name  TEXT,
  timestamp       TEXT NOT NULL,
  alerted_parent  INTEGER DEFAULT 0
);

-- Indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_scores_session   ON conversation_scores(session_id);
CREATE INDEX IF NOT EXISTS idx_scores_timestamp ON conversation_scores(timestamp);
CREATE INDEX IF NOT EXISTS idx_crisis_session   ON crisis_events(session_id);
