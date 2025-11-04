/**
 * Migration script to import existing bot brains into Supabase
 *
 * Run this after first login to populate the database with platform bots
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Bot brain files to migrate
const BOTS_TO_MIGRATE = [
  { id: 'claude', brainFile: 'claude.js' },
  { id: 'finnshipley', brainFile: 'finnshipley.js' },
  { id: 'mattyatlas', brainFile: 'mattyatlas.js' },
  { id: 'rickd', brainFile: 'rickd.js' }
];

async function migrateBots(userId) {
  console.log('🚀 Starting bot migration...\n');

  const brainsDir = path.join(__dirname, '../../claude-bot/brains');
  const results = [];

  for (const { id, brainFile } of BOTS_TO_MIGRATE) {
    try {
      const brainPath = path.join(brainsDir, brainFile);

      // Check if brain file exists
      if (!fs.existsSync(brainPath)) {
        console.log(`⚠️  Skipping ${id}: Brain file not found`);
        continue;
      }

      // Load brain module
      const brain = require(brainPath);

      // Prepare bot data for database
      const botData = {
        name: brain.name || id,
        description: brain.description || '',
        system_prompt: {
          prompt: brain.systemPrompt,
          version: brain.version,
          security: brain.security,
          private: brain.private
        },
        creator_id: userId,
        is_platform_bot: true,
        is_public: true,
        version: brain.version || '1.0'
      };

      // Insert into database
      const { data, error } = await supabase
        .from('bots')
        .insert(botData)
        .select()
        .single();

      if (error) {
        console.log(`❌ Failed to migrate ${id}:`, error.message);
        results.push({ id, success: false, error: error.message });
      } else {
        console.log(`✅ Migrated ${id} (${brain.name})`);
        results.push({ id, success: true, dbId: data.id });
      }
    } catch (err) {
      console.log(`❌ Error processing ${id}:`, err.message);
      results.push({ id, success: false, error: err.message });
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log('  Success:', results.filter(r => r.success).length);
  console.log('  Failed:', results.filter(r => !r.success).length);

  return results;
}

// Main execution
async function main() {
  // Check if user ID is provided
  const userId = process.argv[2];

  if (!userId) {
    console.error('❌ Error: User ID required');
    console.error('\nUsage: node migrate-bots.js <USER_ID>');
    console.error('\nGet your user ID from Supabase Dashboard:');
    console.error('  1. Go to Authentication → Users');
    console.error('  2. Copy your UUID\n');
    process.exit(1);
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    console.error('❌ Error: Invalid UUID format');
    console.error('   Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\n');
    process.exit(1);
  }

  console.log(`👤 User ID: ${userId}\n`);

  await migrateBots(userId);
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
