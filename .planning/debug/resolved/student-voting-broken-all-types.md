---
status: diagnosed
trigger: "Student Voting Broken Across All Bracket Types (Cluster A) - Phase 07 UAT Round 2"
created: 2026-02-01T00:00:00Z
updated: 2026-02-01T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Multiple root causes across DE, RR, and the student page
test: Code trace of voting interaction path from student click to server action
expecting: Identified gaps in prop threading and missing interactive components
next_action: Document findings for fix plan

## Symptoms

expected: Students can click entrants to vote in DE, RR, and Predictive brackets when teacher opens voting
actual: (1) DE bracket shows Winners/Losers tabs but entrants are not clickable. (2) RR bracket shows matchups but says "Upcoming" - students cannot vote. (3) RR shows all matchups even in simple mode.
errors: No JS errors reported - the UI renders but is non-interactive for voting
reproduction: Teacher creates DE/RR bracket, activates it, opens voting. Student joins. Student sees bracket structure but cannot interact.
started: After 07-14 refactored student bracket page to route by bracket type

## Eliminated

(none - all hypotheses confirmed on first investigation pass)

## Evidence

- timestamp: 2026-02-01T00:01:00Z
  checked: Student bracket page (src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx) lines 348-364
  found: |
    DE bracket rendering at line 355-363 passes to DoubleElimDiagram with ONLY these props:
      bracket, entrants, matchups, isTeacher=false
    MISSING: No participantId, no initialVotes, no castVote handler, no onEntrantClick, no votedEntrantIds.
    Compare to SE path at line 383-390 which passes to AdvancedVotingView WITH participantId and initialVotes.
  implication: |
    ROOT CAUSE #1 (DE): The student page renders DoubleElimDiagram as a READ-ONLY visualization.
    It never wraps it in AdvancedVotingView or provides any voting mechanism.

- timestamp: 2026-02-01T00:02:00Z
  checked: DoubleElimDiagram component (src/components/bracket/double-elim-diagram.tsx) lines 129-134 and 280-293
  found: |
    DoubleElimDiagram accepts: { bracket, entrants, matchups, isTeacher? }
    It renders BracketDiagram WITHOUT passing onEntrantClick, votedEntrantIds, or votedMatchupIds.
    BracketDiagram (bracket-diagram.tsx line 27) DOES accept onEntrantClick and votedEntrantIds as optional props.
    These props enable voting when present (line 135: isClickable = isVoting && onEntrantClick && !isByeMatchup).
    But DoubleElimDiagram never threads them through.
  implication: |
    ROOT CAUSE #1a: Even if the student page DID pass vote handlers, DoubleElimDiagram has no prop
    for onEntrantClick/votedEntrantIds and would not forward them to BracketDiagram.
    The component needs new props added AND the student page needs to provide them.

- timestamp: 2026-02-01T00:03:00Z
  checked: AdvancedVotingView (src/components/student/advanced-voting-view.tsx) - the WORKING voting path for SE brackets
  found: |
    AdvancedVotingView provides the complete voting pipeline:
    1. Uses useRealtimeBracket hook for live matchup updates (line 41)
    2. Imports and calls castVote server action (line 8, 99)
    3. Manages vote state with useState (line 35)
    4. Passes onEntrantClick handler to BracketDiagram (line 169)
    5. Passes votedEntrantIds to BracketDiagram (line 170)
    6. Shows voting status badge and progress counter (lines 141-161)
    DE brackets bypass ALL of this. They render DoubleElimDiagram directly instead.
  implication: |
    The working SE flow is: StudentPage -> AdvancedVotingView -> BracketDiagram (with onEntrantClick)
    The broken DE flow is: StudentPage -> DoubleElimDiagram -> BracketDiagram (WITHOUT onEntrantClick)
    DE needs either: (a) its own voting wrapper, or (b) DoubleElimDiagram enhanced with vote props.

