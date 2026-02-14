---
status: diagnosed
trigger: "Investigate five issues with Round-Robin brackets from UAT Test 10 R3"
created: 2026-02-02T12:00:00Z
updated: 2026-02-02T12:00:00Z
---

# Round-Robin Student UI Issues (5 findings from UAT Test 10 R3)

---

## Issue 1: Old winner animation plays instead of new celebration

### Symptoms

When a round-robin bracket completes, the old `WinnerReveal` countdown animation plays instead of the newer `CelebrationScreen` (confetti + trophy) used by SE/DE brackets.

### Root Cause

**File:** `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx`
**Location:** `RRLiveView` component, lines 516-571

The `RRLiveView` component (student-facing round-robin view) has **zero winner/celebration logic**. It subscribes to real-time updates via `useRealtimeBracket` but never destructures `bracketCompleted` from the hook return, and never renders `WinnerReveal` or `CelebrationScreen`.

Contrast with `DEVotingView` (lines 384-511) which:
1. Destructures `bracketCompleted` from `useRealtimeBracket` (line 400)
2. Has a `useEffect` that triggers `WinnerReveal` when `bracketCompleted` fires (lines 424-438)
3. Has a second `useEffect` that shows `CelebrationScreen` after 4 seconds (lines 441-446)
4. Renders both overlays conditionally (lines 464-480)

On the **teacher side** (`LiveDashboard`, lines 222-268), the winner reveal logic explicitly checks `isDoubleElim` and `matchup.round === totalRounds` (SE/Predictive) but has **no round-robin branch**. When the bracket completes, neither the status-transition-based detection (lines 222-268) nor the fallback (lines 274-290) fire for RR brackets because:
- The status-transition detection checks for `bracketRegion === 'grand_finals'` (DE) or `matchup.round === totalRounds && matchup.position === 1` (SE) -- neither applies to RR matchups.
- The fallback only checks `isDoubleElim` (line 275).

So if any animation plays, it would be coming from a stale state or a different code path. If the user is seeing the "old" countdown-style animation, it is likely the `WinnerReveal` being triggered by the teacher's LiveDashboard (which the teacher sees, not the student), or the `bracketCompleted` event coincidentally matching the SE fallback logic when `totalRounds === 1` (since the live page sets `totalRounds = 1` for RR at line 87).

**The actual bug on the teacher side:**
In `LiveDashboard` lines 247-259, when `bracketCompleted` fires and `!isDoubleElim`, it checks `matchup.round === totalRounds && matchup.position === 1`. Since `totalRounds = 1` for RR (line 87 of live/page.tsx), and RR matchups do have `round: 1`, the **SE/Predictive reveal path fires for the first decided RR matchup in round 1**. This triggers the old `WinnerReveal` countdown. But the `CelebrationScreen` (with confetti) never shows because it depends on `bracketCompleted` which is separate -- it does show after 4s delay (line 294). The issue is the `WinnerReveal` showing for an arbitrary matchup winner rather than a meaningful "champion."

### Why It Happens

1. **Student side:** `RRLiveView` was never given winner/celebration logic. The imports for `WinnerReveal` and `CelebrationScreen` exist at the file top but are only used by `DEVotingView`.
2. **Teacher side:** The `totalRounds = 1` workaround for RR causes the SE winner-detection logic to misfire, picking an arbitrary matchup winner from round 1.

### Suggested Fix

**Student `RRLiveView` (lines 516-571):**
1. Destructure `bracketCompleted` from `useRealtimeBracket`.
2. Add state for `showCelebration` (no `WinnerReveal` countdown -- RR has no single "final matchup" to reveal).
3. Compute the champion from standings (highest-ranked entrant) or just show the bracket name.
4. When `bracketCompleted` fires, show `CelebrationScreen` directly (skip the countdown animation since RR has no dramatic final matchup).

**Teacher `LiveDashboard` (lines 222-268):**
1. Add `isRoundRobin` guard to the winner-detection `useEffect`. When `isRoundRobin`, do NOT try to find a "final matchup." Instead, when `bracketCompleted` fires, show `CelebrationScreen` directly with the leader from standings.
2. For the existing SE/Predictive path, add `&& !isRoundRobin` to the condition at line 247.

---

## Issue 2: No results/standings visible on student page

### Symptoms

Students can vote on RR matchups but cannot see the standings table or match results. Teacher sees standings in LiveDashboard, but students see an empty standings placeholder ("No results yet").

### Root Cause

**File:** `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx`
**Location:** `RRLiveView` component, line 555-558

