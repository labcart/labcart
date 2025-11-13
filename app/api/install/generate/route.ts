import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/install/generate
 * Generate a one-time install token for the authenticated user
 *
 * Body: { serverName?: string }
 * Returns: { token, installCommand, expiresAt }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverName } = body;

    // Get user from auth header (Supabase anon key client)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    // Create client with anon key to verify auth
    const anonClient = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const { data: { user }, error: authError } = await anonClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Generate secure random token
    const token = randomBytes(32).toString('hex');

    // Use service role to insert token
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration

    const { data, error } = await supabase
      .from('install_tokens')
      .insert({
        token,
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
        server_id: serverName || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating install token:', error);
      return NextResponse.json(
        { error: 'Failed to create install token', details: error.message },
        { status: 500 }
      );
    }

    // Generate install command
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const installCommand = `curl -fsSL ${baseUrl}/api/install/${token} | bash`;

    console.log(`✅ Install token generated for user ${user.id}`);

    return NextResponse.json({
      success: true,
      token,
      installCommand,
      expiresAt: data.expires_at,
    });

  } catch (error) {
    console.error('Error in POST /api/install/generate:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate install token',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
