import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/workspace/state?workspaceId=xxx
 * Load workspace state (tabs) for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    // Get auth token from cookie or header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Query workspace state
    const { data, error } = await supabase
      .from('workspace_states')
      .select('*')
      .eq('user_id', user.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (error) {
      // If not found, return empty state
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          state: null,
          message: 'No saved state found',
        });
      }

      console.error('Error fetching workspace state:', error);
      return NextResponse.json(
        { error: 'Failed to fetch workspace state', details: error.message },
        { status: 500 }
      );
    }

    console.log(`📂 Loaded workspace state for user ${user.id}, workspace ${workspaceId}`);

    return NextResponse.json({
      success: true,
      state: data.tab_state,
      updatedAt: data.updated_at,
    });

  } catch (error) {
    console.error('Error in GET /api/workspace/state:', error);
    return NextResponse.json(
      {
        error: 'Failed to load workspace state',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspace/state
 * Save workspace state (tabs) for the authenticated user
 *
 * Body: { workspaceId: string, state: object }
 */
export async function POST(request: NextRequest) {
  try {
    const { workspaceId, state } = await request.json();

    if (!workspaceId || !state) {
      return NextResponse.json(
        { error: 'Workspace ID and state are required' },
        { status: 400 }
      );
    }

    // Get auth token from cookie or header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Upsert workspace state (insert or update)
    const { data, error } = await supabase
      .from('workspace_states')
      .upsert(
        {
          user_id: user.id,
          workspace_id: workspaceId,
          tab_state: state,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,workspace_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving workspace state:', error);
      return NextResponse.json(
        { error: 'Failed to save workspace state', details: error.message },
        { status: 500 }
      );
    }

    console.log(`💾 Saved workspace state for user ${user.id}, workspace ${workspaceId}`);
    console.log(`   Tabs: ${state.tabs?.length || 0}, Active: ${state.activeTabId}`);

    return NextResponse.json({
      success: true,
      updatedAt: data.updated_at,
    });

  } catch (error) {
    console.error('Error in POST /api/workspace/state:', error);
    return NextResponse.json(
      {
        error: 'Failed to save workspace state',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
