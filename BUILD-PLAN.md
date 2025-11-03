# Labcart - Build Plan

## Project Setup ✅
- ✅ Next.js 14 + TypeScript
- ✅ Tailwind CSS
- ✅ Shadcn/UI initialized
- ✅ Core components installed (button, input, scroll-area, separator)

---

## Phase 1: Basic Layout (Day 1)

### Goal: 3-column layout with conductor.build aesthetic

**Tasks:**
1. Create 3-column layout structure
   - Left sidebar (250px fixed)
   - Center chat (flex-1)
   - Right sidebar (250px fixed)

2. Apply conductor.build colors
   - Background: #f6f6f5
   - Sidebar: #ecece9
   - Text: #2c2826
   - Borders: #e0e0e0

3. Create placeholder components:
   - `components/LeftSidebar.tsx`
   - `components/ChatWindow.tsx`
   - `components/RightSidebar.tsx`

4. Test responsive layout

**Acceptance criteria:**
- [ ] 3-column layout displays correctly
- [ ] Colors match conductor.build
- [ ] Layout is responsive
- [ ] Typography uses SF Pro/Inter

---

## Phase 2: Chat Window (Day 2)

### Goal: Functional chat interface with bot server connection

**Tasks:**
1. Build chat message components
   - User message bubble
   - Bot message bubble
   - Code block rendering (syntax highlighting)
   - Markdown support

2. Create chat input
   - Multi-line textarea
   - Send button
   - Attach button (placeholder)

3. WebSocket connection to bot server
   - Connect to localhost:3001
   - Send messages
   - Receive messages
   - Handle connection errors

4. Display messages in chat window

**Acceptance criteria:**
- [ ] Can send message to bot
- [ ] Bot response displays in chat
- [ ] Code blocks have syntax highlighting
- [ ] Markdown renders correctly
- [ ] WebSocket connection stable

---

## Phase 3: Sidebars (Day 3)

### Goal: Functional task list and bot selector

**Left Sidebar:**
1. Tasks section
   - Active tasks list
   - Status indicators (🔴 🟡 🟢)
   - Click to view details
   - Completed tasks (collapsed)

2. Tools section
   - TTS, Image Gen, GitHub
   - Status indicators

**Right Sidebar:**
1. Bots section
   - List of bot personalities
   - Click to switch bot
   - Highlight selected bot

2. Sessions section
   - Show sessions for selected bot
   - Group by date
   - Click to load session

**Acceptance criteria:**
- [ ] Tasks display correctly
- [ ] Can click bot to switch
- [ ] Sessions list updates when bot changes
- [ ] Status indicators work

---

## Phase 4: Integration (Day 4)

### Goal: Connect all pieces, polish UX

**Tasks:**
1. Bot switching logic
   - Clicking bot in right sidebar switches chat
   - Sessions list updates
   - Chat history loads

2. Task management
   - Right-click task to assign
   - Task status updates

3. Polish
   - Smooth animations
   - Loading states
   - Error handling
   - Empty states

4. Dark mode (stretch goal)

**Acceptance criteria:**
- [ ] Bot switching works smoothly
- [ ] Task assignment works
- [ ] All interactions feel polished
- [ ] No obvious bugs

---

## Phase 5: Deploy (Day 5)

### Goal: Running locally, ready to use

**Tasks:**
1. Test with real bot server
2. Fix any bugs
3. Add basic settings page
4. Document how to run

**Acceptance criteria:**
- [ ] Works with existing bot server
- [ ] Can talk to Finn, Matty, Rick
- [ ] Delegation works
- [ ] Ready to use daily

---

## Future Enhancements (Post-MVP)

- Tauri packaging (desktop app)
- File preview in chat
- Drag-and-drop task assignment
- Advanced task management
- Git worktree integration
- Keyboard shortcuts
- Search functionality

---

## Technical Notes

### Colors (from UI-VISION.md)
```css
--background: #f6f6f5
--sidebar: #ecece9
--text: #2c2826
--border: #e0e0e0
--success: #28a745
--error: #dc3545
```

### Fonts
- UI: SF Pro / Inter
- Code: SF Mono / JetBrains Mono

### Bot Server Connection
- URL: ws://localhost:3001
- Protocol: WebSocket
- Fallback: HTTP polling if WS fails

---

## Current Status

**Phase 1:** In Progress
- Created project structure
- Shadcn/UI configured
- Ready to build layout

**Next Step:** Create 3-column layout in `app/page.tsx`
