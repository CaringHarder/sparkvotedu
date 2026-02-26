# Phase 28: RR All-at-Once Completion Fix - Research

**Researched:** 2026-02-26
**Domain:** Round-robin bracket lifecycle, all-at-once pacing, completion detection, celebration chain, teacher live dashboard
**Confidence:** HIGH

## Summary

This phase fixes premature completion in round-robin all-at-once brackets. Through deep investigation of the codebase, multiple interconnected issues have been identified with HIGH confidence:

**Root cause #1 (activation bug):** When a round-robin bracket is activated (`draft -> active`), `updateBracketStatusDAL` in `src/lib/dal/bracket.ts` (line 656-668) only opens round 1 matchups to `voting` status, regardless of pacing mode. For `all_at_once` pacing, ALL matchups across ALL rounds should be opened to `voting` simultaneously. This means students can only see and vote on round 1 matchups, and the teacher must manually advance each round even though the bracket is supposed to be "all at once."

**Root cause #2 (completion detection):** The completion check in `recordResult` (server action in `src/actions/round-robin.ts`, line 51) calls `isRoundRobinComplete` which checks if ALL matchups are decided. This is correct in principle, but combined with root cause #1, completion fires after round 1 is decided because only round 1 matchups are open -- subsequent rounds are still `pending` and never get a chance to be decided before the bracket transitions to completed. The `isBracketComplete` function in `advancement.ts` (line 227-237) correctly checks all matchups, but `isRoundRobinComplete` in `dal/round-robin.ts` (line 249-266) ALSO correctly checks all matchups. The interaction between these two paths and the fact that only round 1 is `voting` creates the premature completion scenario.

**Root cause #3 (celebration chain for RR):** The celebration chain for RR brackets on both teacher and student views works correctly (WinnerReveal countdown -> CelebrationScreen) WHEN `bracketCompleted` fires. The issue is WHEN it fires (too early due to root causes #1/#2), not HOW it fires. The `hasShownRevealRef` guard prevents re-triggering, and the celebration screen has a manual dismiss button. However, there is no "final standings table with champion highlighted" shown after celebration dismisses -- currently, dismissing the celebration simply returns to the normal dashboard view.

**Additional requirements from CONTEXT.md decisions:** Teacher needs to see round progress, be able to decide zero-vote matchups, and the tiebreaking system needs head-to-head as primary tiebreaker (already implemented in `calculateRoundRobinStandings`).

**Primary recommendation:** Fix the activation path to open ALL matchups for `all_at_once` pacing, ensure completion only fires when every matchup across all rounds is decided, add teacher controls for zero-vote matchup resolution, add round progress indicator to teacher dashboard, and show final standings after celebration dismissal.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Students see NO round progress indicators -- they just see matchups and vote
- Teacher live dashboard shows real-time round progress (e.g., "Rounds: 2/3 complete")
- Round status updates live as matchups resolve via existing realtime infrastructure
- Celebration requires manual dismiss -- stays on screen until user taps/clicks
- After celebration dismisses, show final standings table with champion highlighted (both views)
- Celebration is identical on teacher and student views -- same animation and content
- Teacher can see which specific matchups are still awaiting votes in each round
- Teacher should be able to decide a matchup result or mark as tie when no students voted (zero-vote matchups)
- Tie matchups (equal votes) are automatically recorded as ties -- standings use win/loss/tie points
- Head-to-head result is the tiebreaker when teams have identical win/loss/tie records
- Absent students don't block bracket completion -- matchups complete based on votes received
- No minimum vote threshold -- a matchup with any votes (even just 1) can resolve

