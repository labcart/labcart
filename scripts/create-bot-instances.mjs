import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: 'aws-0-us-west-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.xmpmgumxjivhgzsjcmnn',
  password: 'Labcart#1029384756',
  ssl: { rejectUnauthorized: false }
});

const sql = `
-- Create bot_instances table for user's bot server configurations
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bot_instances_user_id ON bot_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_instances_active ON bot_instances(active);

-- Enable RLS
ALTER TABLE bot_instances ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own bot instances"
ON bot_instances FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bot instances"
ON bot_instances FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bot instances"
ON bot_instances FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bot instances"
ON bot_instances FOR DELETE
USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_bot_instances_updated_at
BEFORE UPDATE ON bot_instances
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
`;

async function run() {
  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('Connected!');

    console.log('Creating bot_instances table...');
    await client.query(sql);
    console.log('✅ Table created successfully!');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
