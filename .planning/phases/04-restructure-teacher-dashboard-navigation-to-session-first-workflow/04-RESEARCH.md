# Phase 4: Restructure Teacher Dashboard Navigation to Session-First Workflow - Research

**Researched:** 2026-04-08
**Domain:** Next.js App Router navigation restructuring, UI component refactoring, data migration
**Confidence:** HIGH

## Summary

This phase restructures the teacher dashboard from an activity-centric navigation (Dashboard | Sessions | Archived | Activities > Brackets/Polls) to a session-first navigation (Dashboard | Sessions | Archived | Analytics | Billing | Profile). The Activities section and its sub-items are removed from the sidebar. Sessions become the workspace where teachers manage brackets and polls via a tabbed interface (Brackets | Polls | Students).

The codebase is well-positioned for this change. The `SidebarNav` component uses a clean data-driven nav items array, the `MobileNav` automatically mirrors it by rendering `<SidebarNav />`, and existing `BracketCard`/`PollCard` components with `CardContextMenu` can be reused inside session tabs. Server actions for assigning brackets/polls to sessions (`assignBracketToSession`, `assignPollToSession`) already exist. The main work is: (1) sidebar simplification, (2) session detail page rebuild with tabs, (3) orphan activity migration, (4) new "Move to session" and "Duplicate to session" context menu actions, (5) card title truncation fix, and (6) dashboard dropdown session selector.

**Primary recommendation:** Work in layers -- sidebar/navigation first, then session detail workspace, then orphan migration + new context menu actions, then dashboard dropdown and route cleanup.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Remove the Activities section (and its Brackets/Polls sub-items) from the sidebar entirely. New sidebar: Dashboard | Sessions | Archived | (separator) | Analytics | Billing | Profile
- **D-02:** Mobile hamburger drawer mirrors the new desktop sidebar exactly -- same items, same order
- **D-03:** Top-level `/brackets` and `/polls` list pages -- Claude's discretion on handling (redirect to /sessions or remove). Individual detail pages (`/brackets/[id]`, `/polls/[id]`) must continue to work.
- **D-04:** Bracket/poll creation moves inside session context. Create from within a session detail page with session pre-selected.
- **D-05:** Archived sessions stay as a top-level sidebar item. Dedicated `/sessions/archived` page.
- **D-06:** Sessions on the /sessions page sorted: active first (by last activity), then ended sessions by recency.
- **D-07:** Session detail page becomes a tabbed workspace with tabs: Brackets | Polls | Students
- **D-08:** Prominent session header showing: session name (editable inline), large join code with copy button, status badge, student count, activity count
- **D-09:** Default tab = whichever tab (Brackets or Polls) has the most recently updated item. Falls back to Brackets if session is empty.
- **D-10:** Students tab shows full participant list with fun name, real name, emoji, last seen, ban/unban -- reuse existing session detail component
- **D-11:** Bracket and poll cards in session tabs reuse existing BracketCard/PollCard components with full context menus (rename, duplicate, archive, delete)
- **D-12:** Fix card title truncation -- titles must display fully without ellipsis for reasonable-length titles on both bracket and poll cards
- **D-13:** All brackets/polls must belong to a session (enforce sessionId non-null going forward). Existing orphans migrate to an auto-created "General" session per teacher.
- **D-14:** Add "Move to session..." context menu option on bracket/poll cards -- opens a session picker to reassign
- **D-15:** Add "Duplicate to session..." context menu option on bracket/poll cards -- copies activity to a different session
- **D-16:** Dashboard uses a dropdown session selector (not cards) to choose and navigate to an active session
- **D-17:** No ended/archived sessions on dashboard -- those live exclusively in the Archived sidebar page
- **D-18:** Keep existing welcome message, plan/usage card, and "Create Session" as primary CTA

### Claude's Discretion
- Handling of `/brackets` and `/polls` top-level routes (D-03): redirect strategy vs removal
- Tab URL structure for session detail (e.g., query params `?tab=polls` vs path segments)
- Exact card title max-width/wrapping behavior for D-12 (word-wrap vs multi-line)
- Session dropdown component choice and positioning on dashboard
- Whether to make `sessionId` non-nullable in schema or enforce at application level

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Architecture Patterns

