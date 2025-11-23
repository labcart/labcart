import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://maaotshzykjncoifrbmj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW90c2h6eWtqbmNvaWZyYm1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjIwMzU5NSwiZXhwIjoyMDc3Nzc5NTk1fQ.AHec7PwTI21iaiHVG2pBAfXWUwbocvlM4aok-AxKzF0';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Checking user info for e2887c64-2af6-4e08-a206-dccf435386f7:\n');

// Get user from auth.users
const { data: userData, error: userError } = await supabase.auth.admin.getUserById('e2887c64-2af6-4e08-a206-dccf435386f7');

if (userError) {
  console.log('Error fetching user:', userError);
} else if (userData.user) {
  console.log('User details:');
  console.log(`   Email: ${userData.user.email}`);
  console.log(`   Created: ${userData.user.created_at}`);
  console.log(`   Last sign in: ${userData.user.last_sign_in_at}`);
  console.log(`   Provider: ${userData.user.app_metadata?.provider || 'N/A'}`);
}

// Get their bots
const { data: bots, error: botsError } = await supabase
  .from('bots')
  .select('id, name, created_at')
  .eq('user_id', 'e2887c64-2af6-4e08-a206-dccf435386f7')
  .order('created_at', { ascending: false });

if (botsError) {
  console.log('\nError fetching bots:', botsError);
} else {
  console.log(`\nThis user's bots (${bots.length} total):`);
  bots.forEach(bot => {
    console.log(`   - ${bot.name} (${bot.id.substring(0, 8)}...)`);
  });
}
