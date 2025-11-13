# Supabase Tab Persistence Setup

## Overview

This document explains how to set up the Supabase database table for persisting tab state across logout/login sessions.

## Step 1: Create the Database Table

Go to your Supabase SQL Editor:
**https://supabase.com/dashboard/project/maaotshzykjncoifrbmj/sql/new**

Copy and paste the following SQL:

```sql
-- Create workspace_states table
CREATE TABLE IF NOT EXISTS workspace_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  tab_state JSONB NOT NULL DEFAULT '{"tabs":[],"activeTabId":null}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, workspace_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workspace_states_user_workspace
ON workspace_states(user_id, workspace_id);

-- Enable RLS (Row Level Security)
ALTER TABLE workspace_states ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own workspace states
CREATE POLICY "Users can read own workspace states"
ON workspace_states FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own workspace states
CREATE POLICY "Users can insert own workspace states"
ON workspace_states FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own workspace states
CREATE POLICY "Users can update own workspace states"
ON workspace_states FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own workspace states
CREATE POLICY "Users can delete own workspace states"
ON workspace_states FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workspace_states_updated_at
BEFORE UPDATE ON workspace_states
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

Click **RUN** to execute the SQL.

## Step 2: Verify the Table

After running the SQL, verify the table was created:

```sql
SELECT * FROM workspace_states LIMIT 1;
```

You should see an empty result (no rows yet).

## How It Works

### Architecture

1. **Browser localStorage** (fast, browser-specific)
   - Still used by Zustand for instant state restore
   - Acts as local cache

2. **Supabase Database** (persistent, cross-device)
   - Auto-saves tab state every 1 second after changes
   - Loads on workspace identification
   - Tied to user_id + workspace_id combination

### Data Flow

```
Login → Workspace Selected → Load State from Supabase → Merge with localStorage
                                                              ↓
User Opens/Closes Tabs → Update localStorage (instant) → Debounce 1s → Save to Supabase
                                                              ↓
                                                        Logout → Keep localStorage intact
                                                              ↓
                                                Login Again → Reload from Supabase
```

### Benefits

✅ Tabs persist across logout/login (same browser)
✅ Tabs sync across devices (different browsers)
✅ Per-workspace isolation (different workspaces = different tabs)
✅ Multi-user friendly (each user has separate state)
✅ Secure (RLS ensures users only see their own data)

## Files Changed

### New Files
- [app/api/workspace/state/route.ts](app/api/workspace/state/route.ts) - API routes for load/save
- [scripts/create-workspace-states-table.js](scripts/create-workspace-states-table.js) - Migration script (for reference)

### Modified Files
- [store/tabStore.ts](store/tabStore.ts:407-498) - Added `loadWorkspaceState()` and `saveWorkspaceState()` methods
- [types/index.ts](types/index.ts:146-148) - Added Supabase sync method types
- [components/WorkspacePanel.tsx](components/WorkspacePanel.tsx:212-235) - Added load on mount + auto-save on tab changes
- [app/login/page.tsx](app/login/page.tsx:42-53) - Fixed logout to NOT clear localStorage

## Testing

1. Login to your account
2. Open a workspace
3. Create some tabs (chat with bots, open files)
4. Logout
5. Login again
6. Your tabs should be restored!

## Troubleshooting

### Tabs not persisting?

Check browser console for errors:
- `📂 Loading workspace state for: <workspace-id>` - Should appear on mount
- `💾 Auto-saving workspace state...` - Should appear 1s after tab changes
- `✅ Workspace state loaded from Supabase` - Should appear after successful load

### Database errors?

Check Supabase logs:
- Go to https://supabase.com/dashboard/project/maaotshzykjncoifrbmj/logs/explorer
- Look for errors in the `workspace_states` table queries

### RLS policy errors?

Make sure you're logged in. The policies require an authenticated user (`auth.uid()`).

## Security

- **Row Level Security (RLS)** ensures users can only access their own workspace states
- User ID from Supabase auth (`auth.uid()`) is used for access control
- No user can read/write another user's workspace state
- Workspace states are automatically deleted when a user account is deleted (ON DELETE CASCADE)
