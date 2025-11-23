import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://maaotshzykjncoifrbmj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW90c2h6eWtqbmNvaWZyYm1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjIwMzU5NSwiZXhwIjoyMDc3Nzc5NTk1fQ.AHec7PwTI21iaiHVG2pBAfXWUwbocvlM4aok-AxKzF0';

const supabase = createClient(supabaseUrl, serviceRoleKey);

console.log('=== BOTS TABLE SCHEMA ===\n');

const { data, error } = await supabase
  .from('bots')
  .select('*')
  .limit(1);

if (error) {
  console.error('Error:', error);
} else if (data.length > 0) {
  console.log('Columns:', Object.keys(data[0]));
  console.log('\nSample bot:');
  console.log(JSON.stringify(data[0], null, 2));
}

// Get all bots to see if any have server_id
console.log('\n=== ALL BOTS ===\n');
const { data: allBots } = await supabase
  .from('bots')
  .select('*')
  .order('created_at', { ascending: false });

allBots?.forEach(bot => {
  console.log(`Bot: ${bot.name} (${bot.id.substring(0,8)}...)`);
  console.log(`  User: ${bot.user_id.substring(0,8)}...`);
  if (bot.server_id) {
    console.log(`  Server ID: ${bot.server_id}`);
  } else {
    console.log(`  Server ID: NULL`);
  }
  console.log();
});
