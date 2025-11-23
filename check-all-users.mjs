import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://maaotshzykjncoifrbmj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW90c2h6eWtqbmNvaWZyYm1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjIwMzU5NSwiZXhwIjoyMDc3Nzc5NTk1fQ.AHec7PwTI21iaiHVG2pBAfXWUwbocvlM4aok-AxKzF0';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== ALL USERS IN SUPABASE AUTH ===\n');

// List all users
const { data: { users }, error } = await supabase.auth.admin.listUsers({
  perPage: 100
});

if (error) {
  console.log('Error listing users:', error);
} else {
  console.log(`Total users: ${users.length}\n`);

  users.forEach((user, i) => {
    console.log(`${i + 1}. ${user.email}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Provider: ${user.app_metadata?.provider || 'N/A'}`);
    console.log(`   Username: ${user.user_metadata?.user_name || 'N/A'}`);
    console.log(`   Created: ${user.created_at}`);
    console.log(`   Last sign in: ${user.last_sign_in_at || 'Never'}`);
    console.log('');
  });
}

console.log('\n=== BOT SERVERS TABLE ===\n');

// Check bot_servers table structure and all entries
const { data: servers, error: serversError } = await supabase
  .from('bot_servers')
  .select('*')
  .order('created_at', { ascending: false });

if (serversError) {
  console.log('Error fetching bot servers:', serversError);
} else {
  console.log(`Total bot servers: ${servers.length}\n`);

  servers.forEach((server, i) => {
    console.log(`${i + 1}. ${server.server_url}`);
    console.log(`   Server ID: ${server.server_id || 'NULL'}`);
    console.log(`   User ID: ${server.user_id}`);
    console.log(`   Status: ${server.status}`);
    console.log(`   Created: ${server.created_at}`);
    console.log(`   Last heartbeat: ${server.last_heartbeat}`);
    console.log('');
  });
}

console.log('\n=== CHECKING SERVER_ID UNIQUENESS ===\n');

// Check for duplicate server_ids
const serverIdMap = new Map();
servers?.forEach(server => {
  const sid = server.server_id || 'NULL';
  if (!serverIdMap.has(sid)) {
    serverIdMap.set(sid, []);
  }
  serverIdMap.get(sid).push({
    url: server.server_url,
    userId: server.user_id
  });
});

serverIdMap.forEach((entries, serverId) => {
  if (entries.length > 1) {
    console.log(`⚠️  DUPLICATE server_id: ${serverId}`);
    entries.forEach(entry => {
      console.log(`   - ${entry.url} (user: ${entry.userId.substring(0, 8)}...)`);
    });
  }
});

console.log('\n=== BOTS BY USER ===\n');

// Get bots grouped by user
for (const user of users || []) {
  const { data: userBots } = await supabase
    .from('bots')
    .select('id, name')
    .eq('user_id', user.id);

  console.log(`${user.email} (${user.id.substring(0, 8)}...):`);
  console.log(`   Bots: ${userBots?.length || 0}`);
  userBots?.forEach(bot => {
    console.log(`      - ${bot.name} (${bot.id.substring(0, 8)}...)`);
  });
  console.log('');
}
