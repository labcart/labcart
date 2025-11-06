# LabCart Project Architecture & Roadmap

**Last Updated:** 2025-11-05

---

## Project Overview

LabCart is a non-coder-centric IDE that uses Claude Code CLI sessions as the backend. It provides a VS Code-like interface with AI-powered coding assistants (bots with unique personalities).

### Key Components:

1. **LabCart UI** (Next.js) - The IDE frontend
2. **Bot Server** (Node.js) - Orchestrates Claude CLI sessions and manages bot personalities
3. **Claude CLI** - Runs locally on user's machine, provides AI capabilities

---

## Current State (As of 2025-11-05)

### What Works:
- ✅ Full IDE UI with file explorer, Monaco editor, terminals
- ✅ Multiple bot personalities (Finn, Matty, Rick)
- ✅ Bot server orchestrates Claude CLI sessions locally
- ✅ Supabase authentication implemented
- ✅ Socket.IO communication between UI and bot server
- ✅ Session management and conversation tracking
- ✅ Terminal integration
- ✅ File operations (read, write, create, delete, rename)

### What Doesn't Work Yet:
- ❌ Hardcoded Linux paths (`/opt/lab/`) - won't work on Mac/Windows
- ❌ No workspace picker - assumes fixed directory structure
- ❌ Brain files are local (not gatekept)
- ❌ Not packaged as installable app
- ❌ No install/setup process for end users

---

## Business Model & Architecture Decision

### Target Deployment Model: **Local-First with Remote Brain API**

**Rationale:**
- Cursor proves this model works ($100M+ revenue)
- Lower infrastructure costs (no compute/storage for user workspaces)
- Better UX (faster, more private, works offline)
- Full Claude functionality (filesystem access, tools, terminal)
- Easier to build and scale

### What Runs Where:

**User's Machine (Local):**
- LabCart UI (Next.js on localhost:3000)
- Bot Server (Node.js on localhost:4000)
- Claude CLI (spawns locally with filesystem access)
- All MCP services and HTTP services

**Our Infrastructure (Remote):**
- Supabase (auth, user management) ✅ Already implemented
- **Brain API** (serves system prompts) ❌ TODO
- License validation
- Usage tracking
- Analytics

### Gatekeeping Strategy:

Users authenticate via Supabase to use the app. When they send a message to a bot:

1. Bot server (running locally) checks auth with Supabase
2. Bot server calls **our Brain API** to fetch the system prompt for that bot
3. Our API validates: Is user authenticated? Do they have access to this bot?
4. If yes, API returns the encrypted/obfuscated system prompt
5. Bot server spawns Claude CLI locally with that prompt
6. Claude works with user's local files
7. Response goes back to UI

**What we gatekeep:**
- Brain files (system prompts) - never leave our servers
- Access control - can revoke anytime
- Usage tracking - know who's using what

**What runs locally:**
- Claude CLI execution (user pays for their own Anthropic API)
- File system access
- Terminal operations
- UI rendering

---

## Phase 1: Make It Portable (Current Focus)

### Goal:
Make LabCart run on any machine (Mac, Windows, Linux) without hardcoded paths.

### Tasks:

#### 1. Fix Hardcoded Paths
**Files to update:**
- [ ] `/opt/lab/labcart/store/workspaceStore.ts:20` - Remove `/opt/lab/labcart` default
- [ ] `/opt/lab/labcart/components/TerminalPanel.tsx:19` - Remove `/opt/lab` default
- [ ] `/opt/lab/labcart/hooks/useTerminal.ts:100` - Remove `/opt/lab` default
- [ ] `/opt/lab/claude-bot/server.js:608` - Remove `/opt/lab/labcart` fallback

**Solution:**
- Implement workspace picker UI (like VS Code)
- On first run, prompt user to select workspace folder
- Save selection to localStorage
- Use that as the base path for all operations

#### 2. Workspace Picker Implementation
- [ ] Create `WorkspacePicker` component
- [ ] Add "Choose Workspace" dialog on first run
- [ ] Store workspace path in localStorage
- [ ] Add "Change Workspace" option in settings
- [ ] Update all components to use selected workspace path

#### 3. Environment Variable Handling
- [ ] Document required env vars for users
- [ ] Create `.env.example` files with proper defaults
- [ ] Add setup validation on app start

#### 4. Cross-Platform Compatibility
- [ ] Test on Mac
- [ ] Test on Windows
- [ ] Fix any platform-specific path issues (use `path.join()`, not string concat)
- [ ] Update restart scripts for cross-platform support

---

## Phase 2: Remote Brain API

### Goal:
Move brain files to remote API so users can't see/modify system prompts.

### Tasks:

#### 1. Create Brain API Service
- [ ] Set up Express/Next.js API routes
- [ ] Deploy to Vercel/Railway/similar
- [ ] Implement auth middleware (validate Supabase JWT)
- [ ] Create endpoints:
  - `GET /api/brains/:botId` - Get system prompt for a bot
  - `POST /api/brains/:botId/validate` - Validate user has access