### Claude's Discretion
- Celebration timing (immediate vs brief pause) -- RECOMMENDATION: Keep existing 2-second delay before WinnerReveal, then manual dismiss on CelebrationScreen. This matches the existing pattern in all other bracket types and provides a moment of anticipation.
- Visual treatment for pending vs resolved matchups on teacher view -- RECOMMENDATION: Use existing matchup card design with status badges (already present: "Upcoming", "Vote!", "Decided", "Tie"). For all-at-once, add a subtle visual distinction between rounds (e.g., round header with decided/total count badge). The `RoundRobinMatchups` component already supports this with its collapsible round sections.
- Stale matchup time-based hints -- RECOMMENDATION: Skip for this phase. The existing `RoundRobinMatchups` component shows "Upcoming" and "Vote!" badges which are sufficient. Time-based hints add complexity without clear value for the core bug fix.
- Secondary tiebreaker beyond head-to-head -- RECOMMENDATION: Use total vote count as secondary tiebreaker (sum of votes received across all matchups). This is lightweight to implement and provides a meaningful signal. If still tied after that, assign equal rank (which `calculateRoundRobinStandings` already does for unresolvable ties).
- Exact round progress format on teacher dashboard -- RECOMMENDATION: Text badge in the top action bar: "Rounds: X/Y complete" where Y is total round count. Lightweight, informational, fits existing layout. For per-round detail, the existing `RoundRobinMatchups` component already shows "X/Y decided" per round header.

### Deferred Ideas (OUT OF SCOPE)
- Force-complete option for individual rounds (teacher override to force-resolve all matchups in a round) -- new capability, future phase
- Student-facing round progress indicators -- not needed for bug fix scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FIX-01 | Round robin all-at-once brackets complete only after all rounds' matchups are decided, not after the first round | Root cause identified: activation only opens round 1; completion detection correct but premature due to partial activation |
| SC-1 | RR all-at-once bracket with multiple rounds does not complete after first round | Fix activation to open ALL matchups for all_at_once pacing |
| SC-2 | Final matchup of final round triggers completion + celebration on both views | Completion chain is correct once all matchups are properly opened |
| SC-3 | Celebration does not loop -- fires once and dismisses cleanly | hasShownRevealRef guard already present in both teacher LiveDashboard and student RRLiveView |
| SC-4 | calculateRoundRobinStandings continues working correctly (non-regression) | Pure function with comprehensive test suite -- no changes needed to the engine |
</phase_requirements>

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App router, server actions, API routes | Project framework |
| React | 19.2.3 | Component state management, hooks | UI framework |
| Prisma | ^7.3.0 | Database queries for matchup/bracket updates | ORM layer |
| @supabase/supabase-js | ^2.93.3 | Realtime broadcast for live updates | Realtime infrastructure |
| motion/react | (current) | Animation for celebration/reveal | Already used for WinnerReveal + CelebrationScreen |
| canvas-confetti | (current) | Confetti effects in CelebrationScreen | Already used |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | (current) | Unit tests for round-robin engine | Testing calculateRoundRobinStandings changes |

No new libraries needed. This is a fix to existing code with UI enhancements.

## Architecture Patterns

### Key Files and Their Roles

```
src/lib/dal/bracket.ts                    # updateBracketStatusDAL -- ROOT CAUSE: only opens round 1
src/lib/dal/round-robin.ts                # isRoundRobinComplete, recordRoundRobinResult, getRoundRobinStandings
src/actions/round-robin.ts                # recordResult -- calls isRoundRobinComplete after each result
src/lib/bracket/advancement.ts            # isBracketComplete -- RR branch checks all matchups
src/lib/bracket/round-robin.ts            # calculateRoundRobinStandings -- pure engine (DO NOT MODIFY)
src/lib/bracket/__tests__/round-robin.test.ts  # Engine tests (add non-regression tests)
src/components/teacher/live-dashboard.tsx  # Teacher view: celebration chain, RR matchup display, action bar
src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx  # Student view: RRLiveView component
src/components/bracket/round-robin-matchups.tsx  # Matchup grid (shared teacher+student)
src/components/bracket/round-robin-standings.tsx  # Standings table (shared)
src/components/bracket/celebration-screen.tsx     # Celebration overlay (shared)
src/components/bracket/winner-reveal.tsx          # Countdown overlay (shared)
src/lib/realtime/broadcast.ts             # Server-side broadcast
src/hooks/use-realtime-bracket.ts         # Client-side realtime subscription
```

