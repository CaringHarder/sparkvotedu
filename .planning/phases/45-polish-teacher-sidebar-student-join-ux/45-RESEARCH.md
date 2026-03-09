# Phase 45: Polish Teacher Sidebar & Student Join UX - Research

**Researched:** 2026-03-09
**Domain:** Next.js real-time UI, Supabase broadcast, Prisma schema, React state management
**Confidence:** HIGH

## Summary

Phase 45 addresses four interconnected UX gaps: (1) sidebar live refresh for new student joins and name edits on both poll and bracket live pages, (2) simplifying returning student lookup to first-name-only with disambiguation cards, (3) adding last initial to the teacher edit dialog, and (4) persisting the Fun/Real toggle default to the teacher profile with an explicit "Set as default" action.

The codebase already has all foundational patterns in place -- Supabase broadcast for `participant_joined`, the `ParticipationSidebar` component, `findReturningStudent` DAL function, `TeacherEditNameDialog`, and `nameViewDefault` column on the Teacher model. Every change is an extension of existing patterns, not new architecture. The primary technical challenge is making the sidebar participants list reactive (currently static SSR props) without introducing full page refreshes.

**Primary recommendation:** Create an API endpoint (or server action) to fetch the current participants list, subscribe to `participant_joined` broadcasts on both poll and bracket live pages, and refetch the participants array on each event. This mirrors the existing `fetchPollState` pattern used for vote counts.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Returning student lookup: single first-name field only (remove last initial requirement)
- Flow: enter first name -> search -> show match cards (emoji + fun name + last initial if exists)
- Single match: show confirmation card ("Welcome back! Cosmic Tiger -- That's me!") -- do NOT auto-reclaim silently
- Multiple matches: show all cards for disambiguation, student picks theirs
- "None of these" button redirects to new student 3-step wizard
- Zero matches: primary CTA "Join as new student" + subtle "Oops, I misspelled my name -- try again" link to retry
- Search scope: all of this teacher's non-archived sessions (unchanged)
- Lightweight impersonation guard: if student already has an active participant in THIS session and tries to look up a different name, show a warning. Only check same-session -- no cross-session blocking.
- Toggle persistence: Explicit "Set as default" action -- toggling per-session does NOT auto-save
- "Set as default" link appears next to the Fun/Real segmented control in sidebar header
- Only shows when current view differs from saved default
- Clicking it fires a server action to update teacher profile column
- Feedback: subtle toast ("Default set to Fun view") for 2-3 seconds
- Single global default on Teacher model -- applies to both polls and brackets
- Teacher edit dialog: Two separate fields: First Name input + Last Initial input (max 2 chars)
- Last initial required (at least 1 character) -- teacher must enter one
- Dialog header shows student's emoji + fun name as read-only context
- Edit scope: this session's participant only -- does NOT update other sessions
- Real-time sync to student via existing broadcastParticipantJoined pattern
- Sidebar live refresh: Subscribe to `participant_joined` broadcast on BOTH poll and bracket live pages
- New student tile slides in with brief green/highlight pulse (1-2 seconds), then settles into sort order
- Name edits also reflect in real-time (broadcastParticipantJoined already reused by teacherUpdateStudentName)
- Disconnected students: fade out after 30-60 second timeout instead of staying with grey dot
- Audit and align both poll and bracket live sidebar behavior

### Claude's Discretion
- Exact slide-in animation implementation (framer-motion vs CSS transitions)
- Disconnect fade timeout duration (30s vs 60s -- pick what feels right)
- Toast component choice (existing shadcn toast vs lightweight custom)
- Schema migration approach for nameViewDefault column on Teacher model
- How to detect "already has active participant in this session" for the impersonation guard (localStorage check vs server query)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TCHR-02 | Toggle has a global default (saved to teacher profile) with per-session override | `nameViewDefault` column already exists on Teacher model. Need: server action to update it, "Set as default" UI link, toast feedback. See Architecture Patterns: Toggle Persistence. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x | App router, server actions, API routes | Already in use |
| Prisma | 6.x | ORM, schema, `db push` for migrations | Already in use |
| Supabase Realtime | via `@supabase/supabase-js` | Broadcast channels for live updates | Already in use |
| motion/react | (framer-motion) | Animations for slide-in, fade-out | Already imported in join wizard components |
| zod | 3.x | Server action input validation | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | existing | Component variant styling | Styling toast, cards |
| lucide-react | existing | Icons | Toast close, card indicators |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| motion/react for slide-in | CSS keyframes | motion/react already imported, provides AnimatePresence for mount/unmount -- use it |
| shadcn toast | Custom inline toast | No toast library installed. Custom inline toast (absolute positioned div with auto-dismiss) is simpler than adding a package. Recommend custom. |