#### 2. Encrypt/Obfuscate Brain Files
- [ ] Implement encryption for brain files
- [ ] Store encrypted brains in database or secure storage
- [ ] API decrypts on-the-fly when serving

#### 3. Update Bot Server to Use Remote Brains
- [ ] Modify `lib/brain-loader.js` to fetch from API instead of local files
- [ ] Add auth token to requests
- [ ] Handle API failures gracefully (cache? fallback?)
- [ ] Remove local brain files from distribution

#### 4. Usage Tracking
- [ ] Log each brain fetch request
- [ ] Track which users are using which bots
- [ ] Implement rate limiting if needed

---

## Phase 3: Package as Installable App

### Goal:
Make LabCart easy to install for non-technical users.

### Options:

**Option A: Electron App**
- Full desktop app experience
- Can bundle Node.js, bot server, everything
- Package as .dmg (Mac), .exe (Windows), .deb/.rpm (Linux)
- Most "production" feeling

**Option B: Install Script**
- Bash/PowerShell script that:
  - Checks for Node.js, installs if missing
  - Installs Claude CLI
  - Clones/downloads LabCart
  - Runs `npm install`
  - Creates desktop shortcuts
- Lighter weight, more flexible

**Option C: Docker Container**
- Single `docker run` command
- Cross-platform
- But requires Docker installed

### Tasks (Assuming Electron):
- [ ] Set up Electron wrapper
- [ ] Bundle Next.js app in Electron
- [ ] Bundle bot server in Electron
- [ ] Auto-start bot server when app launches
- [ ] Package with electron-builder
- [ ] Code signing (Mac/Windows)
- [ ] Auto-update mechanism

---

## Phase 4: Premium Features & Monetization

### Pricing Tiers:

**Free Tier:**
- 1 basic bot (limited personality)
- 50 messages/month
- Local only

**Pro Tier ($20/mo):**
- All bots (Finn, Matty, Rick)
- Unlimited messages
- Priority support
- Advanced features (TBD)

**Enterprise Tier ($99/mo):**
- Everything in Pro
- Cloud workspaces (Phase 5)
- Team collaboration
- Custom bots

### Tasks:
- [ ] Implement subscription tiers in Supabase
- [ ] Add Stripe integration
- [ ] Gate bot access by tier
- [ ] Usage limits for free tier
- [ ] Upgrade prompts in UI

---

## Phase 5: Cloud Workspaces (Future)

### Goal:
Offer hosted development environments like GitHub Codespaces.

### Architecture:
- User's code lives on our servers
- Claude runs on our infrastructure
- Browser-based access (no install)
- Per-hour pricing

### Why Later:
- Expensive to operate
- Complex to build
- Not necessary for v1
- Only needed for non-technical users who can't install locally

---

## Technical Debt & Improvements

### Priority Fixes:
- [ ] Better error handling throughout
- [ ] Logging/monitoring system
- [ ] Unit tests for critical paths
- [ ] E2E tests for main workflows
- [ ] Performance optimization (large file handling)
- [ ] Memory leak checks (Claude sessions)

### Nice-to-Haves:
- [ ] Dark/light theme toggle
- [ ] Keyboard shortcuts (VS Code style)
- [ ] Extensions/plugin system
- [ ] Git integration in UI
- [ ] Collaborative editing
- [ ] Mobile app (view-only?)

---

## Success Metrics

### Launch Goals (6 months):
- 1,000 active users
- 100 paying subscribers
- <5% churn rate
- 4.5+ star reviews

### Revenue Goals (12 months):
- $10k MRR
- 500 Pro subscribers
- 10 Enterprise customers

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Users reverse-engineer brains | High | Encryption, obfuscation, legal terms |
| Claude CLI changes breaking compatibility | High | Version pinning, abstraction layer |
| Infrastructure costs too high | Medium | Start local-first, optimize later |
| Competitor (Cursor, etc.) adds same features | Medium | Focus on unique personalities, better UX |
| Users don't want to install locally | Low | Offer cloud tier in Phase 5 |

---

## Next Immediate Steps

1. **Fix hardcoded paths** (this week)
2. **Implement workspace picker** (this week)
3. **Test on Mac** (this week)
4. **Create Brain API** (next week)
5. **Move brain files to API** (next week)

---

## Notes & Decisions Log

### 2025-11-05 - Architecture Discussion
- Decided on local-first approach (not remote compute)
- Confirmed Claude CLI must run locally for filesystem access
- Brain API will serve system prompts remotely for gatekeeping
- Workspace picker like VS Code (not hardcoded paths)
- Electron packaging for v1 (not web-based install)

---

## Resources & References

- [Cursor Business Model](https://cursor.sh) - Similar local-first AI IDE
- [VS Code Architecture](https://code.visualstudio.com/api) - Workspace and extension patterns
- [Claude Code CLI Docs](https://docs.anthropic.com/claude/docs/claude-code)
- [Electron Documentation](https://www.electronjs.org/docs/latest)

---

*This is a living document. Update as architecture evolves.*
