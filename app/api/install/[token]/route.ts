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
  const serverIdValue = serverId || 'server-$(hostname)';

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

echo "✅ Node.js found: \$(node --version)"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

echo "✅ Git found"
echo ""

# Create install directory
INSTALL_DIR="\$HOME/.labcart"
mkdir -p "\$INSTALL_DIR"
cd "\$INSTALL_DIR"

echo "📦 Installing to: \$INSTALL_DIR"
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

# Install Cloudflare Tunnel
echo ""
echo "🌐 Installing Cloudflare Tunnel..."
# Check if cloudflared exists AND works (not just exists)
if ! cloudflared --version &> /dev/null; then
    # Detect OS
    OS=\$(uname -s)
    if [ "\$OS" = "Darwin" ]; then
        CF_OS="darwin"
    else
        CF_OS="linux"
    fi

    # Detect architecture
    ARCH=\$(uname -m)
    if [ "\$ARCH" = "x86_64" ]; then
        CF_ARCH="amd64"
    elif [ "\$ARCH" = "aarch64" ] || [ "\$ARCH" = "arm64" ]; then
        CF_ARCH="arm64"
    else
        CF_ARCH="amd64"  # fallback
    fi

    echo "   Downloading cloudflared for \$CF_OS-\$CF_ARCH..."
    if [ "\$CF_OS" = "darwin" ]; then
        # macOS releases are .tgz archives
        curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-\$CF_OS-\$CF_ARCH.tgz" -o cloudflared.tgz
        tar -xzf cloudflared.tgz
        rm cloudflared.tgz
        chmod +x cloudflared
    else
        # Linux releases are raw binaries
        curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-\$CF_OS-\$CF_ARCH" -o cloudflared
        chmod +x cloudflared
    fi
    sudo mv cloudflared /usr/local/bin/ 2>/dev/null || mv cloudflared \$HOME/.local/bin/cloudflared
    echo "✅ Cloudflared installed"
else
    echo "✅ Cloudflared already installed"
fi

# Create temporary .env with placeholder
cat > .env << EOF
# Auto-configured by LabCart Install
USER_ID=${userId}
SERVER_ID=${serverIdValue}
SERVER_URL=https://placeholder.trycloudflare.com
COORDINATION_URL=${coordinationUrl}/api/servers/register
HTTP_PORT=3010
NEXT_PUBLIC_SUPABASE_URL=https://maaotshzykjncoifrbmj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW90c2h6eWtqbmNvaWZyYm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMDM1OTUsImV4cCI6MjA3Nzc3OTU5NX0.gtv5duMO1_eRsDkuzrMIWqSira1CnnImQagGTEXepVs
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW90c2h6eWtqbmNvaWZyYm1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjIwMzU5NSwiZXhwIjoyMDc3Nzc5NTk1fQ.AHec7PwTI21iaiHVG2pBAfXWUwbocvlM4aok-AxKzF0
EOF

# Start Cloudflare Tunnel with PM2
echo ""
echo "🚀 Starting Cloudflare Tunnel..."
npx pm2 delete labcart-tunnel 2>/dev/null || true
npx pm2 start cloudflared --name labcart-tunnel --interpreter none -- tunnel --url http://localhost:3010 --no-autoupdate

# Wait for tunnel URL with retry logic (max 30 seconds)
echo "⏳ Waiting for tunnel URL..."
TUNNEL_URL=""
for i in {1..15}; do
    sleep 2
    TUNNEL_URL=\$(npx pm2 logs labcart-tunnel --nostream --lines 100 2>/dev/null | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1)
    if [ -n "\$TUNNEL_URL" ]; then
        echo "✅ Tunnel URL detected: \$TUNNEL_URL"
        break
    fi
    echo "   Attempt \$i/15..."
done

if [ -z "\$TUNNEL_URL" ]; then
    echo "❌ Error: Could not detect tunnel URL after 30 seconds."
    echo "   Please check: npx pm2 logs labcart-tunnel"
    exit 1
fi

# Update .env with actual tunnel URL
cat > .env << EOF
# Auto-configured by LabCart Install
USER_ID=${userId}
SERVER_ID=${serverIdValue}
SERVER_URL=\$TUNNEL_URL
COORDINATION_URL=${coordinationUrl}/api/servers/register
HTTP_PORT=3010
NEXT_PUBLIC_SUPABASE_URL=https://maaotshzykjncoifrbmj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW90c2h6eWtqbmNvaWZyYm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMDM1OTUsImV4cCI6MjA3Nzc3OTU5NX0.gtv5duMO1_eRsDkuzrMIWqSira1CnnImQagGTEXepVs
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW90c2h6eWtqbmNvaWZyYm1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjIwMzU5NSwiZXhwIjoyMDc3Nzc5NTk1fQ.AHec7PwTI21iaiHVG2pBAfXWUwbocvlM4aok-AxKzF0
EOF

