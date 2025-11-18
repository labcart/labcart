// We cannot execute DDL via Supabase JS client or REST API
// The only option is to use the SQL Editor in Supabase Dashboard
// OR set up proper migrations

console.log('⚠️  To fix the server registration error, you need to run this SQL in Supabase Dashboard:');
console.log('');
console.log('-- Option 1: Add the missing column (recommended for consistency)');
console.log('ALTER TABLE bot_servers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();');
console.log('');
console.log('-- Option 2: Drop the trigger (if we don't need updated_at tracking)');
console.log('DROP TRIGGER IF EXISTS update_bot_servers_updated_at ON bot_servers;');
console.log('');
console.log('Dashboard URL: https://supabase.com/dashboard/project/maaotshzykjncoifrbmj/sql/new');
