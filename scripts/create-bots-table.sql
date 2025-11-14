-- Create bots table
CREATE TABLE IF NOT EXISTS bots (
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
CREATE INDEX IF NOT EXISTS idx_bots_user_id ON bots(user_id);
CREATE INDEX IF NOT EXISTS idx_bots_active ON bots(active);

-- Enable RLS (Row Level Security)
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own bots
CREATE POLICY "Users can read own bots"
ON bots FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own bots
CREATE POLICY "Users can insert own bots"
ON bots FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own bots
CREATE POLICY "Users can update own bots"
ON bots FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own bots
CREATE POLICY "Users can delete own bots"
ON bots FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_bots_updated_at
BEFORE UPDATE ON bots
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
