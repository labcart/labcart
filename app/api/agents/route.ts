import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/agents
 * Get agent profiles and user's agent instances
 *
 * Query params:
 * - userId: Get user's agent instances + public marketplace agents
 * - catalogOnly: Get only marketplace agent profiles (catalog)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const catalogOnly = searchParams.get('catalogOnly') === 'true';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (catalogOnly) {
      // Get marketplace agent profiles (catalog)
      const { data, error } = await supabase
        .from('marketplace_agents')
        .select('*')
        .eq('is_active', true)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching agent profiles:', error);
        return NextResponse.json(
          { error: 'Failed to fetch agents', details: error.message },
          { status: 500 }
        );
      }

      const agents = (data || []).map(agent => ({
        id: agent.id,
        slug: agent.slug,
        name: agent.name,
        description: agent.short_description || agent.long_description,
        brain_config: agent.brain_config,
        agent_type: agent.agent_type,
        icon_emoji: agent.icon_emoji,
        capabilities: agent.capabilities,
        is_active: agent.is_active,
        visibility: agent.visibility,
        created_at: agent.created_at,
      }));

      return NextResponse.json({ agents });
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId or catalogOnly parameter is required' },
        { status: 400 }
      );
    }

    // Get user's agent instances joined with marketplace_agents
    const { data: userInstances, error: userError } = await supabase
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
          short_description,
          brain_config,
          agent_type,
          icon_emoji,
          is_active
        )
      `)
      .eq('user_id', userId);

    if (userError) {
      console.error('Error fetching user agent instances:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch agents', details: userError.message },
        { status: 500 }
      );
    }

    // Also get public marketplace agents
    const { data: catalogAgents, error: catalogError } = await supabase
      .from('marketplace_agents')
      .select('*')
      .eq('is_active', true)
      .eq('visibility', 'public');

    if (catalogError) {
      console.error('Error fetching catalog agents:', catalogError);
    }

    // Transform user agent instances
    const instances = (userInstances || []).map(ua => {
      const profile = ua.agent as any;
      return {
        id: ua.id,
        profile_id: profile?.id,
        instance_slug: ua.instance_slug,
        name: profile?.name || ua.instance_slug,
        description: profile?.short_description,
        brain_config: {
          ...profile?.brain_config,
          ...(ua.config_overrides || {}),
        },
        agent_type: profile?.agent_type,
        icon_emoji: profile?.icon_emoji,
        is_active: profile?.is_active ?? true,
        user_id: userId,
        created_at: ua.created_at,
      };
    });

    // Transform catalog agents (profiles)
    const profiles = (catalogAgents || []).map(agent => ({
      id: agent.id,
      slug: agent.slug,
      name: agent.name,
      description: agent.short_description || agent.long_description,
      brain_config: agent.brain_config,
      agent_type: agent.agent_type,
      icon_emoji: agent.icon_emoji,
      is_active: agent.is_active,
      visibility: agent.visibility,
      created_at: agent.created_at,
    }));

    return NextResponse.json({
      instances,  // User's agent instances
      profiles,   // Available agent profiles (catalog)
    });

  } catch (error) {
    console.error('Error in GET /api/agents:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch agents',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents
 * Create a new agent instance from a marketplace profile
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      profileId,      // marketplace_agents.id
      instanceSlug,   // optional custom slug
      configOverrides, // optional config customizations
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!profileId) {
      return NextResponse.json(
        { error: 'profileId is required (marketplace agent profile to instantiate)' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the profile exists
    const { data: profile, error: fetchError } = await supabase
      .from('marketplace_agents')
      .select('id, slug, name')
      .eq('id', profileId)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json(
        { error: 'Agent profile not found' },
        { status: 404 }
      );
    }

    // Create user's agent instance
    const { data, error } = await supabase
      .from('my_agents')
      .insert({
        user_id: userId,
        agent_id: profileId,
        instance_slug: instanceSlug || profile.slug,
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

    console.log(`Agent instance created: ${data.id} for user ${userId}`);

    return NextResponse.json({
      success: true,
      instance: {
        id: data.id,
        profile_id: profileId,
        name: profile.name,
        instance_slug: data.instance_slug,
        user_id: userId,
        created_at: data.created_at,
      },
    });

  } catch (error) {
    console.error('Error in POST /api/agents:', error);
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
 * PUT /api/agents
 * Update a user's agent instance
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
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

    console.log(`Agent instance updated: ${id}`);

    return NextResponse.json({
      success: true,
      instance: data,
    });

  } catch (error) {
    console.error('Error in PUT /api/agents:', error);
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
 * DELETE /api/agents
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

    console.log(`Agent instance deleted: ${id}`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in DELETE /api/agents:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete agent instance',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
