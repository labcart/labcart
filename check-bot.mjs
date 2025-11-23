import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://maaotshzykjncoifrbmj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW90c2h6eWtqbmNvaWZyYm1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjIwMzU5NSwiZXhwIjoyMDc3Nzc5NTk1fQ.AHec7PwTI21iaiHVG2pBAfXWUwbocvlM4aok-AxKzF0';

const supabase = createClient(supabaseUrl, supabaseKey);

// Check if bot b21ebcbe-5d34-44d5-a05a-aee52605db0d exists
console.log('Checking for bot: b21ebcbe-5d34-44d5-a05a-aee52605db0d\n');

const { data: targetBot, error: targetError } = await supabase
  .from('bots')
  .select('id, name, user_id, created_at')
  .eq('id', 'b21ebcbe-5d34-44d5-a05a-aee52605db0d')
  .single();

if (targetError && targetError.code !== 'PGRST116') {
  console.log('Error checking target bot:', targetError);
} else if (!targetBot) {
  console.log('❌ Bot b21ebcbe-5d34-44d5-a05a-aee52605db0d NOT FOUND in database\n');
} else {
  console.log('✅ Bot FOUND:');
  console.log(`   ID: ${targetBot.id}`);
  console.log(`   Name: ${targetBot.name}`);
  console.log(`   User ID: ${targetBot.user_id}`);
  console.log(`   Created: ${targetBot.created_at}\n`);
}

// List all bots for user 268c4d30-6c83-42b8-bf15-d59a4c2cf994
console.log('\nBots for user 268c4d30-6c83-42b8-bf15-d59a4c2cf994:');

const { data: userBots, error: userError } = await supabase
  .from('bots')
  .select('id, name, created_at')
  .eq('user_id', '268c4d30-6c83-42b8-bf15-d59a4c2cf994')
  .order('created_at', { ascending: false });

if (userError) {
  console.log('Error fetching user bots:', userError);
} else {
  console.log(`Found ${userBots.length} bots:\n`);
  userBots.forEach(bot => {
    console.log(`   - ${bot.name} (${bot.id.substring(0, 8)}...)`);
  });
}

// List ALL bots to see if b21ebcbe exists under a different user
console.log('\n\nSearching ALL bots for b21ebcbe prefix:');
const { data: allBots, error: allError } = await supabase
  .from('bots')
  .select('id, name, user_id')
  .like('id', 'b21ebcbe%');

if (allError) {
  console.log('Error searching all bots:', allError);
} else if (allBots.length === 0) {
  console.log('❌ No bots found with ID starting with b21ebcbe');
} else {
  console.log(`Found ${allBots.length} bot(s):`);
  allBots.forEach(bot => {
    console.log(`   - ${bot.name} (${bot.id})`);
    console.log(`     Owner: ${bot.user_id}`);
  });
}