**No new packages needed.** Everything required is already in the dependency tree.

## Architecture Patterns

### Sidebar Live Refresh

**Current state:** Both poll and bracket live pages receive `participants` as a static SSR prop. The poll live page subscribes to `participant_joined` but only updates `participantCount` (a number), not the actual participants array. The bracket live page has NO subscription to `participant_joined` at all.

**Pattern: Refetchable participants list**

1. Create an API route `GET /api/sessions/[sessionId]/participants` that returns the current participants array (id, funName, firstName, emoji, lastInitial)
2. In both poll and bracket live pages, store `participants` in React state (initialized from SSR prop)
3. On `participant_joined` broadcast event, fetch the API route and update state
4. This mirrors the existing `fetchPollState` pattern used by `useRealtimePoll`

**Why not router.refresh():** Would cause full page re-render, losing client state (sidebar open/close, selected matchup, etc.)

**Key files to modify:**
- `src/app/api/sessions/[sessionId]/participants/route.ts` (NEW)
- `src/app/(dashboard)/polls/[pollId]/live/client.tsx` -- make participants stateful, subscribe
- `src/components/teacher/live-dashboard.tsx` -- make participants stateful, subscribe to `activities:{sessionId}` channel
- `src/components/teacher/participation-sidebar.tsx` -- accept new participant highlight callback

### Returning Student Lookup (First Name Only)

**Current state:** `ReturningNameEntry` has two fields (firstName + lastInitial). `lookupStudent` server action requires both. `findReturningStudent` DAL function queries by both.

**Pattern: First-name-only lookup with confirmation**

1. New DAL function `findReturningByFirstName(teacherId, firstName)` -- queries across all non-archived sessions, case-insensitive, firstName only
2. New server action `lookupStudentByFirstName({ code, firstName })` -- replaces `lookupStudent` for the returning flow
3. Key behavioral change: single match shows a confirmation card instead of auto-reclaiming silently
4. `ReturningNameEntry` simplified to single input field
5. `ReturningDisambiguation` extended to show lastInitial on cards (e.g., "Alice B")
6. New `ReturningConfirmation` component for single-match confirmation ("Welcome back! That's me!")

**DAL query pattern:**
```typescript
export async function findReturningByFirstName(teacherId: string, firstName: string) {
  return prisma.studentParticipant.findMany({
    where: {
      firstName: { equals: firstName, mode: 'insensitive' },
      banned: false,
      session: { teacherId, archivedAt: null },
    },
    select: { id: true, funName: true, emoji: true, lastInitial: true, sessionId: true, lastSeenAt: true },
    orderBy: { lastSeenAt: 'desc' },
  })
}
```

**Impersonation guard:** Check localStorage for an existing participantId in the current session. If found and the student is searching a different firstName, show a warning banner. This is lightweight and client-only -- no server query needed.

### Toggle Persistence ("Set as Default")

**Current state:** `nameViewDefault` column already exists on Teacher model (String, default "fun"). It's read at SSR time and passed as `teacherNameViewDefault` prop. The toggle is pure React state -- toggling does NOT write to DB.

**Pattern:**
1. New server action `setNameViewDefault(value: 'fun' | 'real')` -- authenticated, updates Teacher.nameViewDefault
2. `NameViewToggle` extended with optional "Set as default" link
3. Link only renders when `currentView !== savedDefault`
4. On click: call server action, show inline toast, update saved default in local state

### Teacher Edit Dialog (Last Initial)

**Current state:** `TeacherEditNameDialog` has a single firstName Input. `teacherUpdateStudentName` server action only updates firstName.

**Pattern:**
1. Add lastInitial field to dialog (max 2 chars, required min 1 char)
2. Extend `teacherUpdateStudentName` to accept optional `lastInitial` parameter
3. Pass `lastInitial` through to the Prisma update
4. Broadcast triggers existing `broadcastParticipantJoined` (already called)

### Disconnect Fade-Out

**Current state:** Disconnected students show with grey dot and 50% opacity immediately.

**Pattern:** Track disconnect timestamps. After 45 seconds (split the 30-60 range), apply CSS transition to `opacity: 0` over 2 seconds, then remove from rendered list. Use a `useEffect` interval that checks disconnect age every 10 seconds.

**Recommendation for disconnect timeout:** 45 seconds. Students frequently lose connection briefly when switching tabs on Chromebooks -- 30s is too aggressive, 60s leaves ghost tiles too long.

