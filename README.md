# LabCart IDE

**An AI-native IDE where multiple AI agents with distinct personalities collaborate on YOUR codebase.**

LabCart is like VS Code meets Cursor meets Conductor.build - a desktop IDE where bots (Finn, Matty, Rick, Claude) work together on your actual project files, with real terminals and file system access.

## What is LabCart?

LabCart is NOT:
- ❌ A chat-only web application
- ❌ A sandbox where bots play with toy examples
- ❌ An API-key-based SaaS service

LabCart IS:
- ✅ A downloadable desktop IDE (macOS app)
- ✅ Multi-bot collaboration on YOUR real codebase
- ✅ Persistent context - bots remember their work
- ✅ Real terminal integration - execute commands
- ✅ Real file system access - read/write your files
- ✅ Uses YOUR Claude subscription (not ours)

## Current Status

**MVP Chat Interface:** ✅ Complete (60%)
- Multi-bot chat interface with tabs
- Bot personality system (loaded from Supabase)
- Session persistence (local JSON files)
- GitHub OAuth authentication
- Real-time messaging via Socket.io

**Next Priority:** 🚧 Terminal & File System
- Real terminal integration (pty process)
- File system access for bots
- User workspace configuration
- User's Claude CLI integration

## Development Setup

### Prerequisites
- Node.js 18+
- Claude CLI installed and authenticated
- Supabase account (for bot personalities)

### Running Locally

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
# Create .env.local with:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. **Run the dev server:**
```bash
npm run dev
```

4. **Run the bot backend (in separate terminal):**
```bash
cd ../claude-bot
node server.js
```

5. **Open IDE:**
Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
labcart/
├── app/                    # Next.js App Router
│   └── page.tsx           # Main IDE layout
├── components/
│   ├── ChatWindow.tsx     # Multi-tab chat interface
│   ├── LeftSidebar.tsx    # File explorer (TODO: real files)
│   └── RightSidebar.tsx   # Team, Plans, Tasks, Terminal
├── contexts/
│   └── BotContext.tsx     # Bot state management
├── hooks/
│   └── useSocket.ts       # Socket.io connection
├── services/
│   └── api.ts             # HTTP API client
└── store/
    └── tabStore.ts        # Zustand state management
```

## Architecture

See [ARCHITECTURE.md](../ARCHITECTURE.md) for detailed technical architecture, design decisions, and roadmap.

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19 + TypeScript**
- **Tailwind CSS**
- **Socket.io** (real-time communication)
- **Zustand** (state management)
- **Supabase** (auth + bot personalities)

## Contributing

This is currently a private project in active development. See the main [ARCHITECTURE.md](../ARCHITECTURE.md) for the full vision and roadmap.

---

**Last Updated:** 2025-11-04
**Status:** MVP chat complete, building real IDE features next
