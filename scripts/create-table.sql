-- Create workspace_states table
CREATE TABLE IF NOT EXISTS workspace_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  tab_state JSONB NOT NULL DEFAULT '{"tabs":[],"activeTabId":null}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, workspace_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workspace_states_user_workspace
ON workspace_states(user_id, workspace_id);

-- Enable RLS (Row Level Security)
ALTER TABLE workspace_states ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own workspace states
CREATE POLICY "Users can read own workspace states"
ON workspace_states FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own workspace states
CREATE POLICY "Users can insert own workspace states"
ON workspace_states FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own workspace states
CREATE POLICY "Users can update own workspace states"
ON workspace_states FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own workspace states
CREATE POLICY "Users can delete own workspace states"
ON workspace_states FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workspace_states_updated_at
BEFORE UPDATE ON workspace_states
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
