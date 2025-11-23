import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://maaotshzykjncoifrbmj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW90c2h6eWtqbmNvaWZyYm1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjIwMzU5NSwiZXhwIjoyMDc3Nzc5NTk1fQ.AHec7PwTI21iaiHVG2pBAfXWUwbocvlM4aok-AxKzF0';

const supabase = createClient(supabaseUrl, serviceRoleKey);

console.log('=== ALL BOT SERVERS ===\n');

const { data: servers, error } = await supabase
  .from('bot_servers')
  .select('*')
  .order('created_at', { ascending: false });

if (error) {
  console.error('Error:', error);
} else {
  servers.forEach(s => {
    console.log(`Server ID: ${s.id}`);
    console.log(`  User: ${s.user_id.substring(0, 8)}...`);
    console.log(`  Name: ${s.server_name}`);
    console.log(`  URL: ${s.server_url}`);
    console.log(`  Status: ${s.status}`);
    console.log(`  Heartbeat: ${s.last_heartbeat}`);
    console.log();
  });

  // Check for duplicates or NULLs
  const nullIds = servers.filter(s => !s.id);
  if (nullIds.length > 0) {
    console.log(`⚠️  ${nullIds.length} servers with NULL id`);
  }

  const idCounts = {};
  servers.forEach(s => {
    idCounts[s.id] = (idCounts[s.id] || 0) + 1;
  });

  const duplicates = Object.entries(idCounts).filter(([id, count]) => count > 1);
  if (duplicates.length > 0) {
    console.log(`⚠️  Duplicate IDs found:`);
    duplicates.forEach(([id, count]) => {
      console.log(`   ${id}: ${count} servers`);
    });
  }
}
