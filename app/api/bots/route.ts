import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/bots
 * Get all bots/agents for a user
 * Uses unified schema: marketplace_agents (templates) + my_agents (user instances)
 * Returns agents in a format compatible with the bot server
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const platformOnly = searchParams.get('platformOnly') === 'true';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (platformOnly) {
      // Get only marketplace agents (templates)
      const { data, error } = await supabase
        .from('marketplace_agents')
        .select('*')
        .eq('is_active', true)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching marketplace agents:', error);
        return NextResponse.json(
          { error: 'Failed to fetch bots', details: error.message },
          { status: 500 }
        );
      }

      // Transform to bot format for compatibility
      const bots = (data || []).map(agent => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        system_prompt: agent.brain_config,
        active: agent.is_active,
        is_platform_bot: true,
        is_public: agent.is_public,
        web_only: true,
        created_at: agent.created_at,
      }));

      return NextResponse.json({ bots });
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId or platformOnly parameter is required' },
        { status: 400 }
      );
    }

    // Get user's agent instances joined with marketplace_agents
    const { data: userAgents, error: userError } = await supabase
      .from('my_agents')
      .select(`
        id,
        instance_slug,
        config_overrides,
        created_at,
        agent:marketplace_agents (
          id,
          name,
          slug,
          description,
          brain_config,
          agent_type,
          icon_emoji,
          is_active
        )
      `)
      .eq('user_id', userId);

    if (userError) {
      console.error('Error fetching user agents:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch bots', details: userError.message },
        { status: 500 }
      );
    }

    // Also get public marketplace agents the user hasn't installed yet
    const { data: publicAgents, error: publicError } = await supabase
      .from('marketplace_agents')
      .select('*')
      .eq('is_active', true)
      .eq('is_public', true);

    if (publicError) {
      console.error('Error fetching public agents:', publicError);
    }

    // Transform user agents to bot format
    const userBots = (userAgents || []).map(ua => {
      const agent = ua.agent as any;
      return {
        id: ua.id, // Use my_agents id for user's instance
        agent_id: agent?.id, // Reference to marketplace_agents
        name: agent?.name || ua.instance_slug,
        description: agent?.description,
        system_prompt: {
          ...agent?.brain_config,
          ...(ua.config_overrides || {}),
        },
        active: agent?.is_active ?? true,
        is_platform_bot: false,
        is_public: false,
        web_only: true,
        user_id: userId,
        created_at: ua.created_at,
      };
    });

    // Transform public agents to bot format
    const platformBots = (publicAgents || []).map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      system_prompt: agent.brain_config,
      active: agent.is_active,
      is_platform_bot: true,
      is_public: agent.is_public,
      web_only: true,
      created_at: agent.created_at,
    }));

    // Combine: user's instances first, then platform bots
    const bots = [...userBots, ...platformBots];

    return NextResponse.json({ bots });

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
 * Create a new agent instance by "installing" a marketplace agent
 * Creates entry in my_agents table
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      agentId, // marketplace_agents.id
      instanceSlug, // optional custom slug for this instance
      configOverrides, // optional config customizations
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required (marketplace agent to install)' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the marketplace agent exists
    const { data: agent, error: fetchError } = await supabase
      .from('marketplace_agents')
      .select('id, slug, name')
      .eq('id', agentId)
      .single();

    if (fetchError || !agent) {
      return NextResponse.json(
        { error: 'Marketplace agent not found' },
        { status: 404 }
      );
    }

    // Create user's agent instance
    const { data, error } = await supabase
      .from('my_agents')
      .insert({
        user_id: userId,
        agent_id: agentId,
        instance_slug: instanceSlug || agent.slug,
        config_overrides: configOverrides || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating agent instance:', error);
      return NextResponse.json(
        { error: 'Failed to create agent instance', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Agent instance created: ${data.id} for user ${userId}`);

    return NextResponse.json({
      success: true,
      bot: {
        id: data.id,
        agent_id: agentId,
        name: agent.name,
        instance_slug: data.instance_slug,
        user_id: userId,
        created_at: data.created_at,
      },
    });

  } catch (error) {
    console.error('Error in POST /api/bots:', error);
    return NextResponse.json(
      {
        error: 'Failed to create agent instance',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/bots
 * Update a user's agent instance (config_overrides only)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id, // my_agents.id
      instanceSlug,
      configOverrides,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Agent instance id is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build update object with only provided fields
    const updates: any = { updated_at: new Date().toISOString() };
    if (instanceSlug !== undefined) updates.instance_slug = instanceSlug;
    if (configOverrides !== undefined) updates.config_overrides = configOverrides;

    const { data, error } = await supabase
      .from('my_agents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating agent instance:', error);
      return NextResponse.json(
        { error: 'Failed to update agent instance', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Agent instance updated: ${id}`);

    return NextResponse.json({
      success: true,
      bot: data,
    });

  } catch (error) {
    console.error('Error in PUT /api/bots:', error);
    return NextResponse.json(
      {
        error: 'Failed to update agent instance',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bots
 * Delete a user's agent instance
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Agent instance id is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from('my_agents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting agent instance:', error);
      return NextResponse.json(
        { error: 'Failed to delete agent instance', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Agent instance deleted: ${id}`);

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error('Error in DELETE /api/bots:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete agent instance',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
