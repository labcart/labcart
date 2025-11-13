#!/usr/bin/env node

import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;

// Supabase connection - trying with service role key as password
const client = new Client({
  host: 'db.maaotshzykjncoifrbmj.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '8jGKgGRPSwyJsmY3',
  ssl: {
    rejectUnauthorized: false
  }
});

const SQL = readFileSync('scripts/create-table.sql', 'utf8');

console.log('🚀 Connecting to Supabase PostgreSQL...\n');

try {
  await client.connect();
  console.log('✅ Connected!\n');

  console.log('📝 Executing SQL...\n');
  await client.query(SQL);

  console.log('✅ Table created successfully!\n');
} catch (err) {
  console.error('❌ Error:', err.message);
  console.error('\nThis means I need the actual database password, not the JWT token.');
  console.error('You can find it in: Supabase Dashboard → Project Settings → Database → Connection String\n');
} finally {
  await client.end();
}
