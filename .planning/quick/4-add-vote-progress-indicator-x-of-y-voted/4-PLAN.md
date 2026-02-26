---
phase: quick-4
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/teacher/live-dashboard.tsx
  - src/components/teacher/vote-progress-bar.tsx
autonomous: true
requirements: [QUICK-4]

must_haves:
  truths:
    - "Teacher sees an 'X of Y voted (P%)' indicator with progress bar on the live bracket view"
    - "Progress bar updates in real-time as students vote"
    - "Indicator shows participation for currently-voting matchups in the active round/region"
    - "Indicator is hidden when no matchups are currently open for voting"
    - "Works for all bracket types: SE, DE, RR, Predictive, Large"
  artifacts:
    - path: "src/components/teacher/vote-progress-bar.tsx"
      provides: "Reusable vote progress bar component"
      min_lines: 30
    - path: "src/components/teacher/live-dashboard.tsx"
      provides: "Integration of progress bar into bracket live view"
  key_links:
    - from: "src/components/teacher/vote-progress-bar.tsx"
      to: "live-dashboard.tsx"
      via: "props: votedCount, totalCount, isActive"
      pattern: "VoteProgressBar"
    - from: "src/components/teacher/live-dashboard.tsx"
      to: "initialVoterIds + realtimeVoteCounts"
      via: "useMemo aggregation of unique voters across voting matchups"
      pattern: "uniqueVoters|aggregateVoters"
---

<objective>
Add a vote progress indicator ("X of Y voted") with a green progress bar to the bracket teacher live dashboard, visible when matchups are open for voting. Matches the existing poll-results participation pattern for visual consistency.

Purpose: Teachers currently lack at-a-glance participation visibility in bracket mode. The participation sidebar shows per-matchup counts but requires opening/expanding and selecting a matchup. A top-level progress bar gives immediate feedback.
Output: New VoteProgressBar component + integration into LiveDashboard
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/teacher/live-dashboard.tsx
@src/components/teacher/participation-sidebar.tsx
@src/components/poll/poll-results.tsx (lines 140-167 for pattern reference)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create VoteProgressBar component</name>
  <files>src/components/teacher/vote-progress-bar.tsx</files>
  <action>
Create a new client component `VoteProgressBar` that displays bracket voting participation.

Props interface:
- `votedCount: number` -- unique students who have voted
- `totalCount: number` -- total participants
- `isActive: boolean` -- whether voting is currently open (controls pulse indicator)
- `label?: string` -- optional context label (e.g., "Round 2" or "Winners R1")

Visual pattern (replicate from poll-results.tsx lines 140-167):
1. Row with: green pulse dot (if active, else amber static dot) + status label ("Voting" if active) + vertical divider + "X of Y voted (P%)" in tabular-nums + optional round label
2. Below: green progress bar (h-2, rounded-full, bg-muted track, bg-green-500 fill with transition-all duration-500)
3. When votedCount >= totalCount and totalCount > 0, show "All voted!" badge (green-100 bg, green-700 text, rounded-full) next to the count text

Wrap the entire component in a container: `rounded-lg border bg-card px-4 py-2.5` to match the visual weight of the top action bar. Entire component returns null if `totalCount === 0` (no participants).

Use Tailwind classes only, no external dependencies. Mark as 'use client'.
  </action>
  <verify>TypeScript compiles: `npx tsc --noEmit --pretty 2>&1 | grep vote-progress-bar` returns no errors</verify>
  <done>VoteProgressBar component exists, renders participation indicator with progress bar, handles edge cases (0 participants, all voted)</done>
</task>

<task type="auto">
  <name>Task 2: Integrate VoteProgressBar into LiveDashboard</name>
  <files>src/components/teacher/live-dashboard.tsx</files>
  <action>
Add VoteProgressBar to the LiveDashboard, positioned between the error bar (line ~1179) and the "Main content: diagram + sidebar" section (line ~1268). This placement keeps it visible without cluttering the top action bar.

**Step 1: Compute aggregate voter count across voting matchups**

Add a `useMemo` that computes `{ votedCount, totalCount, isVotingActive, roundLabel }`:

For ALL bracket types, find the currently-voting matchups:
- SE/Predictive (non-auto): `currentMatchups.filter(m => m.round === currentRound && m.status === 'voting')`
- DE: `deActiveRegionMatchups.filter(m => m.round === deCurrentDbRound && m.status === 'voting')`
- RR: `currentMatchups.filter(m => m.roundRobinRound === currentRoundRobinRound && m.status === 'voting')`
- Predictive auto / Sports: skip (no student voting)

For the voted count, union unique voter IDs from `initialVoterIds` across all voting matchups. Also check `realtimeVoteCounts[matchupId]?.total` -- if it's higher than the initialVoterIds length for that matchup, use the realtime total instead (real-time data is more current). The aggregate formula:
```
const voterIdSets = votingMatchups.map(m => new Set(initialVoterIds[m.id] ?? []))
const unionIds = new Set(voterIdSets.flatMap(s => [...s]))
// Also check if realtime totals suggest more voters than initial data shows
// For each matchup, take max(initialVoterIds.length, realtimeTotal)
// But for unique count across matchups, we can only deduplicate with IDs
// So: use union of IDs as base, then add excess from realtime if any single matchup's
// realtime total exceeds its initialVoterIds count
let votedCount = unionIds.size
for (const m of votingMatchups) {
  const realtimeTotal = Object.values(realtimeVoteCounts[m.id] ?? {}).reduce((a, b) => a + b, 0) / 2
  // Note: realtimeVoteCounts has {entrantId: count} but NOT total at this level
  // Actually use mergedVoteCounts which combines initial + realtime
  const counts = mergedVoteCounts[m.id] ?? {}
  const matchupTotalVotes = Math.max(...Object.values(counts).map(v => typeof v === 'number' ? v : 0), 0)
  // Total votes on a matchup = sum of votes for each entrant... but each student votes for ONE entrant
  // So total unique voters on matchup = sum of all entrant vote counts
  const matchupVoterCount = Object.values(counts).reduce((a, v) => a + (typeof v === 'number' ? v : 0), 0)
  const initialCount = (initialVoterIds[m.id] ?? []).length
  if (matchupVoterCount > initialCount) {
    votedCount += (matchupVoterCount - initialCount)
  }
}
```

