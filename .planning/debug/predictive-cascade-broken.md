---
status: diagnosed
trigger: "Predictive bracket prediction cascade broken -- simple mode shows advanced bracket diagram, later rounds show TBD and are not selectable"
created: 2026-02-01T18:00:00Z
updated: 2026-02-01T18:45:00Z
---

## Current Focus

hypothesis: CONFIRMED -- Two distinct root causes identified (Issue A: simple mode renders wrong UI, Issue B: no cascade logic exists)
test: Full code trace through PredictiveBracket component, matchup data model, and prediction state management
expecting: Both issues confirmed at the code level
next_action: Report findings

## Symptoms

expected: (1) Simple predictive mode shows vertical matchup cards (MatchupPredictionCard list) for ALL rounds. (2) Picking a winner in Round 1 should cascade that entrant into the Round 2 matchup slot so the student can then predict Round 2, then Round 3, etc., filling out the entire bracket.
actual: (1) Simple mode shows MatchupPredictionCards (correct component) but only first-round matchups appear because later rounds have null entrants and are filtered out. (2) No cascade logic exists -- picking R1 winners does not populate R2 matchup slots. Later rounds show TBD and cannot be selected.
errors: No runtime errors -- functional logic gap
reproduction: Create 8-team predictive bracket (simple mode), open predictions, student views bracket. Student can only pick R1 (quarterfinals). R2 and R3 matchups show TBD.
started: Since predictive bracket was first implemented (cascade was never built)

## Eliminated

(none -- root causes found on first investigation pass)

## Evidence

- timestamp: 2026-02-01T18:05:00Z
  checked: SimplePredictionMode in predictive-bracket.tsx (lines 186-355)
  found: |
    Line 201-204: `nonByeMatchups` is computed as:
      `bracket.matchups.filter((m) => !m.isBye && m.entrant1Id && m.entrant2Id)`
    This filter REQUIRES BOTH entrant1Id AND entrant2Id to be non-null.
    For an 8-team bracket, only R1 matchups (4 matches) have both entrants populated.
    R2 matchups have entrant1Id=null and entrant2Id=null (filled only when actual winners advance).
    R3 (final) also has null entrants.
    Result: nonByeMatchups contains ONLY R1 matchups. R2 and R3 are silently excluded.
  implication: This is the DIRECT CAUSE of "student was only able to pick first round". The filter removes all later-round matchups from the UI because they have null entrants in the database.

- timestamp: 2026-02-01T18:08:00Z
  checked: AdvancedPredictionMode in predictive-bracket.tsx (lines 361-554)
  found: |
    Line 376-379: Same filter as SimplePredictionMode:
      `bracket.matchups.filter((m) => !m.isBye && m.entrant1Id && m.entrant2Id)`
    Advanced mode uses BracketDiagram component which renders ALL matchups (including TBD ones),
    but the totalCount for "allSelected" check (line 412) only counts non-bye matchups with both
    entrants, so progress tracking is also limited to R1 only.
    The handleEntrantClick callback (line 427-436) also finds matchups from bracket.matchups directly,
    but BracketDiagram's MatchupBox only makes entrants clickable when `isClickable` is true,
    which requires matchup.status === 'voting' AND entrantId to be non-null.
  implication: Advanced mode at least SHOWS the bracket diagram with TBD slots, but interaction is still limited to R1 because later-round matchups have null entrant IDs.

- timestamp: 2026-02-01T18:10:00Z
  checked: Bracket engine matchup generation (engine.ts lines 89-121)
  found: |
    generateMatchups() creates matchups where:
    - Round 1: entrant1Seed and entrant2Seed are populated (mapped to real entrant IDs in DAL)
    - Round 2+: entrant1Seed = null, entrant2Seed = null (persisted as null entrant IDs)
    This is CORRECT for live bracket resolution (winners are advanced by the advancement engine).
    But for PREDICTIVE mode, the student needs to speculatively fill in later rounds based on
    their earlier-round predictions. This requires CLIENT-SIDE cascade logic.
  implication: The database schema is correct -- later rounds SHOULD have null entrants. The missing piece is client-side prediction cascade logic.

- timestamp: 2026-02-01T18:12:00Z
  checked: handleSelect function in SimplePredictionMode (line 244-247)
  found: |
    `function handleSelect(matchupId: string, entrantId: string) {
      if (!isPredictionsOpen || (!isEditing && hasSubmitted)) return
      setSelections((prev) => ({ ...prev, [matchupId]: entrantId }))
    }`
    This ONLY updates the selections map for the clicked matchup. It does NOT:
    - Identify which later-round matchup is fed by this matchup (via nextMatchupId)
    - Propagate the selected winner as an entrant in the next-round matchup
    - Cascade through multiple rounds (e.g., R1 winner -> R2 slot -> if R2 also picked, R3 slot)
    - Rebuild the list of available matchups to include newly-populated later-round matchups
  implication: CONFIRMED: No cascade logic exists. handleSelect is a simple key-value store update.