```tsx
<RoundRobinStandings
  standings={[]}            // <-- HARDCODED EMPTY ARRAY
  isLive={bracket.roundRobinStandingsMode === 'live'}
/>
```

The `standings` prop is hardcoded to `[]` (empty array). This means the `RoundRobinStandings` component always renders either:
- "Standings will be revealed after the round closes." (if `isLive` is false)
- "No results yet. Standings will appear as matchups are decided." (if `isLive` is true and standings is empty)

**Why the teacher sees standings but students don't:**

The teacher's `LiveDashboard` receives standings computed server-side:
- **Server page** (`/brackets/[bracketId]/live/page.tsx`, lines 109-112): calls `getRoundRobinStandings(bracketId)` which queries decided matchups from the database and computes W-L-T records.
- **LiveDashboard** (line 958-961): passes the real `standings` array to `RoundRobinStandings`.

The student page has no equivalent. It fetches bracket state from `/api/brackets/[bracketId]/state`, but that API endpoint (`route.ts`) returns matchups, entrants, and bracket config -- it does **not** return computed standings. There is no `/api/brackets/[bracketId]/standings` endpoint, and the student page never calls `getRoundRobinStandings`.

### Why It Happens

The `RRLiveView` was implemented with a placeholder `standings={[]}`. The standings computation lives exclusively in the DAL (`getRoundRobinStandings` in `src/lib/dal/round-robin.ts`), which is a server-side function. No API route was created to expose standings to the client, and no client-side standings computation was implemented.

### Suggested Fix

Two approaches (choose one):

**Approach A: Add standings to the state API (recommended)**
1. In `/api/brackets/[bracketId]/state/route.ts`, import `getRoundRobinStandings` from the DAL.
2. When `bracket.bracketType === 'round_robin'`, call `getRoundRobinStandings(bracketId)` and include the result in the JSON response under a `standings` key.
3. Update `BracketStateResponse` in the student page to include `standings?: RoundRobinStanding[]`.
4. In `toBracketWithDetails` or in `RRLiveView`, pass the standings from the API response to `RoundRobinStandings`.
5. In `useRealtimeBracket`, when `bracket_update` events fire (e.g., `winner_selected`), the refetch will pull updated standings.

**Approach B: Client-side computation**
1. Compute standings client-side from `currentMatchups` in `RRLiveView` -- filter for `status === 'decided'` matchups and compute W-L-T from `winnerId`.
2. This is feasible since the pure calculation function `calculateRoundRobinStandings` exists in `src/lib/bracket/round-robin.ts` -- it could be imported client-side.

Approach A is cleaner because it keeps the computation server-side and stays consistent with the teacher view.

---

## Issue 3: Need tabbed UI (Voting / Results) like predictive brackets

### Symptoms

Students want a tabbed interface to toggle between "Voting" (the matchup grid where they vote) and "Results" (standings table). Predictive brackets already have this pattern (Bracket/Predictions tabs).

### Root Cause

**File:** `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx`
**Location:** `RRLiveView` component, lines 546-570

The current `RRLiveView` renders standings and matchups stacked vertically with no tab navigation:

```tsx
<div className="space-y-4">
  <RoundRobinStandings ... />
  <RoundRobinMatchups ... />
</div>
```

In contrast, `PredictiveStudentView` (lines 580-671) implements a full tabbed UI:
- State: `const [activeTab, setActiveTab] = useState<'bracket' | 'results'>('bracket')`
- Tab bar: Two buttons with active/inactive styling (lines 628-651)
- Conditional rendering based on `activeTab` (lines 654-669)

`RRLiveView` lacks this pattern entirely.

### Why It Happens

The RR student view was implemented as a straightforward vertical layout (standings on top, matchups below). The tabbed UX pattern was only built for predictive brackets. Nobody ported the tab pattern to RR.

### Suggested Fix

1. In `RRLiveView`, add tab state:
   ```tsx
   const [activeTab, setActiveTab] = useState<'voting' | 'results'>('voting')
   ```

2. Add the tab bar (copy the pattern from `PredictiveStudentView` lines 628-651), changing labels to "Voting" and "Results".

3. Conditionally render based on `activeTab`:
   - `'voting'`: render `<RoundRobinMatchups ... />`
   - `'results'`: render `<RoundRobinStandings ... />`

4. This also depends on Issue 2 being fixed -- standings must have real data for the Results tab to be meaningful.

**Reference implementation:** `PredictiveStudentView` at lines 618-670 in the same file.

---

## Issue 4: No visual distinction between simple and advanced matchup layout

### Symptoms

