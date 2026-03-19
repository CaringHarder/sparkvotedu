---
phase: 48-fix-bracket-vote-tracking-accuracy-and-a
verified: 2026-03-19T00:00:00Z
status: passed
score: 3/3 must-haves verified
---

# Quick Task 48: Fix Bracket Vote Tracking Accuracy and Add Prediction Submission Indicator

**Task Goal:** Fix bracket vote tracking accuracy and add prediction submission indicator
**Verified:** 2026-03-19
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Sports brackets show prediction submitters in participation sidebar | VERIFIED | `currentVoterIds` memo in live-dashboard.tsx line 816 now checks `isPredictive || isSports`, returning `mergedVoterIds['predictions']` for both bracket types |
| 2 | Prediction submitters loaded on initial page load (not just realtime) | VERIFIED | `getPredictionSubmitterIds()` exists in prediction.ts (lines 123–130), called in live/page.tsx (line 122), passed as `predictionSubmitterIds` prop (line 224), seeded into `mergedVoterIds['predictions']` at live-dashboard.tsx lines 517–519 |
| 3 | Sidebar shows "predicted" label for predictive/sports brackets | VERIFIED | `voteLabel` prop added to `ParticipationSidebar` interface (line 15) with default `'voted'` (line 29), rendered at line 148 as `{voteLabel}`; live-dashboard passes `(isPredictive || isSports) && bracket.predictionStatus !== 'active' ? 'predicted' : 'voted'` at line 1967 |

**Score:** 3/3 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/dal/prediction.ts` | `getPredictionSubmitterIds` function | VERIFIED | Substantive implementation at lines 123–130: queries `prisma.prediction.findMany` with `distinct: ['participantId']`, returns `string[]` |
| `src/components/teacher/participation-sidebar.tsx` | `voteLabel` prop | VERIFIED | Prop defined in interface (line 15), destructured with default `'voted'` (line 29), used in render at line 148 and line 154 (`All {voteLabel}!`) |
| `src/components/teacher/live-dashboard.tsx` | Prediction tracking wiring | VERIFIED | Accepts `predictionSubmitterIds` prop (line 46), seeds `mergedVoterIds['predictions']` (lines 517–519), checks `isSports` in `currentVoterIds` (line 816), and passes `voteLabel` to sidebar (line 1967) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| live/page.tsx | `getPredictionSubmitterIds` | `import` at line 6, called in parallel with `scoreBracketPredictions` at line 122 | WIRED | Result stored as `predictionSubmitterIds`, passed to `<LiveDashboard>` at line 224 |
| `LiveDashboard` | `mergedVoterIds['predictions']` | `predictionSubmitterIds` prop seeded at lines 517–519 | WIRED | Seed only runs when `predictionSubmitterIds.length > 0`, which is correct behavior |
| `mergedVoterIds['predictions']` | `currentVoterIds` | memo at line 816 checks `isPredictive || isSports` | WIRED | Sports brackets now included alongside predictive brackets |
| `currentVoterIds` | `<ParticipationSidebar voterIds>` | line 1964 | WIRED | `voterIds={currentVoterIds}` passes the unified prediction submitter set to sidebar |
| `voteLabel` | `<ParticipationSidebar>` | line 1967 | WIRED | `(isPredictive || isSports) && bracket.predictionStatus !== 'active' ? 'predicted' : 'voted'` — correctly shows "predicted" during prediction phase, "voted" after predictions close |

### Commit Verification

Commit `df5c160` exists and is valid. Diff confirms exactly four files changed with +36/-9 lines matching the described changes in SUMMARY.md.

### Anti-Patterns Found

None detected. Implementation is substantive with real DB queries and proper prop wiring throughout.

### Human Verification Required

None. All wiring is verifiable programmatically for this change.

---

_Verified: 2026-03-19_
_Verifier: Claude (gsd-verifier)_
