import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://maaotshzykjncoifrbmj.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW90c2h6eWtqbmNvaWZyYm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMDM1OTUsImV4cCI6MjA3Nzc3OTU5NX0.hjXGa9BrYyuSqQXVtSsZx1ckkR0lxPVtKGjx9YgWjfo';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW90c2h6eWtqbmNvaWZyYm1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjIwMzU5NSwiZXhwIjoyMDc3Nzc5NTk1fQ.AHec7PwTI21iaiHVG2pBAfXWUwbocvlM4aok-AxKzF0';

const supabase = createClient(supabaseUrl, serviceKey);

// Get devivo's user info
const devivoUserId = 'e2887c64-2af6-4e08-a206-dccf435386f7';
const botId = 'b21ebcbe-5d34-44d5-a05a-aee52605db0d';

console.log('=== CHECKING BOT ACCESS FOR DEVIVO ===\n');
console.log(`User ID: ${devivoUserId}`);
console.log(`Bot ID: ${botId}\n`);

// Check if bot exists and who owns it
const { data: bot, error: botError } = await supabase
  .from('bots')
  .select('*')
  .eq('id', botId)
  .single();

if (botError) {
  console.log('❌ Error fetching bot:', botError.message);
} else {
  console.log('✅ Bot found:');
  console.log(`   Name: ${bot.name}`);
  console.log(`   Owner: ${bot.user_id}`);
  console.log(`   Server: ${bot.server_id}`);
  console.log(`   Match: ${bot.user_id === devivoUserId ? 'YES - devivo owns this bot' : 'NO - different owner'}\n`);
}

// Check devivo's bot servers
const { data: servers, error: serverError } = await supabase
  .from('bot_servers')
  .select('*')
  .eq('user_id', devivoUserId);

if (serverError) {
  console.log('❌ Error fetching servers:', serverError.message);
} else {
  console.log(`Devivo's bot servers (${servers.length}):`);
  servers.forEach(s => {
    console.log(`   - ${s.id}: ${s.server_url}`);
    console.log(`     Status: ${s.status}`);
  });
}
