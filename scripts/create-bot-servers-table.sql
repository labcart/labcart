-- Create bot_servers table for coordination
CREATE TABLE IF NOT EXISTS bot_servers (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  server_name TEXT NOT NULL,
  server_url TEXT,
  status TEXT DEFAULT 'offline' CHECK (status IN ('provisioning', 'online', 'offline', 'terminated')),
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  terminated_at TIMESTAMPTZ,
  UNIQUE(user_id, server_name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bot_servers_user_status
ON bot_servers(user_id, status);

-- Enable RLS (Row Level Security)
ALTER TABLE bot_servers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own servers
CREATE POLICY "Users can read own bot servers"
ON bot_servers FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own servers
CREATE POLICY "Users can insert own bot servers"
ON bot_servers FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own servers
CREATE POLICY "Users can update own bot servers"
ON bot_servers FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own servers
CREATE POLICY "Users can delete own bot servers"
ON bot_servers FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_bot_servers_updated_at
BEFORE UPDATE ON bot_servers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
