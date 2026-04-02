-- Migration 001: Initial schema
-- Applied: 2026-02-28
-- This is the base schema. See schema.sql for the full table definitions.
-- Run: turso db shell haven-db < server/src/db/migrations/001_initial.sql

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  child_name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age BETWEEN 7 AND 12),
  preferred_character TEXT,
  parent_email TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_scores (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  character_name TEXT NOT NULL,
  tone_score INTEGER NOT NULL CHECK (tone_score BETWEEN 1 AND 5),
  visit_count INTEGER DEFAULT 1,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crisis_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  character_name TEXT,
  timestamp TEXT NOT NULL,
  alerted_parent INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_scores_session ON conversation_scores(session_id);
CREATE INDEX IF NOT EXISTS idx_scores_timestamp ON conversation_scores(timestamp);
CREATE INDEX IF NOT EXISTS idx_crisis_session ON crisis_events(session_id);
