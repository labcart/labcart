#!/bin/bash

# Labcart UI - Restart Script
# Simple restart for Next.js dev server

echo "🛑 Stopping UI dev server..."

# Kill ALL Next.js related processes (comprehensive)
pkill -9 -f "next-server" 2>/dev/null && echo "   Killed next-server processes"
pkill -9 -f "next dev" 2>/dev/null && echo "   Killed next dev processes"
pkill -9 -f "postcss" 2>/dev/null && echo "   Killed postcss processes"

# Wait for processes to fully terminate
sleep 2

# Verify port 3000 is free
if lsof -i :3000 >/dev/null 2>&1; then
  echo "⚠️  Port 3000 still in use, force killing..."
  lsof -ti :3000 | xargs -r kill -9 2>/dev/null
  sleep 1
fi

echo "✅ All UI processes stopped"

# Clear build cache for clean start
echo "🧹 Clearing .next cache..."
rm -rf .next

echo "🚀 Starting UI dev server..."

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Start dev server in background
npm run dev > /tmp/labcart-ui.log 2>&1 &
DEV_PID=$!

sleep 2

# Verify it started
if ps -p $DEV_PID > /dev/null 2>&1; then
  echo "✅ UI dev server started successfully!"
  echo "📊 Process: $DEV_PID"
  echo "🌐 URL: http://localhost:3000"
  echo ""
  echo "📋 To view logs:"
  echo "   tail -f /tmp/labcart-ui.log"
else
  echo "❌ Failed to start - process died"
  echo "📋 Check /tmp/labcart-ui.log for errors"
  exit 1
fi
