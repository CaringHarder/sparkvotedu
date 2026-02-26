---
status: diagnosed
trigger: "RR Bracket Completion Countdown has two problems: teacher view no celebration, student view shows WinnerReveal text, z-index bleed-through"
created: 2026-02-23T00:00:00Z
updated: 2026-02-23T00:00:00Z
---

## Current Focus

hypothesis: Multiple distinct root causes confirmed for all four reported issues
test: Code reading and logic tracing
expecting: N/A - diagnosis complete
next_action: Return findings

## Symptoms

expected: |
  1. Teacher view: When RR bracket completes, show countdown -> celebration with winner
  2. Student view: Countdown -> celebration screen directly (no "And the winner is..." intermediate)
  3. No "All votes in!" text bleeding through behind celebration overlay
  4. Design direction: ALL bracket types should go countdown -> celebration, skip WinnerReveal entirely
actual: |
  1. Teacher view: No countdown or celebration at all for RR brackets - stays on standings/matchups
  2. Student view: Countdown plays, then shows "Colosseum vs Taj Mahal" / "And the winner is..." text BEFORE celebration
  3. "All votes in!" text from simple voting view visible behind the celebration overlay
errors: None (behavioral bugs, not crashes)
reproduction: Complete all rounds of a round-robin bracket and observe both teacher and student views
started: Since WinnerReveal/CelebrationScreen was added to RR brackets

## Eliminated

(none - all hypotheses confirmed)

## Evidence

- timestamp: 2026-02-23T00:01:00Z
  checked: live-dashboard.tsx bracketDone variable (line 792-794)
  found: |
    bracketDone = isDoubleElim ? deBracketDone : (currentRound === totalRounds && allRoundDecided)
    This uses SE-centric logic (currentRound/totalRounds/allRoundDecided) which does NOT apply to RR brackets.
    For RR, totalRounds is a prop representing SE round count, not RR round count. currentRound and
    roundStatus are explicitly skipped for RR brackets. bracketDone will almost certainly never be true for RR.
  implication: ROOT CAUSE #1 identified - teacher side bracketDone never becomes true for RR

- timestamp: 2026-02-23T00:02:00Z
  checked: live-dashboard.tsx WinnerReveal trigger for RR (lines 246-293 and 325-369)
  found: |
    Path 1 (lines 246-293): Detects newly decided FINAL matchup. Guard on line 271-275 says:
      `!isRoundRobin && matchup.round === totalRounds && matchup.position === 1`
    This EXPLICITLY excludes RR with `!isRoundRobin`.

    Path 2 (lines 299-315): Fallback for DE only. Guard: `bracketCompleted && isDoubleElim`

    Path 3 (lines 325-369): General fallback. Guard: `bracketCompleted && !revealState && !hasShownRevealRef.current && !isDoubleElim`
    This DOES include RR (isRoundRobin is not excluded), and line 333 has RR-specific logic.
    BUT it depends on `bracketCompleted` from useRealtimeBracket which requires `bracket_completed`
    broadcast event OR fetched status === 'completed'. If bracketDone never becomes true, the bracket
    may never get marked 'completed' on the server, meaning bracketCompleted never fires.
  implication: Even if bracketCompleted eventually fires, the reveal chain DOES exist for teacher RR -
    but bracketDone being broken means the "Complete!" badge never shows and the bracket may not get
    marked completed server-side, blocking the bracketCompleted signal.

- timestamp: 2026-02-23T00:03:00Z
  checked: Student RRLiveView (bracket page.tsx lines 545-760)
  found: |
    Lines 589-609: When bracketCompleted fires, RRLiveView computes top2 entrants and sets revealState
    with { entrant1Name: top1, entrant2Name: top2 } after a 2-second delay.

    Lines 611-615: handleRevealComplete chains WinnerReveal -> CelebrationScreen.

    Lines 680-687: Renders <WinnerReveal entrant1Name={...} entrant2Name={...} onComplete={handleRevealComplete} />

    WinnerReveal (winner-reveal.tsx) has THREE stages: countdown -> pause -> reveal.
    The 'reveal' stage (lines 163-191) shows "{entrant1Name} vs {entrant2Name}" and
    "And the winner is..." text for 2.2 seconds before calling onComplete -> CelebrationScreen.

    User wants: countdown -> celebration directly. The WinnerReveal component's reveal stage
    is the unwanted intermediate step.
  implication: ROOT CAUSE #2 identified - WinnerReveal always shows "X vs Y" / "And the winner is..."
    reveal stage. The user wants to skip this entirely and go countdown -> celebration.

