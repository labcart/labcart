-- Create install_tokens table for one-time install links
CREATE TABLE IF NOT EXISTS install_tokens (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  used_at TIMESTAMPTZ,
  server_id TEXT
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_install_tokens_user_created
ON install_tokens(user_id, created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE install_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own tokens
CREATE POLICY "Users can read own install tokens"
ON install_tokens FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own tokens
CREATE POLICY "Users can insert own install tokens"
ON install_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tokens
CREATE POLICY "Users can update own install tokens"
ON install_tokens FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own tokens
CREATE POLICY "Users can delete own install tokens"
ON install_tokens FOR DELETE
USING (auth.uid() = user_id);
