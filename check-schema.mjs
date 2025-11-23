import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://maaotshzykjncoifrbmj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW90c2h6eWtqbmNvaWZyYm1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjIwMzU5NSwiZXhwIjoyMDc3Nzc5NTk1fQ.AHec7PwTI21iaiHVG2pBAfXWUwbocvlM4aok-AxKzF0';

const supabase = createClient(supabaseUrl, serviceRoleKey);

console.log('=== bot_servers TABLE SCHEMA ===\n');

const { data, error } = await supabase
  .from('bot_servers')
  .select('*')
  .limit(1);

if (error) {
  console.error('Error:', error);
} else if (data.length > 0) {
  console.log('Columns:', Object.keys(data[0]));
  console.log('\nSample row:');
  console.log(JSON.stringify(data[0], null, 2));
} else {
  console.log('No rows found in table');
}