### Pattern 1: All-at-Once Activation Fix
**What:** Modify `updateBracketStatusDAL` to check pacing and open all matchups for `all_at_once` mode.
**Where:** `src/lib/dal/bracket.ts`, lines 655-668
**Current code (buggy):**
```typescript
// Auto-open round 1 for round-robin brackets on activation
if (bracket.status === 'draft' && status === 'active' && updated.bracketType === 'round_robin') {
  await prisma.matchup.updateMany({
    where: {
      bracketId: bracket.id,
      roundRobinRound: 1,  // BUG: only opens round 1
      status: 'pending',
    },
    data: { status: 'voting' },
  })
}
```
**Fix pattern:**
```typescript
if (bracket.status === 'draft' && status === 'active' && updated.bracketType === 'round_robin') {
  const pacing = updated.roundRobinPacing ?? 'round_by_round'
  if (pacing === 'all_at_once') {
    // Open ALL matchups for all-at-once pacing
    await prisma.matchup.updateMany({
      where: { bracketId: bracket.id, status: 'pending' },
      data: { status: 'voting' },
    })
  } else {
    // Round-by-round: only open round 1
    await prisma.matchup.updateMany({
      where: { bracketId: bracket.id, roundRobinRound: 1, status: 'pending' },
      data: { status: 'voting' },
    })
  }
  broadcastBracketUpdate(bracketId, 'round_advanced', { round: 1 }).catch(console.error)
}
```

### Pattern 2: Completion Detection (Already Correct)
**What:** `isRoundRobinComplete` in `src/lib/dal/round-robin.ts` already checks ALL matchups for `decided` status.
**Verification:** Once the activation fix opens all matchups, completion will only fire when every matchup across all rounds is decided. No changes needed here.
**Key code (correct):**
```typescript
export async function isRoundRobinComplete(bracketId: string): Promise<string | null> {
  const matchups = await prisma.matchup.findMany({
    where: { bracketId },
    select: { status: true, winnerId: true },
  })
  if (matchups.length === 0) return null
  const allDecided = matchups.every((m) => m.status === 'decided')
  if (!allDecided) return null
  // All decided -- compute standings to find the winner
  const standings = await getRoundRobinStandings(bracketId)
  return standings[0].entrantId
}
```

### Pattern 3: Teacher Decides Zero-Vote Matchups
**What:** Teacher can manually decide a matchup result or mark as tie. This is already partially supported via `recordResult` action which accepts `winnerId: null` for ties.
**Where:** `src/components/bracket/round-robin-matchups.tsx` -- the MatchupCard already has Win/Tie buttons for teacher on voting matchups.
**Gap:** The existing buttons require the matchup to be in `voting` status. For all-at-once, ALL matchups are `voting`, so this already works. The teacher clicks the appropriate "Wins" or "Tie" button on any matchup.

### Pattern 4: Round Progress on Teacher Dashboard
**What:** Show "Rounds: X/Y complete" in the top action bar for RR all-at-once brackets.
**Where:** `src/components/teacher/live-dashboard.tsx`, inside the top bar where round indicators are shown.
**Implementation:** Compute rounds progress from `currentMatchups` grouped by `roundRobinRound`. Count rounds where all matchups are decided.

### Pattern 5: Post-Celebration Final Standings
**What:** After celebration dismisses, show final standings table with champion highlighted.
**Where:** Both teacher LiveDashboard and student RRLiveView.
**Implementation:** When `showCelebration` transitions from true to false (user dismissed), set a `showFinalStandings` flag. Render a full-screen overlay or prominent section with the standings table, highlighting the rank 1 entrant(s).

### Pattern 6: Celebration Manual Dismiss (Already Implemented)
**What:** CelebrationScreen already has a "Continue" button and auto-dismiss after 12 seconds.
**CONTEXT decision:** Celebration requires manual dismiss -- stays on screen until user taps/clicks.
**Gap:** The current CelebrationScreen auto-dismisses after 12 seconds (line 124: `setTimeout(handleDismiss, 12000)`). This should be removed to match the "manual dismiss only" requirement.

