#!/usr/bin/env node

/**
 * Simple script to run SQL against Supabase
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSQL(sqlFile) {
  const sql = fs.readFileSync(sqlFile, 'utf8');

  console.log(`Running SQL from ${sqlFile}...`);
  console.log(sql);
  console.log('\n---\n');

  // Note: Supabase JS client doesn't support raw SQL execution
  // We need to use the REST API directly

  const apiUrl = `${supabaseUrl}/rest/v1/rpc/exec_sql`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    const data = await response.json();
    console.log('Response:', data);

    if (!response.ok) {
      console.error('Error:', data);
      process.exit(1);
    }

    console.log('✅ SQL executed successfully');
  } catch (error) {
    console.error('Error executing SQL:', error);

    // Try alternative: just log the SQL for manual execution
    console.log('\n⚠️  Could not execute automatically.');
    console.log('Please run this SQL manually in Supabase SQL Editor:');
    console.log('\n' + sql);
  }
}

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('Usage: node run-sql.js <sql-file>');
  process.exit(1);
}

runSQL(sqlFile);
