---
phase: 09-analytics
plan: 03
subsystem: api, ui
tags: [papaparse, csv, export, tier-gating, server-actions, analytics]

# Dependency graph
requires:
  - phase: 09-analytics-01
    provides: Analytics DAL with getBracketVoteDistribution, getPollVoteDistribution, scoreBracketPredictions
  - phase: 06-billing-and-subscriptions
    provides: canAccess gate function, UpgradePrompt component, SubscriptionTier types
provides:
  - Server actions for tier-gated CSV export data (bracket, poll, predictive)
  - CSVExportButton client component using PapaParse
  - Bracket analytics page with CSV export buttons
  - Poll analytics page with CSV export button
affects: [analytics-hub, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server action tier re-check pattern: re-verify canAccess in server action before returning export data"
    - "Client-side CSV generation: PapaParse unparse + Blob + createObjectURL download"
    - "Conditional export buttons: CSVExportButton for allowed tiers, UpgradePrompt for restricted tiers"

key-files:
  created:
    - src/actions/analytics.ts
    - src/components/analytics/csv-export-button.tsx
  modified:
    - src/app/(dashboard)/brackets/[bracketId]/analytics/page.tsx
    - src/app/(dashboard)/polls/[pollId]/analytics/page.tsx

key-decisions:
  - "Server-side tier re-check in every export server action prevents API-level bypass of CSV export restriction"
  - "PapaParse unparse for client-side CSV generation (handles escaping, quoting, special characters)"
  - "Per-round point columns in predictive export use getPointsForRound for header labels: R1 (1pts), R2 (2pts), etc."
  - "Predictive export gated to pro_plus directly (not csvExport) since predictive brackets are Pro Plus only"

patterns-established:
  - "Export server action pattern: auth -> tier check -> ownership -> fetch data -> transform to flat rows -> return"
  - "CSVExportButton: generic reusable component accepting any server action returning {data, filename} | {error}"

# Metrics
duration: 3min
completed: 2026-02-15
---

# Phase 9 Plan 03: Tier-Gated CSV Export Summary

**Tier-gated CSV export for bracket/poll analytics using PapaParse with server-side tier re-check and predictive bracket scoring breakdown export**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-15T23:26:25Z
- **Completed:** 2026-02-15T23:29:02Z
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 2

## Accomplishments
- Server actions for all three export types (bracket matchups, poll votes, predictive scoring) with auth + tier verification
- Reusable CSVExportButton component with loading state, error handling, and Blob download
- Bracket analytics page shows Export CSV (Pro+) and Export Predictions CSV (Pro Plus for predictive brackets)
- Poll analytics page shows Export CSV (Pro+) with proper Borda score columns for ranked polls
- Free tier teachers see UpgradePrompt lock icon instead of export buttons

## Task Commits

Each task was committed atomically:

1. **Task 1: Create server actions for export data with tier verification** - `6771b6a` (feat)
2. **Task 2: Create CSV export button and wire into analytics pages** - `79d7590` (feat)

## Files Created/Modified
- `src/actions/analytics.ts` - Server actions: getBracketExportData, getPollExportData, getPredictiveExportData with tier verification
- `src/components/analytics/csv-export-button.tsx` - Client component: CSVExportButton with PapaParse unparse and Blob download
- `src/app/(dashboard)/brackets/[bracketId]/analytics/page.tsx` - Added CSV export buttons and upgrade prompt based on tier
- `src/app/(dashboard)/polls/[pollId]/analytics/page.tsx` - Added CSV export button and upgrade prompt based on tier

## Decisions Made
- Server-side tier re-check in every export server action prevents API-level bypass (not just UI gating)
- PapaParse `unparse()` for CSV generation handles all escaping/quoting edge cases automatically
- Predictive export uses `getPointsForRound()` for column headers (`R1 (1pts)`, `R2 (2pts)`) to show scoring weights
- Predictive export gated to `pro_plus` directly since predictive brackets are Pro Plus only (separate from general `csvExport` gate)
- Used `alert()` for error display in CSVExportButton to match project simplicity (no toast library)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All Phase 9 analytics plans complete (09-01, 09-02, 09-03)
- Full analytics suite: participation stats, vote distribution, CSV export, predictive scoring detail
- Ready for Phase 10 or dashboard refinements

## Self-Check: PASSED

All 4 files verified on disk (2 created, 2 modified). Both task commits (6771b6a, 79d7590) verified in git log.

---
*Phase: 09-analytics*
*Completed: 2026-02-15*