### Anti-Patterns to Avoid
- **Do NOT modify `calculateRoundRobinStandings`:** The pure engine function is correct and has comprehensive tests. Changes here would break Phase 24's work.
- **Do NOT add per-round completion checks:** The fix is at the activation level (open all matchups) and completion level (check all matchups). Per-round completion logic would add unnecessary complexity.
- **Do NOT change the broadcast channel structure:** The existing `bracket:{bracketId}` channel works correctly for all bracket types.
- **Do NOT duplicate celebration logic:** Both teacher and student views use the same `CelebrationScreen` component. Keep it unified.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Round-robin standings | Custom sorting/ranking | `calculateRoundRobinStandings()` from Phase 24 | Already handles W/L/T, head-to-head tiebreaking, circular ties |
| Celebration animation | Custom confetti/animation | Existing `CelebrationScreen` + `WinnerReveal` components | Already brand-themed with multi-wave confetti |
| Matchup status transitions | Custom state machine | Prisma updateMany with status filter | Status is a simple string enum, no complex transitions needed |
| Realtime updates | Custom polling/SSE | Existing `useRealtimeBracket` hook + Supabase Broadcast | Already handles transport fallback, batched vote updates |

**Key insight:** The core fix is small (activation path + celebration timing). Most of the work is UI enhancements (round progress, final standings, zero-vote matchup handling) using existing components and patterns.

## Common Pitfalls

### Pitfall 1: Only Fixing Activation Without Verifying Completion
**What goes wrong:** Opening all matchups for all_at_once is necessary but not sufficient. The completion check must also work correctly with the new state.
**Why it happens:** `isRoundRobinComplete` checks ALL matchups, but `recordResult` in `actions/round-robin.ts` calls it after every single matchup result. With all matchups open, completion fires correctly after the final result.
**How to avoid:** Verify end-to-end: activate bracket -> all matchups become voting -> decide all matchups one by one -> completion fires only after the last one -> celebration fires once -> manual dismiss -> final standings shown.
**Warning signs:** Completion fires after a subset of matchups are decided.

### Pitfall 2: Breaking Round-by-Round Pacing
**What goes wrong:** The activation fix for all_at_once inadvertently changes round-by-round behavior.
**Why it happens:** Conditional logic based on pacing mode, but the else branch must remain exactly as-is.
**How to avoid:** Guard the fix with `if (pacing === 'all_at_once')` and keep the round-by-round branch unchanged.
**Warning signs:** Round-by-round brackets open all matchups at once.

### Pitfall 3: Double Celebration or Missing Celebration
**What goes wrong:** Celebration fires twice (once per path) or never fires.
**Why it happens:** Both teacher and student views have multiple paths to trigger celebration (status-transition detection + bracketCompleted fallback + direct completion check).
**How to avoid:** The `hasShownRevealRef` guard prevents double-firing. Ensure this ref is present and working in both teacher LiveDashboard (line 124) and student RRLiveView (line 663).
**Warning signs:** Celebration screen appears twice, or never appears after all matchups are decided.

### Pitfall 4: CelebrationScreen Auto-Dismiss Breaking Manual Dismiss Requirement
**What goes wrong:** CelebrationScreen auto-dismisses after 12 seconds, violating the "manual dismiss only" requirement.
**Why it happens:** Line 124 of celebration-screen.tsx: `dismissTimerRef.current = setTimeout(handleDismiss, 12000)`.
**How to avoid:** Remove the auto-dismiss timer. Keep only the "Continue" button and click-anywhere-to-dismiss behavior.
**Warning signs:** Celebration disappears on its own after 12 seconds.

### Pitfall 5: Standings Table Not Updating After Final Matchup
**What goes wrong:** The post-celebration standings table shows incomplete data because the client hasn't refetched.
**Why it happens:** The standings are computed client-side from `currentMatchups`. If the final matchup result hasn't been reflected in the realtime state when the celebration is dismissed, standings may be stale.
**How to avoid:** Compute standings from `currentMatchups` at render time (already done in both views). Since `useRealtimeBracket` refetches on `bracket_completed` event, the data should be current by the time the user dismisses celebration.
**Warning signs:** Standings show fewer matchups than expected after celebration.

