---
phase: 04-restructure-teacher-dashboard-navigation-to-session-first-workflow
verified: 2026-04-08T20:30:00Z
status: gaps_found
score: 14/17 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Sidebar bottom items (Analytics, Billing, Profile) are pinned to viewport bottom and never require scrolling"
    status: failed
    reason: "In the mobile drawer, SidebarNav is rendered inside 'flex flex-1 flex-col overflow-y-auto' which allows the container to scroll freely. SidebarNav's own 'flex-1' spacer only pins bottom items when the parent has a fixed height (h-full). In overflow-y-auto, the parent can grow past the viewport, so flex-1 expands infinitely and the bottom items scroll away. On desktop the aside has no overflow-y-auto so pinning works, but the mobile drawer breaks D-01's expected sticky behavior. User confirmed this during human checkpoint."
    artifacts:
      - path: "src/components/dashboard/mobile-nav.tsx"
        issue: "Line 104: wrapper div uses 'flex flex-1 flex-col overflow-y-auto' — SidebarNav's flex-1 spacer cannot pin bottom items inside a scrollable container"
      - path: "src/components/dashboard/sidebar-nav.tsx"
        issue: "Nav uses 'flex h-full flex-col' with flex-1 spacer for bottom items — correct pattern but only works when parent has bounded height, not inside overflow-y-auto"
    missing:
      - "Mobile drawer container must not use overflow-y-auto for the portion containing SidebarNav's bottom-pinned items"
      - "Fix: remove overflow-y-auto from SidebarNav wrapper in mobile-nav.tsx, or restructure drawer so top nav scrolls but bottom items remain sticky (e.g., split into a separate non-overflowing bottom section)"

  - truth: "End Session button requires a confirmation dialog before proceeding"
    status: failed
    reason: "handleEndSession() in session-workspace.tsx calls endSession() directly on click with no confirmation dialog. User confirmed this during human checkpoint — destructive action fires immediately."
    artifacts:
      - path: "src/components/teacher/session-workspace.tsx"
        issue: "Lines 97-104: handleEndSession() calls endSession(session.id) directly without any confirm/alert dialog. No AlertDialog, no window.confirm, no modal gate."
    missing:
      - "Add a confirmation dialog (AlertDialog or similar) before calling endSession()"
      - "Dialog should warn that ending a session is permanent and students will be disconnected"

  - truth: "Dashboard session dropdown is visually prominent enough to be immediately discoverable"
    status: failed
    reason: "DashboardSessionDropdown renders as a plain shadcn Select in a max-w-sm div with the label 'Active Sessions' above it. User confirmed during human checkpoint that it lacks sufficient visual prominence — the dropdown blends into the page and is not immediately obvious as the primary navigation path to sessions."
    artifacts:
      - path: "src/components/dashboard/dashboard-session-dropdown.tsx"
        issue: "Dropdown is a bare Select component in max-w-sm with no visual treatment (no border emphasis, no icon, no card wrapper). Insufficient prominence for a primary navigation element."
      - path: "src/components/dashboard/shell.tsx"
        issue: "Lines 130-143: Active Sessions section uses a plain h2 heading and renders the dropdown without visual emphasis card, icon, or distinguishing treatment."
    missing:
      - "Wrap dropdown in a card or visually emphasized container"
      - "Add a session/navigation icon alongside the label"
      - "Consider a larger trigger with arrow/chevron styling that signals navigability"
      - "Or replace with a list of session links styled as cards (per original plan decision that dashboard showed session cards)"
human_verification: []
---

# Phase 4: Restructure Teacher Dashboard Navigation to Session-First Workflow — Verification Report

