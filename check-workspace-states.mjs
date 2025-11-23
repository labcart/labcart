import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://maaotshzykjncoifrbmj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW90c2h6eWtqbmNvaWZyYm1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjIwMzU5NSwiZXhwIjoyMDc3Nzc5NTk1fQ.AHec7PwTI21iaiHVG2pBAfXWUwbocvlM4aok-AxKzF0';

const supabase = createClient(supabaseUrl, serviceRoleKey);

console.log('=== WORKSPACE STATES ===\n');

const { data: states, error } = await supabase
  .from('workspace_states')
  .select('*')
  .order('updated_at', { ascending: false });

if (error) {
  console.error('Error:', error);
} else {
  console.log(`Found ${states.length} workspace states\n`);

  const statesByUser = {};
  states.forEach(state => {
    const userId = state.user_id.substring(0, 8);
    if (!statesByUser[userId]) statesByUser[userId] = [];
    statesByUser[userId].push(state);
  });

  for (const [userId, userStates] of Object.entries(statesByUser)) {
    console.log(`User ${userId}... has ${userStates.length} workspace(s):`);
    userStates.forEach(state => {
      console.log(`  Workspace ID: ${state.workspace_id}`);
      console.log(`  Tabs: ${state.tab_state?.tabs?.length || 0}`);
      console.log(`  Updated: ${state.updated_at}`);

      // Check for bot tabs referencing specific bots
      if (state.tab_state?.tabs) {
        const chatTabs = state.tab_state.tabs.filter(t => t.type === 'chat');
        if (chatTabs.length > 0) {
          console.log(`  Chat tabs:`);
          chatTabs.forEach(tab => {
            console.log(`    - Bot: ${tab.botName} (${tab.botId?.substring(0,8)}...)`);
          });
        }
      }
      console.log();
    });
  }

  // Check for any workspace_id collisions
  const workspaceIds = states.map(s => s.workspace_id);
  const duplicates = workspaceIds.filter((id, idx) => workspaceIds.indexOf(id) !== idx);
  if (duplicates.length > 0) {
    console.log(`⚠️  Duplicate workspace IDs found: ${duplicates.join(', ')}`);
  }
}