### Recommended Project Structure (changes only)
```
src/
  app/api/sessions/[sessionId]/participants/
    route.ts                    # NEW: GET participants for sidebar refresh
  actions/
    student.ts                  # MODIFY: add lookupStudentByFirstName, extend teacherUpdateStudentName
    teacher.ts                  # NEW or MODIFY: add setNameViewDefault server action
  components/teacher/
    participation-sidebar.tsx   # MODIFY: stateful participants, animations, fade-out
    name-view-toggle.tsx        # MODIFY: add "Set as default" link + toast
    teacher-edit-name-dialog.tsx # MODIFY: add lastInitial field
  components/student/join-wizard/
    returning-name-entry.tsx    # MODIFY: single firstName field
    returning-confirmation.tsx  # NEW: single-match "That's me!" card
    returning-disambiguation.tsx # MODIFY: show lastInitial on cards
    join-wizard.tsx             # MODIFY: new flow states for confirmation
  lib/dal/
    student-session.ts          # MODIFY: add findReturningByFirstName
```

### Anti-Patterns to Avoid
- **Don't use router.refresh() for sidebar updates:** Loses all client state (sidebar position, selected matchup, scroll position). Use targeted API fetch + state update.
- **Don't auto-save toggle to DB on every click:** User explicitly said "Set as default" action, not auto-save. Per-session toggle should remain ephemeral.
- **Don't block the returning flow on impersonation guard:** The guard is intentionally lightweight -- show a warning, not a blocker. Students are anonymous by design.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Animation for sidebar tiles | Custom CSS animation timing | `motion/react` (framer-motion) AnimatePresence + layout animations | Already in the bundle, handles mount/unmount gracefully |
| Input validation | Manual regex | Existing `firstNameSchema` + `lastInitialSchema` from zod | Already defined and tested |
| Broadcast signaling | Custom WebSocket | `broadcastParticipantJoined` pattern | Already battle-tested in production |
| Toast notification | Full toast library (sonner/react-hot-toast) | Custom 3-second auto-dismiss div | No toast lib installed; adding one for a single use case is overkill |

## Common Pitfalls

### Pitfall 1: Duplicate Supabase Channel Subscriptions
**What goes wrong:** Multiple components subscribe to the same `activities:{sessionId}` channel, creating duplicate event handlers
**Why it happens:** Poll live page already subscribes in `useRealtimePoll` hook for `participant_joined`. Adding another subscription in the client component would double-fire.
**How to avoid:** Have `useRealtimePoll` return a callback/refetch for participants, OR create a separate hook that the client component calls. Do NOT subscribe to the same channel in two places.
**Warning signs:** Console shows duplicate broadcast events, participants list flickering.

### Pitfall 2: Stale Closure in Participant State Updates
**What goes wrong:** The `participant_joined` handler captures old participants array in closure
**Why it happens:** useEffect captures state at subscription time
**How to avoid:** Use a ref for the fetch function, or use the functional state update pattern `setParticipants(prev => newList)` where newList comes from fresh API fetch.

### Pitfall 3: Race Condition Between SSR Props and Realtime Fetch
**What goes wrong:** Realtime fetch returns before participants state is initialized from SSR props, causing a flash of empty list
**Why it happens:** Subscription connects and fires before React hydration completes
**How to avoid:** Initialize state from SSR props in useState initializer. Only update from API after first successful subscription.

### Pitfall 4: Missing lastInitial in DuplicateCandidate Type
**What goes wrong:** Disambiguation cards can't show lastInitial because the type doesn't include it
**Why it happens:** `DuplicateCandidate` type only has `{ id, funName, emoji }` -- no lastInitial
**How to avoid:** Extend `DuplicateCandidate` type (or create a new type for returning flow) to include `lastInitial: string | null`.

### Pitfall 5: Returning Flow State Machine Complexity
**What goes wrong:** Adding new states (confirmation card, name-only entry) to the wizard reducer creates invalid transitions
**Why it happens:** The wizard uses a discriminated union reducer with 12+ states already
**How to avoid:** Map new states carefully: `returning-name` (simplified) -> `returning-confirm` (NEW, single match) or `returning-disambiguate` (existing, multiple matches). Test all transitions.

## Code Examples

### Participants API Route
```typescript
// src/app/api/sessions/[sessionId]/participants/route.ts
// Source: mirrors pattern from src/app/api/polls/[pollId]/state/route.ts
import { NextResponse } from 'next/server'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params

  // Verify teacher owns this session
  const session = await prisma.classSession.findFirst({
    where: { id: sessionId, teacherId: teacher.id },
    select: { id: true },
  })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const participants = await prisma.studentParticipant.findMany({
    where: { sessionId, banned: false },
    select: { id: true, funName: true, firstName: true, emoji: true, lastInitial: true },
    orderBy: { funName: 'asc' },
  })

  return NextResponse.json({ participants })
}
```

