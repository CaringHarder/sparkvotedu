# Quick Task 44: Fix live classroom issues — null R2 regions, slow activities API

**Date:** 2026-03-17
**Commit:** 382562b

## Issues Fixed

### 1. Women's NCAA bracket missing Quarterfinals
**Root cause:** ESPN data left R2 matchups with `bracket_region: null`. The region-based view (`computeRegionsFromBracketField`) excluded null-region matchups from every tab.
**Fix (data):** Manually repaired 16 R2 matchups by inheriting region from R1 feeder matchups.
**Fix (code):** `wireMatchupAdvancement()` now propagates bracketRegion to null-region matchups after wiring linkage, preventing this for future imports.

### 2. Student dashboard blank cards / slow bracket loading
**Root cause:** Activities API ran N+1 queries — one `vote.count()` per bracket and one `pollVote.count()` per poll, for every student request. With 28 concurrent students × 2 brackets × polling every few seconds = ~112 redundant queries per cycle.
**Fix:** Replaced with single batch `findMany` + `distinct` queries. Now 2 queries total regardless of bracket/poll count.

### 3. Region propagation in wireMatchupAdvancement
**Fix:** Added step 5 to `wireMatchupAdvancement()` that re-fetches matchups after linking and inherits `bracketRegion` from feeder matchups for any null-region round > 0.
