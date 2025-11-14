import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/install/[token]
 * Serves the install script with pre-configured user ID
 *
 * This endpoint is called by: curl https://labcart.app/api/install/abc-xyz-123 | bash
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return new NextResponse('Missing token', { status: 400 });
    }

    // Use service role to fetch token
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch and validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from('install_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return new NextResponse('Invalid or expired token', { status: 404 });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    if (now > expiresAt) {
      return new NextResponse('Token has expired', { status: 410 });
    }

    // Check if token was already used
    if (tokenData.used_at) {
      return new NextResponse('Token has already been used', { status: 410 });
    }

    // Mark token as used
    await supabase
      .from('install_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    // Generate install script
    const installScript = generateInstallScript(tokenData.user_id, tokenData.server_id);

    console.log(`✅ Install script served for token ${token}`);

    // Return bash script
    return new NextResponse(installScript, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {
    console.error('Error in GET /api/install/[token]:', error);
    return new NextResponse(
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}

function generateInstallScript(userId: string, serverId: string | null): string {
  const coordinationUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const serverIdValue = serverId || `server-$(hostname)`;

  return `#!/bin/bash
set -e

echo "🚀 LabCart Bot Server Installation"
echo "===================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

echo "✅ Git found"
echo ""

# Create install directory
INSTALL_DIR="$HOME/.labcart"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

echo "📦 Installing to: $INSTALL_DIR"
echo ""

# Clone or update the bot server repository
if [ -d "claude-bot/.git" ]; then
    echo "📥 Updating existing installation..."
    cd claude-bot
    git pull
else
    echo "📥 Cloning bot server..."
    rm -rf claude-bot
    git clone https://github.com/labcart/claude-bot.git
    cd claude-bot
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Create .env file with pre-configured settings
echo ""
echo "⚙️  Configuring bot server..."
cat > .env << EOF
# Auto-configured by LabCart Install
USER_ID=${userId}
SERVER_ID=${serverIdValue}
COORDINATION_URL=${coordinationUrl}/api/servers/register
HTTP_PORT=3010
EOF

echo "✅ Configuration saved to .env"
echo ""

# Start the server
echo "🚀 Starting bot server..."
echo ""
echo "   To run in background: npm run start &"
echo "   To run with logs:      npm run start"
echo ""

# Ask user how they want to run it
read -p "Start server now? (y/n) " -n 1 -r
echo
if [[ \$REPLY =~ ^[Yy]\$ ]]; then
    echo "Starting server..."
    npm run start
else
    echo ""
    echo "✅ Installation complete!"
    echo ""
    echo "To start the server later, run:"
    echo "   cd \$INSTALL_DIR/claude-bot"
    echo "   npm run start"
fi
`;
}
