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
if [ -d "labcart-bot/.git" ]; then
    echo "📥 Updating existing installation..."
    cd labcart-bot
    git pull
else
    echo "📥 Cloning bot server..."
    rm -rf labcart-bot
    git clone https://github.com/labcart/labcart-bot.git
    cd labcart-bot
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

# Stop existing bot server and tunnel to prevent stale processes during install
echo "🛑 Stopping existing processes (if running)..."
npx pm2 delete labcart-bot 2>/dev/null || true
npx pm2 delete labcart-tunnel 2>/dev/null || true

# Create .env configuration
# NOTE: SERVER_URL is NOT included - the bot server now dynamically detects
# its tunnel URL using the built-in TunnelManager. This prevents stale URL issues
# when cloudflared restarts and generates a new URL.
cat > .env << EOF
# Auto-configured by LabCart Install
# NOTE: Tunnel URL is detected dynamically by TunnelManager - no SERVER_URL needed
USER_ID=${userId}
SERVER_ID=${serverIdValue}
COORDINATION_URL=${coordinationUrl}/api/servers/register
HTTP_PORT=3010
NEXT_PUBLIC_SUPABASE_URL=https://maaotshzykjncoifrbmj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW90c2h6eWtqbmNvaWZyYm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMDM1OTUsImV4cCI6MjA3Nzc5NTk1fQ.gtv5duMO1_eRsDkuzrMIWqSira1CnnImQagGTEXepVs
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

# Create .env files from templates ONLY if they don't exist (preserve user secrets)
echo "🔧 Setting up service .env files..."

# TTS Service .env
if [ ! -f services/tts-http-service/.env ]; then
  cat > services/tts-http-service/.env <<ENV_EOF
# TTS Service Secrets - Add your API keys here
OPENAI_API_KEY=\${OPENAI_API_KEY:-}
GOOGLE_APPLICATION_CREDENTIALS=\${GOOGLE_APPLICATION_CREDENTIALS:-}
ELEVENLABS_API_KEY=\${ELEVENLABS_API_KEY:-}
ENV_EOF
  echo "   ✅ Created services/tts-http-service/.env"
else
  echo "   ⏭️  Skipping services/tts-http-service/.env (already exists)"
fi

# Image Gen Service .env
if [ ! -f services/image-gen-http-service/.env ]; then
  cat > services/image-gen-http-service/.env <<ENV_EOF
# Image Gen Service Secrets - Add your API keys here
OPENAI_API_KEY=\${OPENAI_API_KEY:-}
GOOGLE_AI_API_KEY=\${GOOGLE_AI_API_KEY:-}
REPLICATE_API_TOKEN=\${REPLICATE_API_TOKEN:-}
ENV_EOF
  echo "   ✅ Created services/image-gen-http-service/.env"
else
  echo "   ⏭️  Skipping services/image-gen-http-service/.env (already exists)"
fi

# Chat Context Service .env (no secrets needed currently)
if [ ! -f services/chat-context-http-service/.env ]; then
  cat > services/chat-context-http-service/.env <<ENV_EOF
# Chat Context Service Secrets (none required currently)
ENV_EOF
  echo "   ✅ Created services/chat-context-http-service/.env"
else
  echo "   ⏭️  Skipping services/chat-context-http-service/.env (already exists)"
fi

echo "✅ Service .env files ready"
echo "💡 Tip: Edit service .env files to add your API keys. They won't be overwritten on updates."

# Install MCP Router globally (if not already installed)
if [ ! -d "\$HOME/mcp-router" ]; then
  echo "🔀 Installing MCP Router to ~/mcp-router..."
  cp -r mcp-router "\$HOME/mcp-router"
  cd "\$HOME/mcp-router"
  npm install
  cd "\$INSTALL_DIR/labcart-bot"
  echo "✅ MCP Router installed globally"
else
  echo "✅ MCP Router already installed at ~/mcp-router (shared)"
fi

# Install service dependencies (if directories exist)
if [ -d "services/tts-http-service" ]; then
  cd services/tts-http-service && npm install && cd ../..
fi
if [ -d "services/image-gen-http-service" ]; then
  cd services/image-gen-http-service && npm install && cd ../..
fi
if [ -d "services/chat-context-http-service" ]; then
  cd services/chat-context-http-service && npm install && cd ../..
fi

# Start services if not already running (shared across installations)
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
  if [ -d "services/tts-http-service" ]; then
    echo "🚀 Starting TTS service..."
    npx pm2 start index.js --name tts-service --cwd services/tts-http-service
  fi
else
  echo "✅ TTS service already running (shared)"
fi

if ! curl -s http://localhost:3002/health > /dev/null 2>&1; then
  if [ -d "services/image-gen-http-service" ]; then
    echo "🚀 Starting Image Gen service..."
    npx pm2 start index.js --name image-service --cwd services/image-gen-http-service
  fi
else
  echo "✅ Image Gen service already running (shared)"
fi

if ! curl -s http://localhost:3003/health > /dev/null 2>&1; then
  if [ -d "services/chat-context-http-service" ]; then
    echo "🚀 Starting Chat Context service..."
    npx pm2 start index.js --name chat-service --cwd services/chat-context-http-service
  fi
else
  echo "✅ Chat Context service already running (shared)"
fi

# Start the bot server with PM2
# The bot server now manages its own Cloudflare tunnel internally
echo ""
echo "🚀 Starting bot server with PM2..."
mkdir -p logs
npx pm2 start server.js --name labcart-bot --log logs/pm2.log --time

# Save PM2 process list
npx pm2 save

echo ""
echo "✅ Installation complete!"
echo ""
echo "🎉 Bot server is running!"
echo "🚇 Cloudflare tunnel is managed automatically by the bot server"
echo "   (URL is detected dynamically and registered to the panel)"
echo ""
echo "📋 Management commands:"
echo "   npx pm2 status                   # View all services"
echo "   npx pm2 logs labcart-bot         # View bot logs (includes tunnel output)"
echo "   npx pm2 restart labcart-bot      # Restart bot server and tunnel"
echo "   npx pm2 stop labcart-bot         # Stop bot server"
echo "   npx pm2 delete labcart-bot       # Remove bot from PM2"
echo ""
`;
}