### Current Navigation Structure (to be modified)
```
SidebarNav (sidebar-nav.tsx):
  navItems: Dashboard | Sessions | Archived
  activitiesSection: Activities > Brackets, Polls   <-- REMOVE
  bottomNavItems: Analytics | Billing | Profile
```

### Target Navigation Structure
```
SidebarNav (sidebar-nav.tsx):
  navItems: Dashboard | Sessions | Archived
  (separator)
  bottomNavItems: Analytics | Billing | Profile
```

### Session Detail Workspace Architecture
```
/sessions/[sessionId]/page.tsx (Server Component)
  |-- Fetches: session + participants + brackets + polls
  |-- Serializes dates for client
  |-- Determines default tab based on most recent update
  |
  +-- SessionWorkspace (Client Component)
        |-- Session header (name, code, status, counts)
        |-- Tab bar: Brackets | Polls | Students
        |-- Tab content:
        |     Brackets: BracketCard[] with CardContextMenu + "Create Bracket" CTA
        |     Polls: PollCard[] with CardContextMenu + "Create Poll" CTA
        |     Students: StudentRoster (existing component, reused)
        |-- "Move to session" / "Duplicate to session" dialogs
```

### Pattern 1: Tab State via Query Params
**What:** Use `?tab=brackets|polls|students` query parameter for tab selection [ASSUMED]
**When to use:** When tab state should be URL-shareable and survive page refresh
**Why over path segments:** Session detail is a single page with different views, not separate routes. Query params keep the URL flat and avoid nested route complexity.
```typescript
// In session detail page (server component)
interface SessionDetailPageProps {
  params: Promise<{ sessionId: string }>
  searchParams: Promise<{ tab?: string }>
}

// Pass default tab to client component
const defaultTab = determineDefaultTab(brackets, polls) // 'brackets' | 'polls'
const requestedTab = (await searchParams).tab
const activeTab = requestedTab || defaultTab
```

### Pattern 2: Redirect Strategy for Removed Routes
**What:** Replace `/brackets` and `/polls` list pages with server-side redirects to `/sessions` [ASSUMED]
**When to use:** When removing navigation entry points but keeping deep links alive
**Why redirect vs remove:** Teachers may have bookmarked `/brackets` or `/polls`. Redirecting is graceful. Individual detail pages (`/brackets/[id]`, `/polls/[id]`) remain untouched per D-03.
```typescript
// src/app/(dashboard)/brackets/page.tsx -- replace content with redirect
import { redirect } from 'next/navigation'
export default function BracketsPage() {
  redirect('/sessions')
}
// Same for /polls/page.tsx and /activities/page.tsx
```

### Pattern 3: Orphan Migration via Server Action
**What:** One-time migration to assign orphan brackets/polls to auto-created "General" session
**When to use:** During phase deployment or on first dashboard load
**Why:** D-13 requires all activities belong to a session. Existing data may have `sessionId: null`.
```typescript
// Migration approach: DAL function called from a migration script or server action
async function migrateOrphanActivities(teacherId: string) {
  // 1. Find orphan brackets/polls for this teacher
  // 2. Create "General" session if orphans exist
  // 3. Assign orphans to the General session
}
```

### Pattern 4: Session Picker Dialog
**What:** Reusable dialog component for "Move to session" and "Duplicate to session"
**When to use:** From CardContextMenu for both brackets and polls
```typescript
// SessionPickerDialog props
interface SessionPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentSessionId: string | null
  onSelect: (sessionId: string) => void
  title: string // "Move to session" | "Duplicate to session"
  isPending: boolean
}
```

### Anti-Patterns to Avoid
- **Don't create separate route segments for tabs:** `/sessions/[id]/brackets` and `/sessions/[id]/polls` would require parallel routes or layout nesting. Query params are simpler. [ASSUMED]
- **Don't delete `/brackets/[id]` or `/polls/[id]` routes:** These are deep links to activity detail/edit pages used by "Go Live" buttons, edit links, etc. They must remain.
- **Don't make sessionId non-nullable in Prisma schema immediately:** This would require a blocking migration. Enforce at the application level first -- the migration script handles existing orphans, and creation forms enforce session selection. Schema migration can follow as a separate cleanup step. [ASSUMED]

