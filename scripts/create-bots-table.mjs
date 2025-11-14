import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://maaotshzykjncoifrbmj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW90c2h6eWtqbmNvaWZyYm1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjIwMzU5NSwiZXhwIjoyMDc3Nzc5NTk1fQ.AHec7PwTI21iaiHVG2pBAfXWUwbocvlM4aok-AxKzF0';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createBotsTable() {
  const sql = fs.readFileSync('./scripts/create-bots-table.sql', 'utf8');

  console.log('Creating bots table...');

  // Execute the SQL
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });

  if (error) {
    console.error('Error creating table:', error);
    process.exit(1);
  }

  console.log('✅ Bots table created successfully');
}

createBotsTable();