- timestamp: 2026-02-01T18:15:00Z
  checked: handleEntrantClick in AdvancedPredictionMode (lines 427-436)
  found: |
    Same pattern -- only calls setSelections for the clicked matchup. No cascade.
    The `votedEntrantIds` map is passed to BracketDiagram for visual highlighting only.
    BracketDiagram renders matchups from the server data (bracket.matchups), not from
    a client-side prediction-augmented matchup list.
  implication: Advanced mode also has zero cascade logic.

- timestamp: 2026-02-01T18:18:00Z
  checked: MatchupData type and nextMatchupId field (types.ts, engine.ts)
  found: |
    Each matchup has a `nextMatchupId` field linking it to the next-round matchup.
    This data IS available on the client (bracket.matchups includes nextMatchupId).
    The cascade logic would need to:
    1. When user picks winner of matchup M, find M.nextMatchupId
    2. Determine which slot (entrant1 or entrant2) M feeds into (based on position: odd -> slot 1, even -> slot 2)
    3. Set that slot's entrant to the predicted winner in a client-side overlay
    4. If that next-round matchup now has BOTH slots filled (from two feeder predictions), make it selectable
    5. Recursively cascade if the user had already picked a winner for that next-round matchup
    6. Handle "changing your mind" -- if user changes R1 pick, invalidate downstream predictions
  implication: All the structural data (nextMatchupId, position) needed for cascade is available. The logic just was never implemented.

- timestamp: 2026-02-01T18:22:00Z
  checked: Issue A -- "simple mode renders the ADVANCED bracket diagram"
  found: |
    PARTIALLY INCORRECT SYMPTOM REPORT. Looking at SimplePredictionMode (lines 317-354):
    It renders MatchupPredictionCard components in a vertical list, NOT the BracketDiagram.
    Only AdvancedPredictionMode renders BracketDiagram (line 534-541).

    The routing logic at line 41-63 of PredictiveBracket:
      `if (predictiveMode === 'advanced') { return <AdvancedPredictionMode ... /> }`
      `return <SimplePredictionMode ... />`
    This correctly checks `bracket.predictiveMode`.

    HOWEVER, Test 13 says: "in predictive simple mode, the student saw the advanced bracket (full bracket)".

    Possible explanations:
    a) The bracket was created with predictiveMode='advanced' despite user intending 'simple'
    b) The predictiveMode field is not being passed correctly through the API
    c) The tester's expectation of "simple" vs "advanced" differs from what the code defines

    Checking the student page toBracketWithDetails() (line 451):
      `predictiveMode: data.predictiveMode ?? null`
    And in PredictiveBracket (line 23):
      `const predictiveMode = bracket.predictiveMode ?? 'simple'`

    If predictiveMode is null (default), it falls back to 'simple'. So SimplePredictionMode
    WOULD be rendered... but since nonByeMatchups only contains R1 matchups, the student only
    sees 4 matchup cards. The tester may have mistaken the limited R1-only card view for
    something else, OR the bracket was actually created with predictiveMode='advanced'.
  implication: |
    Issue A needs clarification. The routing logic IS correct (predictiveMode defaults to 'simple').
    If the student literally saw the bracket diagram (SVG bracket tree), then predictiveMode was
    'advanced' on the bracket record. If they saw vertical cards but only R1, they may have
    described the symptom imprecisely. Either way, the CORE ISSUE is the same: only R1 is
    interactable regardless of mode.

- timestamp: 2026-02-01T18:25:00Z
  checked: submitPrediction server action and DAL (prediction.ts, lib/dal/prediction.ts)
  found: |
    submitPredictions DAL (lines 17-90) accepts an array of { matchupId, predictedWinnerId }.
    It does NOT validate that the predictedWinnerId is actually an entrant in that matchup.
    It just stores whatever predictions the client sends.

    This means the DAL is READY for multi-round predictions -- the client just needs to
    send predictions for ALL rounds (including rounds where entrants are derived from
    earlier predictions, not from the database).

    The DAL filters out bye matchups (line 64-66) but does not filter by round or
    check whether matchup entrants are populated.
  implication: Server-side submission already supports full bracket predictions. The missing cascade is purely a client-side UI/state issue.