### Pitfall 6: Modifying calculateRoundRobinStandings
**What goes wrong:** Changes to the pure engine function break existing tests and Phase 24 functionality.
**Why it happens:** The function already handles head-to-head tiebreaking correctly. Adding secondary tiebreakers (total votes) is a NEW feature and should be additive, not modifying existing logic.
**How to avoid:** If adding total-vote-count tiebreaker, add it as a new pass after the existing head-to-head resolution, not by modifying the existing sorting logic. Or, better yet, handle it in the standings display layer rather than the engine.
**Warning signs:** Existing round-robin tests fail.

## Code Examples

### Activation Fix (Root Cause #1)

```typescript
// src/lib/dal/bracket.ts, lines 655-668
// BEFORE (buggy):
if (bracket.status === 'draft' && status === 'active' && updated.bracketType === 'round_robin') {
  await prisma.matchup.updateMany({
    where: { bracketId: bracket.id, roundRobinRound: 1, status: 'pending' },
    data: { status: 'voting' },
  })
  broadcastBracketUpdate(bracketId, 'round_advanced', { round: 1 }).catch(console.error)
}

// AFTER (fixed):
if (bracket.status === 'draft' && status === 'active' && updated.bracketType === 'round_robin') {
  const pacing = updated.roundRobinPacing ?? 'round_by_round'
  if (pacing === 'all_at_once') {
    await prisma.matchup.updateMany({
      where: { bracketId: bracket.id, status: 'pending' },
      data: { status: 'voting' },
    })
  } else {
    await prisma.matchup.updateMany({
      where: { bracketId: bracket.id, roundRobinRound: 1, status: 'pending' },
      data: { status: 'voting' },
    })
  }
  broadcastBracketUpdate(bracketId, 'round_advanced', { round: 1 }).catch(console.error)
}
```

### Round Progress Computation (Teacher Dashboard)

```typescript
// src/components/teacher/live-dashboard.tsx -- new useMemo
const rrRoundProgress = useMemo(() => {
  if (!isRoundRobin) return { completed: 0, total: 0 }
  const roundsMap = new Map<number, MatchupData[]>()
  for (const m of currentMatchups) {
    const rr = m.roundRobinRound ?? m.round
    if (!roundsMap.has(rr)) roundsMap.set(rr, [])
    roundsMap.get(rr)!.push(m)
  }
  let completed = 0
  const total = roundsMap.size
  for (const [, matchups] of roundsMap) {
    if (matchups.length > 0 && matchups.every((m) => m.status === 'decided')) {
      completed++
    }
  }
  return { completed, total }
}, [isRoundRobin, currentMatchups])
```

### Teacher Matchup Override (Already Exists)

```typescript
// src/actions/round-robin.ts -- recordResult already supports winnerId: null for ties
// The MatchupCard in round-robin-matchups.tsx already shows:
// - "[Name] Wins" buttons for each entrant
// - "Tie" button
// - "Decide by Votes" button (when votes exist and one leads)
// These are shown when: isTeacher && isVoting && onRecordResult
// For all-at-once, ALL matchups start as voting, so these controls are visible.
```

### Post-Celebration Final Standings

```typescript
// Pattern for both teacher and student views:
// When CelebrationScreen's onDismiss fires:
const [showFinalStandings, setShowFinalStandings] = useState(false)

// In celebration dismiss handler:
onDismiss={() => {
  setShowCelebration(false)
  setRevealState(null)
  setShowFinalStandings(true)  // NEW: show final standings overlay
}}

// Render final standings overlay when active:
{showFinalStandings && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95">
    <div className="max-w-lg w-full p-6 space-y-4">
      <h2 className="text-2xl font-bold text-center">Final Standings</h2>
      <RoundRobinStandings standings={computedStandings} isLive={true} />
      <button onClick={() => setShowFinalStandings(false)}>
        Continue
      </button>
    </div>
  </div>
)}
```

### Celebration Manual Dismiss Fix