**Phase Goal:** Restructure the teacher dashboard so sessions are the primary navigation and organizational unit. Teachers pick a session first, then manage its brackets and polls from within that session's tabbed workspace. Remove Activities sidebar section, migrate orphan activities, fix card title truncation, add Move/Duplicate to session context menu actions, and replace dashboard session cards with a dropdown selector.
**Verified:** 2026-04-08T20:30:00Z
**Status:** gaps_found — 3 gaps blocking full goal achievement
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Sidebar shows Dashboard, Sessions, Archived, separator, Analytics, Billing, Profile — no Activities section | VERIFIED | sidebar-nav.tsx: navItems=[Dashboard, Sessions, Archived], bottomNavItems=[Analytics, Billing, Profile], no activitiesSection string, no NavSection interface |
| 2 | Mobile hamburger drawer mirrors the new sidebar exactly | VERIFIED | mobile-nav.tsx line 105 renders `<SidebarNav />` — automatic mirror |
| 3 | Bracket and poll card titles show up to 2 lines before ellipsis | VERIFIED | bracket-card.tsx line 165: `line-clamp-2`; poll-card.tsx line 130: `line-clamp-2` with title attribute on both |
| 4 | Visiting /activities, /brackets, or /polls redirects to /sessions | VERIFIED | All three page.tsx files contain only `redirect('/sessions')` |
| 5 | Individual detail pages /brackets/[id] and /polls/[id] still work | VERIFIED | Directories src/app/(dashboard)/brackets/[bracketId] and polls/[pollId] both exist and untouched |
| 6 | getBracketsBySessionDAL returns brackets for a given session | VERIFIED | bracket.ts line 837: `export async function getBracketsBySessionDAL(sessionId: string)` with Prisma query |
| 7 | getSessionWithActivities returns session + brackets + polls + participants in one query | VERIFIED | class-session.ts lines 298-331: full Prisma include with brackets, polls, participants, _count |
| 8 | migrateOrphanActivities creates a General session and assigns orphan brackets/polls to it | VERIFIED | class-session.ts lines 338-375: idempotent implementation with prisma.$transaction |
| 9 | duplicateBracketDAL and duplicatePollDAL accept optional targetSessionId | VERIFIED | bracket.ts line 859: `targetSessionId?: string`; poll.ts line 322: `targetSessionId?: string` |
| 10 | Session detail page shows a tabbed workspace with Brackets, Polls, Students tabs | VERIFIED | session-workspace.tsx: Tabs with TabsTrigger values "brackets", "polls", "students"; rendered in sessions/[sessionId]/page.tsx |
| 11 | Session header displays editable name, large join code, copy button, QR button, status badge, student/bracket/poll counts | VERIFIED | session-workspace.tsx: EditableSessionName, span with tracking-widest font-mono for code, Copy button (aria-label="Copy join code"), QRCodeDisplay, Badge, stats row |
| 12 | Create Bracket and Create Poll CTAs link to existing creation pages with ?sessionId= query param | VERIFIED | session-workspace.tsx lines 205, 237: `/brackets/new?sessionId=${session.id}` and `/polls/new?sessionId=${session.id}` |
| 13 | Card context menu includes 'Move to session...' and 'Duplicate to session...' options | VERIFIED | card-context-menu.tsx: imports SessionPickerDialog, assignBracketToSession; "Move to session..." at line 256, "Duplicate to session..." at line 267 |
| 14 | Session picker dialog opens when Move or Duplicate is selected | VERIFIED | session-picker-dialog.tsx: full dialog with session list, current session labeling, Move Activity / Duplicate Activity confirm labels |
| 15 | Sidebar bottom items are pinned to viewport bottom and never require scrolling | FAILED | Mobile drawer wraps SidebarNav in overflow-y-auto — flex-1 spacer cannot pin bottom items in scrollable container. User confirmed during human checkpoint. |
| 16 | End Session button requires a confirmation dialog before proceeding | FAILED | session-workspace.tsx handleEndSession() calls endSession() directly — no confirmation dialog. User confirmed during human checkpoint. |
| 17 | Dashboard session dropdown is visually prominent enough to be immediately discoverable | FAILED | DashboardSessionDropdown is a bare Select in max-w-sm with no visual treatment. User confirmed during human checkpoint that it is not sufficiently prominent. |

