import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/install-named/[token]
 * Serves the install script with NAMED TUNNEL (stable URL)
 *
 * This endpoint is called by: curl https://labcart.app/api/install-named/abc-xyz-123 | bash
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

    // Generate install script with NAMED TUNNEL
    const installScript = generateNamedTunnelInstallScript(tokenData.user_id, tokenData.server_id);

    console.log(`✅ Named tunnel install script served for token ${token}`);

    // Return bash script
    return new NextResponse(installScript, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {
    console.error('Error in GET /api/install-named/[token]:', error);
    return new NextResponse(
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}

function generateNamedTunnelInstallScript(userId: string, serverId: string | null): string {
  const coordinationUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const serverIdValue = serverId || 'server-$(hostname)';

  return `#!/bin/bash
set -e

echo "🚀 LabCart Bot Server Installation (Named Tunnel)"
echo "===================================================="
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

# Generate unique tunnel name and subdomain (sanitized for Cloudflare requirements)
# Tunnel names and subdomains must be lowercase alphanumeric with hyphens only
# Add random suffix to ensure uniqueness on reinstall
HOSTNAME=\$(hostname | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')
RANDOM_SUFFIX=\$(head -c 4 /dev/urandom | xxd -p)
TUNNEL_NAME="labcart-\$HOSTNAME-\$RANDOM_SUFFIX"
SUBDOMAIN="srv-\$HOSTNAME-\$RANDOM_SUFFIX"

echo ""
echo "🌐 Creating named tunnel via API: \$TUNNEL_NAME"
echo "🌐 Subdomain: \$SUBDOMAIN.labcart.io"
echo ""

# Call API to create tunnel AND DNS record
TUNNEL_RESPONSE=\$(curl -s -X POST ${coordinationUrl}/api/tunnels/create \\
  -H "Content-Type: application/json" \\
  -d "{\\"tunnelName\\":\\"\$TUNNEL_NAME\\",\\"subdomain\\":\\"\$SUBDOMAIN\\"}")

# Parse response
TUNNEL_ID=\$(echo "\$TUNNEL_RESPONSE" | grep -o '"tunnelId":"[^"]*"' | cut -d'"' -f4)
PUBLIC_URL=\$(echo "\$TUNNEL_RESPONSE" | grep -o '"publicUrl":"[^"]*"' | cut -d'"' -f4)

if [ -z "\$TUNNEL_ID" ] || [ -z "\$PUBLIC_URL" ]; then
    echo "❌ Failed to create tunnel"
    echo "Response: \$TUNNEL_RESPONSE"
    exit 1
fi

echo "✅ Tunnel ID: \$TUNNEL_ID"
echo "✅ Public URL: \$PUBLIC_URL"
echo "   ✨ This URL is STABLE and will not change on restart!"

# Create cloudflared config directory
mkdir -p ~/.cloudflared

# Extract credentials from response using Python
CREDENTIALS=\$(echo "\$TUNNEL_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(json.dumps(data['credentials'], indent=2))")

# Save tunnel credentials
echo "\$CREDENTIALS" > ~/.cloudflared/\$TUNNEL_ID.json

# Create tunnel configuration
cat > ~/.cloudflared/config.yml <<CONFIG
tunnel: \$TUNNEL_ID
credentials-file: ~/.cloudflared/\$TUNNEL_ID.json

ingress:
  - service: http://localhost:3010
CONFIG

echo "✅ Tunnel configuration created"
echo ""

echo "✅ Public URL: \$PUBLIC_URL"
echo "   This URL will NOT change on restart! 🎉"
echo ""

# Create .env file with stable public URL
cat > .env << EOF
# Auto-configured by LabCart Install (Named Tunnel)
USER_ID=${userId}
SERVER_ID=${serverIdValue}
SERVER_URL=\$PUBLIC_URL
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

# Stop any existing PM2 processes
npx pm2 delete labcart-tunnel 2>/dev/null || true
npx pm2 delete labcart-bot 2>/dev/null || true

# Start named tunnel with PM2
echo ""
echo "🚀 Starting named tunnel with PM2..."
npx pm2 start cloudflared --name labcart-tunnel --interpreter none -- tunnel run \$TUNNEL_NAME

# Wait for tunnel to be fully ready
echo "⏳ Waiting for tunnel to connect..."
sleep 3

# Start the bot server with PM2
echo ""
echo "🚀 Starting bot server with PM2..."
npx pm2 start server.js --name labcart-bot --log logs/pm2.log --time

# Save PM2 process list
npx pm2 save

echo ""
echo "✅ Installation complete!"
echo ""
echo "🎉 Bot server is running with NAMED TUNNEL!"
echo "🌐 Public URL: \$PUBLIC_URL"
echo "   ✨ This URL is STABLE and will not change on restart!"
echo ""
echo "📋 Management commands:"
echo "   npx pm2 status                   # View all services"
echo "   npx pm2 logs labcart-bot         # View bot logs"
echo "   npx pm2 logs labcart-tunnel      # View tunnel logs"
echo "   npx pm2 restart labcart-bot      # Restart bot server"
echo "   npx pm2 restart labcart-tunnel   # Restart tunnel (keeps same URL!)"
echo "   npx pm2 stop labcart-bot         # Stop bot server"
echo "   npx pm2 delete labcart-bot       # Remove bot from PM2"
echo ""
`;
}
