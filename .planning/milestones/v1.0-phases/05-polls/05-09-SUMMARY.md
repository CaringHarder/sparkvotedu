---
phase: "05-polls"
plan: "09"
subsystem: "poll-realtime-bugfixes"
tags: [polls, real-time, race-condition, vote-counts, bug-fix, gap-closure]

dependency-graph:
  requires: ["05-02", "05-05"]
  provides: ["reliable-poll-reveal", "accurate-vote-retabulation"]
  affects: ["UAT-round-2-fixes"]

tech-stack:
  added: []
  patterns: ["forceReveal-prop-pattern", "complete-vote-counts-with-zeros", "full-replacement-flush"]

file-tracking:
  key-files:
    created: []
    modified:
      - src/app/(dashboard)/polls/[pollId]/live/client.tsx
      - src/components/poll/poll-results.tsx
      - src/lib/dal/poll.ts
      - src/hooks/use-realtime-poll.ts

decisions:
  - id: "05-09-01"
    decision: "forceReveal prop replaces status transition detection for winner reveal"
    context: "Status transition detection is inherently racy due to router.refresh() re-rendering server component before broadcast arrives"
  - id: "05-09-02"
    decision: "getSimplePollVoteCounts returns zeros for all options, not just options with votes"
    context: "groupBy only returns groups with votes > 0; vote changes can drop options to zero"
  - id: "05-09-03"
    decision: "Real-time hook flush uses full replacement (not spread merge) since broadcast now contains complete state"
    context: "Spread merge preserves stale keys when option drops to zero; full replacement is safe because DAL now returns all options"

metrics:
  duration: "~2.0m"
  completed: "2026-01-31"
---

# Phase 05 Plan 09: UAT Round 2 Bug Fixes Summary

**One-liner:** Fix winner reveal race condition via forceReveal prop pattern, fix vote retabulation via complete zero-inclusive vote counts and full replacement flush

## What Was Done

### Task 1: Fix winner reveal race condition
- **Root cause:** `handleStatusChange('closed')` calls `router.refresh()` which re-renders server component with `poll.status='closed'`. The `prevStatusRef` in PollResults initializes to `'closed'` after refresh, so the `active->closed` transition is never detected when the broadcast arrives.
- **Fix in `client.tsx`:**
  - Added `forceReveal` state, set to `true` synchronously when teacher clicks Close Poll (before `router.refresh()`)
  - Passed `forceReveal` and `onRevealDismissed` callback as props to `PollResults`
- **Fix in `poll-results.tsx`:**
  - Added `forceReveal?: boolean` and `onRevealDismissed?: () => void` to `PollResultsProps`
  - Removed `prevStatusRef` and racy status transition detection `useEffect`
  - Replaced with `useEffect` that triggers `setShowReveal(true)` when `forceReveal` prop is true
  - Updated `PollReveal.onDismiss` to also call `onRevealDismissed?.()` to reset parent state
  - Removed `useRef` import (no longer needed)

### Task 2: Fix vote retabulation with complete vote counts
- **Root cause (DAL):** `getSimplePollVoteCounts` uses `prisma.pollVote.groupBy` which only returns groups with votes > 0. When a student changes vote from Option A to Option B, Option A drops to 0 and is omitted from the result.
- **Root cause (hook):** Flush uses `{...prev, ...pending}` spread merge which preserves stale keys from previous state.
- **Fix in `poll.ts` (belt):**
  - `getSimplePollVoteCounts` now queries `pollOption.findMany` to get all option IDs for the poll
  - Initializes all options to zero, then overlays actual groupBy counts
  - Broadcast payload now always includes `{optionA: 0, optionB: 2}` instead of `{optionB: 2}`
- **Fix in `use-realtime-poll.ts` (suspenders):**
  - Changed flush from `setVoteCounts((prev) => ({ ...prev, ...pending }))` to `setVoteCounts(pending)` (full replacement)
  - Accumulation at `pendingVoteCounts.current` left unchanged -- still uses spread merge for correct batching between flush intervals

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| 05-09-01 | forceReveal prop replaces status transition detection | Eliminates race between router.refresh() and broadcast timing |
| 05-09-02 | DAL returns zeros for all options | groupBy omits zero-count groups; sparse data causes stale display |
| 05-09-03 | Full replacement flush in real-time hook | Safe because DAL now returns complete state; prevents stale key preservation |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `npx tsc --noEmit`: Zero errors (both tasks)
- `npm run build`: Successful (all routes compile)
- Code review: `forceReveal` set synchronously before `router.refresh()` -- no race possible
- Code review: `getSimplePollVoteCounts` queries `pollOption.findMany` for all option IDs
- Code review: Flush uses `setVoteCounts(pending)` (full replacement)
- Code review: Accumulation at line 99 unchanged -- still `{ ...pendingVoteCounts.current, ...counts }`

## Commits

| Hash | Type | Description |
|------|------|-------------|
| c1fefa8 | fix | fix winner reveal race condition on poll close |
| 23373cc | fix | fix vote retabulation with complete vote counts |

## Next Phase Readiness

Both UAT round 2 failures are resolved:
1. Winner reveal now plays immediately when teacher clicks Close Poll (no dependency on broadcast timing)
2. Vote counts are accurate when students change votes (old option correctly decreases to zero)

No blockers or concerns for downstream work. These fixes strengthen the real-time polling foundation for future phases.