**Score:** 14/17 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/dashboard/sidebar-nav.tsx` | Simplified sidebar without Activities section | VERIFIED | No activitiesSection, no NavSection, no Zap/Trophy/BarChart3 imports |
| `src/components/bracket/bracket-card.tsx` | Card title with line-clamp-2 | VERIFIED | line-clamp-2 on h3, title={renameValue} attribute present |
| `src/components/poll/poll-card.tsx` | Card title with line-clamp-2 | VERIFIED | line-clamp-2 on h3, title={renameValue} attribute present |
| `src/lib/dal/bracket.ts` | getBracketsBySessionDAL function | VERIFIED | Exported at line 837 with Prisma query |
| `src/lib/dal/class-session.ts` | getSessionWithActivities and migrateOrphanActivities | VERIFIED | Both exported with full implementations |
| `src/lib/dal/poll.ts` | duplicatePollDAL with targetSessionId | VERIFIED | Parameter present at line 322 |
| `src/components/teacher/session-workspace.tsx` | Client component: tabbed session workspace | VERIFIED | 285 lines, 'use client', exports SessionWorkspace, all three tabs, header, CTAs |
| `src/app/(dashboard)/sessions/[sessionId]/page.tsx` | Server component fetching session with activities | VERIFIED | Imports and calls getSessionWithActivities and getTeacherSessions |
| `src/components/teacher/session-picker-dialog.tsx` | Reusable dialog for selecting a session | VERIFIED | 116 lines, exports SessionPickerDialog with full dialog implementation |
| `src/components/dashboard/dashboard-session-dropdown.tsx` | Dropdown to jump to an active session from dashboard | VERIFIED (functional) | File exists, 46 lines, Select-based dropdown; visual prominence is gap (Gap 3) |
| `src/components/shared/card-context-menu.tsx` | Extended context menu with Move and Duplicate to session options | VERIFIED | Contains "Move to session..." and "Duplicate to session..." items |
| `src/components/ui/tabs.tsx` | shadcn Tabs component installed | VERIFIED | File exists (installed via shadcn) |
| `src/components/ui/select.tsx` | shadcn Select component installed | VERIFIED | File exists (installed via shadcn) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `mobile-nav.tsx` | `sidebar-nav.tsx` | renders `<SidebarNav />` | WIRED | Line 105: `<SidebarNav />` inside drawer |
| `sessions/[sessionId]/page.tsx` | `class-session.ts` | getSessionWithActivities call | WIRED | Line 3 import, line 23 call |
| `sessions/[sessionId]/page.tsx` | `class-session.ts` | getTeacherSessions for sessions prop | WIRED | Line 3 import, line 24 call |
| `session-workspace.tsx` | `bracket-card.tsx` | BracketCard component | WIRED | Import line 9, usage lines 221-227 with sessions prop threaded |
| `session-workspace.tsx` | `poll-card.tsx` | PollCard component | WIRED | Import line 10, usage lines 253-259 with sessions prop threaded |
| `card-context-menu.tsx` | `session-picker-dialog.tsx` | opens dialog on menu item click | WIRED | Import line 25, SessionPickerDialog rendered lines 321, 331 |
| `shell.tsx` | `dashboard-session-dropdown.tsx` | renders dropdown in dashboard | WIRED | Import line 9, rendered lines 134-142 |
| `shell.tsx` | `class-session.ts` | migrateOrphanActivities call | WIRED | Import line 2, call line 24 |
| `actions/bracket.ts` | `dal/bracket.ts` | duplicateBracketDAL with targetSessionId | WIRED | Schema has targetSessionId, passed to DAL at line 402 |
| `actions/poll.ts` | `dal/poll.ts` | duplicatePollDAL with targetSessionId | WIRED | Schema has targetSessionId, passed to DAL at line 397 |

---

### Requirements Coverage

Requirements D-01 through D-18 are defined in `.planning/phases/04-restructure-teacher-dashboard-navigation-to-session-first-workflow/04-CONTEXT.md`. There is no separate REQUIREMENTS.md file in this project. Verification is against CONTEXT.md decisions.

| Requirement | Plan | Description | Status | Evidence |
|-------------|------|-------------|--------|----------|
| D-01 | 04-01 | Remove Activities section from sidebar | SATISFIED | sidebar-nav.tsx: only Dashboard/Sessions/Archived + bottomNavItems |
| D-02 | 04-01 | Mobile drawer mirrors desktop sidebar | SATISFIED | mobile-nav.tsx renders SidebarNav directly |
| D-03 | 04-01 | /activities, /brackets, /polls redirect; detail pages preserved | SATISFIED | All three list pages redirect('/sessions'); detail dirs exist |
| D-04 | 04-03 | Create from within session context with sessionId param | SATISFIED | CTAs link to /brackets/new?sessionId= and /polls/new?sessionId= |
| D-05 | 04-01 | Archived sessions stay as top-level sidebar item | SATISFIED | sidebar-nav.tsx: Archived item with href=/sessions/archived |
| D-06 | 04-02 | Sessions sorted active-first then ended by recency | SATISFIED | class-session.ts lines 127-137: sort implementation with active-first logic |
| D-07 | 04-03 | Session detail as tabbed workspace | SATISFIED | session-workspace.tsx: Tabs with brackets/polls/students |
| D-08 | 04-03 | Prominent session header with editable name, code, copy, QR, badge, counts | SATISFIED | session-workspace.tsx: all header elements present |
| D-09 | 04-03 | Default tab = most recently updated activity type | SATISFIED | page.tsx lines 40-46: server-side comparison of latestBracket vs latestPoll updatedAt |
| D-10 | 04-03 | Students tab reuses existing StudentRoster | SATISFIED | session-workspace.tsx lines 274-280: StudentRoster rendered in students tab |
| D-11 | 04-03 | Bracket/poll cards reuse BracketCard/PollCard with full context menus | SATISFIED | session-workspace.tsx: BracketCard and PollCard rendered in respective tabs |
| D-12 | 04-01 | Fix card title truncation to 2 lines | SATISFIED | Both cards use line-clamp-2 with title attribute |
| D-13 | 04-02/04-04 | Orphan activities migrate to General session | SATISFIED | migrateOrphanActivities implemented; shell.tsx calls it on dashboard load |
| D-14 | 04-04 | "Move to session..." context menu option | SATISFIED | card-context-menu.tsx: "Move to session..." item, handleMoveToSession handler |
| D-15 | 04-04 | "Duplicate to session..." context menu option | SATISFIED | card-context-menu.tsx: "Duplicate to session..." item, targetSessionId on duplicate actions |
| D-16 | 04-04 | Dashboard uses dropdown session selector | SATISFIED (functional) | DashboardSessionDropdown exists and is wired; visual prominence gap exists |
| D-17 | 04-04 | No ended/archived sessions on dashboard | SATISFIED | shell.tsx line 26: `activeSessions = sessions.filter(s => s.status === 'active')` — only active passed to dropdown |
| D-18 | 04-04 | Keep welcome message, plan/usage card, Create Session CTA | SATISFIED | shell.tsx: "Welcome back" heading, Plan & Usage card, Create Session link all present |

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `session-workspace.tsx` line 97-104 | handleEndSession() fires destructive action without confirmation | Blocker | Ending a session is irreversible — teachers can accidentally end live sessions |
| `mobile-nav.tsx` line 104 | overflow-y-auto wrapper around SidebarNav breaks flex-1 bottom pinning | Warning | Bottom nav items scroll away on mobile — usability regression for Analytics/Billing/Profile |
| `dashboard-session-dropdown.tsx` | Bare Select with no visual treatment | Warning | Primary navigation mechanism not discoverable — defeats purpose of D-16 |

---

### Behavioral Spot-Checks

Step 7b skipped for route-redirect and UI-only checks — no runnable entry points accessible without server.

Key functional wiring confirmed statically:
- migrateOrphanActivities: called in shell.tsx before return, uses prisma.$transaction for atomicity
- getSessionWithActivities: prisma.classSession.findFirst with full include (brackets, polls, participants, _count) — real DB query
- DashboardSessionDropdown: onValueChange calls router.push('/sessions/${value}') — navigation is wired

---

### Human Verification Required

No additional human verification items beyond the three gaps already identified via the human checkpoint in Plan 04, Task 3.

---

### Gaps Summary

Three gaps were identified, all surfaced by the developer during the human verification checkpoint in Plan 04-04 Task 3. They are polish/UX completeness issues, not functional regressions — the session-first workflow is functionally correct, but three UX behaviors are incomplete:

**Gap 1 — Sidebar bottom items require scrolling on mobile**
The mobile drawer wraps `<SidebarNav />` in an `overflow-y-auto` container (`mobile-nav.tsx` line 104). `SidebarNav` uses `flex-1` to push Analytics/Billing/Profile to the bottom of the available height, but this only works when the parent has a bounded height (e.g., `h-full`). Inside an `overflow-y-auto` wrapper, the container can grow beyond the viewport, making `flex-1` effectively infinite and causing the bottom items to scroll out of view. Fix: restructure the mobile drawer so navigation items scroll independently from a sticky bottom section.

**Gap 2 — End Session fires without confirmation**
`handleEndSession()` in `session-workspace.tsx` calls `endSession(session.id)` directly on button click. For a destructive, irreversible operation (ending a live class session), this needs a confirmation dialog. Fix: wrap with an AlertDialog component confirming the action before proceeding.

**Gap 3 — Dashboard session dropdown lacks visual prominence**
`DashboardSessionDropdown` renders as a bare `<Select>` in a `max-w-sm` container with a plain `h2` label. The dropdown is the primary entry point for teachers to reach their sessions from the dashboard, but its appearance does not signal this importance. User confirmed it was not immediately discoverable. Fix: add a card wrapper, session icon, or styled button treatment that signals navigability.

These three gaps do not block the core session-first workflow (teachers can still navigate to sessions via the Sessions sidebar item), but they represent UX regressions or safety concerns that should be addressed before the phase is considered complete.

---

_Verified: 2026-04-08T20:30:00Z_
_Verifier: Claude (gsd-verifier)_
