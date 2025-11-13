#!/usr/bin/env node

/**
 * Create workspace_states table using Supabase service role
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://maaotshzykjncoifrbmj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW90c2h6eWtqbmNvaWZyYm1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjIwMzU5NSwiZXhwIjoyMDc3Nzc5NTk1fQ.AHec7PwTI21iaiHVG2pBAfXWUwbocvlM4aok-AxKzF0';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const SQL = readFileSync('scripts/create-table.sql', 'utf8');

console.log('🚀 Creating workspace_states table...\n');

// Split SQL into individual statements
const statements = SQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

for (const statement of statements) {
  if (!statement) continue;

  console.log(`Executing: ${statement.substring(0, 50)}...`);

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: statement });

    if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log('✅ Success');
    }
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}

console.log('\n✅ Table creation complete!');
