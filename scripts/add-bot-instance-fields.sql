-- Add fields to existing bots table to support bot server instances
-- This extends the bots table without breaking existing platform bot functionality

-- Add new columns
ALTER TABLE bots ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE bots ADD COLUMN IF NOT EXISTS server_id TEXT REFERENCES bot_servers(id) ON DELETE SET NULL;
ALTER TABLE bots ADD COLUMN IF NOT EXISTS telegram_token TEXT;
ALTER TABLE bots ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE bots ADD COLUMN IF NOT EXISTS workspace TEXT;
ALTER TABLE bots ADD COLUMN IF NOT EXISTS web_only BOOLEAN DEFAULT true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bots_user_id ON bots(user_id);
CREATE INDEX IF NOT EXISTS idx_bots_server_id ON bots(server_id);
CREATE INDEX IF NOT EXISTS idx_bots_active ON bots(active);

-- Add RLS policies for user_id (in addition to existing creator_id policies)
-- Users can read bots they own OR public bots
DROP POLICY IF EXISTS "Users can read own bot instances" ON bots;
CREATE POLICY "Users can read own bot instances"
ON bots FOR SELECT
USING (
  auth.uid() = user_id OR
  auth.uid() = creator_id OR
  is_public = true
);

-- Users can insert bots they create
DROP POLICY IF EXISTS "Users can insert own bots" ON bots;
CREATE POLICY "Users can insert own bots"
ON bots FOR INSERT
WITH CHECK (auth.uid() = creator_id);

-- Users can update bots they own (user_id) or created (creator_id)
DROP POLICY IF EXISTS "Users can update own bots" ON bots;
CREATE POLICY "Users can update own bots"
ON bots FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = creator_id)
WITH CHECK (auth.uid() = user_id OR auth.uid() = creator_id);

-- Users can delete bots they own (user_id) or created (creator_id)
DROP POLICY IF EXISTS "Users can delete own bots" ON bots;
CREATE POLICY "Users can delete own bots"
ON bots FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = creator_id);
