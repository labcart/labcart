import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://maaotshzykjncoifrbmj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW90c2h6eWtqbmNvaWZyYm1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjIwMzU5NSwiZXhwIjoyMDc3Nzc5NTk1fQ.AHec7PwTI21iaiHVG2pBAfXWUwbocvlM4aok-AxKzF0';

const supabase = createClient(supabaseUrl, serviceRoleKey);

console.log('=== BOT b21ebcbe-5d34-44d5-a05a-aee52605db0d ===\n');

// Get the bot
const { data: bot, error: botError } = await supabase
  .from('bots')
  .select('*')
  .eq('id', 'b21ebcbe-5d34-44d5-a05a-aee52605db0d')
  .single();

if (botError) {
  console.log('Error fetching bot:', botError);
} else {
  console.log('Bot details:');
  console.log(`  ID: ${bot.id}`);
  console.log(`  Name: ${bot.name}`);
  console.log(`  User ID: ${bot.user_id}`);
  console.log(`  Telegram ID: ${bot.telegram_bot_id || 'N/A'}`);
  console.log(`  Created: ${bot.created_at}`);

  // Get the user who owns this bot
  const { data: userData } = await supabase.auth.admin.getUserById(bot.user_id);
  if (userData?.user) {
    console.log(`  Owner email: ${userData.user.email}`);
  }

  // Get this user's bot servers
  console.log('\nBot servers for this user:');
  const { data: servers } = await supabase
    .from('bot_servers')
    .select('*')
    .eq('user_id', bot.user_id);

  servers?.forEach(s => {
    console.log(`  - ${s.server_name}: ${s.server_url}`);
    console.log(`    Status: ${s.status}, ID: ${s.id}`);
  });
}
