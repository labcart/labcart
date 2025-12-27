import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/tunnels/create
 * Creates a named Cloudflare Tunnel using the Cloudflare API
 * AND creates DNS CNAME record for public access
 *
 * Body: { tunnelName: string, subdomain: string }
 * Returns: { tunnelId, credentials, publicUrl }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tunnelName, subdomain } = body;

    if (!tunnelName) {
      return NextResponse.json(
        { error: 'tunnelName is required' },
        { status: 400 }
      );
    }

    if (!subdomain) {
      return NextResponse.json(
        { error: 'subdomain is required' },
        { status: 400 }
      );
    }

    // Get API token and account ID from environment (Cloudflare Worker secrets)
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!apiToken) {
      return NextResponse.json(
        { error: 'CLOUDFLARE_API_TOKEN not configured' },
        { status: 500 }
      );
    }

    if (!accountId) {
      return NextResponse.json(
        { error: 'CLOUDFLARE_ACCOUNT_ID not configured' },
        { status: 500 }
      );
    }

    console.log(`Using Cloudflare account: ${accountId}`);

    // Generate tunnel secret (we need to keep this to return it)
    const tunnelSecret = generateTunnelSecret();

    // Create tunnel via Cloudflare API
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/cfd_tunnel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tunnelName,
          tunnel_secret: tunnelSecret,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Cloudflare API error:', data);
      return NextResponse.json(
        {
          error: 'Failed to create tunnel',
          details: data.errors || data.messages,
        },
        { status: response.status }
      );
    }

    const tunnel = data.result;

    console.log(`✅ Created tunnel: ${tunnelName} (${tunnel.id})`);

    // Now create DNS CNAME record for public access
    console.log(`🌐 Creating DNS record: ${subdomain}.labcart.io → ${tunnel.id}.cfargotunnel.com`);

    // Get Zone ID for labcart.io
    const zonesResp = await fetch('https://api.cloudflare.com/client/v4/zones?name=labcart.io', {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      }
    });

    const zonesData = await zonesResp.json();
    if (!zonesData.success || !zonesData.result || zonesData.result.length === 0) {
      console.error('Failed to get labcart.io zone:', zonesData);
      return NextResponse.json(
        {
          error: 'Failed to get labcart.io zone',
          details: zonesData.errors || 'Zone not found',
        },
        { status: 500 }
      );
    }

    const zoneId = zonesData.result[0].id;
    console.log(`✅ Found zone ID: ${zoneId}`);

    // Create CNAME record pointing to tunnel
    const dnsResp = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'CNAME',
        name: subdomain,
        content: `${tunnel.id}.cfargotunnel.com`,
        ttl: 1,
        proxied: true,
      }),
    });

    const dnsData = await dnsResp.json();

    if (!dnsData.success) {
      console.error('Failed to create DNS record:', dnsData);
      return NextResponse.json(
        {
          error: 'Failed to create DNS record',
          details: dnsData.errors || 'Unknown DNS error',
        },
        { status: 500 }
      );
    }

    const publicUrl = `https://${subdomain}.labcart.io`;
    console.log(`✅ DNS record created: ${publicUrl}`);

    // Return tunnel info with public URL
    return NextResponse.json({
      success: true,
      tunnelId: tunnel.id,
      tunnelName: tunnel.name,
      publicUrl: publicUrl,
      credentials: {
        AccountTag: accountId,
        TunnelSecret: tunnelSecret,
        TunnelID: tunnel.id,
      },
    });

  } catch (error) {
    console.error('Error in POST /api/tunnels/create:', error);
    return NextResponse.json(
      {
        error: 'Failed to create tunnel',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate a random tunnel secret (base64 encoded 32 bytes)
 */
function generateTunnelSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64');
}