- timestamp: 2026-02-01T18:28:00Z
  checked: Test 14 -- empty leaderboard
  found: |
    Leaderboard in TeacherPredictiveView (lines 141-177) shows scores from `leaderboard` state.
    usePredictions hook calls getLeaderboard -> scoreBracketPredictions (DAL).
    scoreBracketPredictions scores predictions against RESOLVED matchups (status='decided', winnerId not null).

    The leaderboard being empty has TWO possible causes:
    1. Students can only predict R1, so only R1 predictions exist. If no R1 matchups have been
       resolved yet (bracket still in prediction phase), there are zero resolved matchups to score against.
    2. Even if the bracket were activated and matchups resolved, scoring would only cover R1 predictions
       (since students can't make R2/R3 predictions due to missing cascade).

    The test report says "leaderboard shows on teacher page but it is empty since student can't
    fully fill out the predictive bracket" -- this is consistent: students only submitted R1
    predictions (if any), and those haven't been resolved yet.
  implication: Empty leaderboard is a downstream consequence of the cascade bug, not an independent issue.

## Resolution

root_cause: |
  TWO ROOT CAUSES confirmed:

  **ROOT CAUSE 1 (PRIMARY): No client-side prediction cascade logic exists**

  Location: `src/components/bracket/predictive-bracket.tsx`

  Both SimplePredictionMode and AdvancedPredictionMode suffer from the same fundamental gap:
  when a student picks a winner for a matchup, the selection is stored as a flat key-value pair
  (`selections[matchupId] = entrantId`) with NO propagation to downstream matchups.

  The bracket database correctly stores later-round matchups with null entrant1Id/entrant2Id
  (since those slots are only filled when actual winners advance during live play). For
  predictive mode, the CLIENT must maintain a speculative overlay that:

  a) Uses nextMatchupId + position to determine which slot each matchup feeds into
  b) When a user picks a winner, propagates that entrant as the "speculative entrant" in the
     next-round matchup
  c) Recursively cascades through the bracket when feeder matchups are completed
  d) Handles "change of mind" by invalidating/clearing all downstream predictions when an
     earlier pick changes
  e) Rebuilds the renderable matchup list to include matchups where both speculative entrants
     are now known

  This cascade logic was never implemented. The selections state is a simple Record<string, string>
  with no awareness of bracket topology.

  **ROOT CAUSE 2: nonByeMatchups filter excludes later-round matchups**

  Location: `src/components/bracket/predictive-bracket.tsx`, lines 201-204 and 376-379

  ```typescript
  const nonByeMatchups = useMemo(
    () => bracket.matchups.filter((m) => !m.isBye && m.entrant1Id && m.entrant2Id),
    [bracket.matchups]
  )
  ```

  This filter requires BOTH entrant1Id AND entrant2Id to be non-null. For an 8-team bracket:
  - R1: 4 matchups with both entrants populated -> INCLUDED
  - R2: 2 matchups with null/null entrants -> EXCLUDED
  - R3: 1 matchup (final) with null/null entrants -> EXCLUDED

  Even if cascade logic existed, this filter would still exclude later-round matchups from
  rendering and from the progress counter (madeCount/totalCount). The filter needs to be
  replaced with one that includes matchups where speculative (predicted) entrants fill the slots.

  **DOWNSTREAM CONSEQUENCE (Test 14): Empty leaderboard**

  Because students can only predict R1, the leaderboard has minimal or zero data to score.
  This resolves automatically once the cascade is implemented.

  **ISSUE A CLARIFICATION: Simple vs Advanced mode rendering**

  The routing logic in PredictiveBracket IS correct:
  - predictiveMode === 'advanced' -> AdvancedPredictionMode (BracketDiagram SVG)
  - predictiveMode === 'simple' (or null/default) -> SimplePredictionMode (vertical cards)

  The tester report "student saw the advanced bracket (full bracket)" in Test 13 suggests either:
  (a) The bracket was created with predictiveMode='advanced', OR
  (b) The tester described the limited R1-only card list as "the advanced bracket" because it
      looked incomplete/wrong. This needs verification against the actual bracket record.

  The mode routing itself is NOT buggy. Both modes share the same cascade gap.

fix: N/A (diagnosis only)
verification: N/A (diagnosis only)
files_changed: []

## Suggested Fix Direction

1. **Build a prediction cascade engine** (new utility or hook):
   - Input: bracket matchups (with nextMatchupId topology), current selections
   - Output: "augmented matchups" where later-round entrant slots are filled from predictions
   - Must handle cascading invalidation when earlier picks change
   - Algorithm:
     a. Start from R1 matchups (both entrants known from DB)
     b. For each matchup with a selection, find its nextMatchupId
     c. Determine slot via position parity (odd position -> entrant1, even -> entrant2)
     d. Set the speculative entrant in the next matchup
     e. If both slots of a later-round matchup are now filled, it becomes selectable
     f. Repeat until no more cascading is possible

2. **Replace nonByeMatchups filter** with a filter that includes matchups where
   speculative (prediction-derived) entrants fill both slots

3. **Update handleSelect** to trigger cascade recomputation after each pick

4. **Handle pick changes**: When a user changes an R1 pick, clear all downstream
   predictions that depended on the old pick, and re-cascade from the new pick

5. **Both modes need the same fix**: SimplePredictionMode and AdvancedPredictionMode
   should share the cascade logic (extract to a shared hook like `usePredictionCascade`)
