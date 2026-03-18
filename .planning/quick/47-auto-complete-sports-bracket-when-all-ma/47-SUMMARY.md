# Quick Task 47: Auto-complete sports bracket when all matchups decided via sync

## Summary

Sports brackets now auto-complete when all tournament games have been decided via
ESPN API sync. Previously, sports brackets stayed in `active` status indefinitely
with no way for the teacher to finalize the bracket.

## Changes

1. **Auto-completion in syncBracketResults** (`src/lib/dal/sports.ts`):
   - After each sync, checks if all matchups (excluding R0 play-ins) are decided
   - If all decided and bracket not already completed: sets `status` and `predictionStatus` to `completed`
   - Broadcasts `bracket_completed` + `broadcastActivityUpdate` for student dashboard

2. **Fixed sync broadcast** (`src/lib/dal/sports.ts`):
   - Previously broadcast `bracket_completed` on EVERY sync (even partial score updates)
   - Now uses `scores_synced` event for incremental updates
   - `bracket_completed` only fires on actual completion

3. **New event type** (`src/lib/realtime/broadcast.ts`):
   - Added `scores_synced` to `BracketUpdateType` union

4. **Realtime hooks updated**:
   - `use-realtime-bracket.ts`: refetches bracket state on `scores_synced`
   - `use-predictions.ts`: refetches leaderboard scores on `scores_synced`

5. **UI update** (`live-dashboard.tsx`):
   - "Complete!" badge now shows for sports brackets (removed `!isSports` exclusion)

## Lifecycle After Fix

```
DRAFT → PREDICTIONS_OPEN → ACTIVE → [games play over days] → COMPLETED (auto)
                                      ↑ sync every 60s
                                      ↑ leaderboard updates live
                                      ↑ student dashboard moves to Closed on completion
```

## Commit

`2adc4f3`
