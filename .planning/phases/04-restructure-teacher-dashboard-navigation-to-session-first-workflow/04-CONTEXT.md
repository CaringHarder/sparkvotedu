# Phase 4: Restructure Teacher Dashboard Navigation to Session-First Workflow - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the teacher dashboard so sessions are the primary navigation and organizational unit. Teachers pick a session first, then manage its brackets and polls from within that session's workspace. Remove the standalone Activities section. Migrate orphan activities to sessions. Fix card title truncation across the app.

</domain>

<decisions>
## Implementation Decisions

### Navigation Structure
- **D-01:** Remove the Activities section (and its Brackets/Polls sub-items) from the sidebar entirely. New sidebar: Dashboard | Sessions | Archived | (separator) | Analytics | Billing | Profile
- **D-02:** Mobile hamburger drawer mirrors the new desktop sidebar exactly — same items, same order
- **D-03:** Top-level `/brackets` and `/polls` list pages — Claude's discretion on handling (redirect to /sessions or remove). Individual detail pages (`/brackets/[id]`, `/polls/[id]`) must continue to work.
- **D-04:** Bracket/poll creation moves inside session context. Create from within a session detail page with session pre-selected.
- **D-05:** Archived sessions stay as a top-level sidebar item (revised from earlier tab/filter decision). Dedicated `/sessions/archived` page.
- **D-06:** Sessions on the /sessions page sorted: active first (by last activity), then ended sessions by recency.

### Session Detail Layout
- **D-07:** Session detail page becomes a tabbed workspace with tabs: **Brackets | Polls | Students**
- **D-08:** Prominent session header showing: session name (editable inline), large join code with copy button, status badge, student count, activity count
- **D-09:** Default tab = whichever tab (Brackets or Polls) has the most recently updated item. Falls back to Brackets if session is empty.
- **D-10:** Students tab shows full participant list with fun name, real name, emoji, last seen, ban/unban — reuse existing session detail component
- **D-11:** Bracket and poll cards in session tabs reuse existing BracketCard/PollCard components with full context menus (rename, duplicate, archive, delete)
- **D-12:** **Fix card title truncation** — titles must display fully without ellipsis for reasonable-length titles on both bracket and poll cards. Example problem: "What is your favorite book (Week 1)?" and "What is your favorite book (Week 2)?" were indistinguishable because "(Week N)" was truncated.

### Orphan Activities
- **D-13:** All brackets/polls must belong to a session (enforce `sessionId` non-null going forward). Existing orphans migrate to an auto-created "General" session per teacher.
- **D-14:** Add "Move to session..." context menu option on bracket/poll cards — opens a session picker to reassign
- **D-15:** Add "Duplicate to session..." context menu option on bracket/poll cards — copies activity to a different session

### Dashboard Home Page
- **D-16:** Dashboard uses a **dropdown session selector** (not cards) to choose and navigate to an active session
- **D-17:** No ended/archived sessions on dashboard — those live exclusively in the Archived sidebar page
- **D-18:** Keep existing welcome message, plan/usage card, and "Create Session" as primary CTA

### Claude's Discretion
- Handling of `/brackets` and `/polls` top-level routes (D-03): redirect strategy vs removal
- Tab URL structure for session detail (e.g., query params `?tab=polls` vs path segments)
- Exact card title max-width/wrapping behavior for D-12 (word-wrap vs multi-line)
- Session dropdown component choice and positioning on dashboard
- Whether to make `sessionId` non-nullable in schema or enforce at application level

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Navigation & Layout
- `src/components/dashboard/sidebar-nav.tsx` — Current sidebar navigation with Activities section to remove
- `src/components/dashboard/mobile-nav.tsx` — Mobile drawer that must mirror new sidebar
- `src/app/(dashboard)/layout.tsx` — Dashboard layout with sidebar + header
- `src/components/dashboard/shell.tsx` — Dashboard home page content (DashboardShell)

### Session Pages
- `src/app/(dashboard)/sessions/page.tsx` — Sessions list page
- `src/app/(dashboard)/sessions/[sessionId]/page.tsx` — Session detail page (currently basic)
- `src/app/(dashboard)/sessions/[sessionId]/session-detail.tsx` — Session detail client component
- `src/app/(dashboard)/sessions/archived/page.tsx` — Archived sessions page

### Activity Pages (to restructure)
- `src/app/(dashboard)/activities/page.tsx` — Unified activities page (to remove/redirect)
- `src/app/(dashboard)/brackets/page.tsx` — Brackets list page (to remove/redirect)
- `src/app/(dashboard)/polls/page.tsx` — Polls list page (to remove/redirect)
- `src/app/(dashboard)/brackets/new/page.tsx` — Bracket creation (to move into session context)
- `src/app/(dashboard)/polls/new/page.tsx` — Poll creation (to move into session context)

### Data Layer
- `prisma/schema.prisma` — ClassSession, Bracket, Poll models with optional sessionId
- `src/lib/dal/class-session.ts` — Session data access (getTeacherSessions, getSessionWithParticipants)
- `src/lib/dal/bracket.ts` — Bracket data access
- `src/lib/dal/poll.ts` — Poll data access

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SidebarNav` component: Well-structured with NavItem/NavSection types — straightforward to modify
- `MobileNav` component: Portaled drawer that renders `<SidebarNav />` — will automatically update when sidebar changes
- `SessionCardMenu` component: Existing context menu for session cards
- Bracket/Poll card components with context menus: Rename, duplicate, archive, delete actions already exist
- `DashboardShell`: Server component with session fetching — good base for dropdown conversion
- `ActivitiesList`: Has session filtering logic that can inform the session detail tab implementation

### Established Patterns
- Server Components for data fetching, Client Components for interactivity
- Framer Motion AnimatePresence for card animations (delete fade, archive slide-left)
- useEffect prop sync for card state after router.refresh()
- Context menus using existing pattern across bracket/poll cards
- shadcn/ui Card, Badge, Tabs components available

### Integration Points
- Sidebar nav items array — add/remove entries to change navigation
- Dashboard layout — sidebar width, header, main content area
- Session detail page — currently minimal, needs full workspace buildout
- Bracket/Poll creation forms — need session context prop/param
- Prisma schema — sessionId currently optional on Bracket and Poll models

</code_context>

<specifics>
## Specific Ideas

- Dropdown selector on dashboard for session quick-switch (not card grid)
- Session workspace header should prominently display the join code — teachers share this with the class
- Card titles MUST show fully: the "(Week 1)" vs "(Week 2)" truncation problem is a real user pain point observed in production
- "Move to session" and "Duplicate to session" are both needed — not just one or the other

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-restructure-teacher-dashboard-navigation-to-session-first-workflow*
*Context gathered: 2026-04-08*
