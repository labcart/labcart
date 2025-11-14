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

async function createBotInstancesTable() {
  const sql = fs.readFileSync('./scripts/create-bot-instances-table.sql', 'utf8');

  console.log('Creating bot_instances table...');

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Executing ${statements.length} SQL statements...`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`\n[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 80)}...`);

    try {
      const { data, error } = await supabase.rpc('exec', { sql: statement });

      if (error) {
        // Try alternative: direct query for CREATE/ALTER statements
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
          method: 'POST',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: statement })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error executing statement: ${errorText}`);

          // For DDL statements, we need to use the SQL Editor API
          // Let's try a different approach - execute via raw SQL
          const { error: rawError } = await supabase.rpc('exec_sql', { query: statement });
          if (rawError) {
            console.error('Raw SQL error:', rawError);
            throw new Error(`Failed to execute: ${statement.substring(0, 100)}`);
          }
        }
      }

      console.log('✅ Success');
    } catch (err) {
      console.error(`❌ Failed:`, err.message);
      process.exit(1);
    }
  }

  console.log('\n✅ Bot instances table created successfully');
}

createBotInstancesTable();
