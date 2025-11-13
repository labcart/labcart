# LabCart Architecture Discussion - November 12, 2025

## Key Question
Should LabCart evolve toward isolated workspaces (Codespaces-style) or stay with shared workspace + git branches?

## Current State
- Central UI (Next.js web app)
- Single shared bot server with 5 bots
- All bots work on same VPS filesystem
- Tab state syncs across sessions via Supabase
- **Product:** Multi-agent IDE with session management

## Three Architecture Options

### 1. Shared Workspace + Git Branches (Current)
- All bots on same filesystem, different git branches
- **Pros:** Simple, cheap, easy file sharing
- **Cons:** No process isolation, can't run conflicting environments
- **Best for:** Small teams, single project

### 2. Isolated Workspaces (Docker/VM per bot)
- Each bot gets its own container/VM
- **Pros:** True isolation, parallel work, security
- **Cons:** Complex infra, higher cost, harder to share files
- **Best for:** Multi-project teams, enterprise

### 3. Hybrid (Recommended)
- Default: Shared workspace
- Optional: Spawn isolated workspaces for specific bots
- Start simple, scale up as needed

## Phased Roadmap

### Phase 1 (Now): Shared Workspace + Git
- Keep current architecture
- Add git branch management UI
- Assign bots to specific branches
- Improve conflict detection

### Phase 2: Workspace Templates
- Save/load workspace configs
- One-click project setup
- Export/import workspace state

### Phase 3: Docker Isolation (Future)
- Add optional isolated workspaces
- Keep shared as default
- Power users choose isolation when needed

## Design Decision: Sync UI
- **DON'T show:** "Syncing... ✓ Synced" for auto-saves (too noisy)
- **DO show:** Only errors or manual saves
- Follow Notion/Google Docs pattern: silent sync unless problem
- Note: GitHub Codespaces/VS Code Web DON'T sync tabs at all - we're ahead here

## Next Priorities
1. Keep silent sync (no UI noise)
2. Add git branch management
3. Bot workspace assignment
4. Multi-bot coordination UI
5. Context sharing improvements (core differentiator)

## Bottom Line
**Killer feature isn't isolation model - it's multi-bot coordination + session context sharing.** Double down on that.
