-- Create bot_instances table for user's bot server configurations
-- This is separate from the 'bots' table which stores platform bot templates
CREATE TABLE IF NOT EXISTS bot_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brain TEXT NOT NULL,
  display_name TEXT,
  workspace TEXT,
  web_only BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  telegram_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bot_instances_user_id ON bot_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_instances_active ON bot_instances(active);

-- Enable RLS (Row Level Security)
ALTER TABLE bot_instances ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own bot instances
CREATE POLICY "Users can read own bot instances"
ON bot_instances FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own bot instances
CREATE POLICY "Users can insert own bot instances"
ON bot_instances FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own bot instances
CREATE POLICY "Users can update own bot instances"
ON bot_instances FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own bot instances
CREATE POLICY "Users can delete own bot instances"
ON bot_instances FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_bot_instances_updated_at
BEFORE UPDATE ON bot_instances
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
