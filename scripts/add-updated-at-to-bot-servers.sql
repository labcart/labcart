-- Add updated_at column to bot_servers table
-- This column is required by the update_updated_at_column() trigger

ALTER TABLE bot_servers
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
