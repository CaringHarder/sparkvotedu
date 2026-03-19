# Quick Task 48: Fix bracket vote tracking accuracy and add prediction submission indicator

## Summary

Fixed prediction tracking in the teacher participation sidebar for sports and predictive brackets. Previously, sports brackets never showed prediction submitters because the `currentVoterIds` memo only checked `isPredictive` (which excludes sports brackets). Also, prediction submitters were only tracked via realtime broadcasts — on page load, the sidebar started empty.

## Root Cause Analysis

### Bracket vote tracking (SE/DE/RR)
The existing bracket vote tracking code was actually **correct** — the research found the `mergedVoterIds` Record<matchupId, string[]> pattern is properly handled with per-matchup extraction in `currentVoterIds`. No changes needed here.

### Prediction tracking gaps (Predictive/Sports)
1. **Sports brackets excluded**: `currentVoterIds` only returned `mergedVoterIds['predictions']` for `isPredictive` (bracketType === 'predictive'), not sports brackets
2. **No initial load**: `getPredictionSubmitterIds()` didn't exist — submitters only appeared after realtime broadcast events
3. **No "predicted" label**: Sidebar always said "voted" even during prediction phase
4. **Sports not in active context**: `hasActiveVotingContext` didn't include `isSports`

## Changes

| File | Change |
|------|--------|
| `src/lib/dal/prediction.ts` | Added `getPredictionSubmitterIds()` — queries distinct participantIds from Prediction table |
| `src/app/(dashboard)/brackets/[bracketId]/live/page.tsx` | Loads prediction submitter IDs on page load, passes as prop |
| `src/components/teacher/live-dashboard.tsx` | Seeds `mergedVoterIds['predictions']`, includes `isSports` in prediction check, passes `voteLabel` to sidebar |
| `src/components/teacher/participation-sidebar.tsx` | Added `voteLabel` prop, shows "predicted" or "voted" dynamically |

## Commit

`df5c160`
