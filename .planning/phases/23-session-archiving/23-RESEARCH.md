# Phase 23: Session Archiving - Research

**Researched:** 2026-02-23
**Domain:** Session lifecycle management (archive, recover, permanent delete)
**Confidence:** HIGH

## Summary

Phase 23 adds a three-state session lifecycle: active/ended sessions on the main dashboard, archived sessions on a separate page, and permanent deletion from the archived page. The implementation touches five layers: (1) schema migration adding `archivedAt` to `class_sessions`, (2) DAL functions for archive/unarchive/delete with activity auto-ending, (3) server actions wrapping the DAL, (4) UI components including a three-dot context menu on session cards, confirmation dialogs, and an archived sessions page with search, and (5) student access control blocking join codes for archived sessions.

The codebase already has all the primitives needed: Prisma migrations with hand-edited SQL, Radix UI dropdown menus and dialogs, the DAL-action-component pattern, and existing three-dot context menus on bracket cards. The main complexity is the archive action's side effects (auto-ending active brackets and polls) and the cascade delete logic for permanent deletion (brackets and polls have optional session references without cascade, so they must be explicitly deleted).

**Primary recommendation:** Follow existing patterns exactly -- Prisma migration for `archived_at`, DAL functions mirroring `endSession` pattern, server actions mirroring `class-session.ts`, Radix dropdown menu for the three-dot menu, Radix dialog for confirmations. The archived sessions page is a new route at `/sessions/archived` with a search input following the admin `TeacherFilters` pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Archive interaction
- Archive action lives in a three-dot context menu on each session card (not inline button)
- Archiving requires a confirmation dialog ("Archive this session?")
- Single session archiving only -- no bulk select
- Active sessions can be archived -- auto-end all running activities first, then archive

#### Archived sessions view
- Archived sessions live on a separate page (not tabs or inline toggle)
- Link to archived sessions page in the dashboard sidebar nav
- Search by session name supported on the archived page
- Sorted by archive date, newest first

#### Permanent delete flow
- Sessions can only be permanently deleted from the archived page (must archive first -- two-step safety net)
- Standard confirmation dialog: "Permanently delete this session? This cannot be undone." with Cancel/Delete
- Delete button styled subtly, not alarming red -- appropriate for a classroom tool
- Full cascade delete: session + all participants, polls, brackets, votes -- complete removal

#### Recovery behavior
- Recovered sessions return to the main active session list with a toast notification confirming restoration
- Recovery is instant -- one click, no confirmation dialog (safe, non-destructive action)
- Archived sessions block student access via join code -- "This session is no longer available"

### Claude's Discretion

