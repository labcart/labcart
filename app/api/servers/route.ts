import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/servers
 * Get list of bot servers for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
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

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Fetch user's bot servers
    const { data, error } = await supabase
      .from('bot_servers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bot servers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bot servers', details: error.message },
        { status: 500 }
      );
    }

    // Filter servers that are still active (heartbeat within last 2 minutes)
    const now = new Date();
    const serversWithStatus = data.map(server => {
      const lastHeartbeat = new Date(server.last_heartbeat);
      const timeSinceHeartbeat = now.getTime() - lastHeartbeat.getTime();
      const isOnline = timeSinceHeartbeat < 120000; // 2 minutes

      return {
        ...server,
        status: server.status === 'terminated' ? 'terminated' : (isOnline ? 'online' : 'offline'),
      };
    });

    return NextResponse.json({
      success: true,
      servers: serversWithStatus,
    });

  } catch (error) {
    console.error('Error in GET /api/servers:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch bot servers',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