- timestamp: 2026-02-01T00:04:00Z
  checked: Student page RR rendering (lines 323-346) and RoundRobinMatchups component
  found: |
    Student page renders RoundRobinMatchups with isTeacher=false and NO onRecordResult prop.
    RoundRobinMatchups MatchupCard (line 227): Teacher voting controls only render when
    isTeacher=true AND isVoting=true AND onRecordResult exists.
    For students (isTeacher=false): there are NO vote interaction elements at all.
    The MatchupCard for students shows only status badges: "Upcoming", "Decided", or "Tie".
    There are no clickable elements, no castVote call, no vote buttons for students.
  implication: |
    ROOT CAUSE #2 (RR): RoundRobinMatchups has NO student voting UI at all.
    It was designed as a teacher-only component for recording results.
    RR student voting was never implemented - the component only has teacher controls.
    Students need either: (a) vote buttons added to MatchupCard when isTeacher=false,
    or (b) a separate student-facing RR voting component.

- timestamp: 2026-02-01T00:05:00Z
  checked: RR matchup status transition flow
  found: |
    RR matchups are created with status='pending' (round-robin.ts:83).
    For round_by_round pacing, advanceRoundRobinRound (line 225-232) transitions
    pending matchups to 'voting' status for the SPECIFIED round number.
    But the teacher's "Open Round N" button (live-dashboard.tsx:284-294) calls
    advanceRound with roundNumber = currentRoundRobinRound + 1.
    The FIRST round (round 1) is never transitioned to 'voting' because:
    - The bracket starts with all matchups as 'pending'
    - The "Open Round" button only appears when canAdvanceRoundRobin is true (line 262-270)
    - canAdvanceRoundRobin requires currentRoundMatchups.every(m.status === 'decided') - but
      round 1 matchups are 'pending', not 'decided'
    - There is NO "Open Voting" button for RR in the live dashboard (the SE/DE "Open Voting"
      button is gated by !isRoundRobin at line 393)
  implication: |
    ROOT CAUSE #3 (RR initial round): There is no mechanism for the teacher to open
    voting on the FIRST round of a round-robin bracket. The existing "Open Voting" button
    is filtered out for RR brackets, and the "Open Round N" button only opens SUBSEQUENT rounds.
    Even if student RR voting UI existed, matchups would stay 'pending' forever for round 1.

- timestamp: 2026-02-01T00:06:00Z
  checked: RR "shows all matchups even in simple mode" symptom (test 10)
  found: |
    Student page (line 323-345) renders RoundRobinMatchups with:
      pacing={(bracket.roundRobinPacing ?? 'round_by_round') as ...}
    RoundRobinMatchups component (line 51-56):
      For round_by_round: defaultExpanded = new Set([currentRound])
      For all_at_once: defaultExpanded = new Set(roundNumbers)
    However, there is no filtering of MATCHUPS based on pacing.
    Even in round_by_round mode, ALL rounds are rendered (just collapsed).
    Students can expand any round by clicking the round header (line 87-108).
    This matches symptom: "showed all matchups even in simple mode" - student can see
    and expand all rounds, just with only the current round expanded by default.
  implication: |
    ROOT CAUSE #4 (RR pacing visibility): For round_by_round pacing on the student side,
    future rounds should likely be hidden entirely (not just collapsed), or at least
    their matchups should be hidden. Currently students can see ALL round robin matchups.

- timestamp: 2026-02-01T00:07:00Z
  checked: DE Grand Finals card voting interaction
  found: |
    GrandFinalsCard (double-elim-diagram.tsx:64-126) is a completely read-only component.
    It shows entrant names and "Voting in progress" text but has NO click handlers.
    Even if Winners/Losers tabs got voting enabled via BracketDiagram, the Grand Finals
    tab would still be non-interactive because it uses its own custom card component.
  implication: |
    ROOT CAUSE #1b: Grand Finals in DE brackets are doubly broken - both because
    DoubleElimDiagram doesn't support voting AND because the GrandFinalsCard component
    itself has no voting interaction.

- timestamp: 2026-02-01T00:08:00Z
  checked: Student page real-time updates for DE/RR
  found: |
    The student page (lines 84-168) fetches bracket state ONCE on mount via useEffect.
    It does NOT use useRealtimeBracket hook at all.
    Compare: AdvancedVotingView and SimpleVotingView both use useRealtimeBracket
    for live matchup status changes.
    For DE/RR on the student page, when the teacher opens voting (changing matchup status
    from 'pending' to 'voting'), the student page will NOT see the change until hard refresh.
    This matches symptom: "had to hard refresh to allow voting"
  implication: |
    ROOT CAUSE #5 (all non-SE types): The student bracket page has no real-time subscription
    for DE/RR/Predictive brackets. It loads state once and never updates.
    SE brackets work because they go through AdvancedVotingView/SimpleVotingView which
    have their own useRealtimeBracket subscriptions.