- Archived session card info density (name, stats, dates -- pick what's useful)
- Whether recovered sessions retain active activities or auto-end them on archive
- Three-dot menu icon and positioning within existing card patterns
- Archived page layout and empty state design
- Confirmation dialog copy and styling details

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 7.3.0 | ORM + schema migration | Already used for all DB access |
| @radix-ui/react-dropdown-menu | 2.1.16 | Three-dot context menu | Already installed, DropdownMenu UI component exists |
| @radix-ui/react-dialog | 1.1.15 | Confirmation dialogs | Already installed, Dialog UI component exists |
| lucide-react | 0.563.0 | Icons (Archive, RotateCcw, Trash2, MoreVertical, Search) | Already used across all components |
| Next.js | 16.1.6 | App router, server components, server actions | Framework |
| zod | 4.3.6 | Input validation in server actions | Already used in student.ts and bracket.ts |

### No New Dependencies Required

This phase requires zero new npm packages. All UI primitives (dropdown menus, dialogs, icons, inputs, buttons, cards, badges) are already installed and wrapped in the project's component library.

## Architecture Patterns

### Recommended Project Structure
```
prisma/
├── schema.prisma                    # Add archivedAt to ClassSession
├── migrations/
│   └── YYYYMMDDHHMMSS_phase23_session_archiving/
│       └── migration.sql            # ALTER TABLE class_sessions ADD COLUMN archived_at

src/
├── lib/dal/
│   └── class-session.ts             # Add: archiveSession, unarchiveSession,
│                                    #       deleteSessionPermanently, getArchivedSessions,
│                                    #       getTeacherSessions (modify to exclude archived)
├── actions/
│   └── class-session.ts             # Add: archiveSession, unarchiveSession,
│                                    #       deleteSessionPermanently, getArchivedSessions
├── app/(dashboard)/
│   ├── sessions/
│   │   ├── page.tsx                 # Modify: add three-dot menu to session cards
│   │   ├── archived/
│   │   │   └── page.tsx             # NEW: Archived sessions page with search
│   │   └── [sessionId]/
│   │       └── session-detail.tsx   # Modify: add archive action to detail view
│   └── dashboard/
│       └── page.tsx                 # No change needed (already filters active only)
├── components/
│   ├── dashboard/
│   │   ├── sidebar-nav.tsx          # Modify: add "Archived" nav link
│   │   └── mobile-nav.tsx           # Uses SidebarNav -- auto-inherits changes
│   └── teacher/
│       ├── session-card-menu.tsx    # NEW: Three-dot dropdown menu component
│       ├── archive-confirm-dialog.tsx  # NEW: Archive confirmation dialog
│       └── delete-confirm-dialog.tsx   # NEW: Permanent delete confirmation dialog
└── app/(student)/
    └── join/[code]/page.tsx         # Modify: handle archived session status
```

### Pattern 1: DAL Function with Ownership Check + Side Effects
**What:** Archive operation that verifies teacher ownership, auto-ends active activities, then sets archivedAt
**When to use:** For the archive action which has cascading side effects
**Example:**
```typescript
// Source: Follows existing endSession pattern from src/lib/dal/class-session.ts
export async function archiveSession(sessionId: string, teacherId: string) {
  const session = await prisma.classSession.findFirst({
    where: { id: sessionId, teacherId },
  })
  if (!session) {
    throw new Error('Session not found or unauthorized')
  }

  // Use transaction to atomically: end activities + archive session
  return prisma.$transaction(async (tx) => {
    // Auto-end active brackets in this session
    await tx.bracket.updateMany({
      where: { sessionId, status: 'active' },
      data: { status: 'completed' },
    })

    // Auto-close active polls in this session
    await tx.poll.updateMany({
      where: { sessionId, status: 'active' },
      data: { status: 'closed' },
    })

    // Archive the session (also end it if still active)
    return tx.classSession.update({
      where: { id: sessionId },
      data: {
        status: 'ended',
        archivedAt: new Date(),
        endedAt: session.endedAt ?? new Date(),
      },
    })
  })
}
```

### Pattern 2: Server Action with Auth + Error Handling
**What:** Server action wrapping DAL with standard auth check and error shape
**When to use:** All three new actions (archive, unarchive, delete)
**Example:**
```typescript
// Source: Follows existing endSession action pattern from src/actions/class-session.ts
'use server'

export async function archiveSession(sessionId: string) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  try {
    await archiveSessionDAL(sessionId, teacher.id)
    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Session not found or unauthorized') {
      return { error: 'Session not found or unauthorized' }
    }
    return { error: 'Failed to archive session' }
  }
}
```

### Pattern 3: Three-Dot Context Menu on Card (Existing Pattern)
**What:** MoreVertical icon button that opens a dropdown menu with actions
**When to use:** Session card overflow actions (archive, end session, etc.)
**Example:**
```typescript
// Source: Follows bracket-card.tsx pattern (src/components/bracket/bracket-card.tsx)
// BUT upgrade to Radix DropdownMenu instead of custom div overlay
// The bracket-card uses a hand-rolled menu; session cards should use Radix DropdownMenu
// which is already installed and wrapped in src/components/ui/dropdown-menu.tsx

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Archive, Trash2 } from 'lucide-react'

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
      <MoreVertical className="h-4 w-4" />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => setShowArchiveConfirm(true)}>
      <Archive className="h-4 w-4" />
      Archive Session
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Pattern 4: Confirmation Dialog (Existing Pattern)
**What:** Radix Dialog with title, description, and Cancel/Confirm buttons
**When to use:** Archive confirmation and permanent delete confirmation
**Example:**
```typescript
// Source: Follows deactivate-dialog.tsx pattern (src/components/admin/deactivate-dialog.tsx)
// Simplified version (no type-to-confirm for archive, just Cancel/Archive)
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Archive this session?</DialogTitle>
      <DialogDescription>
        Archived sessions will be hidden from the main list.
        Students will no longer be able to join. You can recover
        the session at any time from the Archived Sessions page.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
      <Button onClick={handleArchive} disabled={isPending}>
        {isPending ? 'Archiving...' : 'Archive'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Pattern 5: Filtered Query for Session Lists
**What:** Exclude archived sessions from the main session list, fetch only archived for the archive page
**When to use:** getTeacherSessions and getArchivedSessions DAL functions
**Example:**
```typescript
// Modify existing getTeacherSessions to exclude archived
export async function getTeacherSessions(teacherId: string) {
  return prisma.classSession.findMany({
    where: { teacherId, archivedAt: null },  // <-- add filter
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { participants: true } } },
  })
}

// New: get only archived sessions with search
export async function getArchivedSessions(teacherId: string, search?: string) {
  return prisma.classSession.findMany({
    where: {
      teacherId,
      archivedAt: { not: null },
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    orderBy: { archivedAt: 'desc' },
    include: {
      _count: { select: { participants: true, brackets: true, polls: true } },
    },
  })
}
```

### Anti-Patterns to Avoid
- **Soft-delete with status field:** Don't use `status: 'archived'` -- use `archivedAt: DateTime?` instead. This is cleaner because: (a) sessions already have meaningful status values ('active', 'ended'), (b) archivedAt preserves the archive timestamp for sorting, (c) null check is cleaner for filtering than status string matching
- **Deleting brackets/polls via session cascade:** Brackets and polls have OPTIONAL session references (`sessionId: String?`) with NO cascade delete. Deleting a session will NOT auto-delete its brackets and polls. Must explicitly delete them in a transaction.
- **Custom dropdown menu implementation:** Bracket cards use a hand-rolled menu with `useState` + click-outside detection. Use Radix `DropdownMenu` instead -- it's already installed and handles accessibility, keyboard navigation, and click-outside automatically.
- **Toast library for notifications:** No toast library exists in the project. For the "session recovered" notification, use a simple inline success message or a lightweight custom toast pattern, not a new library install.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dropdown context menus | Custom div + useEffect click-outside | Radix DropdownMenu (already installed) | Handles focus management, keyboard nav, screen readers, click-outside, portal rendering |
| Confirmation dialogs | Custom modal overlay with fixed positioning | Radix Dialog (already installed) | Handles focus trap, scroll lock, escape key, overlay click, screen readers |
| Search input with debounce | Custom debounce implementation | Follow TeacherFilters pattern with useRef timeout | Already battle-tested in admin panel, handles cleanup |
| Cascade delete of session relationships | Multiple sequential deletes | Prisma $transaction with explicit deletes | Atomicity -- either everything deletes or nothing does |

**Key insight:** Every UI primitive needed for this phase already exists in the project. The risk is hand-rolling things that are already available.

## Common Pitfalls

### Pitfall 1: Brackets and Polls Don't Cascade on Session Delete
**What goes wrong:** Deleting a ClassSession only cascades to StudentParticipant (which cascades to Vote, PollVote, Prediction). Brackets and Polls have optional `sessionId` with no cascade -- they'll become orphaned records.
**Why it happens:** The schema uses `ClassSession?` (optional relation) for Bracket.session and Poll.session. No `onDelete: Cascade` on these relations.
**How to avoid:** In the `deleteSessionPermanently` DAL function, use a Prisma transaction that explicitly deletes: (1) brackets with their cascading children, (2) polls with their cascading children, (3) the session itself (which cascades to participants and their children).
**Warning signs:** After deleting a session, orphaned brackets/polls remain in the database with a now-invalid `sessionId`.

### Pitfall 2: Active Activities Blocking Archive
**What goes wrong:** Teacher archives a session with live voting in progress. Students see broken state.
**Why it happens:** Session is marked archived but brackets/polls remain in active/voting state.
**How to avoid:** The archive DAL function must atomically: (1) updateMany brackets to 'completed', (2) updateMany polls to 'closed', (3) set session archivedAt. All within a `$transaction`.
**Warning signs:** Student activity grid shows activities for a session that's been archived.

### Pitfall 3: Recovery Session Status Ambiguity
**What goes wrong:** Recovered session has `archivedAt: null` but `status: 'ended'`. Teacher expects it to be usable but it's dead.
**Why it happens:** Archive sets `status: 'ended'` + `archivedAt`, and unarchive only clears `archivedAt`.
**How to avoid:** Decision: recovered sessions return to the "ended" state on the main list. This is correct behavior because activities were auto-ended on archive. The session is recoverable for viewing but not for new activity. Document this clearly.
**Warning signs:** Teacher expects to resume a recovered session but can't add activities.

### Pitfall 4: Student Session Access with Archived Status
**What goes wrong:** Student uses a saved join URL for an archived session and sees confusing error.
**Why it happens:** `findSessionByCode` currently returns any session regardless of archive status. Student gets into a session that's been archived.
**How to avoid:** Add archive check in the join flow. In `join/[code]/page.tsx`, after finding the session, check if `archivedAt` is set and show "This session is no longer available" message with a re-enter code form.
**Warning signs:** Students reaching archived session dashboards via bookmarked join URLs.

### Pitfall 5: Sidebar Nav Link Collision with Sessions Route
**What goes wrong:** The archived sessions page at `/sessions/archived` triggers the "Sessions" nav item highlight.
**Why it happens:** The sidebar nav checks `pathname.startsWith(item.href + '/')` which would match `/sessions/archived` under `/sessions`.
**How to avoid:** This is actually acceptable behavior -- the archived page IS under the sessions domain. But consider whether to add it as a dedicated nav item or keep it as a sub-route. Per user decision, it should be a dedicated sidebar nav link.
**Warning signs:** Two nav items appearing highlighted simultaneously.

### Pitfall 6: Search on Archived Page for Unnamed Sessions
**What goes wrong:** Sessions without names can't be found by search since `name` is null.
**Why it happens:** Many sessions use the fallback display name "Unnamed Session -- Feb 22" which is computed client-side, not stored in the DB.
**How to avoid:** For the search query, search by `name` field. Unnamed sessions (name=null) won't match search queries. This is acceptable because unnamed sessions have no meaningful text to search by. The default view (no search) shows all archived sessions, and unnamed ones are visible there.
**Warning signs:** Teacher searches for a session they know exists but can't find it because it was unnamed.

## Code Examples

### Migration SQL for archivedAt
```sql
-- Phase 23: Add archived_at column to class_sessions
ALTER TABLE "class_sessions" ADD COLUMN "archived_at" TIMESTAMP(3);

-- Index for efficient filtering of archived vs non-archived sessions
CREATE INDEX "class_sessions_teacher_id_archived_at_idx" ON "class_sessions"("teacher_id", "archived_at");
```

### Prisma Schema Addition
```prisma
model ClassSession {
  id         String    @id @default(uuid())
  code       String
  name       String?
  status     String    @default("active")
  teacherId  String    @map("teacher_id")
  teacher    Teacher   @relation(fields: [teacherId], references: [id])
  createdAt  DateTime  @default(now()) @map("created_at")
  updatedAt  DateTime  @updatedAt @map("updated_at")
  endedAt    DateTime? @map("ended_at")
  archivedAt DateTime? @map("archived_at")   // <-- NEW

  participants StudentParticipant[]
  brackets     Bracket[]
  polls        Poll[]

  @@index([code, status])
  @@index([teacherId, archivedAt])            // <-- NEW index
  @@map("class_sessions")
}
```

### Permanent Delete with Full Cascade (Transaction)
```typescript
export async function deleteSessionPermanently(sessionId: string, teacherId: string) {
  const session = await prisma.classSession.findFirst({
    where: { id: sessionId, teacherId, archivedAt: { not: null } },
  })
  if (!session) {
    throw new Error('Session not found, unauthorized, or not archived')
  }

  return prisma.$transaction(async (tx) => {
    // 1. Delete brackets in this session (cascades to entrants, matchups, votes, predictions)
    const brackets = await tx.bracket.findMany({
      where: { sessionId },
      select: { id: true },
    })
    for (const bracket of brackets) {
      await tx.bracket.delete({ where: { id: bracket.id } })
    }

    // 2. Delete polls in this session (cascades to options, poll_votes)
    const polls = await tx.poll.findMany({
      where: { sessionId },
      select: { id: true },
    })
    for (const poll of polls) {
      await tx.poll.delete({ where: { id: poll.id } })
    }

    // 3. Delete the session (cascades to student_participants, which cascade to votes, poll_votes, predictions)
    await tx.classSession.delete({ where: { id: sessionId } })
  })
}
```

### Session Card with Three-Dot Menu (Sessions Page Integration)
```typescript
// The sessions page currently renders sessions as simple Link cards.
// Phase 23 wraps each card with a relative container and adds a DropdownMenu.
// The three-dot button uses stopPropagation to prevent the card Link from navigating.

<div className="relative">
  <Link href={`/sessions/${session.id}`} className="block">
    <Card className="transition-shadow hover:shadow-md cursor-pointer">
      {/* ... existing card content with pr-8 gap for menu button ... */}
    </Card>
  </Link>
  {/* Positioned absolutely in top-right of card */}
  <div className="absolute right-3 top-3">
    <SessionCardMenu
      session={session}
      onArchived={() => router.refresh()}
    />
  </div>
</div>
```

### Unarchive (Recovery) Action
```typescript
export async function unarchiveSession(sessionId: string, teacherId: string) {
  const session = await prisma.classSession.findFirst({
    where: { id: sessionId, teacherId, archivedAt: { not: null } },
  })
  if (!session) {
    throw new Error('Session not found, unauthorized, or not archived')
  }

  // Simply clear archivedAt -- session returns to main list as "ended"
  return prisma.classSession.update({
    where: { id: sessionId },
    data: { archivedAt: null },
  })
}
```

### Student Join Code Check for Archived Sessions
```typescript
// In src/app/(student)/join/[code]/page.tsx, after findSessionByCode:
const session = await findSessionByCode(code)

if (!session) {
  // ... existing "no session found" error ...
}

// NEW: Check for archived session
if (session.archivedAt) {
  return (
    <div className="...">
      <div className="rounded-lg border border-muted bg-muted/30 p-4 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          This session is no longer available.
        </p>
      </div>
      <div className="mt-4">
        <JoinForm />
      </div>
    </div>
  )
}
```

## Claude's Discretion Recommendations

### Archived Session Card Info Density
**Recommendation:** Show: session name (or fallback), join code (muted), participant count, bracket count, poll count, archive date. This gives teachers enough info to decide whether to recover or delete without navigating into the session.

### Activity Auto-End on Archive
**Recommendation:** Auto-end ALL activities on archive. Active brackets become "completed", active polls become "closed". When recovered, the session returns as "ended" with all activities in their final states. Teachers who want to re-run activities can create a new session. Rationale: archiving means "I'm done with this session" -- resuming mid-activity makes no sense.

### Three-Dot Menu Icon and Positioning
**Recommendation:** Use `MoreVertical` (already used in bracket-card.tsx) positioned in the top-right corner of each session card via absolute positioning. Match the bracket card's subtle styling: `rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground`. Use Radix DropdownMenu for the menu itself.

### Archived Page Layout and Empty State
**Recommendation:** Match the sessions page layout. Header with "Archived Sessions" title + back link to sessions. Search input at top (debounced, matching TeacherFilters pattern). Grid of session cards below. Empty state: centered icon + "No archived sessions" + description text, similar to the dashboard empty state pattern.

### Confirmation Dialog Copy
**Recommendation:**
- **Archive dialog:** Title: "Archive this session?" / Body: "This session and all its activities will be hidden from the main list. Students will no longer be able to join using the class code. You can recover the session at any time." / Buttons: Cancel | Archive
- **Delete dialog:** Title: "Permanently delete this session?" / Body: "This will permanently delete the session, all student data, brackets, polls, and votes. This action cannot be undone." / Buttons: Cancel | Delete (styled subtly per user decision, NOT red -- use default/outline variant)

### Toast for Session Recovery
**Recommendation:** Since no toast library exists and adding one is overhead, implement a minimal inline success notification at the top of the sessions page. Use a URL search param (`?recovered=sessionName`) that the sessions page reads to show a temporary "Session recovered" banner that auto-dismisses after 5 seconds. Alternatively, use `router.refresh()` with a short-lived state variable. The simplest approach: after unarchive succeeds, redirect to `/sessions?restored=1` and show a banner.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `prisma db push` | `prisma migrate` with baseline | Phase 19 (2026-02-21) | Hand-editable SQL migrations |
| Device fingerprinting for students | Name-based identity | Phase 20 (2026-02-21) | Students join with first name |
| Mixed "Activate"/"Go Live" terminology | "Start"/"End" terminology | Phase 22 (2026-02-22) | Consistent action buttons |
| No session naming | Editable session names with blur-to-save | Phase 22 (2026-02-22) | Sessions have optional names |

**Deprecated/outdated:**
- Device-based student identity (replaced by name-based in Phase 20)
- `prisma db push` for schema changes (replaced by `prisma migrate` in Phase 19)

## Open Questions

1. **Recovered session status: "ended" vs "active"**
   - What we know: Archiving auto-ends activities and sets session status to 'ended'. Unarchiving clears archivedAt.
   - What's unclear: Should recovered sessions return as "ended" (status quo, all activities completed) or "active" (session re-opened for new activities)?
   - Recommendation: Return as "ended". A teacher who wants to re-engage students should create a new session. Recovery is for access to data, not for resuming. This is simplest and avoids edge cases with stale join codes.

2. **Toast notification implementation**
   - What we know: No toast library exists. User decision requires a toast for recovery confirmation.
   - What's unclear: Whether to add a toast library (sonner, react-hot-toast) or use a lightweight custom approach.
   - Recommendation: Use a URL search param approach (`/sessions?restored=1`) with a dismissible banner. Avoids new dependency. Can upgrade to a toast library in a future phase if toast notifications are needed elsewhere.

3. **Archived page under sessions route vs separate route**
   - What we know: User decided "separate page" with "link in sidebar nav".
   - What's unclear: Whether to route as `/sessions/archived` (nested under sessions) or `/archived` (top-level).
   - Recommendation: Use `/sessions/archived` -- it's semantically part of the sessions domain and keeps URL hierarchy clean. The sidebar nav link points to this URL.

## Sources

### Primary (HIGH confidence)
- Prisma schema: `prisma/schema.prisma` -- verified all model relationships, cascade behaviors, existing field patterns
- Existing DAL patterns: `src/lib/dal/class-session.ts`, `src/lib/dal/bracket.ts`, `src/lib/dal/poll.ts` -- verified ownership checks, transaction patterns, status transitions
- Existing server action patterns: `src/actions/class-session.ts`, `src/actions/bracket.ts` -- verified auth + error shape pattern
- Existing UI patterns: `src/components/bracket/bracket-card.tsx` (three-dot menu), `src/components/admin/deactivate-dialog.tsx` (confirmation dialog), `src/components/admin/teacher-filters.tsx` (search with debounce)
- Migration patterns: `prisma/migrations/20260221213903_phase19_rls_schema_wipe/migration.sql` -- verified hand-edited SQL approach
- Student join flow: `src/app/(student)/join/[code]/page.tsx`, `src/actions/student.ts` -- verified where session status is checked
- Dashboard and sidebar: `src/components/dashboard/sidebar-nav.tsx`, `src/components/dashboard/shell.tsx` -- verified nav structure and session filtering

### Secondary (MEDIUM confidence)
- Radix UI DropdownMenu API -- verified component exists at `src/components/ui/dropdown-menu.tsx` with full export set
- Radix UI Dialog API -- verified component exists at `src/components/ui/dialog.tsx` with full export set

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All dependencies already installed, all patterns already in use
- Architecture: HIGH -- Every layer follows existing patterns, no new architectural concepts
- Pitfalls: HIGH -- Verified cascade behavior directly from schema, identified the bracket/poll orphan issue from actual FK definitions

**Research date:** 2026-02-23
**Valid until:** 2026-03-25 (stable patterns, no external dependency changes expected)
