---
status: documented
trigger: "Debug nested button hydration error + batch decide loading state in RR matchups"
created: 2026-02-02T00:00:00Z
updated: 2026-02-02T00:00:00Z
---

## Current Focus

Research complete. Documented nesting structure and loading state gap.

## Symptoms

**Symptom 1: Nested Button Hydration Error**
- expected: No hydration errors in console
- actual: Hydration error `<button> cannot be a descendant of <button>`
- errors: Originates from round-robin-matchups.tsx line 130
- reproduction: Load teacher live dashboard with round-robin bracket that has voting matchups
- started: Unknown (existing bug)

**Symptom 2: Batch Decide Loading State Missing**
- expected: Button should show loading/disabled state during batch decide operation
- actual: Button remains interactive, no visual feedback during async operation
- errors: None (behavior issue)
- reproduction: Click "Close All & Decide by Votes" button
- started: Unknown (feature never implemented)

## Evidence

### Evidence 1: Nested Button Structure Confirmed
- timestamp: 2026-02-02T00:00:00Z
- checked: src/components/bracket/round-robin-matchups.tsx lines 107-141
- found:
  ```tsx
  {/* Round header (collapsible) */}
  <button
    type="button"
    onClick={() => toggleRound(roundNumber)}
    className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-muted/50"
  >
    {/* ... header content ... */}

    {/* Batch decide by votes button in round header */}
    {isTeacher && !isComplete && voteCounts && onBatchDecideByVotes && roundMatchups.some((m) => m.status === 'voting') && (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onBatchDecideByVotes()
        }}
        className="rounded bg-violet-600 px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-violet-700"
      >
        Close All &amp; Decide by Votes
      </button>
    )}
  </button>
  ```
- implication: The batch decide button (line 130-140) is rendered INSIDE the collapsible round header button (line 107-141). This creates a `<button>` nested within another `<button>`, which is invalid HTML and causes the hydration error.

### Evidence 2: e.stopPropagation() Prevents Parent Click
- timestamp: 2026-02-02T00:00:00Z
- checked: Line 133 of round-robin-matchups.tsx
- found: `onClick={(e) => { e.stopPropagation(); onBatchDecideByVotes() }}`
- implication: The nested button uses `e.stopPropagation()` to prevent triggering the parent button's collapse/expand behavior. This works functionally but doesn't fix the invalid HTML structure.

### Evidence 3: Loading State Available in Parent Component
- timestamp: 2026-02-02T00:00:00Z
- checked: src/components/teacher/live-dashboard.tsx line 55
- found: `const [isPending, startTransition] = useTransition()`
- implication: The parent component (live-dashboard.tsx) has an `isPending` state from `useTransition()` hook that tracks when async operations are in progress.

### Evidence 4: Batch Handler Uses startTransition
- timestamp: 2026-02-02T00:00:00Z
- checked: src/components/teacher/live-dashboard.tsx lines 551-583
- found:
  ```tsx
  const handleBatchDecideByVotes = useCallback(() => {
    setError(null)
    const votingMatchups = currentMatchups.filter(
      (m) => m.roundRobinRound === currentRoundRobinRound && m.status === 'voting'
    )
    if (votingMatchups.length === 0) return

    startTransition(async () => {
      for (const m of votingMatchups) {
        // ... batch decide logic ...
        const result = await recordResult({
          bracketId: bracket.id,
          matchupId: m.id,
          winnerId,
        })
        if (result && 'error' in result) {
          setError(result.error as string)
          return
        }
      }
    })
  }, [currentMatchups, currentRoundRobinRound, mergedVoteCounts, bracket.id])
  ```
- implication: The batch decide handler is wrapped in `startTransition()`, which sets `isPending=true` during execution. This state is available but never passed down to the RoundRobinMatchups component.

### Evidence 5: Other Buttons Use isPending State
- timestamp: 2026-02-02T00:00:00Z
- checked: src/components/teacher/live-dashboard.tsx lines 801-869
- found: Multiple examples of buttons using `disabled={isPending}` and showing loading text:
  ```tsx
  disabled={isPending}
  {isPending ? 'Opening...' : `Open ${getRegionDisplayName(deRegion)} Voting`}
  ```
- implication: The pattern for showing loading state already exists elsewhere in the component. The batch decide button doesn't follow this pattern because:
  1. `isPending` is not passed to RoundRobinMatchups component
  2. RoundRobinMatchups doesn't accept an isPending prop
  3. The button doesn't conditionally render based on loading state

### Evidence 6: RoundRobinMatchups Component Props
- timestamp: 2026-02-02T00:00:00Z
- checked: src/components/bracket/round-robin-matchups.tsx lines 7-19
- found:
  ```tsx
  interface RoundRobinMatchupsProps {
    matchups: MatchupData[]
    entrants: BracketEntrantData[]
    currentRound: number
    pacing: 'round_by_round' | 'all_at_once'
    isTeacher: boolean
    onRecordResult?: (matchupId: string, winnerId: string | null) => void
    onStudentVote?: (matchupId: string, entrantId: string) => void
    votedMatchups?: Record<string, string>
    voteCounts?: Record<string, Record<string, number>>
    onBatchDecideByVotes?: () => void
    votingStyle?: 'simple' | 'advanced'
  }
  ```
