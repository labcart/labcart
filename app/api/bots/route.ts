import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/bots
 * Get all bots for a user (or specific server)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const serverId = searchParams.get('serverId');

    if (!userId && !serverId) {
      return NextResponse.json(
        { error: 'userId or serverId is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabase.from('bots').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (serverId) {
      // Get all bots for a specific server via bot_servers join
      const { data: serverData } = await supabase
        .from('bot_servers')
        .select('user_id')
        .eq('id', serverId)
        .single();

      if (serverData) {
        query = query.eq('user_id', serverData.user_id);
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bots:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bots', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ bots: data });

  } catch (error) {
    console.error('Error in GET /api/bots:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch bots',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bots
 * Create a new bot instance
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, brain, displayName, workspace, webOnly = true, telegramToken } = body;

    if (!userId || !brain) {
      return NextResponse.json(
        { error: 'userId and brain are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create bot record
    const { data, error } = await supabase
      .from('bots')
      .insert({
        user_id: userId,
        brain,
        display_name: displayName,
        workspace,
        web_only: webOnly,
        telegram_token: telegramToken,
        active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bot:', error);
      return NextResponse.json(
        { error: 'Failed to create bot', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Bot created: ${data.id} (brain: ${brain}) for user ${userId}`);

    return NextResponse.json({
      success: true,
      bot: data,
    });

  } catch (error) {
    console.error('Error in POST /api/bots:', error);
    return NextResponse.json(
      {
        error: 'Failed to create bot',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/bots
 * Update an existing bot
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, brain, displayName, workspace, webOnly, active, telegramToken } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Bot id is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build update object with only provided fields
    const updates: any = {};
    if (brain !== undefined) updates.brain = brain;
    if (displayName !== undefined) updates.display_name = displayName;
    if (workspace !== undefined) updates.workspace = workspace;
    if (webOnly !== undefined) updates.web_only = webOnly;
    if (active !== undefined) updates.active = active;
    if (telegramToken !== undefined) updates.telegram_token = telegramToken;

    const { data, error } = await supabase
      .from('bots')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating bot:', error);
      return NextResponse.json(
        { error: 'Failed to update bot', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Bot updated: ${id}`);

    return NextResponse.json({
      success: true,
      bot: data,
    });

  } catch (error) {
    console.error('Error in PUT /api/bots:', error);
    return NextResponse.json(
      {
        error: 'Failed to update bot',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bots
 * Delete a bot
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Bot id is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from('bots')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting bot:', error);
      return NextResponse.json(
        { error: 'Failed to delete bot', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Bot deleted: ${id}`);

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error('Error in DELETE /api/bots:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete bot',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