Round-robin brackets have a `roundRobinVotingStyle` setting (`'simple'` or `'advanced'`), configured by the teacher in the bracket form. Both modes currently render identically on the student side.

### Root Cause

**File:** `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/components/bracket/round-robin-matchups.tsx`
**Full file (lines 1-371)**

The `RoundRobinMatchups` component has a single rendering path for all matchups. It does not accept or use a `votingStyle` prop. The `MatchupCard` sub-component (lines 180-371) renders the same compact card layout regardless of whether the bracket is configured as `simple` or `advanced`.

The `roundRobinVotingStyle` value IS stored in the database and returned by the state API (line 79 of `route.ts`), and it IS mapped into `BracketWithDetails` (line 727 of the student page). However, **it is never passed to `RoundRobinMatchups`** and the component has no prop for it.

**In `RRLiveView` (student page lines 559-567):**
```tsx
<RoundRobinMatchups
  matchups={currentMatchups}
  entrants={bracket.entrants}
  currentRound={currentRound}
  pacing={...}
  isTeacher={false}
  onStudentVote={handleStudentVote}
  votedMatchups={votedMatchups}
/>
// NOTE: No votingStyle prop passed
```

**In `LiveDashboard` (lines 969-978):**
```tsx
<RoundRobinMatchups
  matchups={currentMatchups}
  entrants={bracket.entrants}
  currentRound={currentRoundRobinRound}
  pacing={...}
  isTeacher={true}
  onRecordResult={handleRecordRoundRobinResult}
  voteCounts={mergedVoteCounts}
  onBatchDecideByVotes={handleBatchDecideByVotes}
/>
// NOTE: No votingStyle prop passed here either
```

### Why It Happens

The `roundRobinVotingStyle` configuration was added to the bracket form and database schema but the rendering differentiation was never implemented in the `RoundRobinMatchups` component. The component always renders the same "compact card" layout.

### Suggested Fix

1. Add a `votingStyle: 'simple' | 'advanced'` prop to `RoundRobinMatchupsProps`.

2. Define visual differences:
   - **Simple mode** (current layout): Compact cards with entrant names, vote buttons, and status badges. Minimal info.
   - **Advanced mode**: Expanded cards showing vote count bars/percentages, matchup history (if available), entrant records (W-L-T from standings), and a more detailed grid layout.

3. In `MatchupCard`, branch rendering based on `votingStyle`:
   - Simple: current compact layout
   - Advanced: larger cards with more data (vote count progress bars, entrant W-L records inline, etc.)

4. Pass `bracket.roundRobinVotingStyle` (or `'simple'` as default) from both `RRLiveView` and `LiveDashboard` into the component.

---

## Issue 5: Future rounds visible as "upcoming" instead of hidden for round-by-round pacing

### Symptoms

When pacing is `round_by_round`, future rounds show on the student page with an "Upcoming" badge and a clock icon, instead of being hidden entirely. Students might think they should be able to vote on them.

### Root Cause

**File:** `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/components/bracket/round-robin-matchups.tsx`
**Location:** Lines 83-90

```tsx
const visibleRounds = !isTeacher && pacing === 'round_by_round'
  ? roundNumbers.filter((rn) => {
      const rm = roundsMap.get(rn) ?? []
      // Show rounds that have at least one non-pending matchup, OR are the current round
      return rm.some((m) => m.status !== 'pending') || rn === currentRound
    })
  : roundNumbers
```

This filter is ALMOST correct but has a gap. The logic shows:
- Rounds with at least one non-pending matchup (voting or decided)
- The `currentRound` (even if all its matchups are pending)

The problem: `currentRound` is computed in `RRLiveView` as:
```tsx
const currentRound = currentMatchups.find((m) => m.status !== 'decided')?.roundRobinRound ?? 1
```

This finds the **first matchup that is NOT `decided`** and uses its `roundRobinRound`. If all of round 1 is decided and round 2 has been opened for voting, `currentRound` becomes the round of the first `voting` matchup in round 2. That is correct.

However, the `visibleRounds` filter shows rounds where `rm.some((m) => m.status !== 'pending')`. This means:
- Round 1 (all decided): visible (has non-pending matchups) -- correct
- Round 2 (voting): visible (has non-pending matchups) -- correct
- Round 3+ (all pending): should be HIDDEN

The filter actually works correctly for hiding fully-pending future rounds. Let me re-examine more carefully.

**Second look -- the actual bug:**

The `currentRound` computed in `RRLiveView` (line 529) uses `.find()` on the matchup array which is ordered by `round ASC, position ASC`. If round 1 is all decided but round 2 has NOT been opened yet (all pending), then:

