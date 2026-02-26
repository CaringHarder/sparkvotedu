---
status: diagnosed
trigger: "RR Bracket Declares Winner in 3-Way Tie -- identical records and points still picks a winner"
created: 2026-02-23T00:00:00Z
updated: 2026-02-23T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED -- Champion display code does NOT use the proper standings function; it uses naive win-counting that cannot detect ties
test: Traced all four champion-selection code paths (teacher champion, teacher reveal, student champion, student reveal)
expecting: All four paths bypass `calculateRoundRobinStandings`
next_action: Return diagnosis

## Symptoms

expected: A 3-way tie with identical records and points should have proper tiebreaker logic or acknowledge the tie
actual: A winner is declared despite identical records and points
errors: None (logic bug, not runtime error)
reproduction: Create RR bracket with 3 teams where all teams have same W-L record and same points
started: Unknown

## Eliminated

- hypothesis: The `calculateRoundRobinStandings()` function itself is broken for ties
  evidence: The function correctly assigns equal rank for circular h2h ties (test at round-robin.test.ts line 374-387 confirms 3-way circular tie gets rank=1 for all three). The function also uses `fullyResolved: false` to properly flag unresolvable ties.
  timestamp: 2026-02-23

## Evidence

- timestamp: 2026-02-23
  checked: `src/lib/bracket/round-robin.ts` -- `calculateRoundRobinStandings()` function (lines 80-250)
  found: The standings function correctly handles ties. It sorts by points desc, then wins desc, then uses head-to-head tiebreaker. For 3+ way ties with circular h2h (A beats B, B beats C, C beats A), it correctly returns `fullyResolved: false` and assigns the same rank to all tied entrants. This function is CORRECT.
  implication: The bug is NOT in the standings computation itself.

- timestamp: 2026-02-23
  checked: `src/lib/bracket/__tests__/round-robin.test.ts` -- test at lines 374-387
  found: Test explicitly verifies that a 3-way circular tie (A beats B, B beats C, C beats A) results in all three teams getting rank=1. Test passes.
  implication: Confirms the standings logic is correct; the bug must be in how champion is selected from standings.

- timestamp: 2026-02-23
  checked: Teacher `championName` at `src/components/teacher/live-dashboard.tsx` lines 389-401
  found: For RR brackets, this code uses SE/DE logic: `currentMatchups.find((m) => m.round === totalRounds && m.position === 1)` -- it looks for a "final matchup" which does NOT EXIST in round robin. RR matchups don't have a single championship final. This will either return undefined (falling back to "Champion" string) or match some arbitrary matchup.
  implication: Teacher celebration shows either a generic "Champion" or an arbitrary entrant name. Does NOT use standings at all.

- timestamp: 2026-02-23
  checked: Teacher reveal winner at `src/components/teacher/live-dashboard.tsx` lines 328-369
  found: For RR, computes winner by counting matchup wins from decided matchups, then sorting by count descending: `[...wins.entries()].sort((a, b) => b[1].count - a[1].count)`. Takes `sorted[0]` as champion. When all teams have the same win count, JavaScript's `Array.sort()` is NOT guaranteed stable across engines -- it picks whichever element happens to come first. No tie detection whatsoever.
  implication: In a 3-way tie, picks an arbitrary winner based on Map iteration order (insertion order in V8/modern engines, which depends on matchup processing order).

- timestamp: 2026-02-23
  checked: Student `championName` at `src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx` lines 618-637
  found: Same naive approach -- iterates decided matchups, counts wins per entrant, picks the one with `maxWins`. When two or more entrants have the same win count, it simply keeps the first one found (due to `if (val.count > maxWins)` using strict greater-than, so the first entrant to reach that count wins and subsequent equal-count entrants are ignored).
  implication: Picks an arbitrary winner in a tie. The `>` (not `>=`) means it picks the entrant whose wins were counted first in Map iteration.