SIMPLIFICATION: Actually, since each student votes once per matchup and each matchup's total voters = sum of entrant vote counts, and we want unique voters across ALL matchups, the most reliable approach for real-time accuracy:

```typescript
const votingProgressData = useMemo(() => {
  // Find voting matchups based on bracket type
  let votingMatchups: MatchupData[]
  let roundLabel: string | undefined

  if (isPredictiveAuto || isSports) {
    return { votedCount: 0, totalCount: 0, isVotingActive: false, roundLabel: undefined }
  }

  if (isDoubleElim && deActiveRegionInfo) {
    votingMatchups = deActiveRegionMatchups.filter(
      m => m.round === deCurrentDbRound && m.status === 'voting'
    )
    roundLabel = `${getRegionDisplayName(deRegion)} ${getDeRoundLabel(deActiveRegionInfo.currentDisplayRound, deActiveRegionInfo.displayRounds, deRegion)}`
  } else if (isRoundRobin) {
    votingMatchups = currentMatchups.filter(
      m => m.roundRobinRound === currentRoundRobinRound && m.status === 'voting'
    )
    roundLabel = `Round ${currentRoundRobinRound}`
  } else {
    // SE, Predictive (vote-based)
    votingMatchups = currentMatchups.filter(
      m => m.round === currentRound && m.status === 'voting'
    )
    if (totalRounds > 1) roundLabel = getRoundLabel(currentRound)
  }

  if (votingMatchups.length === 0) {
    return { votedCount: 0, totalCount: participants.length, isVotingActive: false, roundLabel }
  }

  // Union unique voter IDs across all voting matchups from initialVoterIds
  const allVoterIds = new Set<string>()
  for (const m of votingMatchups) {
    for (const id of (initialVoterIds[m.id] ?? [])) {
      allVoterIds.add(id)
    }
  }

  // Check realtime vote counts for any matchup -- if sum of entrant votes
  // exceeds initialVoterIds length, real-time data has newer info
  let realtimeExcess = 0
  for (const m of votingMatchups) {
    const counts = mergedVoteCounts[m.id] ?? {}
    const matchupVoterCount = Object.values(counts).reduce((sum, v) => sum + v, 0)
    const initialCount = (initialVoterIds[m.id] ?? []).length
    if (matchupVoterCount > initialCount) {
      realtimeExcess = Math.max(realtimeExcess, matchupVoterCount - initialCount)
    }
  }

  const votedCount = allVoterIds.size + realtimeExcess

  return {
    votedCount: Math.min(votedCount, participants.length),
    totalCount: participants.length,
    isVotingActive: true,
    roundLabel,
  }
}, [
  isPredictiveAuto, isSports, isDoubleElim, isRoundRobin,
  deActiveRegionInfo, deActiveRegionMatchups, deCurrentDbRound, deRegion,
  currentMatchups, currentRoundRobinRound, currentRound, totalRounds,
  participants.length, initialVoterIds, mergedVoteCounts,
])
```

Place this useMemo near the other derived data (around line 497, after voteLabels).

**Step 2: Render VoteProgressBar**

Import VoteProgressBar at the top of the file. Add it after the error bar section (after line ~1179), before the "Main content" div:

```tsx
{/* Vote progress indicator */}
{votingProgressData.isVotingActive && (
  <VoteProgressBar
    votedCount={votingProgressData.votedCount}
    totalCount={votingProgressData.totalCount}
    isActive={votingProgressData.isVotingActive}
    label={votingProgressData.roundLabel}
  />
)}
```

This ensures the bar only shows when matchups are actively voting, and disappears when voting closes.

**Important:** The `getRoundLabel` and `getDeRoundLabel` functions are defined inside the component but AFTER the useMemo location. Since they're regular function declarations (not const), they're hoisted and accessible. Alternatively, if TypeScript complains, move the useMemo after these function definitions (around line ~812).
  </action>
  <verify>
1. `npx tsc --noEmit` compiles without errors
2. `npm run build` succeeds
3. Visual check: navigate to a live bracket with voting open -- progress bar appears between top bar and bracket diagram
  </verify>
  <done>
- VoteProgressBar renders in LiveDashboard when matchups are open for voting
- Shows "X of Y voted (P%)" with green progress bar
- Updates via merged vote counts (initial + realtime)
- Hidden when no voting is active
- Works for SE, DE, RR, and Predictive bracket types
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` -- no type errors
2. `npm run build` -- production build succeeds
3. Manual test: Create a bracket, open voting, verify progress bar appears
4. Manual test: Have students vote, verify count updates
5. Manual test: Close voting, verify progress bar disappears
6. Manual test: Verify for DE bracket with region tabs -- label shows region context
</verification>

<success_criteria>
- Green progress bar visible on bracket live view when matchups are open for voting
- "X of Y voted (P%)" text with green pulse dot while active
- Progress bar fill matches participation percentage
- Disappears when no matchups are voting
- Works across all bracket types (SE, DE, RR, Predictive)
- Matches poll-results visual pattern for consistency
</success_criteria>

<output>
After completion, create `.planning/quick/4-add-vote-progress-indicator-x-of-y-voted/4-SUMMARY.md`
</output>
