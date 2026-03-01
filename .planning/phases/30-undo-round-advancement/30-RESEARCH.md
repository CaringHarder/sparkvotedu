# Phase 30: Undo Round Advancement - Research

**Researched:** 2026-03-01
**Domain:** Bracket round undo / cascade cleanup across SE, DE, RR, and predictive bracket types
**Confidence:** HIGH

## Summary

Phase 30 implements "Undo Round Advancement" -- the ability for teachers to reverse the most recent round advancement in any bracket type (SE, DE, RR, predictive) while the bracket is still in progress. This is a codebase-internal feature with no new external libraries. The complexity lives entirely in the per-type undo logic and cascade cleanup.

The codebase already has a single-matchup undo in `src/lib/bracket/advancement.ts` (`undoMatchupAdvancement`) and a server action wrapper in `src/actions/bracket-advance.ts` (`undoAdvancement`). However, these only handle one matchup at a time and block if the next matchup has votes. Phase 30 requires a **round-level** undo that cascades: clearing all winners in the undone round, deleting all votes in those matchups, clearing propagated entrants in downstream rounds, and recursively clearing any matchups/votes in later rounds that depended on the undone results.

The highest-risk area is **double-elimination undo** because advancing a WB round has side effects in the losers bracket (losers drop down). Undoing a WB round means: (1) clearing WB winners, (2) removing losers that were placed into the LB, (3) clearing any LB matchups that used those losers. For the LB itself, undo is simpler since LB matchups only feed forward within the LB or to grand finals. Grand finals undo may require deleting a dynamically-created reset match.