- timestamp: 2026-02-23
  checked: Student reveal at `src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx` lines 588-608
  found: Identical naive win-counting and sorting. `sorted[0]` becomes "top1" (winner) and `sorted[1]` becomes "top2" (runner-up). No tie detection.
  implication: Same arbitrary winner selection in a tie scenario.

- timestamp: 2026-02-23
  checked: Student page also computes `standings` at lines 640-656 using `calculateRoundRobinStandings()`
  found: The student page DOES call the proper standings function for the standings table display. But it does NOT use the standings result for champion/reveal selection -- those use separate naive win-counting code.
  implication: The correct logic exists and is called, but its output (including `rank` and tie detection) is ignored for champion selection.

- timestamp: 2026-02-23
  checked: `src/components/bracket/round-robin-standings.tsx`
  found: The standings table correctly displays rank from the standings data, including shared ranks (e.g., all rank=1 for a 3-way tie). But the champion celebration and reveal overlays never consult this data.
  implication: Users see the standings table showing a 3-way tie (all rank 1), then see a celebration screen declaring one of them the "champion" -- contradictory UX.

## Resolution

root_cause: |
  The champion/winner display code in 4 locations does NOT use the existing `calculateRoundRobinStandings()` function which correctly handles ties. Instead, each location independently re-implements a naive "count wins and pick the top" algorithm that has no tie detection.

  Specifically:

  1. **Teacher `championName`** (`live-dashboard.tsx:389-401`): Uses SE/DE "find final matchup" logic for ALL bracket types including RR. RR has no final matchup, so this either returns "Champion" fallback or matches an arbitrary matchup.

  2. **Teacher reveal** (`live-dashboard.tsx:328-369`): Counts matchup wins and sorts. Picks `sorted[0]` with no tie-awareness. In a 3-way tie, picks arbitrarily based on Map insertion order.

  3. **Student `championName`** (`student bracket page.tsx:618-637`): Iterates wins and tracks `maxWins` with strict `>`. First entrant to reach the max count becomes leader; subsequent tied entrants are ignored.

  4. **Student reveal** (`student bracket page.tsx:588-608`): Same naive win-counting and sorting as teacher reveal.

  Meanwhile, `calculateRoundRobinStandings()` in `src/lib/bracket/round-robin.ts` correctly:
  - Computes points (win=3, tie=1, loss=0)
  - Sorts by points, then wins
  - Applies head-to-head tiebreaker for 2-way ties
  - Detects circular/unresolvable N-way ties and assigns EQUAL rank
  - Returns `rank` field on each standing

  The student page even calls this function for the standings TABLE display (line 650), but ignores it for champion selection.

fix: |
  **Recommended fix approach:**

  1. Create a shared utility function (or reuse `calculateRoundRobinStandings`) that returns:
     - The champion name (if rank=1 is unique)
     - A tie indicator (if multiple entrants share rank=1)
     - The list of tied entrant names (for co-champion display)

  2. Update all 4 champion/reveal code paths to use the standings-based logic:
     - If exactly one entrant has rank=1: declare them champion
     - If multiple entrants share rank=1: either declare co-champions or show "Tie!" in celebration

  3. Update `CelebrationScreen` component to support a tie state:
     - Accept optional `isTie: boolean` and `tiedNames: string[]` props
     - Show "Co-Champions!" or "It's a tie!" with all tied names
     - Alternatively: show the tied entrant names with a shared trophy

  4. Update `WinnerReveal` component similarly for the countdown reveal:
     - Support showing "It's a tie!" between multiple entrants instead of a 1v1 reveal

  **Key files to modify:**
  - `src/components/teacher/live-dashboard.tsx` (teacher champion + reveal)
  - `src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx` (student champion + reveal)
  - `src/components/bracket/celebration-screen.tsx` (add tie support)
  - `src/components/bracket/winner-reveal.tsx` (add tie support, optional)

  **The simplest minimal fix** (before UX enhancements) would be to replace the naive win-counting in all 4 locations with a call to `calculateRoundRobinStandings()`, check if standings[0].rank is shared by multiple entrants, and if so, display "Co-Champions: A, B, C" instead of just "A".

verification:
files_changed: []