```tsx
currentMatchups.find((m) => m.status !== 'decided')?.roundRobinRound ?? 1
```

This returns round 2's `roundRobinRound` because the first non-decided matchup is in round 2. Then in `visibleRounds`:
- `rn === currentRound` matches round 2
- Round 2 matchups are all pending, but `rn === currentRound` is true, so round 2 shows

So the student sees Round 2 with all-pending matchups displaying the "Upcoming" badge with clock icons, even though the teacher hasn't opened round 2 for voting yet. This is the confusing state the user reports.

The real problem is two-fold:
1. `currentRound` calculation is wrong for RR pacing. It should be the latest round that has been opened (has voting or decided matchups), NOT the first undecided round.
2. Even when `currentRound` is correct, the `visibleRounds` filter still includes it even if all its matchups are pending (which means it hasn't been opened yet).

**Note:** The teacher LiveDashboard (`currentRoundRobinRound`, lines 465-472) computes this correctly:
```tsx
const activeRounds = currentMatchups
  .filter((m) => m.roundRobinRound != null && m.status !== 'pending')
  .map((m) => m.roundRobinRound!)
if (activeRounds.length === 0) return 1
return Math.max(...activeRounds)
```
This returns the **highest round with non-pending matchups**, which is the correct "current" round.

### Why It Happens

The `RRLiveView` uses a naive `currentRound` calculation (first non-decided matchup's round) instead of the teacher dashboard's correct calculation (highest round with non-pending matchups). This causes the `visibleRounds` filter to include the next un-opened round via the `rn === currentRound` escape hatch.

### Suggested Fix

1. In `RRLiveView` (line 529), replace the `currentRound` calculation with the same logic used in `LiveDashboard`:

   ```tsx
   const currentRound = useMemo(() => {
     const activeRounds = currentMatchups
       .filter((m) => m.roundRobinRound != null && m.status !== 'pending')
       .map((m) => m.roundRobinRound!)
     if (activeRounds.length === 0) return 1
     return Math.max(...activeRounds)
   }, [currentMatchups])
   ```

   Note: `RRLiveView` currently does NOT use `useMemo` -- it computes `currentRound` inline. This should be changed to `useMemo` for consistency and correctness.

2. Optionally, also tighten the `visibleRounds` filter in `RoundRobinMatchups` to remove the `rn === currentRound` fallback entirely, since the only time it matters is when the current round is all-pending (which is the exact case we want to hide):

   ```tsx
   const visibleRounds = !isTeacher && pacing === 'round_by_round'
     ? roundNumbers.filter((rn) => {
         const rm = roundsMap.get(rn) ?? []
         return rm.some((m) => m.status !== 'pending')
       })
     : roundNumbers
   ```

   This is safe because if a round has been opened for voting, at least one matchup will be `voting` (not `pending`), so it passes the filter. If all matchups are pending, the round hasn't been opened and should be hidden.

---

## Summary Table

| # | Issue | Root Cause File | Root Cause Type | Severity |
|---|-------|----------------|-----------------|----------|
| 1 | Old winner animation instead of celebration | `page.tsx` (`RRLiveView`) + `live-dashboard.tsx` | Missing feature (no RR celebration logic) + wrong branch (SE logic misfires for RR) | Medium |
| 2 | No standings visible to students | `page.tsx` (`RRLiveView`) line 556 | Hardcoded `standings={[]}` + no API endpoint for standings | High |
| 3 | No tabbed Voting/Results UI | `page.tsx` (`RRLiveView`) lines 554-568 | Missing feature (tab pattern not implemented for RR) | Medium |
| 4 | No simple vs advanced visual distinction | `round-robin-matchups.tsx` | Missing feature (`votingStyle` prop never implemented) | Low |
| 5 | Future rounds visible as "upcoming" | `page.tsx` (`RRLiveView`) line 529 + `round-robin-matchups.tsx` lines 83-90 | Wrong `currentRound` calculation exposes un-opened rounds | High |

## Files Involved

- `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx` -- Issues 1, 2, 3, 5
- `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/components/bracket/round-robin-matchups.tsx` -- Issues 4, 5
- `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/components/teacher/live-dashboard.tsx` -- Issue 1 (teacher side)
- `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/app/api/brackets/[bracketId]/state/route.ts` -- Issue 2 (missing standings in API)
- `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/lib/dal/round-robin.ts` -- Issue 2 (standings function exists server-side only)
- `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/components/bracket/round-robin-standings.tsx` -- Issue 2 (component works, just never given data)