## Resolution

root_cause: |
  Five interconnected root causes, all stemming from the 07-14 bracket type routing refactor
  adding VISUAL routing without adding INTERACTIVE voting support:

  **RC1 - DE brackets have no voting mechanism on student page**
  File: src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx (lines 348-364)
  File: src/components/bracket/double-elim-diagram.tsx (lines 9-14, 129-134)
  The student page renders DoubleElimDiagram directly (read-only visualization) instead of
  wrapping it in a voting-capable component. DoubleElimDiagram itself lacks props for
  onEntrantClick/votedEntrantIds and does not thread them to its child BracketDiagram.
  The GrandFinalsCard sub-component is also entirely read-only.

  **RC2 - RR brackets have no student voting UI**
  File: src/components/bracket/round-robin-matchups.tsx (lines 144-255)
  RoundRobinMatchups was designed as a teacher-only interaction component. When isTeacher=false,
  the MatchupCard renders only status badges (Upcoming/Decided/Tie) with zero clickable elements.
  No castVote call, no vote buttons, no entrant selection for students.

  **RC3 - RR round 1 matchups can never be opened for voting**
  File: src/components/teacher/live-dashboard.tsx (lines 393, 262-270, 284-294)
  The SE/DE "Open Voting" button is explicitly excluded for RR (!isRoundRobin).
  The RR "Open Round N" button only works for rounds AFTER the current one completes.
  Round 1 starts as 'pending' with no UI path to transition it to 'voting'.

  **RC4 - RR shows all rounds to students regardless of pacing mode**
  File: src/components/bracket/round-robin-matchups.tsx (lines 51-56, 77-128)
  In round_by_round mode, all rounds are rendered (just collapsed). Students can expand and
  see future round matchups, violating the expectation that only the current round is visible.

  **RC5 - No real-time updates for DE/RR/Predictive on student page**
  File: src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx (lines 84-168)
  The student page fetches bracket state once via useEffect and never subscribes to real-time
  updates. When teacher opens voting, students don't see the status change without hard refresh.
  SE brackets work because AdvancedVotingView/SimpleVotingView use useRealtimeBracket internally.

fix: (not applied - diagnosis only)
verification: (not applied - diagnosis only)
files_changed: []

## Suggested Fix Directions

### RC1 Fix (DE voting)
Two-part fix needed:
1. Add onEntrantClick, votedEntrantIds, and votedMatchupIds props to DoubleElimDiagram interface.
   Thread them through to each BracketDiagram rendered in winners/losers tabs.
   Add entrant click support to GrandFinalsCard.
2. On the student page, either:
   (a) Wrap DoubleElimDiagram in a new DE-specific voting wrapper that uses useRealtimeBracket
       and castVote (similar to AdvancedVotingView), OR
   (b) Enhance AdvancedVotingView to accept a custom diagram renderer prop and render
       DoubleElimDiagram instead of plain BracketDiagram.

### RC2 Fix (RR student voting)
Add student voting elements to RoundRobinMatchups MatchupCard when isTeacher=false and
status==='voting'. Could be simple entrant-click buttons that call a castVote callback prop.
The student page would need to pass an onStudentVote callback that calls the castVote server action.
Alternatively, create a dedicated StudentRoundRobinVoting component.

### RC3 Fix (RR round 1 opening)
Add a mechanism for the teacher to open round 1 for voting. Options:
- Add an "Open Round 1" button in the live dashboard for RR brackets when round 1 is all pending
- Auto-open round 1 when the bracket is activated
- Reuse the existing openMatchupsForVoting infrastructure for RR

### RC4 Fix (RR pacing visibility)
For round_by_round pacing on the student side, filter out rounds beyond the current round
(or rounds that are all 'pending') instead of just collapsing them.

### RC5 Fix (real-time updates)
Add useRealtimeBracket to the student bracket page for DE/RR/Predictive paths, or restructure
so these types use voting wrapper components that already include the hook.