- implication: The component does not accept an `isPending` or `isBatchDeciding` prop. To add loading state, the component interface needs to be extended.

## Eliminated

None yet (research phase only).

## Resolution

### Root Cause

**Issue 1: Nested Button Structure**
- The batch decide button (line 130-140) is rendered as a child of the round header button (line 107-141)
- This creates invalid HTML: `<button><button></button></button>`
- React's hydration process detects this mismatch between server and client rendering
- While `e.stopPropagation()` prevents functional issues, it doesn't fix the structural problem

**Issue 2: Missing Loading State**
- The parent component (live-dashboard.tsx) has `isPending` state that tracks async operations
- The `handleBatchDecideByVotes` function uses `startTransition()` which sets `isPending=true`
- However, `isPending` is never passed to the RoundRobinMatchups component
- The RoundRobinMatchups component doesn't accept an `isPending` prop
- Therefore, the batch decide button has no way to show loading/disabled state

### Fix Strategy

**For Issue 1 (Nested Button):**

**Option A: Move button outside the header button** (Recommended)
- Restructure the round header to place the batch decide button adjacent to (not inside) the header button
- Use flexbox/grid layout to position the button visually where it needs to be
- This maintains the visual layout while fixing the HTML structure

**Option B: Change header from button to div**
- Replace the `<button>` header element with a `<div onClick={...}>`
- Add keyboard accessibility (onKeyDown for Enter/Space)
- Add ARIA attributes (role="button", tabIndex={0})
- Less preferred because it requires more accessibility work

**Recommended: Option A** - Keep the header as a semantic button, restructure layout to avoid nesting.

**For Issue 2 (Loading State):**

1. **Add prop to RoundRobinMatchups:**
   ```tsx
   interface RoundRobinMatchupsProps {
     // ... existing props ...
     isBatchDeciding?: boolean  // NEW
   }
   ```

2. **Pass isPending from parent:**
   ```tsx
   <RoundRobinMatchups
     // ... existing props ...
     isBatchDeciding={isPending}
   />
   ```

3. **Use prop in batch decide button:**
   ```tsx
   <button
     type="button"
     onClick={(e) => {
       e.stopPropagation()
       onBatchDecideByVotes()
     }}
     disabled={isBatchDeciding}
     className={/* ... add disabled styling ... */}
   >
     {isBatchDeciding ? 'Deciding...' : 'Close All & Decide by Votes'}
   </button>
   ```

### Example Fix Structure (Option A for nested button)

```tsx
<div className="rounded-lg border">
  {/* Container for header and batch button */}
  <div className="flex items-center justify-between gap-2 px-3 py-2">

    {/* Collapsible header button (no longer wraps everything) */}
    <button
      type="button"
      onClick={() => toggleRound(roundNumber)}
      className="flex flex-1 items-center gap-2 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center gap-2">
        {isExpanded ? <ChevronDown /> : <ChevronRight />}
        <span>Round {roundNumber}</span>
        <span>{decidedCount}/{totalCount} decided</span>
      </div>
    </button>

    {/* Complete badge (outside button) */}
    {isComplete && (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs">
        Complete
      </span>
    )}

    {/* Batch decide button (outside header button, no stopPropagation needed) */}
    {isTeacher && !isComplete && voteCounts && onBatchDecideByVotes && roundMatchups.some((m) => m.status === 'voting') && (
      <button
        type="button"
        onClick={onBatchDecideByVotes}
        disabled={isBatchDeciding}
        className="rounded bg-violet-600 px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isBatchDeciding ? 'Deciding...' : 'Close All & Decide by Votes'}
      </button>
    )}
  </div>

  {/* Round matchups */}
  {isExpanded && (
    <div className="border-t px-3 pb-3 pt-2 space-y-2">
      {/* ... matchup cards ... */}
    </div>
  )}
</div>
```

### Files to Change

1. **src/components/bracket/round-robin-matchups.tsx**
   - Add `isBatchDeciding?: boolean` to props interface
   - Restructure round header to move batch decide button outside the header button
   - Add disabled state and loading text to batch decide button
   - Remove `e.stopPropagation()` (no longer needed when not nested)

2. **src/components/teacher/live-dashboard.tsx**
   - Pass `isBatchDeciding={isPending}` prop to RoundRobinMatchups component

### Verification Steps

After fix:
1. Load teacher live dashboard with round-robin bracket
2. Check browser console - should see NO hydration errors
3. Inspect DOM - batch decide button should be sibling to (not child of) header button
4. Click batch decide button
5. Verify button shows "Deciding..." text and is disabled during operation
6. Verify button returns to normal state after operation completes
7. Test that header collapse/expand still works correctly
8. Test that batch decide button click doesn't trigger header collapse

## Notes

- The nested button issue is a React hydration error, but the buttons actually work functionally due to `e.stopPropagation()`
- This is a good example of why semantic HTML matters - even if something "works" functionally, invalid structure causes framework issues
- The loading state pattern already exists in the codebase for other buttons, just needs to be applied consistently
- Moving the button outside the header is cleaner than changing the header to a div, as it maintains semantic HTML