- timestamp: 2026-02-23T00:04:00Z
  checked: Student RRSimpleVoting "All votes in!" (bracket page.tsx lines 798-815)
  found: |
    Lines 798-815: When all matchups are voted on, RRSimpleVoting returns a div with
    "All votes in!" text and a pulsing progress bar. This is rendered inline in the
    normal page flow (not an overlay).

    CelebrationScreen (celebration-screen.tsx line 136) uses: `className="fixed inset-0 z-50 ..."`
    WinnerReveal (winner-reveal.tsx line 94) uses: `className="fixed inset-0 z-50 ..."`

    Both overlays use z-50, which should be on top of normal content. However, the "All votes in!"
    content sits in the normal document flow. The RRLiveView structure is:

    <div className="px-4 py-6">
      {revealState && <WinnerReveal ... />}     // fixed z-50
      {showCelebration && <CelebrationScreen ... />}  // fixed z-50
      ... tab bar and content (including RRSimpleVoting with "All votes in!") ...
    </div>

    The "All votes in!" div has no special z-index but sits in the normal flow. With z-50 overlays,
    normal content SHOULD be underneath. The bleed-through suggests either:
    a) The "All votes in!" content has a background that's not fully transparent and shows at edges
    b) The overlay bg-black/85 is not fully opaque, and "All votes in!" with its green checkmark
       and text is visible through the 15% transparency
    c) The celebration overlay centers content but doesn't cover the underlying text at exact
       same positions

    Most likely: bg-black/85 on CelebrationScreen (85% opacity) allows the bright green checkmark
    and "All votes in!" text to show through. The WinnerReveal has dynamic opacity starting at 0.6
    which is even more transparent.
  implication: ROOT CAUSE #3 identified - celebration overlay is bg-black/85 (not fully opaque),
    and the bright "All votes in!" content with green accent shows through the 15% transparency

- timestamp: 2026-02-23T00:05:00Z
  checked: Design direction - skip WinnerReveal entirely
  found: |
    User wants: countdown -> celebration screen on ALL bracket types and polls.
    Currently WinnerReveal has: countdown (3-2-1) -> pause (dots) -> reveal ("And the winner is...") -> onComplete.
    The countdown IS the desired behavior. The pause + reveal stages are unwanted.

    Two approaches:
    A) Modify WinnerReveal to skip 'pause' and 'reveal' stages, going directly from countdown -> onComplete
    B) Create a new countdown-only component, or add a prop to WinnerReveal like `countdownOnly`

    Either way, the chain should be: countdown (3-2-1) -> onComplete() -> CelebrationScreen
  implication: ROOT CAUSE #4 is architectural - WinnerReveal bundles countdown + "And the winner is..."
    as one component; they need to be separable

## Resolution