## Standard Stack

### Core (Already Installed)
| Library | Purpose | Why Standard |
|---------|---------|--------------|
| Next.js 16 App Router | Routing, server/client components | Project standard [VERIFIED: codebase] |
| shadcn/ui | UI primitives (Card, Badge, Button, Dialog, DropdownMenu) | Project standard [VERIFIED: codebase] |
| Prisma v7 | Database ORM, schema, migrations | Project standard [VERIFIED: codebase] |
| Lucide React | Icons | Project standard [VERIFIED: codebase] |
| Framer Motion | Card animations (AnimatePresence) | Project standard [VERIFIED: codebase] |

### Needs Installation
| Library | Purpose | When to Use |
|---------|---------|-------------|
| shadcn/ui Tabs | Tab component for session workspace | D-07 session tabs |
| shadcn/ui Select | Dropdown for dashboard session selector | D-16 dashboard dropdown |

**Note:** The project currently does NOT have `tabs.tsx` or `select.tsx` in `src/components/ui/`. These must be added via `npx shadcn@latest add tabs select`. [VERIFIED: file listing of src/components/ui/]

**Installation:**
```bash
npx shadcn@latest add tabs select
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab component | Custom tab bar | shadcn/ui Tabs | Accessible, keyboard navigable, ARIA compliant |
| Select dropdown | Custom dropdown | shadcn/ui Select | Focus management, mobile support, scroll |
| Session assignment | New assignment API | Existing `assignBracketToSession` / `assignPollToSession` actions | Already built with auth checks [VERIFIED: src/actions/bracket.ts, src/actions/poll.ts] |
| Student roster | New participant list | Existing `StudentRoster` component | Already built with ban/unban, refresh [VERIFIED: session-detail.tsx] |
| Context menus | New menu system | Existing `CardContextMenu` component | Already has rename, duplicate, archive, delete [VERIFIED: card-context-menu.tsx] |

## Existing Assets Inventory

### Components to Reuse (no modification needed)
| Component | Location | Used By |
|-----------|----------|---------|
| `BracketCard` | `src/components/bracket/bracket-card.tsx` | Session Brackets tab |
| `PollCard` | `src/components/poll/poll-card.tsx` | Session Polls tab |
| `CardContextMenu` | `src/components/shared/card-context-menu.tsx` | Both cards (extend with Move/Duplicate) |
| `StudentRoster` | `src/components/teacher/student-roster.tsx` | Session Students tab |
| `EditableSessionName` | `src/components/teacher/editable-session-name.tsx` | Session header |
| `QRCodeDisplay` | `src/components/teacher/qr-code-display.tsx` | Session header |
| `SessionCreator` | `src/components/teacher/session-creator.tsx` | Sessions list page |
| `BracketStatusBadge` | `src/components/bracket/bracket-status.tsx` | Bracket cards |
| `PollStatusBadge` | `src/components/poll/poll-status.tsx` | Poll cards |

### Components to Modify
| Component | Modification | Decisions |
|-----------|-------------|-----------|
| `SidebarNav` | Remove `activitiesSection` block entirely | D-01 |
| `CardContextMenu` | Add "Move to session" and "Duplicate to session" menu items | D-14, D-15 |
| `BracketCard` | Remove `truncate` CSS class on title `<h3>`, use word-wrap | D-12 |
| `PollCard` | Remove `truncate` CSS class on title `<h3>`, use word-wrap | D-12 |
| `DashboardShell` | Replace session cards grid with dropdown selector | D-16, D-17 |

### Server Actions Already Available
| Action | Location | Purpose |
|--------|----------|---------|
| `assignBracketToSession` | `src/actions/bracket.ts` | Move bracket to session (D-14) |
| `assignPollToSession` | `src/actions/poll.ts` | Move poll to session (D-14) |
| `duplicateBracket` | `src/actions/bracket.ts` | Duplicate bracket (extend for D-15) |
| `duplicatePoll` | `src/actions/poll.ts` | Duplicate poll (extend for D-15) |
| `createBracket` | `src/actions/bracket.ts` | Create bracket (needs session context for D-04) |
| `createPoll` | `src/actions/poll.ts` | Create poll (needs session context for D-04) |

### DAL Functions Available
| Function | Location | Purpose |
|----------|----------|---------|
| `getTeacherSessions` | `src/lib/dal/class-session.ts` | Lists non-archived sessions |
| `getSessionWithParticipants` | `src/lib/dal/class-session.ts` | Session + student list |
| `getTeacherBrackets` | `src/lib/dal/bracket.ts` | All brackets (includes session relation) |
| `getPollsByTeacherDAL` | `src/lib/dal/poll.ts` | All polls (includes session relation) |
| `getPollsBySessionDAL` | `src/lib/dal/poll.ts` | Polls for a specific session |

### DAL Functions Needed (New)
| Function | Purpose | Notes |
|----------|---------|-------|
| `getBracketsBySession` | Get brackets for a specific session | No equivalent exists -- `getTeacherBrackets` fetches all [VERIFIED: grep found no match] |
| `getSessionWithActivities` | Get session + brackets + polls + participants in one query | Compose from existing or add new |

## Common Pitfalls

### Pitfall 1: Mobile Nav Breaks After Sidebar Change
**What goes wrong:** MobileNav stops rendering correctly if SidebarNav structure changes
**Why it happens:** MobileNav renders `<SidebarNav />` directly inside the drawer
**How to avoid:** Since MobileNav simply renders the SidebarNav component, it will automatically reflect sidebar changes. No separate mobile work needed for D-02.
**Warning signs:** Test mobile hamburger menu after every sidebar change

### Pitfall 2: Orphan Activities Silently Left Behind
**What goes wrong:** Teachers with brackets/polls that have `sessionId: null` see no activities in the new session-first UI
**Why it happens:** Session workspace only shows activities linked to that session
**How to avoid:** Run orphan migration BEFORE removing /brackets and /polls list pages. Migration must be idempotent (safe to run multiple times).
**Warning signs:** Activities visible on /brackets page but not in any session

### Pitfall 3: Card Title Truncation Fix Causes Layout Shift
**What goes wrong:** Removing `truncate` class makes cards different heights, breaking grid alignment
**Why it happens:** `truncate` enforces single-line. Multi-line titles push content down.
**How to avoid:** Use `line-clamp-2` (two lines max) instead of removing truncation entirely. This shows enough to distinguish "(Week 1)" vs "(Week 2)" while capping height. The BracketCard title currently uses `truncate` on line 161; PollCard uses `truncate` on line 126. [VERIFIED: bracket-card.tsx:161, poll-card.tsx:126]
**Warning signs:** Cards with very long titles dominating the grid

### Pitfall 4: Duplicate-to-Session Doesn't Set Target Session
**What goes wrong:** "Duplicate to session" creates a copy but assigns it to the source session, not the target
**Why it happens:** Existing `duplicateBracket`/`duplicatePoll` actions don't accept a target sessionId parameter
**How to avoid:** Extend duplicate actions to accept an optional `targetSessionId` parameter. If provided, the duplicate is created with that sessionId instead of the source's.
**Warning signs:** Duplicated activity appears in wrong session

### Pitfall 5: Default Tab Calculation Requires Activity Data at Page Level
**What goes wrong:** Default tab cannot be determined without knowing bracket/poll timestamps
**Why it happens:** D-09 says default tab = tab with most recently updated item
**How to avoid:** Fetch brackets AND polls in the session detail server component, compare latest `updatedAt`/`createdAt`, pass `defaultTab` prop to client component
**Warning signs:** Always defaulting to "Brackets" even when polls are more recent

### Pitfall 6: Session Sort Order on /sessions Page
**What goes wrong:** Sessions don't sort correctly per D-06
**Why it happens:** Current `getTeacherSessions` orders by `createdAt desc` -- doesn't distinguish active vs ended or sort by last activity
**How to avoid:** Modify the DAL or sort client-side: active sessions first (by most recent bracket/poll update), then ended sessions by `endedAt` desc
**Warning signs:** Ended sessions appearing above active ones

## Code Examples

### Sidebar Simplification (D-01)
```typescript
// sidebar-nav.tsx -- simplified structure
// Remove the entire activitiesSection constant and its rendering block
const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Sessions', href: '/sessions', icon: Users },
  { label: 'Archived', href: '/sessions/archived', icon: Archive },
]