echo "✅ Configuration saved to .env"
echo ""

# Create labcart-projects directory for workspaces
echo "📁 Creating workspaces directory..."
mkdir -p "\$HOME/labcart-projects"
echo "✅ Workspaces directory created at ~/labcart-projects"
echo ""

# Initialize bots from brain files
echo "🤖 Initializing bots..."
node scripts/init-bots.js

# Install and start HTTP services
echo ""
echo "📦 Setting up HTTP services..."

# Generate .env files from templates (using environment variables if available)
echo "🔧 Generating service .env files..."

# TTS Service .env
cat > services/tts-http-service/.env <<ENV_EOF
TTS_HTTP_PORT=3001
OPENAI_API_KEY=\${OPENAI_API_KEY:-sk-proj-placeholder}
GOOGLE_APPLICATION_CREDENTIALS=\${GOOGLE_APPLICATION_CREDENTIALS:-}
ELEVENLABS_API_KEY=\${ELEVENLABS_API_KEY:-}
ENV_EOF

# Image Gen Service .env
cat > services/image-gen-http-service/.env <<ENV_EOF
IMAGE_HTTP_PORT=3002
OPENAI_API_KEY=\${OPENAI_API_KEY:-sk-proj-placeholder}
ENV_EOF

# Chat Context Service .env
cat > services/chat-context-http-service/.env <<ENV_EOF
CHAT_CONTEXT_HTTP_PORT=3003
ENV_EOF

echo "✅ Service .env files generated"
echo "⚠️  Note: Set OPENAI_API_KEY, ELEVENLABS_API_KEY environment variables before installation for full functionality"

# Install MCP Router globally (if not already installed)
if [ ! -d "\$HOME/mcp-router" ]; then
  echo "🔀 Installing MCP Router to ~/mcp-router..."
  cp -r mcp-router "\$HOME/mcp-router"
  cd "\$HOME/mcp-router"
  npm install
  cd "\$INSTALL_DIR/claude-bot"
  echo "✅ MCP Router installed globally"
else
  echo "✅ MCP Router already installed at ~/mcp-router (shared)"
fi

# Install service dependencies
cd services/tts-http-service && npm install && cd ../..
cd services/image-gen-http-service && npm install && cd ../..
cd services/chat-context-http-service && npm install && cd ../..

# Start services if not already running (shared across installations)
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "🚀 Starting TTS service..."
  npx pm2 start index.js --name tts-service --cwd services/tts-http-service
else
  echo "✅ TTS service already running (shared)"
fi

if ! curl -s http://localhost:3002/health > /dev/null 2>&1; then
  echo "🚀 Starting Image Gen service..."
  npx pm2 start index.js --name image-service --cwd services/image-gen-http-service
else
  echo "✅ Image Gen service already running (shared)"
fi

if ! curl -s http://localhost:3003/health > /dev/null 2>&1; then
  echo "🚀 Starting Chat Context service..."
  npx pm2 start index.js --name chat-service --cwd services/chat-context-http-service
else
  echo "✅ Chat Context service already running (shared)"
fi

# Stop any existing PM2 bot process
npx pm2 delete labcart-bot 2>/dev/null || true

# Start the server with PM2
echo ""
echo "🚀 Starting bot server with PM2..."
npx pm2 start server.js --name labcart-bot --log logs/pm2.log --time

# Save PM2 process list
npx pm2 save

echo ""
echo "✅ Installation complete!"
echo ""
echo "🎉 Bot server is running!"
echo "🌐 Tunnel URL: \$TUNNEL_URL"
echo ""
echo "📋 Management commands:"
echo "   npx pm2 status                   # View all services"
echo "   npx pm2 logs labcart-bot         # View bot logs"
echo "   npx pm2 logs labcart-tunnel      # View tunnel logs"
echo "   npx pm2 restart labcart-bot      # Restart bot server"
echo "   npx pm2 restart labcart-tunnel   # Restart tunnel"
echo "   npx pm2 stop labcart-bot         # Stop bot server"
echo "   npx pm2 delete labcart-bot       # Remove bot from PM2"
echo ""
`;
}
