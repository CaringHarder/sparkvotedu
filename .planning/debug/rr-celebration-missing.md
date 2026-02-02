---
status: investigating
trigger: "CelebrationScreen Not Showing on RR Bracket Completion (Student Page)"
created: 2026-02-02T00:00:00Z
updated: 2026-02-02T00:00:00Z
---

## Current Focus

hypothesis: RR bracket completion never broadcasts 'bracket_completed' event, so useRealtimeBracket never sets bracketCompleted=true
test: Trace code paths for RR result recording to confirm no completion check exists
expecting: recordRoundRobinResult calls winner_selected broadcast but never checks if bracket is complete
next_action: Document root cause

## Symptoms

expected: When a round-robin bracket completes all rounds (all matchups decided), CelebrationScreen should show on student page with 2-second delay
actual: No CelebrationScreen appears when RR bracket completes
errors: None (feature silently doesn't work)
reproduction: Complete all RR matchups -> observe student page -> no celebration
started: Feature was added in 07-26 but never tested end-to-end

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-02-02T00:00:00Z
  checked: src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx (RRLiveView component)
  found: |
    Lines 534-555: RRLiveView properly implements celebration logic:
    - Destructures bracketCompleted from useRealtimeBracket (line 537)
    - Has showCelebration state (line 534)
    - useEffect triggers celebration with 2-second delay when bracketCompleted=true (lines 550-555)
    - CelebrationScreen renders conditionally on showCelebration (lines 616-622)
    - championName computed from decided matchups (lines 558-577)
    Implementation matches plan 07-26 exactly.
  implication: Student page code is correct. Problem is upstream in bracketCompleted signal.

- timestamp: 2026-02-02T00:00:00Z
  checked: src/hooks/use-realtime-bracket.ts
  found: |
    Lines 60, 94-96, 147-149: bracketCompleted state management:
    - useState(false) initialized (line 60)
    - Set to true when data.status === 'completed' in fetchBracketState (lines 94-96)
    - Set to true when broadcast event type === 'bracket_completed' (lines 147-149)
    Two paths for bracketCompleted: polling API response OR realtime broadcast.
  implication: Hook is correct. Either API never returns status='completed' OR broadcast never fires 'bracket_completed' event.

- timestamp: 2026-02-02T00:00:00Z
  checked: src/lib/dal/round-robin.ts (recordRoundRobinResult function)
  found: |
    Lines 112-150: recordRoundRobinResult implementation:
    - Updates matchup with winnerId and status='decided' (lines 134-141)
    - Broadcasts 'winner_selected' event (lines 144-147)
    - Returns immediately after broadcast
    NO completion check. NO 'bracket_completed' broadcast. NO status update to bracket.
  implication: When recording RR results, completion is never checked.

- timestamp: 2026-02-02T00:00:00Z
  checked: src/actions/bracket-advance.ts (batchAdvanceRound function)
  found: |
    Lines 248-254: After advancing round, checks completion:
    ```typescript
    const completionWinner = await isBracketComplete(bracketId, bracket.bracketType ?? undefined)
    if (completionWinner) {
      broadcastBracketUpdate(bracketId, 'bracket_completed', {
        winnerId: completionWinner,
      }).catch(console.error)
    }
    ```
    This path is used for SE/DE/Predictive bracket advancement, NOT for RR.
  implication: Completion check exists for other bracket types but not for RR.

- timestamp: 2026-02-02T00:00:00Z
  checked: src/lib/bracket/advancement.ts (isBracketComplete function)
  found: |
    Lines 207-240: isBracketComplete implementation:
    - DE: checks grand finals highest-round matchup for winnerId (lines 211-225)
    - SE/Predictive/RR: finds highest-round matchup, returns winnerId (lines 227-240)

    Comment on line 227: "SE / Predictive / RR: highest-round matchup with winnerId"

    This is WRONG for RR. RR has no "highest round wins" concept. All matchups are at equal importance.
    For RR completion, ALL matchups must be decided, not just one.
  implication: Even if isBracketComplete were called for RR, it would give wrong results.

- timestamp: 2026-02-02T00:00:00Z
  checked: src/actions/round-robin.ts
  found: |
    Lines 23-51: recordResult action calls recordRoundRobinResult DAL function.
    No completion check. No bracket status update. Just revalidates path and returns.

    Lines 57-85: advanceRound action calls advanceRoundRobinRound DAL function.
    No completion check. Just opens next round matchups.
  implication: Neither RR action checks for bracket completion.

- timestamp: 2026-02-02T00:00:00Z
  checked: src/lib/dal/round-robin.ts (advanceRoundRobinRound function)
  found: |
    Lines 209-240: advanceRoundRobinRound implementation:
    - Opens matchups for specified round (sets status='voting')
    - Broadcasts 'round_advanced' event
    - Returns success
    NO completion check.
  implication: Even when advancing the final round, completion is never detected.

## Resolution

root_cause: |
  Round-robin bracket completion is never detected or broadcast. The recordRoundRobinResult DAL function
  (src/lib/dal/round-robin.ts) broadcasts 'winner_selected' when a matchup is decided but never checks
  if all matchups are complete. The isBracketComplete function (src/lib/bracket/advancement.ts) has
  incorrect logic for RR brackets (checks highest-round matchup instead of ALL matchups). No code path
  exists to:
  1. Detect when all RR matchups are decided
  2. Update bracket status to 'completed'
  3. Broadcast 'bracket_completed' event

  Without this, useRealtimeBracket never sets bracketCompleted=true, so the celebration useEffect
  never fires, and CelebrationScreen never shows.

fix: (pending - research only)

verification: (pending - research only)

files_changed: []