// bottomNavItems stays the same
const bottomNavItems: NavItem[] = [
  { label: 'Analytics', href: '/analytics', icon: LineChart },
  { label: 'Billing', href: '/billing', icon: CreditCard },
  { label: 'Profile', href: '/profile', icon: User },
]

// In the JSX: remove the entire activitiesSection IIFE block (lines 94-142)
```

### Card Title Fix (D-12)
```typescript
// bracket-card.tsx line 161 -- change from:
<h3 className="truncate text-sm font-semibold text-card-foreground group-hover:text-primary">
// to:
<h3 className="line-clamp-2 text-sm font-semibold text-card-foreground group-hover:text-primary">

// poll-card.tsx line 126 -- change from:
<h3 className="truncate text-sm font-semibold">{renameValue}</h3>
// to:
<h3 className="line-clamp-2 text-sm font-semibold">{renameValue}</h3>
```

### Session Workspace Tab Structure
```typescript
// Using shadcn/ui Tabs component
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

<Tabs defaultValue={defaultTab} className="w-full">
  <TabsList>
    <TabsTrigger value="brackets">
      Brackets ({bracketCount})
    </TabsTrigger>
    <TabsTrigger value="polls">
      Polls ({pollCount})
    </TabsTrigger>
    <TabsTrigger value="students">
      Students ({participantCount})
    </TabsTrigger>
  </TabsList>
  <TabsContent value="brackets">
    {/* BracketCard grid + Create Bracket CTA */}
  </TabsContent>
  <TabsContent value="polls">
    {/* PollCard grid + Create Poll CTA */}
  </TabsContent>
  <TabsContent value="students">
    <StudentRoster ... />
  </TabsContent>