```typescript
// src/components/bracket/celebration-screen.tsx
// REMOVE the auto-dismiss timer (line 124):
// dismissTimerRef.current = setTimeout(handleDismiss, 12000)
// Keep only the "Continue" button and the click handler.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Only round 1 opened on activation | Need pacing-aware activation | This phase | All matchups visible for all-at-once |
| Auto-dismiss celebration after 12s | Manual dismiss only | This phase (CONTEXT decision) | User controls when to proceed |
| Celebration dismisses to normal view | Celebration dismisses to final standings | This phase (CONTEXT decision) | Clear championship moment |

## Open Questions

1. **Should the secondary tiebreaker (total votes) modify `calculateRoundRobinStandings` or be handled in display?**
   - What we know: The pure engine function is well-tested. Adding total vote data requires passing vote counts into the engine, which changes its interface.
   - What's unclear: Whether vote-count-based tiebreaking is complex enough to warrant engine-level changes.
   - Recommendation: Handle in the display layer. After `calculateRoundRobinStandings` returns with equal-rank entries, sort those equal-rank groups by total votes received. This keeps the engine pure and avoids test changes.

2. **How does `handleBatchDecideByVotes` interact with all-at-once pacing?**
   - What we know: `handleBatchDecideByVotes` in LiveDashboard (line 672) operates on `currentRoundRobinRound` matchups only. For all-at-once, this means it only batch-decides one round at a time.
   - What's unclear: Whether teachers want to batch-decide ALL rounds at once or per-round.
   - Recommendation: Keep per-round batch-decide behavior. The teacher can click "Close All & Decide by Votes" on each round section. A "decide all remaining" button is a nice-to-have but out of scope.

3. **Does the `needsRound1Open` fallback in LiveDashboard need updating?**
   - What we know: Line 631-635 checks if all round 1 matchups are pending and shows an "Open Round 1" button. For all-at-once with the activation fix, this should never trigger because all matchups are opened on activation.
   - What's unclear: Edge cases where activation partially fails.
   - Recommendation: Keep the fallback but extend it for all-at-once: if all matchups across all rounds are pending, show an "Open All Rounds" button instead.

4. **How should the teacher's `currentRoundRobinRound` work for all-at-once?**
   - What we know: `currentRoundRobinRound` is computed as the highest round with non-pending matchups. For all-at-once where all matchups are voting, this would be the highest round number.
   - What's unclear: Whether this affects UI behavior (round indicator, batch decide scope).
   - Recommendation: For all-at-once, the concept of "current round" is less relevant. The teacher sees all rounds expanded (already handled by `RoundRobinMatchups` pacing prop). The round progress badge ("Rounds: X/Y complete") replaces the single-round indicator.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all files listed in Architecture Patterns
- `src/lib/dal/bracket.ts` line 655-668 -- activation bug (only opens round 1)
- `src/lib/dal/round-robin.ts` -- `isRoundRobinComplete` checks all matchups (correct)
- `src/actions/round-robin.ts` -- `recordResult` triggers completion check per matchup
- `src/lib/bracket/round-robin.ts` -- `calculateRoundRobinStandings` pure function (correct, has tests)
- `src/components/teacher/live-dashboard.tsx` -- teacher celebration chain with `hasShownRevealRef`
- `src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx` -- student `RRLiveView` with celebration
- `src/components/bracket/celebration-screen.tsx` -- auto-dismiss timer on line 124
- `src/components/bracket/round-robin-matchups.tsx` -- pacing-aware expand behavior
- Phase 27 research -- confirms realtime infrastructure is sound, shared patterns

### Secondary (MEDIUM confidence)
- Phase 27 root cause analysis confirms `useRealtimeBracket` + `fetchBracketState` with cache-busting are working after Phase 27 fixes

## Metadata

**Confidence breakdown:**
- Root cause #1 (activation): HIGH - Direct code reading shows the bug clearly at line 656-668
- Root cause #2 (completion): HIGH - Completion logic is correct; the issue is that only round 1 matchups are open
- Celebration chain: HIGH - Both teacher and student views traced through all code paths
- Architecture patterns: HIGH - All files read and cross-referenced
- UI enhancements: MEDIUM - Recommendations based on existing patterns but not yet implemented

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable codebase, fixes target specific identified bugs)
