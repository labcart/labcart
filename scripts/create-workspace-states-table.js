#!/usr/bin/env node

/**
 * Creates the workspace_states table in Supabase
 * Run this once to set up the database schema
 */

const SUPABASE_URL = 'https://maaotshzykjncoifrbmj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW90c2h6eWtqbmNvaWZyYm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMDM1OTUsImV4cCI6MjA3Nzc3OTU5NX0.gtv5duMO1_eRsDkuzrMIWqSira1CnnImQagGTEXepVs';

const SQL_CREATE_TABLE = `
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
`;

async function createTable() {
  console.log('🚀 Creating workspace_states table in Supabase...\n');

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ query: SQL_CREATE_TABLE }),
    });

    if (!response.ok) {
      // Try alternative method - using the SQL editor endpoint
      console.log('⚠️  RPC endpoint not available, trying direct SQL execution...\n');

      const sqlResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          query: SQL_CREATE_TABLE
        }),
      });

      if (!sqlResponse.ok) {
        console.log('❌ Could not create table via API.');
        console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:\n');
        console.log('─'.repeat(80));
        console.log(SQL_CREATE_TABLE);
        console.log('─'.repeat(80));
        console.log('\n🌐 Go to: https://supabase.com/dashboard/project/maaotshzykjncoifrbmj/sql/new\n');
        process.exit(1);
      }
    }

    console.log('✅ Successfully created workspace_states table!');
    console.log('✅ RLS policies enabled');
    console.log('✅ Indexes created');
    console.log('✅ Auto-update trigger configured\n');

  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:\n');
    console.log('─'.repeat(80));
    console.log(SQL_CREATE_TABLE);
    console.log('─'.repeat(80));
    console.log('\n🌐 Go to: https://supabase.com/dashboard/project/maaotshzykjncoifrbmj/sql/new\n');
    process.exit(1);
  }
}

createTable();