</Tabs>
```

### Orphan Migration
```typescript
// DAL function for orphan migration
export async function migrateOrphanActivities(teacherId: string) {
  const [orphanBrackets, orphanPolls] = await Promise.all([
    prisma.bracket.findMany({
      where: { teacherId, sessionId: null },
      select: { id: true },
    }),
    prisma.poll.findMany({
      where: { teacherId, sessionId: null },
      select: { id: true },
    }),
  ])

  if (orphanBrackets.length === 0 && orphanPolls.length === 0) return null

  // Create "General" session (or find existing)
  let generalSession = await prisma.classSession.findFirst({
    where: { teacherId, name: 'General' },
  })
  if (!generalSession) {
    generalSession = await createClassSession(teacherId, 'General')
  }

  // Assign orphans
  await prisma.$transaction([
    prisma.bracket.updateMany({
      where: { teacherId, sessionId: null },
      data: { sessionId: generalSession.id },
    }),
    prisma.poll.updateMany({
      where: { teacherId, sessionId: null },
      data: { sessionId: generalSession.id },
    }),
  ])

  return generalSession
}
```

## Discretion Recommendations

### D-03: Route Handling for /brackets, /polls, /activities
**Recommendation:** Redirect all three list pages to `/sessions`. Keep detail routes unchanged.
**Rationale:** Bookmarks and browser history may point to these URLs. A redirect is user-friendly. The detail pages (`/brackets/[id]`, `/polls/[id]`) are used by "Go Live" buttons and edit links throughout the app -- they MUST stay. [ASSUMED]

### Tab URL Structure
**Recommendation:** Use query params `?tab=brackets|polls|students`.
**Rationale:** Simpler than nested routes. No layout nesting needed. Tab state survives refresh. Easy to implement with `useSearchParams` on client side. [ASSUMED]

### Card Title Wrapping (D-12)
**Recommendation:** Use `line-clamp-2` (Tailwind) -- allows up to 2 lines before ellipsis. This solves the "(Week 1)" vs "(Week 2)" problem while preventing excessively tall cards.
**Rationale:** Full word-wrap with no limit would cause very long titles to create disproportionately tall cards. Two lines is a good compromise -- most meaningful differentiation appears in the first two lines. [ASSUMED]

### Session Dropdown (D-16)
**Recommendation:** Use shadcn/ui Select component positioned below the welcome section, above the Plan & Usage card.
**Rationale:** Select provides accessibility, keyboard navigation, and consistent styling. Position after welcome message maintains the greeting-first flow. [ASSUMED]

### sessionId Enforcement (D-13)
**Recommendation:** Enforce at application level first (creation forms require session, migration handles orphans). Do NOT change Prisma schema to non-nullable in this phase.
**Rationale:** A schema migration to non-nullable would fail if any null sessionId records exist in production. Application-level enforcement is safer and reversible. Schema migration can be a follow-up cleanup task after confirming all data is migrated. [ASSUMED]

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Activities as navigation category | Sessions as workspace containers | Teachers see context (which class, which code) alongside activities |
| Standalone bracket/poll creation | In-session creation with pre-selected session | Fewer clicks, less cognitive load |
| Optional session assignment | Required session assignment | Data organization, cleaner mental model |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Query params `?tab=` is better than path segments for tabs | Architecture Patterns | Low -- either approach works, query params are simpler |
| A2 | `line-clamp-2` is sufficient for title truncation fix | Common Pitfalls | Low -- can adjust to 3 if needed |
| A3 | Redirect strategy for /brackets and /polls is preferred | Discretion Recommendations | Low -- removal also works but less graceful |
| A4 | Application-level sessionId enforcement is safer than schema change | Discretion Recommendations | Medium -- if orphans slip through, data integrity weakens |
| A5 | shadcn/ui Select is the right component for dashboard dropdown | Discretion Recommendations | Low -- any dropdown works |

## Open Questions

1. **Orphan Migration Timing**
   - What we know: Orphan brackets/polls need to be assigned to a "General" session
   - What's unclear: Should migration run automatically on dashboard load, or as a one-time script/migration?
   - Recommendation: Run as an idempotent check on dashboard load (lazy migration). If teacher has orphans, create "General" session and assign them. This avoids needing a separate deployment step.

2. **Bracket Creation Within Session Context**
   - What we know: `/brackets/new` and `/polls/new` currently accept sessions as a dropdown
   - What's unclear: Should creation pages move to `/sessions/[id]/brackets/new` or keep existing pages with session pre-selected via query param?
   - Recommendation: Keep existing creation pages but pass `?sessionId=xxx` to pre-select and lock the session selector. This reuses existing form components with minimal changes.

3. **"Duplicate to Session" Action Extension**
   - What we know: `duplicateBracket` and `duplicatePoll` exist but don't accept a target sessionId
   - What's unclear: Should we modify existing actions or create new ones?
   - Recommendation: Add optional `targetSessionId` parameter to existing `duplicateBracket`/`duplicatePoll` actions. If provided, override the sessionId on the copy.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified -- this phase is purely code/UI restructuring within the existing Next.js/Prisma stack)

## Sources

### Primary (HIGH confidence)
- Codebase inspection -- sidebar-nav.tsx, mobile-nav.tsx, layout.tsx, shell.tsx, session-detail.tsx
- Codebase inspection -- bracket-card.tsx, poll-card.tsx, card-context-menu.tsx
- Codebase inspection -- bracket.ts actions (assignBracketToSession), poll.ts actions (assignPollToSession)
- Codebase inspection -- prisma/schema.prisma (ClassSession, Bracket, Poll models)
- Codebase inspection -- src/components/ui/ directory listing (no tabs.tsx, no select.tsx)
- Codebase inspection -- DAL functions (class-session.ts, bracket.ts, poll.ts)

### Secondary (MEDIUM confidence)
- shadcn/ui Tabs and Select component APIs [ASSUMED from training data -- verify during implementation]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all components verified in codebase
- Architecture: HIGH -- based on direct code inspection of existing patterns
- Pitfalls: HIGH -- identified from actual code structure and data model
- Discretion areas: MEDIUM -- recommendations are reasonable defaults but user may prefer alternatives

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable codebase, no external dependency risk)
