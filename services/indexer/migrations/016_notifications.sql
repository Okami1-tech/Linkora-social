-- Migration 016: Notifications
-- Stores in-app notifications for users.
--
-- Rollback: DROP TABLE notifications;

CREATE TABLE IF NOT EXISTS notifications (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient  TEXT        NOT NULL,
    type       TEXT        NOT NULL,
    message    TEXT        NOT NULL,
    link_href  TEXT,
    read       BOOLEAN     NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
    ON notifications (recipient);

CREATE INDEX IF NOT EXISTS idx_notifications_read
    ON notifications (read);
