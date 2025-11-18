import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.maaotshzykjncoifrbmj',
  password: 'oX1KuDN4YDw3WjPQ',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

try {
  console.log('Connecting...');
  await client.connect();
  console.log('✅ Connected to database');
  
  console.log('Adding updated_at column...');
  await client.query(`
    ALTER TABLE bot_servers 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `);
  
  console.log('✅ Column added successfully');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  await client.end();
}