**Primary recommendation:** Build a new `undoRound` function per bracket type in the engine/DAL layer, each wrapped in a `prisma.$transaction` for atomicity. The server action auto-pauses the bracket as part of the undo. Reuse existing broadcast infrastructure (`bracket_update` events) for realtime UI refresh on student side.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Undo button lives in a **small grouped toolbar near the Advance Round button** -- keep pause toggle where it is, add undo near advance with minimal layout changes
- Button uses a **dynamic label**: "Undo Round 3" (shows which round will be affected)
- **Type-specific labels**: "Undo Round X" for SE/DE, "Undo Round X Results" for RR, "Undo Resolution" for predictive
- Button is **hidden when unavailable** -- only appears after the first round has been advanced
- Button only targets the round that was **just advanced** -- not available while a current round is mid-vote (only after advance)
- **Tooltip on hover**: "Reverses the most recent round and clears downstream matchups"
- No keyboard shortcuts -- undo is rare and destructive enough to require deliberate click/tap
- During processing, button area shows **"Undoing..." status text** that replaces the button temporarily
- **Always requires confirmation** -- undo is destructive and should never be accidental
- Confirmation button is a **simple button click** (no type-to-confirm)
- Confirmation dialog content: Claude's discretion on exact format and detail level
- **Repeated single undo** -- only the most recent round can be undone at any time, but after undoing, the new "most recent" becomes undoable -- teacher can walk back step by step
- **Active/paused brackets only** -- completed brackets cannot be undone (that's Phase 31: Reopen)
- No time limit -- undo is always available on in-progress brackets
- **Auto-pauses on undo** -- teacher can click undo whether bracket is active or paused; system automatically pauses as part of the undo operation
- Students see the **existing "needs to cook" paused overlay** from Phase 29 -- consistent pause experience, no undo-specific messaging
- **All votes from the undone round are cleared** -- students vote fresh on reopened matchups (clean slate)
- For **predictive brackets**, student predictions are **preserved** -- only the teacher's resolution of who won is reversed
- Teacher uses the **existing pause/resume toggle** to resume when ready -- no special post-undo resume flow (consistent with Phase 29)

### Claude's Discretion
- Undo button icon and exact styling (destructive vs secondary)
- Confirmation dialog confirm button styling
- Cascade impact display format in confirmation (counts vs round-by-round)
- Post-undo feedback mechanism (toast vs inline)
- DE-specific confirmation context
- Bracket visualization update approach (instant vs animated)
- Error handling and retry UX
- Loading state design during undo processing
- Backend transaction strategy for atomic undo operations

### Deferred Ideas (OUT OF SCOPE)
- Poll undo / reopen -- belongs in Phase 31 (Reopen Completed Activities)
- Completed bracket reopening -- belongs in Phase 31 (Reopen Completed Activities)
- Undo on completed brackets -- Phase 31 scope (reopen then undo if needed)
</user_constraints>

## Standard Stack

### Core (Already in Codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | (existing) | Database queries, $transaction for atomic undo | Already used everywhere; $transaction provides rollback on error |
| Zod | (existing) | Input validation for undo server action | Pattern matches all other actions |
| Next.js Server Actions | (existing) | `'use server'` action for undo endpoint | Pattern matches `advanceMatchup`, `batchAdvanceRound` |
| Supabase Realtime | (existing) | Broadcast undo events to student clients | Pattern matches `broadcastBracketUpdate` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | (existing) | Icon for undo button (e.g., `Undo2`, `RotateCcw`) | Button icon in toolbar |
| useTransition | (React 19) | Non-blocking UI updates during undo | Already used in live-dashboard for all actions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single $transaction per undo | Separate queries | Atomic $transaction is critical -- partial undo is worse than failed undo |
| Server action | API route | Server actions are the established pattern; no need for a REST endpoint |

**Installation:** No new packages needed. This is 100% codebase-internal work.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/bracket/
│   └── advancement.ts         # ADD: undoRoundSE, undoRoundDE, undoRoundRR, undoRoundPredictive
├── actions/
│   └── bracket-advance.ts     # ADD: undoRoundAdvancement server action
├── components/teacher/
│   └── live-dashboard.tsx      # MODIFY: add undo button toolbar near advance controls
```

### Pattern 1: Round-Level Undo Engine Functions

**What:** Each bracket type gets a dedicated undo function in `advancement.ts` that handles the specific cascade logic within a `prisma.$transaction`.

**When to use:** Always -- the four bracket types have fundamentally different undo semantics.

**Key principle:** Every undo function must be atomic (single $transaction) and must handle the full cascade. Partial undo is never acceptable.

```typescript
// Pattern for SE undo (simplest case)
export async function undoRoundSE(
  bracketId: string,
  round: number
): Promise<{ undoneMatchups: number; clearedVotes: number }> {
  return prisma.$transaction(async (tx) => {
    // 1. Get all matchups in the target round
    const roundMatchups = await tx.matchup.findMany({
      where: { bracketId, round, status: 'decided' },
    })

    // 2. Delete votes from these matchups (clean slate)
    const voteResult = await tx.vote.deleteMany({
      where: { matchupId: { in: roundMatchups.map(m => m.id) } },
    })

    // 3. Clear winners and reset status to 'pending' (not 'voting' -- paused state)
    await tx.matchup.updateMany({
      where: { id: { in: roundMatchups.map(m => m.id) } },
      data: { winnerId: null, status: 'pending' },
    })

    // 4. Clear propagated entrants in the next round
    for (const matchup of roundMatchups) {
      if (matchup.nextMatchupId) {
        const slot = getSlotForPosition(matchup.position)
        await tx.matchup.update({
          where: { id: matchup.nextMatchupId },
          data: { [slot]: null },
        })
      }
    }

    // 5. Cascade: clear all downstream rounds (round+2, round+3, etc.)
    // Delete votes in downstream rounds
    const downstreamMatchups = await tx.matchup.findMany({
      where: { bracketId, round: { gt: round } },
    })
    if (downstreamMatchups.length > 0) {
      await tx.vote.deleteMany({
        where: { matchupId: { in: downstreamMatchups.map(m => m.id) } },
      })
      await tx.matchup.updateMany({
        where: { id: { in: downstreamMatchups.map(m => m.id) } },
        data: { winnerId: null, entrant1Id: null, entrant2Id: null, status: 'pending' },
      })
    }

    return { undoneMatchups: roundMatchups.length, clearedVotes: voteResult.count }
  })
}
```

### Pattern 2: "Most Recent Round" Detection

**What:** Determine which round is the "most recent advanced" round -- this is the only round that can be undone.

**When to use:** Both for the undo button visibility logic (frontend) and as validation in the backend.

```typescript
// Frontend: detect the most recent advanced round for SE brackets
function getMostRecentAdvancedRound(matchups: MatchupData[]): number | null {
  // Find the highest round where at least one matchup is decided
  // AND the next higher round (if any) has no votes cast yet
  // This means the round was "just advanced" and is undoable
  const decidedRounds = [...new Set(
    matchups.filter(m => m.status === 'decided').map(m => m.round)
  )].sort((a, b) => b - a) // descending

  if (decidedRounds.length === 0) return null

  // The highest decided round is undoable if the round above it has no votes
  // (voting matchups would mean the next round is active, which blocks undo per context)
  const highestDecided = decidedRounds[0]
  const nextRoundMatchups = matchups.filter(m => m.round === highestDecided + 1)
  const nextRoundHasVotes = nextRoundMatchups.some(m => m.status === 'voting' || m.status === 'decided')

  // Per CONTEXT: "not available while a current round is mid-vote (only after advance)"
  // This means undo is only available when the current active round is pending (just advanced, not yet voting)
  if (nextRoundHasVotes) return null

  return highestDecided
}
```

### Pattern 3: Server Action with Auto-Pause

**What:** The undo server action auto-pauses the bracket before performing the undo, then broadcasts both the pause and undo events.

**When to use:** Always -- the context specifies auto-pause on undo.

```typescript
export async function undoRoundAdvancement(input: unknown) {
  // 1. Auth + validate
  // 2. Ownership check
  // 3. Verify bracket is active or paused (not completed/draft)
  // 4. Auto-pause if currently active
  // 5. Call type-specific undo engine function
  // 6. Broadcast pause + undo events
  // 7. revalidatePath
}
```

### Pattern 4: DE Undo Cascade

**What:** Double-elimination undo must handle cross-region effects (WB losers placed into LB).

**When to use:** Only for DE brackets.

**Key insight:** When undoing a WB round, the losers that dropped from that round into the LB must be removed. This means:
1. Clear WB round winners
2. Identify which LB matchups received losers from this WB round (using `wbRoundToLbEngineRound` mapping)
3. Clear those LB entrant slots
4. Cascade: any LB rounds that depended on those matchups must also be cleared
5. If undoing a WB final, clear the LB final's entrant2 slot (WB final loser)
6. If undoing affects grand finals, clear GF entrants and delete any dynamically-created reset match

### Anti-Patterns to Avoid
- **Partial undo without transaction:** Never perform multi-step undo without wrapping in `$transaction`. A partial undo (some matchups cleared, others not) leaves the bracket in an inconsistent state that is very hard to recover from.
- **Resetting to 'voting' status:** Undone matchups should reset to 'pending', not 'voting'. Since the bracket auto-pauses, students can't vote until the teacher resumes. When the teacher resumes and opens voting, the matchups transition pending->voting normally.
- **Forgetting to cascade:** The biggest risk. If round 3 is undone but round 4 matchups still reference round 3 winners as entrants, the bracket is corrupted. Always cascade to ALL downstream rounds.
- **Preserving votes on undone matchups:** Context says "clean slate" -- all votes must be deleted. Don't try to preserve votes thinking teachers might want them.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic multi-table mutations | Manual try/catch around sequential queries | `prisma.$transaction()` | Automatic rollback on any error; avoids partial undo states |
| Realtime UI updates | Custom WebSocket or polling | Existing `broadcastBracketUpdate()` | Already handles all bracket lifecycle events |
| Confirmation dialogs | Custom modal from scratch | Existing dialog pattern (see live-dashboard showUndoConfirm) | The existing matchup-level undo already uses a confirm pattern |
| Pause infrastructure | Custom pause logic | Existing `updateBracketStatus({ status: 'paused' })` | Phase 29 already handles pause/resume |
| Status transitions | Direct DB update | Existing `VALID_TRANSITIONS` in `src/lib/dal/bracket.ts` | Validates allowed transitions |

**Key insight:** The codebase already has all the infrastructure (transactions, broadcasting, pause, status transitions). Phase 30 is about composing these existing primitives into round-level undo operations per bracket type.

## Common Pitfalls

### Pitfall 1: Incomplete DE Cascade (Cross-Region)
**What goes wrong:** Undoing a WB round without cleaning up the LB placements from that round leaves orphaned entrants in the LB that shouldn't be there.
**Why it happens:** The WB->LB loser placement uses complex position mapping (`computeLoserPlacement` with split-and-reverse seeding). It's easy to forget this when only thinking about "undo the winners."
**How to avoid:** When undoing WB round N, use the same `wbRoundToLbEngineRound(N)` mapping to find which LB round(s) received dropdowns, and clear those slots. Test with 8-team DE bracket minimum.
**Warning signs:** After undo, LB matchups still show entrants that should have been removed.

### Pitfall 2: Grand Finals Reset Match Cleanup
**What goes wrong:** If a DE bracket reached GF and the LB champion won (creating a reset match), undoing the GF requires deleting the dynamically-created reset matchup record.
**Why it happens:** Reset matches are created on-the-fly in `advanceDoubleElimMatchup` when the LB champion wins GF match 1. This is the only place in the codebase where matchups are created mid-tournament. Undo must handle deletion.
**How to avoid:** When undoing a GF round, check if a reset match exists (`gfMatchups.length > 1`). If so, delete the reset match entirely (not just clear its data). Also clear the GF match 1 winner and votes.
**Warning signs:** After undo, extra GF matchups remain visible in the bracket.

### Pitfall 3: RR "Round" vs DB "round" Confusion
**What goes wrong:** Round-robin uses `roundRobinRound` (logical round) and `round` (DB position for uniqueness). Undoing by `round` instead of `roundRobinRound` hits wrong matchups.
**Why it happens:** RR matchups have a global `position` counter and the `round` field maps to logical RR round. BUT the `roundRobinRound` field is the authoritative round number for RR-specific logic.
**How to avoid:** For RR undo, filter by `roundRobinRound`, not `round`. The creation code in `src/lib/dal/round-robin.ts` sets `round: round.roundNumber` and `roundRobinRound: round.roundNumber` identically, but always use `roundRobinRound` for RR logic.
**Warning signs:** Wrong matchups get undone, or undo misses some matchups.

### Pitfall 4: Predictive Bracket -- Clearing Resolution Without Clearing Predictions
**What goes wrong:** Undo accidentally deletes student predictions along with the teacher's resolution.
**Why it happens:** Predictions are stored in the `predictions` table, separate from matchup `winnerId`. It's tempting to "clear everything" but predictions must be preserved.
**How to avoid:** For predictive brackets, undo only clears: `matchup.winnerId`, `matchup.status` (back to pending), and downstream propagated entrants. NEVER delete from the `predictions` table during undo. The existing `reopenPredictionsDAL` in `src/lib/dal/prediction.ts` shows the correct pattern.
**Warning signs:** After undo, students are asked to re-submit predictions they already submitted.

### Pitfall 5: "Most Recent Round" Misidentification
**What goes wrong:** The undo button targets the wrong round, or appears when it shouldn't.
**Why it happens:** "Most recent advanced round" is ambiguous when some matchups in a round are decided and others aren't (e.g., teacher advanced some matchups manually but not all).
**How to avoid:** Define "most recent advanced round" as: the highest round number where ALL matchups are decided AND the subsequent round (if any) has no voting or decided matchups. If any matchup in the next round has votes, the undo window has passed.
**Warning signs:** Undo appears during active voting, or undo targets a round that still has undecided matchups.

### Pitfall 6: Forgetting to Delete Votes
**What goes wrong:** After undo, vote records still exist in the database for matchups that were reopened. When the teacher opens voting again, old vote counts appear instantly.
**Why it happens:** Only clearing `winnerId` and resetting `status` without deleting `Vote` records.
**How to avoid:** Always `tx.vote.deleteMany({ where: { matchupId: { in: undoneMatchupIds } } })` as part of the undo transaction. Also delete votes for ALL downstream matchups, not just the undone round.
**Warning signs:** After undo + resume + re-open voting, students see pre-existing vote counts or the system says they've already voted.

## Code Examples

### Example 1: Existing Single-Matchup Undo (Reference)
```typescript
// Source: src/lib/bracket/advancement.ts (lines 79-129)
// This is the EXISTING undo -- it only handles one matchup and blocks if next has votes.
// Phase 30 replaces this with round-level undo that cascades.
export async function undoMatchupAdvancement(matchupId, _bracketId) {
  return prisma.$transaction(async (tx) => {
    const matchup = await tx.matchup.findUnique({ where: { id: matchupId } })
    if (!matchup?.winnerId) throw new Error('Matchup has no winner to undo')
    if (matchup.nextMatchupId) {
      const voteCount = await tx.vote.count({ where: { matchupId: matchup.nextMatchupId } })
      if (voteCount > 0) throw new Error('Cannot undo: next matchup already has votes')
      const slot = getSlotForPosition(matchup.position)
      await tx.matchup.update({ where: { id: matchup.nextMatchupId }, data: { [slot]: null } })
    }
    return tx.matchup.update({
      where: { id: matchupId },
      data: { winnerId: null, status: 'voting' },
    })
  })
}
```

### Example 2: Existing Broadcast Events (Reference)
```typescript
// Source: src/lib/realtime/broadcast.ts
// Bracket update event types -- Phase 30 adds 'round_undone'
type BracketUpdateType =
  | 'winner_selected'
  | 'round_advanced'
  | 'bracket_completed'
  | 'bracket_paused'
  | 'bracket_resumed'
  // ... Phase 30 adds:
  // | 'round_undone'

// Usage pattern:
broadcastBracketUpdate(bracketId, 'round_undone', {
  round: undoneRound,
  bracketType,
}).catch(console.error)
```

### Example 3: Existing Pause Toggle (Reference)
```typescript
// Source: src/components/teacher/live-dashboard.tsx (line 132)
// The pause toggle pattern -- undo will call this same action internally
const handlePauseToggle = useCallback((checked: boolean) => {
  const newStatus = checked ? 'active' : 'paused'
  startTransition(async () => {
    await updateBracketStatus({ bracketId: bracket.id, status: newStatus })
  })
}, [bracket.id])
```

### Example 4: Existing Predictive Reopen Pattern (Reference)
```typescript
// Source: src/lib/dal/prediction.ts (lines 1074-1119)
// This shows how to clear resolution without clearing predictions
export async function reopenPredictionsDAL(bracketId, teacherId) {
  // Clear non-bye matchup winners
  await prisma.matchup.updateMany({
    where: { bracketId, isBye: false },
    data: { winnerId: null },
  })
  // Clear propagated entrants in rounds > 1
  await prisma.matchup.updateMany({
    where: { bracketId, round: { gt: 1 }, isBye: false },
    data: { entrant1Id: null, entrant2Id: null },
  })
  // Reset bracket prediction status
  await prisma.bracket.update({
    where: { id: bracketId },
    data: { predictionStatus: 'predictions_open', revealedUpToRound: null },
  })
}
```

### Example 5: DE WB-to-LB Round Mapping (Critical Reference)
```typescript
// Source: src/lib/bracket/advancement.ts (lines 267-269)
// This mapping is critical for knowing which LB round to clean up
function wbRoundToLbEngineRound(wbEngineRound: number): number {
  if (wbEngineRound === 1) return 1
  return 2 * (wbEngineRound - 1)
}
// And converting engine round to DB round:
// lbDbRound = lbEngineRound + losersRoundOffset
// where losersRoundOffset = wbMaxRound (= Math.log2(bracketSize))
```

### Example 6: VALID_TRANSITIONS for Bracket Status
```typescript
// Source: src/lib/dal/bracket.ts (lines 604-610)
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['active', 'completed', 'archived'],
  active: ['paused', 'completed', 'archived'],
  paused: ['active', 'completed', 'archived'],
  completed: ['archived'],
  archived: [],
}
// Undo auto-pauses: active -> paused (already valid)
// Paused brackets stay paused (no transition needed)
```

## Architecture Decisions (Claude's Discretion Recommendations)

### Undo Button Styling
**Recommendation:** Use a **secondary-destructive style** -- not fully red (which implies deletion), but distinct from normal actions. Use `border-red-300 text-red-600 hover:bg-red-50` (same pattern as the existing matchup-level undo at line 497 of `round-advancement-controls.tsx`). Icon: `Undo2` from lucide-react.

### Confirmation Dialog Format
**Recommendation:** Show **cascade impact as counts** in the confirmation dialog. Example: "This will clear 4 matchup results, delete 47 votes, and reset 2 downstream matchups." Counts are more concrete than round-by-round listing and faster to scan. For DE, add: "This also removes 4 entrants placed in the losers bracket from this round."

### Post-Undo Feedback
**Recommendation:** Use **inline feedback** (not toast). Replace the undo button area with a green success message: "Round 3 undone -- 4 matchups reopened" that fades after 3 seconds. Inline is consistent with the existing error display pattern (`{error && <div className="mb-3 rounded-md bg-red-50...">}`).

### Bracket Visualization Update
**Recommendation:** **Instant update** (no animation). The bracket diagram already re-renders reactively based on matchup data changes from the `useRealtimeBracket` hook. When the server action completes and the page revalidates, the bracket visualization updates automatically. Adding animation would be scope creep.

### Error Handling
**Recommendation:** Show the error inline (same as existing pattern). If the transaction fails, the bracket state is unchanged (Prisma rolls back). Show: "Undo failed -- please try again." No retry button needed -- the user can just click undo again.

### Loading State
**Recommendation:** Replace the undo button with "Undoing..." text (per CONTEXT.md decision). Use `isPending` from `useTransition` -- same pattern as all other action buttons in the live dashboard.

### Backend Transaction Strategy
**Recommendation:** One `prisma.$transaction` per undo call. The transaction timeout should be 30 seconds (matching the existing bracket creation timeout). The transaction should:
1. Verify bracket ownership and status
2. Auto-pause if active
3. Delete votes from target round matchups
4. Clear winners and reset status on target round matchups
5. Delete votes from ALL downstream matchups
6. Clear entrants, winners, status on downstream matchups
7. (DE only) Clear cross-region effects
8. (DE only) Delete GF reset match if applicable

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-matchup undo only | Round-level cascade undo | Phase 30 | Teachers no longer need to undo matchup-by-matchup; one click undoes the entire round |
| Undo blocked by downstream votes | Undo cascades through ALL downstream | Phase 30 | Removes the "Cannot undo: next matchup already has votes" limitation |

**Existing to preserve:**
- The existing single-matchup `undoMatchupAdvancement` function can remain for potential future use (e.g., undo a single override in predictive manual mode). Phase 30's round-level undo is a separate, additional capability.

## Detailed Findings by Bracket Type

### SE (Single Elimination) -- Confidence: HIGH
**How advancement works:** `handleCloseAndAdvance` in live-dashboard calls `advanceMatchup` for each voting matchup with a clear winner. This sets `winnerId` and `status: 'decided'` on each matchup and propagates the winner via `nextMatchupId` -> `entrant1Id`/`entrant2Id` on the next-round matchup.

**What undo must do:**
1. Target round = highest round where ALL matchups are `decided` AND the next round has no `voting`/`decided` matchups
2. For each matchup in the target round: delete votes, clear winnerId, set status = 'pending'
3. For each matchup with nextMatchupId: clear the propagated entrant slot in the next matchup
4. For all rounds > target: delete votes, clear winnerId + entrant1Id + entrant2Id, set status = 'pending'

**Undo availability check:** The undo button appears when `allRoundDecided === true` AND `hasPending === true` (next round matchups exist and are pending) OR when `currentRound === totalRounds` and `allRoundDecided === true` (final round completed but bracket not yet marked `completed`).

### DE (Double Elimination) -- Confidence: HIGH (highest-risk implementation)
**How advancement works:** The live-dashboard operates region-by-region (winners, losers, grand finals). `advanceDoubleElimMatchup` handles: WB winner propagation via nextMatchupId, WB loser placement into the correct LB slot using `computeLoserPlacement`, LB winner propagation, LB champion to GF entrant2, GF logic including dynamic reset match creation.

**What undo must do (WB round undo):**
1. Clear WB round matchup winners and votes
2. Map the WB round to the LB target round using `wbRoundToLbEngineRound(wbEngineRound) + losersRoundOffset`
3. Clear the loser entrant slots that were placed into the LB target round
4. If this is the WB final: clear entrant2Id from the LB final (where the WB final loser goes)
5. Cascade: clear all downstream LB and GF matchups that depended on any of the above

**What undo must do (LB round undo):**
1. Clear LB round matchup winners and votes
2. Clear propagated entrants in the next LB round (via nextMatchupId)
3. If this is the LB final: clear entrant2Id from the GF matchup
4. Cascade downstream

**What undo must do (GF undo):**
1. If reset match exists and is being undone: delete the reset matchup record entirely
2. Clear GF match 1 winner and votes
3. If undoing GF while bracket was just completed: set bracket status back to 'active' (then auto-pause)

### RR (Round Robin) -- Confidence: HIGH
**How advancement works:** RR matchups are independent (no `nextMatchupId`). Each matchup has `roundRobinRound`. Results are recorded via `recordRoundRobinResult` which sets winnerId + status='decided'. Round advancement opens the next round's pending matchups to voting.

**What undo must do:**
1. Target round = highest `roundRobinRound` where all matchups are `decided`
2. Delete votes from those matchups
3. Clear winnerId on those matchups, set status = 'pending'
4. No cascade needed (RR matchups are independent -- no nextMatchupId, no entrant propagation)
5. Exception: if the bracket was auto-completed (all rounds done), reverse the bracket completion by setting status back to active (then auto-pause)

### Predictive -- Confidence: HIGH
**How advancement works:** Predictive brackets use `predictionStatus` lifecycle (predictions_open -> tabulating -> previewing -> revealing -> completed). In manual mode, teachers click matchups to set winners directly. In vote_based mode, students vote on matchups like SE. In auto mode, tabulation resolves winners from predictions.

**What undo must do:**
- For **manual mode**: Similar to SE undo but simpler (no votes to delete, just clear winnerId and downstream propagation)
- For **vote_based mode**: Same as SE undo (delete votes, clear winners, cascade)
- For **auto mode**: More like `reopenPredictionsDAL` -- clear matchup winnerIds and propagated entrants for the target round and downstream, but NEVER delete predictions. Adjust `revealedUpToRound` if in revealing state.

**Key distinction:** Predictive "Undo Resolution" is about reversing the teacher's resolution of who won, NOT about clearing student predictions. The `predictions` table is never touched during undo.

## Open Questions

1. **Should the existing single-matchup `undoMatchupAdvancement` be deprecated or kept?**
   - What we know: Phase 30 adds round-level undo. The single-matchup undo in `RoundAdvancementControls` (line 494-518) is used for individual matchup decisions.
   - What's unclear: Whether teachers ever need per-matchup undo in the live dashboard context.
   - Recommendation: Keep it but consider hiding it in the live dashboard UI once round-level undo is available. The per-matchup undo in `RoundAdvancementControls` is used by older bracket types and may still be useful for edge cases.

2. **DE bracket undo: what if teacher advances WB and LB independently?**
   - What we know: DE live dashboard allows region-by-region navigation and advancement. Teacher could advance WB round 2, then advance LB round 1, then want to undo WB round 2.
   - What's unclear: If LB round 1 was advanced after WB round 2, can WB round 2 still be undone? The LB entrants from WB round 2 losers are already "in play."
   - Recommendation: Define "most recent" per-region for DE. Each region (winners, losers, GF) tracks its own undo-able round independently. But undoing a WB round must also cascade to any LB round that received losers from that WB round, even if those LB rounds were already advanced. This means undoing WB round 2 might also undo LB rounds that depend on WB round 2 losers.

3. **Bracket completion reversal scope**
   - What we know: If the bracket was just marked `completed` by the advancement (e.g., SE final round decided), undo must reverse the completion.
   - What's unclear: Does this count as "reopening a completed bracket" (Phase 31 scope)?
   - Recommendation: If the bracket JUST became completed via the round that's being undone (same round), the undo can reverse it (set status back to active, then auto-pause). This is not "reopening" in the Phase 31 sense -- the teacher is still on the live dashboard and the completion just happened. Phase 31 covers brackets that were completed, teacher navigated away, time passed, and they come back wanting to reopen.

## Sources

### Primary (HIGH confidence)
- `src/lib/bracket/advancement.ts` -- Current advancement + single-matchup undo engine
- `src/actions/bracket-advance.ts` -- Server actions for advancement
- `src/lib/dal/bracket.ts` -- VALID_TRANSITIONS, bracket status management
- `src/lib/dal/prediction.ts` -- Predictive undo patterns (reopenPredictionsDAL)
- `src/components/teacher/live-dashboard.tsx` -- Teacher UI, pause toggle, round advancement controls
- `src/lib/realtime/broadcast.ts` -- Broadcast event types and patterns
- `prisma/schema.prisma` -- Database schema (Matchup, Vote, Prediction models)

### Secondary (MEDIUM confidence)
- `src/lib/bracket/double-elim.ts` -- DE bracket structure generation and loser seeding
- `src/lib/dal/round-robin.ts` -- RR bracket operations
- `src/lib/dal/vote.ts` -- Vote CRUD and matchup status transitions
- `src/components/teacher/round-advancement-controls.tsx` -- Existing per-matchup undo UI

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new libraries; all patterns exist in codebase
- Architecture: HIGH -- Direct extension of existing advancement patterns
- Pitfalls: HIGH -- Identified from actual codebase analysis (DE cross-region cascade is the real risk)
- SE undo: HIGH -- Straightforward cascade pattern
- DE undo: HIGH (confidence in understanding, but HIGH risk in implementation) -- Cross-region effects are complex
- RR undo: HIGH -- Simple since matchups are independent
- Predictive undo: HIGH -- `reopenPredictionsDAL` provides a proven pattern

**Research date:** 2026-03-01
**Valid until:** 2026-03-31 (stable -- no external dependencies to go stale)
