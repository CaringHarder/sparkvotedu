# Phase 31: Reopen Completed Activities - Research

**Researched:** 2026-03-01
**Domain:** Activity lifecycle management -- transitioning completed brackets and closed polls back to a paused state for additional voting
**Confidence:** HIGH

## Summary

Phase 31 implements "Reopen Completed Activities" -- the ability for teachers to bring completed brackets and closed polls back for additional voting. Reopened activities land in a paused state (leveraging Phase 29's pause infrastructure), preserving all existing data while allowing students who haven't yet voted to participate.

This is a codebase-internal feature with no new external libraries. The work spans three layers: (1) DAL/status transition changes to allow `completed -> paused` for brackets and `closed -> paused` for polls, (2) server actions with reopen-specific logic (champion clearing for brackets, matchup status resetting), (3) UI additions -- a "Reopen" menu item in the triple-dot context menu on activity cards and a "Reopen" button on the live dashboard for completed/closed activities, plus broadcast events so student views auto-transition away from completion screens.

The riskiest aspect is bracket reopening because it requires clearing the champion designation and resetting the final round's results -- effectively performing the same database mutations as the undo engine (Phase 30) but triggered from a different entry point. For polls, reopening is simpler since poll votes are preserved and the transition is purely a status change.

**Primary recommendation:** Create `reopenBracketDAL` and `reopenPollDAL` functions that bypass VALID_TRANSITIONS (same pattern as `unarchiveBracketDAL` and the undo engine's `completed -> paused` direct update). Bracket reopen reuses the undo engine's final-round clearing logic. Broadcast `bracket_reopened` / `poll_reopened` events so student realtime hooks refetch state and dismiss celebration/closed screens.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Reopen button placement
- Available in two locations: triple-dot context menu on activity cards AND the live dashboard page
- On activity cards: added as a menu item in the existing triple-dot context menu alongside Edit, Duplicate, Delete
- No confirmation dialog -- reopening lands the activity in paused state, so no votes happen until the teacher explicitly resumes (safe by default)
- Only visible for completed brackets and closed polls in the current active session (archived sessions excluded)

#### Champion & results handling
- Champion designation is cleared when reopening a completed bracket
- Bracket returns to the last completed round, clearing that round's results (functions like a single undo of the final state)
- Poll votes stay visible -- new votes add to existing totals
- Only students who haven't voted yet can vote -- students who already voted remain locked out (reopening is for catching students who missed it, not for revoting)

#### Student transition
- Auto-update via realtime -- celebration/completion screen automatically transitions back to the voting/paused view without requiring a page refresh (consistent with how pause overlay works)
- When a bracket is reopened and lands in paused state, students see the 'needs to cook' paused overlay immediately (consistent with existing pause behavior)
- Students who navigated away from the activity are not pulled back -- if they return to the activity page, they see the updated state
- No limit on how many times an activity can be reopened

#### Reopened state indicators
- No visual distinction -- once reopened, the activity looks and behaves like any other paused activity (clean, no 'Reopened' badge)
- Activity card status changes from 'Completed' to 'Paused' using the existing status badge system

### Claude's Discretion
- Reopen button placement on the live dashboard (where exactly it sits relative to existing controls)
- What already-voted students see when an activity is reopened (results view, waiting state, or voted confirmation)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core (Already in Codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | (existing) | Database queries, `$transaction` for atomic bracket reopen | Already used everywhere; `$transaction` provides rollback on error |
| Zod | (existing) | Input validation for reopen server actions | Pattern matches all other actions |
| Next.js Server Actions | (existing) | `'use server'` action for reopen endpoints | Pattern matches `undoRoundAdvancement`, `updateBracketStatus` |
| Supabase Realtime | (existing) | Broadcast reopen events to student clients | Pattern matches `broadcastBracketUpdate`, `broadcastPollUpdate` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | (existing) | Icon for reopen button (e.g., `RotateCcw`) | Already imported in poll live client for existing reopen button |
| useTransition | (React 19) | Non-blocking UI updates during reopen | Already used in live-dashboard and card-context-menu |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct prisma update (bypass VALID_TRANSITIONS) | Add `completed -> paused` to VALID_TRANSITIONS | Direct update is the established pattern for "reverse" operations (unarchive, undo). Modifying VALID_TRANSITIONS risks allowing unintended transitions through the generic `updateBracketStatusDAL` path |
| New broadcast event type | Reuse existing `bracket_paused` | A `bracket_reopened` event is semantically clearer and lets the student hook differentiate "teacher paused mid-voting" from "teacher reopened a completed bracket" -- important for clearing the celebration screen |

**Installation:** No new packages needed. This is 100% codebase-internal work.

## Architecture Patterns

### Current Status Transition Maps

**Bracket VALID_TRANSITIONS** (from `src/lib/dal/bracket.ts:604-610`):
```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['active', 'completed', 'archived'],
  active: ['paused', 'completed', 'archived'],
  paused: ['active', 'completed', 'archived'],
  completed: ['archived'],  // <-- Need: completed -> paused (via direct update)
  archived: [],
}
```

**Poll VALID_POLL_TRANSITIONS** (from `src/lib/dal/poll.ts:4-10`):
```typescript
const VALID_POLL_TRANSITIONS: Record<string, string[]> = {
  draft: ['active', 'archived'],
  active: ['paused', 'closed', 'archived'],
  paused: ['active', 'closed', 'archived'],
  closed: ['archived', 'draft'],  // <-- Need: closed -> paused (via direct update)
  archived: [],
}
```

**Key insight:** Neither transition map includes `completed/closed -> paused`. This is intentional -- the generic `updateBracketStatusDAL` / `updatePollStatusDAL` should not allow arbitrary reopening. Instead, reopen uses **dedicated DAL functions with direct prisma updates**, matching the established patterns:
- `unarchiveBracketDAL`: `archived -> completed` via direct update (bypasses VALID_TRANSITIONS)
- `undoRoundAdvancement`: `completed -> paused` via direct update (bypasses VALID_TRANSITIONS)

### Pattern 1: Bypass VALID_TRANSITIONS for Reverse Operations
**What:** Dedicated DAL functions that use `prisma.bracket.update` / `prisma.poll.update` directly instead of going through the transition-validated `updateBracketStatusDAL`
**When to use:** Any "backward" status transition that has a specific entry point and validation logic
**Example (from undo engine, `src/actions/bracket-advance.ts:402-409`):**
```typescript
// If bracket was completed, transition to paused via direct update
// (completed -> paused is not in VALID_TRANSITIONS, same pattern as unarchiveBracketDAL)
if (bracket.status === 'completed') {
  await prisma.bracket.update({
    where: { id: bracketId },
    data: { status: 'paused' },
  })
  broadcastBracketUpdate(bracketId, 'bracket_paused', {}).catch(console.error)
}
```

### Pattern 2: Bracket Reopen = Undo Final Round + Status Change
**What:** Reopening a completed bracket is functionally identical to undoing the final round -- clear the final round's winners, delete votes, clear propagated entrants, then set status to paused
**When to use:** When the bracket is in `completed` status and teacher clicks Reopen
**Implementation approach:** The undo engine already has per-type functions (`undoRoundSE`, `undoRoundRR`, `undoRoundDE`, `undoRoundPredictive`) that handle all the matchup cleanup. Reopen can either:
1. **Call the undo functions directly** -- determine the final round, call the appropriate `undoRound*` function, then set status to paused
2. **Extract shared logic** into a helper -- if undo functions have undo-specific side effects that aren't needed for reopen

Option 1 is simpler and preferred. The undo functions take `(bracketId, round)` and handle all cleanup atomically in a `$transaction`. The reopen action just needs to:
1. Determine the final round via `getMostRecentAdvancedRound(bracketId, bracketType)`
2. Call the appropriate `undoRound*` function
3. Set bracket status to `paused` (if the undo function doesn't already handle this)

**Critical detail:** The undo engine (`undoRoundAdvancement` server action) already handles `completed -> paused` status transition (line 404). But it also has round validation (the requested round must match `getMostRecentAdvancedRound`). The reopen action doesn't need the teacher to specify a round -- it always undoes the final round. So the reopen action can call the undo engine functions directly without the round validation layer.

### Pattern 3: Poll Reopen = Pure Status Change
**What:** Reopening a closed poll is a simple status transition from `closed` to `paused` with no data mutations
**When to use:** When a poll is in `closed` status and teacher clicks Reopen
**Key difference from brackets:** Poll votes are preserved intact. The poll was collecting votes, teacher closed it, now they want to collect more. No vote data needs to change. Only the status field changes.
**Existing code note:** The poll live dashboard (`src/app/(dashboard)/polls/[pollId]/live/client.tsx:188-199`) already has a "Reopen" button, but it transitions `closed -> draft` instead of `closed -> paused`. This needs to change to `closed -> paused`.

### Pattern 4: Broadcast for Student View Transitions
**What:** Broadcast a reopen event so student realtime hooks refetch and dismiss completion screens
**When to use:** After any reopen operation
**Bracket:** Use `broadcastBracketUpdate(bracketId, 'bracket_reopened', {})` -- the `useRealtimeBracket` hook already refetches on any `bracket_update` event and tracks `bracketStatus`. When the refetch returns `status: 'paused'`, the hook sets `bracketStatus = 'paused'`, which triggers the PausedOverlay and hides the celebration screen.
**Poll:** Use `broadcastPollUpdate(pollId, 'poll_reopened')` -- the `useRealtimePoll` hook already refetches on any `poll_update` event and tracks `pollStatus`.

### Pattern 5: Activity Card Context Menu Extension
**What:** Add a "Reopen" menu item to the `CardContextMenu` component
**Where:** `src/components/shared/card-context-menu.tsx`
**Condition:** Only visible when `status === 'completed'` (brackets) or `status === 'closed'` (polls) AND the activity is in the current active session (not archived)
**Example pattern (existing menu items):**
```typescript
// The menu already has: Rename, Edit, Copy Link, Duplicate, Archive, Delete
// Add Reopen between Copy Link and Duplicate (or after Duplicate, before separator)
{isCompleted && (
  <DropdownMenuItem disabled={isPending} onSelect={handleReopen}>
    <RotateCcw className="h-4 w-4" />
    Reopen
  </DropdownMenuItem>
)}
```

### Anti-Patterns to Avoid
- **Modifying VALID_TRANSITIONS to include `completed -> paused`:** This would allow any caller of `updateBracketStatusDAL` to reopen brackets without the required data cleanup (champion clearing, final round reset). The transition must go through the dedicated reopen function.
- **Creating a new "reopened" status:** The user explicitly decided against visual distinction. Once reopened, the activity IS paused -- no need for a separate status value.
- **Clearing all votes on reopen:** Only the final round's results are cleared for brackets. All previous rounds and their votes are preserved. For polls, NO votes are cleared.

### Recommended Structure
```
src/
├── lib/dal/bracket.ts          # Add reopenBracketDAL function
├── lib/dal/poll.ts             # Add reopenPollDAL function
├── actions/bracket.ts          # Add reopenBracket server action
├── actions/poll.ts             # Add reopenPoll server action (or modify existing)
├── lib/realtime/broadcast.ts   # Add 'bracket_reopened' and 'poll_reopened' event types
├── components/shared/
│   └── card-context-menu.tsx   # Add Reopen menu item
├── components/teacher/
│   └── live-dashboard.tsx      # Add Reopen button for completed brackets
└── app/(dashboard)/polls/[pollId]/live/
    └── client.tsx              # Change existing Reopen from closed->draft to closed->paused
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bracket final round detection | Custom matchup traversal | `getMostRecentAdvancedRound(bracketId, bracketType)` from `advancement.ts` | Already handles SE, DE, RR, predictive detection correctly |
| Bracket round result clearing | Custom matchup reset logic | `undoRoundSE/RR/DE/Predictive` from `advancement.ts` | Already handles cascade cleanup, vote deletion, entrant clearing atomically |
| Realtime student notification | Custom WebSocket logic | `broadcastBracketUpdate` / `broadcastPollUpdate` from `broadcast.ts` | Established pattern with REST-based Supabase broadcast |
| Status transition validation | Manual status checks | Dedicated DAL functions with explicit status guard | Pattern matches `unarchiveBracketDAL`, keeps reverse transitions controlled |

**Key insight:** The undo engine (Phase 30) already solves the hardest part of bracket reopening -- clearing a round's results with proper cascade. Reopen should compose with those functions, not duplicate them.

## Common Pitfalls

### Pitfall 1: Forgetting to Clear Champion Designation on Bracket Reopen
**What goes wrong:** The bracket status changes to paused but the final matchup still has a winnerId, making the bracket appear both paused and complete
**Why it happens:** Bracket completion is determined by `isBracketComplete` checking for a winnerId on the highest-round matchup. If you only change the status without clearing the final round, the completion check still returns true.
**How to avoid:** Always call the appropriate `undoRound*` function as part of bracket reopen. This clears winnerId on the final matchup, which makes `isBracketComplete` return null.
**Warning signs:** `isBracketComplete` returns non-null after reopen; celebration screen re-triggers on student side.

### Pitfall 2: Poll Reopen Landing in Draft Instead of Paused
**What goes wrong:** The existing "Reopen" button on the poll live dashboard transitions `closed -> draft`, which removes the poll from student views entirely
**Why it happens:** The current implementation (`client.tsx:192`) calls `updatePollStatus({ pollId, status: 'draft' })`. The VALID_POLL_TRANSITIONS map allows `closed -> draft`.
**How to avoid:** Change the target status from `'draft'` to `'paused'`. Since `closed -> paused` is not in VALID_POLL_TRANSITIONS, use a dedicated `reopenPollDAL` function with direct prisma update.
**Warning signs:** Students see the poll disappear from their activity list instead of seeing the paused overlay.

### Pitfall 3: Student Celebration Screen Not Dismissing After Reopen
**What goes wrong:** Students who are still on the bracket page with the celebration screen visible don't see the paused overlay after reopen
**Why it happens:** The `useRealtimeBracket` hook sets `bracketCompleted = true` on `bracket_completed` events and this state is sticky (never reset to false). If the refetch returns `status: 'paused'`, the hook updates `bracketStatus` but `bracketCompleted` may still be true.
**How to avoid:** Two approaches:
1. When refetching state, if `data.status !== 'completed'`, reset `bracketCompleted` to false
2. The student bracket page conditionally renders celebration vs voting based on bracket status from the hook. If `bracketStatus === 'paused'`, show PausedOverlay regardless of `bracketCompleted` flag.

The second approach is safer and already partially implemented: the student bracket page shows the PausedOverlay based on `bracketStatus === 'paused'`. The z-index of PausedOverlay (z-50) matches the CelebrationScreen (z-50), but the celebration screen might take precedence. The fix is to ensure PausedOverlay is rendered AFTER/OVER the celebration screen, or to add a `bracketCompleted = false` reset in the hook.

**Recommended fix:** Add a reset in `useRealtimeBracket.ts` -- when refetch returns `data.status !== 'completed'`, set `setBracketCompleted(false)`. This is the cleanest approach and handles the root cause.

### Pitfall 4: "Only New Students Can Vote" Enforcement for Polls
**What goes wrong:** After reopening a poll, students who already voted can vote again, defeating the purpose of reopening (which is for catching latecomers)
**Why it happens:** By default, polls with `allowVoteChange: true` use upsert for votes, meaning any student can re-submit. Even with `allowVoteChange: false`, the check only verifies if an existing vote exists.
**How to avoid:** The existing vote guard already handles this. When `allowVoteChange: false`, the server action checks for an existing vote and returns "Vote already submitted (changes not allowed)". When `allowVoteChange: true`, votes are upserted -- the student can change their vote (which is the expected behavior for that setting). The real enforcement is at the poll's `allowVoteChange` setting level, not at the reopen level.
**Important nuance:** The user decision says "Only students who haven't voted yet can vote -- students who already voted remain locked out." For polls with `allowVoteChange: true`, this means we need to add special handling: check if this participant has an existing vote AND the poll was reopened, then reject. However, this would require tracking "was this poll reopened" state. The simpler approach: when reopening a poll, temporarily set `allowVoteChange = false` if it was `true`. But this changes the teacher's original intent. **Recommendation:** For polls, the "already voted students locked out" behavior maps to `allowVoteChange: false`. When reopening, we should enforce this by setting `allowVoteChange = false` as part of the reopen operation, regardless of the original setting. If the teacher wants to allow vote changes after reopen, they can re-enable it via the settings editing feature (Phase 32).

### Pitfall 5: Bracket Reopen for Different Bracket Types
**What goes wrong:** Using SE undo logic for an RR or DE bracket, causing incorrect matchup cleanup
**Why it happens:** Each bracket type has unique final-round semantics (SE: single final matchup, DE: grand finals with potential reset match, RR: all matchups decided = complete, Predictive: resolution + reveal state)
**How to avoid:** Route through the correct `undoRound*` function based on `bracket.bracketType`, using `getMostRecentAdvancedRound` to determine the target round. This is the same dispatch pattern used by `undoRoundAdvancement` in `bracket-advance.ts:431-450`.
**Warning signs:** RR bracket reopen clears wrong matchups; DE reopen leaves stale reset match.

### Pitfall 6: Missing Paused Status Color in Activity Cards
**What goes wrong:** Reopened activities show with the default gray badge instead of a distinct "Paused" color
**Why it happens:** The `statusColors` map in `activities-list.tsx:240-246` doesn't include a `paused` entry. It falls back to `statusColors.draft` (gray).
**How to avoid:** Add a `paused` entry to the `statusColors` map (e.g., amber or yellow to match the paused banner). This may already have been addressed in Phase 29 but needs verification.

## Code Examples

### Bracket Reopen DAL Function
```typescript
// Source: Pattern from unarchiveBracketDAL (bracket.ts:561-579) + undoRoundAdvancement (bracket-advance.ts:402-409)
export async function reopenBracketDAL(
  bracketId: string,
  teacherId: string
) {
  const bracket = await prisma.bracket.findFirst({
    where: { id: bracketId, teacherId, status: 'completed' },
    select: { id: true, bracketType: true, sessionId: true },
  })

  if (!bracket) {
    return { error: 'Bracket not found or not completed' }
  }

  // Determine the final round to undo
  const finalRound = await getMostRecentAdvancedRound(bracketId, bracket.bracketType)
  if (!finalRound) {
    return { error: 'No advanced rounds found' }
  }

  // Dispatch to type-specific undo engine (clears winners, votes, cascades)
  switch (bracket.bracketType) {
    case 'single_elimination':
      await undoRoundSE(bracketId, finalRound.round)
      break
    case 'round_robin':
      await undoRoundRR(bracketId, finalRound.round)
      break
    case 'double_elimination':
      await undoRoundDE(bracketId, finalRound.round, finalRound.region!)
      break
    case 'predictive':
      await undoRoundPredictive(bracketId, finalRound.round)
      break
  }

  // Transition status: completed -> paused (bypasses VALID_TRANSITIONS)
  await prisma.bracket.update({
    where: { id: bracketId },
    data: { status: 'paused' },
  })

  return { success: true, sessionId: bracket.sessionId }
}
```

### Poll Reopen DAL Function
```typescript
// Source: Pattern from unarchivePollDAL (poll.ts:366-384)
export async function reopenPollDAL(
  pollId: string,
  teacherId: string
) {
  const poll = await prisma.poll.findFirst({
    where: { id: pollId, teacherId, status: 'closed' },
    select: { id: true, sessionId: true },
  })

  if (!poll) {
    return { error: 'Poll not found or not closed' }
  }

  // Transition status: closed -> paused (bypasses VALID_POLL_TRANSITIONS)
  // Also set allowVoteChange = false to lock out already-voted students
  const updated = await prisma.poll.update({
    where: { id: pollId },
    data: { status: 'paused', allowVoteChange: false },
  })

  return updated
}
```

### Student Hook Fix for Celebration Dismissal
```typescript
// Source: useRealtimeBracket.ts:112-114 -- add reset when status changes from completed
// In the fetchBracketState callback:
if (data.status === 'completed') {
  setBracketCompleted(true)
} else {
  // Reset bracketCompleted when bracket is no longer completed (e.g., reopened)
  setBracketCompleted(false)
}
```

### Broadcast Event Types Extension
```typescript
// Source: broadcast.ts:80-92 -- add new event types
type BracketUpdateType =
  | 'winner_selected'
  | 'round_advanced'
  | 'matchup_opened'
  | 'bracket_completed'
  | 'voting_opened'
  | 'prediction_status_changed'
  | 'reveal_round'
  | 'reveal_complete'
  | 'results_prepared'
  | 'bracket_paused'
  | 'bracket_resumed'
  | 'round_undone'
  | 'bracket_reopened'  // NEW

type PollUpdateType =
  | 'poll_activated'
  | 'poll_closed'
  | 'poll_archived'
  | 'poll_paused'
  | 'poll_resumed'
  | 'poll_reopened'  // NEW
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Poll reopen: `closed -> draft` | Poll reopen: `closed -> paused` | Phase 31 | Students see paused overlay instead of losing the poll from their view |
| `bracketCompleted` state is sticky (never resets) | Reset `bracketCompleted = false` when status is not 'completed' | Phase 31 | Celebration screen properly dismisses on reopen |
| Reopen only on poll live dashboard | Reopen on both activity card context menu and live dashboard | Phase 31 | Teachers can reopen from any location |

**Already exists (update needed):**
- The poll live dashboard already has a "Reopen" button (`client.tsx:188-199`) but it targets `draft` instead of `paused`. This needs to change to call the new `reopenPoll` server action.

## Open Questions

1. **Predictive bracket reopen: prediction status and revealedUpToRound**
   - What we know: The undo engine resets `predictionStatus` and `revealedUpToRound` when undoing the final predictive round. Reopen would do the same via the undo functions.
   - What's unclear: If a predictive bracket was in `revealing` or `revealed` state before completion, reopening should restore to a pre-reveal state. The undo engine handles this (`undoRoundPredictive` adjusts these fields).
   - Recommendation: Rely on `undoRoundPredictive` to handle this correctly -- it already adjusts `predictionStatus` and `revealedUpToRound` based on the bracket's current state.

2. **Live dashboard page guard for reopened brackets**
   - What we know: The live dashboard page (`brackets/[bracketId]/live/page.tsx:46`) only blocks `draft` status. Paused brackets pass through (decision from Phase 29).
   - What's unclear: Nothing -- this is already correct. A reopened bracket in `paused` status will pass the guard and show the live dashboard with the paused banner.
   - Recommendation: No changes needed to the page guard.

3. **"Already voted" enforcement for brackets (matchup level)**
   - What we know: Bracket votes are cast via `castVoteDAL` which uses upsert (`matchup_participantId` unique constraint). Students who already voted for a matchup would simply overwrite their vote if voting reopens.
   - What's unclear: The user says "students who already voted remain locked out." For brackets, the undo engine deletes all votes from the undone round, so there are no existing votes to check against. This means ALL students (including those who previously voted) can vote fresh on the reopened matchups.
   - Recommendation: This is actually the correct behavior for brackets -- the round is fully reset (votes deleted), so it's a clean slate. The "already voted remain locked out" constraint is primarily about polls where votes are preserved.

## Sources

### Primary (HIGH confidence)
- `src/lib/dal/bracket.ts` -- VALID_TRANSITIONS map, `unarchiveBracketDAL` bypass pattern
- `src/lib/dal/poll.ts` -- VALID_POLL_TRANSITIONS map, `updatePollStatusDAL`, existing `closed -> draft` transition
- `src/actions/bracket-advance.ts` -- `undoRoundAdvancement` with `completed -> paused` direct update pattern
- `src/lib/bracket/advancement.ts` -- `undoRoundSE/RR/DE/Predictive` functions, `getMostRecentAdvancedRound`, `isBracketComplete`
- `src/hooks/use-realtime-bracket.ts` -- `bracketCompleted` state, `bracketStatus` tracking, refetch behavior
- `src/hooks/use-realtime-poll.ts` -- `pollStatus` tracking, poll_update event handling
- `src/components/shared/card-context-menu.tsx` -- triple-dot context menu structure
- `src/components/teacher/live-dashboard.tsx` -- undo button placement, pause toggle, bracket controls
- `src/app/(dashboard)/polls/[pollId]/live/client.tsx` -- existing "Reopen" button (lines 188-199)
- `src/lib/realtime/broadcast.ts` -- BracketUpdateType, PollUpdateType, broadcast functions
- `src/components/student/paused-overlay.tsx` -- "needs to cook" overlay shared by brackets and polls
- `src/components/bracket/celebration-screen.tsx` -- champion celebration screen
- `src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx` -- student bracket page with completion/paused handling
- `src/app/(student)/session/[sessionId]/poll/[pollId]/page.tsx` -- student poll page with closed/paused handling
- `prisma/schema.prisma` -- Bracket model (no explicit championId field; completion determined by highest-round matchup winnerId)

### Secondary (MEDIUM confidence)
- `src/app/(dashboard)/activities/activities-list.tsx` -- status badge colors (missing `paused` entry)
- `src/actions/poll.ts` -- poll status update broadcast pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new packages; 100% codebase-internal work using established patterns
- Architecture: HIGH -- All patterns verified by reading existing code. Undo engine reuse is well-documented.
- Pitfalls: HIGH -- Each pitfall identified from direct code reading with specific file/line references

**Research date:** 2026-03-01
**Valid until:** 2026-03-31 (stable internal codebase patterns)
