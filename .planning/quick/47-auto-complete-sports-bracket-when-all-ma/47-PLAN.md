# Quick Task 47: Auto-complete sports bracket when all matchups decided via sync

## Task

When a sports bracket's games all finish (resolved via ESPN sync), auto-transition
predictionStatus and bracket status to `completed`. Also fix the sync broadcasting
`bracket_completed` on every partial sync, and ensure leaderboard + realtime hooks
respond to the new `scores_synced` event.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/dal/sports.ts` | Add auto-completion check after sync; use `scores_synced` event |
| `src/lib/realtime/broadcast.ts` | Add `scores_synced` to BracketUpdateType |
| `src/hooks/use-realtime-bracket.ts` | Handle `scores_synced` for bracket state refetch |
| `src/hooks/use-predictions.ts` | Refetch leaderboard on `scores_synced` |
| `src/components/teacher/live-dashboard.tsx` | Show "Complete!" badge for sports brackets |
