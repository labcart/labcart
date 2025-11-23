import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://maaotshzykjncoifrbmj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW90c2h6eWtqbmNvaWZyYm1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjIwMzU5NSwiZXhwIjoyMDc3Nzc5NTk1fQ.AHec7PwTI21iaiHVG2pBAfXWUwbocvlM4aok-AxKzF0';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== USER 268c4d30-6c83-42b8-bf15-d59a4c2cf994 ===\n');

// Get user from auth.users
const { data: userData, error: userError } = await supabase.auth.admin.getUserById('268c4d30-6c83-42b8-bf15-d59a4c2cf994');

if (userError) {
  console.log('Error fetching user:', userError);
} else if (userData.user) {
  console.log('Email:', userData.user.email);
  console.log('Provider:', userData.user.app_metadata?.provider || 'N/A');
  console.log('Provider ID:', userData.user.user_metadata?.provider_id || 'N/A');
  console.log('Full name:', userData.user.user_metadata?.full_name || 'N/A');
  console.log('User name:', userData.user.user_metadata?.user_name || 'N/A');
  console.log('Created:', userData.user.created_at);
  console.log('Last sign in:', userData.user.last_sign_in_at);
}

// Get their bot servers
const { data: servers, error: serversError } = await supabase
  .from('bot_servers')
  .select('*')
  .eq('user_id', '268c4d30-6c83-42b8-bf15-d59a4c2cf994')
  .order('created_at', { ascending: false });

if (serversError) {
  console.log('\nError fetching servers:', serversError);
} else {
  console.log(`\nBot servers (${servers.length} total):`);
  servers.forEach(s => {
    console.log(`  - ${s.server_url}`);
    console.log(`    Status: ${s.status}`);
    console.log(`    Server ID: ${s.server_id}`);
    console.log(`    Created: ${s.created_at}`);
  });
}

// Get their bots
const { data: bots, error: botsError } = await supabase
  .from('bots')
  .select('id, name, created_at')
  .eq('user_id', '268c4d30-6c83-42b8-bf15-d59a4c2cf994')
  .order('created_at', { ascending: false });

if (botsError) {
  console.log('\nError fetching bots:', botsError);
} else {
  console.log(`\nBots (${bots.length} total):`);
  bots.forEach(bot => {
    console.log(`  - ${bot.name} (${bot.id.substring(0, 8)}...)`);
  });
}