### Set Name View Default Server Action
```typescript
// In src/actions/teacher.ts or src/actions/student.ts
'use server'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { prisma } from '@/lib/prisma'

export async function setNameViewDefault(value: 'fun' | 'real') {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) return { error: 'Not authenticated' }

  await prisma.teacher.update({
    where: { id: teacher.id },
    data: { nameViewDefault: value },
  })

  return { success: true }
}
```

### Inline Toast Component
```typescript
// Lightweight auto-dismiss toast -- no library needed
function InlineToast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3000)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="absolute top-full mt-1 rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-800 shadow-sm"
    >
      {message}
    </motion.div>
  )
}
```

### Single-Match Confirmation Card
```typescript
// Pattern for "Welcome back! That's me!" card
// Mirrors ReturningDisambiguation but for single match with explicit confirm
<div className="flex flex-col items-center gap-4 py-4">
  <p className="text-2xl font-bold">Welcome back!</p>
  <motion.button
    whileTap={{ scale: 0.97 }}
    onClick={() => handleClaim(match)}
    className="flex w-full items-center gap-4 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4"
  >
    <span className="text-3xl">{emojiChar}</span>
    <span className="text-lg font-semibold">{match.funName}</span>
    {match.lastInitial && (
      <span className="text-sm text-muted-foreground">({match.lastInitial}.)</span>
    )}
  </motion.button>
  <p className="text-sm text-muted-foreground">That's me!</p>
  <button onClick={onNoneOfThese} className="text-sm text-muted-foreground underline">
    Not me -- join as new student
  </button>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static SSR participants in sidebar | Refetchable via API on broadcast event | Phase 45 | Sidebar shows new joins in real-time |
| Two-field returning student lookup | Single firstName field with confirmation | Phase 45 | Faster, friendlier UX for returning students |
| Name view toggle is ephemeral only | Persists to teacher profile on explicit action | Phase 45 | TCHR-02 gap closed |
| Teacher edit dialog: firstName only | firstName + lastInitial fields | Phase 45 | Teachers can correct student identity fully |

## Open Questions

1. **Where to put `setNameViewDefault` server action**
   - What we know: Teacher actions are currently in `src/actions/student.ts` (e.g., `teacherUpdateStudentName`)
   - What's unclear: Whether to keep it there or create `src/actions/teacher.ts`
   - Recommendation: Add to existing `src/actions/student.ts` for now -- it's where other teacher-sidebar actions live. Refactoring can happen later.

2. **Bracket live dashboard channel subscription placement**
   - What we know: `live-dashboard.tsx` is a large component (~1900 lines). It uses `useRealtimeBracket` hook for bracket events.
   - What's unclear: Whether to add `participant_joined` subscription inside the component or create a new `useRealtimeParticipants` hook
   - Recommendation: Create a small `useRealtimeParticipants(sessionId)` hook that returns `{ participants, refetch }`. Cleaner separation of concerns.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TCHR-02 | setNameViewDefault persists to Teacher model | unit | `npx vitest run src/actions/__tests__/teacher-name-view.test.ts -t "setNameViewDefault"` | No -- Wave 0 |
| TCHR-02 | lookupStudentByFirstName returns matches without lastInitial | unit | `npx vitest run src/actions/__tests__/student-lookup.test.ts -t "firstName only"` | No -- extend existing |
| TCHR-02 | teacherUpdateStudentName updates lastInitial | unit | `npx vitest run src/actions/__tests__/student-lookup.test.ts -t "lastInitial"` | No -- extend existing |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/actions/__tests__/teacher-name-view.test.ts` -- covers TCHR-02 toggle persistence
- [ ] Extend `src/actions/__tests__/student-lookup.test.ts` -- covers firstName-only lookup

## Sources

### Primary (HIGH confidence)
- Codebase analysis of all referenced files (participation-sidebar.tsx, name-view-toggle.tsx, teacher-edit-name-dialog.tsx, returning-name-entry.tsx, returning-disambiguation.tsx, student-session.ts, student.ts actions, broadcast.ts, use-realtime-poll.ts, live-dashboard.tsx, poll live client.tsx, prisma/schema.prisma)
- CONTEXT.md user decisions from discussion phase

### Secondary (MEDIUM confidence)
- motion/react (framer-motion) AnimatePresence pattern for mount/unmount animations -- verified in existing codebase usage

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in codebase, no new dependencies
- Architecture: HIGH - all patterns are extensions of existing, verified patterns
- Pitfalls: HIGH - identified from direct codebase analysis of current implementation gaps

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable codebase patterns)
