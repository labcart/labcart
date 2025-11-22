import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/bots
 * Get all bots for a user (or specific server)
 * Returns platform bots (is_platform_bot=true) and user's own bot instances
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const serverId = searchParams.get('serverId');
    const platformOnly = searchParams.get('platformOnly') === 'true';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabase.from('bots').select('*');

    if (platformOnly) {
      // Get only platform bots (templates users can install)
      query = query.eq('is_platform_bot', true).eq('is_public', true);
    } else if (userId) {
      // Get user's own bot instances OR public platform bots
      query = query.or(`user_id.eq.${userId},and(is_platform_bot.eq.true,is_public.eq.true)`);
    } else if (serverId) {
      // Get all bots for a specific server
      query = query.eq('server_id', serverId);
    } else {
      return NextResponse.json(
        { error: 'userId, serverId, or platformOnly parameter is required' },
        { status: 400 }
      );
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
 * Create a new bot instance (either from scratch or by "installing" a platform bot)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      name,
      description,
      systemPrompt,
      serverId,
      workspace,
      webOnly = true,
      telegramToken,
      platformBotId // If installing a platform bot, provide its ID
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let botData: any;

    if (platformBotId) {
      // User is "installing" a platform bot - copy the template
      const { data: platformBot, error: fetchError } = await supabase
        .from('bots')
        .select('*')
        .eq('id', platformBotId)
        .single();

      if (fetchError || !platformBot) {
        return NextResponse.json(
          { error: 'Platform bot not found' },
          { status: 404 }
        );
      }

      // Create a new instance for the user
      botData = {
        name: platformBot.name,
        description: platformBot.description,
        system_prompt: platformBot.system_prompt,
        // creator_id: platformBot.creator_id, // REMOVED: Not needed for bot server instances
        user_id: userId, // Assign to this user
        server_id: serverId,
        is_platform_bot: false, // This is now a user instance
        is_public: false,
        workspace,
        web_only: webOnly,
        telegram_token: telegramToken,
        active: true,
      };
    } else {
      // User is creating a custom bot from scratch
      if (!name || !systemPrompt) {
        return NextResponse.json(
          { error: 'name and systemPrompt are required for custom bots' },
          { status: 400 }
        );
      }

      botData = {
        name,
        description,
        system_prompt: systemPrompt,
        // creator_id: userId, // REMOVED: Bot server instances don't need creator_id
        user_id: userId,
        server_id: serverId,
        is_platform_bot: false,
        is_public: false,
        workspace,
        web_only: webOnly,
        telegram_token: telegramToken,
        active: true,
      };
    }

    const { data, error } = await supabase
      .from('bots')
      .insert(botData)
      .select()
      .single();

    if (error) {
      console.error('Error creating bot:', error);
      return NextResponse.json(
        { error: 'Failed to create bot', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Bot created: ${data.id} for user ${userId}`);

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
    const {
      id,
      name,
      description,
      systemPrompt,
      serverId,
      workspace,
      webOnly,
      active,
      telegramToken,
      isPublic
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Bot id is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build update object with only provided fields
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (systemPrompt !== undefined) updates.system_prompt = systemPrompt;
    if (serverId !== undefined) updates.server_id = serverId;
    if (workspace !== undefined) updates.workspace = workspace;
    if (webOnly !== undefined) updates.web_only = webOnly;
    if (active !== undefined) updates.active = active;
    if (telegramToken !== undefined) updates.telegram_token = telegramToken;
    if (isPublic !== undefined) updates.is_public = isPublic;

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