root_cause: |
  FOUR DISTINCT ROOT CAUSES:

  1. TEACHER VIEW - NO CELEBRATION FOR RR BRACKETS
     File: src/components/teacher/live-dashboard.tsx, line 792-794
     The `bracketDone` variable uses SE-centric logic:
       `bracketDone = isDoubleElim ? deBracketDone : (currentRound === totalRounds && allRoundDecided)`
     For RR brackets, `currentRound`, `totalRounds`, and `allRoundDecided` are all computed from
     SE round/roundStatus which don't apply to RR. `roundStatus` (lines 404-417) explicitly returns
     empty for non-SE, making `allRoundDecided` undefined/falsy. bracketDone is NEVER true for RR.

     This means:
     - The "Complete!" badge (line 1052) never shows
     - If bracketDone gates server-side completion marking, `bracketCompleted` from realtime hook
       never fires either, so the WinnerReveal fallback (lines 325-369) never triggers
     - Even if bracketCompleted fires independently, the flow DOES exist (Path 3, line 326 has
       `!isDoubleElim` which includes RR, and line 333 has RR-specific champion computation)

     FIX DIRECTION: bracketDone needs an RR-specific condition. For RR, bracket is done when ALL
     matchups across ALL rounds are decided. Something like:
       `isRoundRobin ? currentMatchups.length > 0 && currentMatchups.every(m => m.status === 'decided') : ...`

  2. STUDENT VIEW - WINNERREVEAL SHOWS "AND THE WINNER IS..." TEXT
     File: src/components/bracket/winner-reveal.tsx, lines 29, 62-77, 162-191
     WinnerReveal has four stages: countdown -> pause -> reveal -> done.
     The 'reveal' stage (lines 162-191) displays "{entrant1Name} vs {entrant2Name}" and
     "And the winner is..." for 2.2 seconds before calling onComplete.

     The user wants countdown -> celebration directly. The pause + reveal stages are unwanted
     in ALL contexts (not just RR).

     FIX DIRECTION: Either add a `countdownOnly` prop to WinnerReveal that skips pause+reveal
     stages and calls onComplete immediately after countdown reaches 0, OR remove the pause+reveal
     stages entirely since the user wants this behavior on ALL bracket types.

  3. STUDENT VIEW - "ALL VOTES IN!" Z-INDEX BLEED-THROUGH
     File: src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx, lines 798-815
     File: src/components/bracket/celebration-screen.tsx, line 136

     The "All votes in!" content (RRSimpleVoting, lines 798-815) includes a bright green checkmark
     icon (bg-green-100) and text that remains rendered in the DOM when the celebration overlay
     appears. CelebrationScreen uses `bg-black/85` (85% opacity background), allowing the
     underlying green/white content to bleed through the 15% transparency.

     FIX DIRECTION: Two options:
     a) Make CelebrationScreen background fully opaque: `bg-black` instead of `bg-black/85`
     b) Hide the underlying content when celebration is showing (e.g., conditionally render
        RRSimpleVoting only when !showCelebration && !revealState)
     Option (b) is cleaner as it also prevents any other content bleed.

  4. ARCHITECTURAL - WINNERREVEAL BUNDLES COUNTDOWN + REVEAL
     File: src/components/bracket/winner-reveal.tsx (entire component)
     The component name "WinnerReveal" and its architecture bundles the countdown (wanted)
     with the "And the winner is..." reveal (unwanted). All callers chain WinnerReveal ->
     CelebrationScreen, but CelebrationScreen already shows the winner name.

     Callers using WinnerReveal:
     - live-dashboard.tsx lines 801-807 (teacher SE/DE)
     - bracket page.tsx DEVotingView lines 493-498 (student DE)
     - bracket page.tsx RRLiveView lines 681-686 (student RR)

     FIX DIRECTION: Modify WinnerReveal to only do the countdown (3-2-1) and skip the
     pause+reveal stages entirely, then call onComplete. Since the user wants this on ALL
     bracket types, this is a universal change. The entrant1Name/entrant2Name props become
     unused and can be removed.

fix: (diagnosis only - not applied)
verification: (diagnosis only - not verified)
files_changed: []

## Files Requiring Changes

1. **src/components/teacher/live-dashboard.tsx**
   - Line 792-794: Fix `bracketDone` to include RR completion logic
   - RR done = all matchups decided (currentMatchups.every(m => m.status === 'decided'))

2. **src/components/bracket/winner-reveal.tsx**
   - Lines 29-31, 56-69, 63-69, 72-77, 137-191: Remove or skip 'pause' and 'reveal' stages
   - After countdown reaches 0, call onComplete() directly
   - Remove entrant1Name/entrant2Name props (no longer displayed) or keep for backward compat
   - Keep only: countdown (3-2-1) -> done -> onComplete()

3. **src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx**
   - Lines 798-815 (RRSimpleVoting "All votes in!" block): Either hide when celebration active
     OR make the celebration overlay fully opaque
   - Simplest: Pass showCelebration/revealState flags to RRSimpleVoting, or conditionally
     render the voting content only when not celebrating

4. **src/components/bracket/celebration-screen.tsx**
   - Line 136: Consider changing `bg-black/85` to `bg-black` for full opacity
   - This is the simpler z-index fix but may affect visual aesthetics
