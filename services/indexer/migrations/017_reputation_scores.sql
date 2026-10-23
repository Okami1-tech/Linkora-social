-- Migration 017: Reputation scores
-- Stores persistent reputation scores for addresses. Used for leaderboard
-- queries and tier lookups. This is a reversible migration.
--
-- Rollback: DROP TABLE reputation_scores;

CREATE TABLE IF NOT EXISTS reputation_scores (
    address    TEXT      PRIMARY KEY,
    score      BIGINT    NOT NULL DEFAULT 0,
    tier       TEXT      NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reputation_scores_score_desc
    ON reputation_scores (score DESC);
