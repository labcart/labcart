import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
DROP POLICY IF EXISTS "Users can read own bot instances" ON bot_instances;
CREATE POLICY "Users can read own bot instances"
ON bot_instances FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own bot instances" ON bot_instances;
CREATE POLICY "Users can insert own bot instances"
ON bot_instances FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bot instances" ON bot_instances;
CREATE POLICY "Users can update own bot instances"
ON bot_instances FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own bot instances" ON bot_instances;
CREATE POLICY "Users can delete own bot instances"
ON bot_instances FOR DELETE
USING (auth.uid() = user_id);

-- Trigger
DROP TRIGGER IF EXISTS update_bot_instances_updated_at ON bot_instances;
CREATE TRIGGER update_bot_instances_updated_at
BEFORE UPDATE ON bot_instances
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
`.trim();

    // Execute via raw SQL using pg client through supabase-js
    const { data, error } = await supabase.rpc('exec', { sql });

    if (error) {
      console.error('SQL Error:', error);
      return NextResponse.json(
        {
          error: 'Failed to create table',
          details: error.message,
          sql: sql.substring(0, 200) + '...'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'bot_instances table created successfully',
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create table',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
