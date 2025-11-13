import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/servers/register
 * Called by bot server on startup to register itself
 *
 * Body: { serverId, userId, serverUrl, serverName, status }
 */
export async function POST(request: NextRequest) {
  try {
    const { serverId, userId, serverUrl, serverName, status } = await request.json();

    if (!serverId || !userId) {
      return NextResponse.json(
        { error: 'serverId and userId are required' },
        { status: 400 }
      );
    }

    // Use service role key to bypass RLS for registration
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert server record
    const { data, error } = await supabase
      .from('bot_servers')
      .upsert(
        {
          id: serverId,
          user_id: userId,
          server_name: serverName || 'Bot Server',
          server_url: serverUrl,
          status: status || 'online',
          last_heartbeat: new Date().toISOString(),
        },
        {
          onConflict: 'id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error registering bot server:', error);
      return NextResponse.json(
        { error: 'Failed to register bot server', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Bot server registered: ${serverId} for user ${userId}`);

    return NextResponse.json({
      success: true,
      server: data,
    });

  } catch (error) {
    console.error('Error in POST /api/servers/register:', error);
    return NextResponse.json(
      {
        error: 'Failed to register bot server',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
