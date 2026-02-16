---
phase: 07-advanced-brackets
plan: 11
subsystem: bracket-prediction
tags: [predictive, predictions, scoring, leaderboard, realtime, supabase, bracket-ui]

# Dependency graph
requires:
  - phase: 07-01
    provides: "Prediction model with @@unique([bracketId, participantId, matchupId]), predictiveMode/predictiveResolutionMode fields"
  - phase: 07-05
    provides: "scorePredictions pure function, getPointsForRound, PredictionScore type"
  - phase: 07-07
    provides: "Bye-aware bracket creation in DAL, isBye field on matchups"
provides:
  - "Prediction DAL with bulk submission, editing, scoring, and per-matchup stats"
  - "Server actions for prediction submission (unauthenticated) and lifecycle management (teacher)"
  - "PredictiveBracket component with simple (form) and advanced (bracket click) modes"
  - "usePredictions real-time hook for prediction leaderboard updates"
  - "prediction_status_changed broadcast event type"
affects: [07-12, 07-13]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Delete + createMany upsert pattern for idempotent prediction replacement"
    - "Dual-mode prediction UI: simple form cards vs interactive bracket diagram clicks"
    - "prediction_status_changed broadcast event for real-time prediction lifecycle updates"

key-files:
  created:
    - src/lib/dal/prediction.ts
    - src/actions/prediction.ts
    - src/components/bracket/predictive-bracket.tsx
    - src/hooks/use-predictions.ts
  modified:
    - src/lib/realtime/broadcast.ts
    - src/components/bracket/bracket-detail.tsx
    - src/app/(dashboard)/brackets/[bracketId]/page.tsx

key-decisions:
  - "Delete + createMany for prediction upsert (not individual upserts) -- simpler, guarantees clean state on edit"
  - "Bye matchups filtered at DAL layer before scoring (isBye=false filter on resolved matchups)"
  - "prediction_status_changed added to BracketUpdateType union for lifecycle broadcasts"
  - "Teacher view uses PredictiveBracket with isTeacher=true; student view detects predictiveMode for form vs diagram"
  - "totalRounds uses Math.ceil(Math.log2(effectiveSize)) for bye bracket support in detail page"

patterns-established:
  - "Prediction upsert: delete-all-for-participant then createMany in transaction (no partial updates)"
  - "Dual UI mode: simple/advanced determined by bracket.predictiveMode prop"
  - "Prediction lifecycle: draft -> predictions_open -> active -> completed with forward-only transitions"

# Metrics
duration: 5min
completed: 2026-02-01
---

# Phase 7 Plan 11: Predictive Bracket Pipeline Summary

**Prediction DAL with bulk submission/scoring, server actions with unauthenticated student submission, and dual-mode prediction UI (simple form + bracket diagram click) with real-time leaderboard hook**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-01T17:59:44Z
- **Completed:** 2026-02-01T18:04:45Z
- **Tasks:** 2/2
- **Files created:** 4
- **Files modified:** 3

## Accomplishments

- Prediction DAL handles bulk submission with delete+createMany upsert pattern, participant prediction retrieval, bracket-wide scoring using predictive engine, and per-matchup prediction stats (hidden until resolution)
- Server actions provide unauthenticated student prediction submission (matching castVote pattern), teacher lifecycle management with feature gating (pro_plus only), leaderboard retrieval, and student prediction fetching
- PredictiveBracket component supports both simple (vertical matchup card list) and advanced (interactive bracket diagram click) prediction modes with progress indicators, submit/edit flow, and read-only display when predictions are closed
- usePredictions real-time hook with Supabase channel subscription for automatic leaderboard and prediction refetch on status changes
- Teacher view includes prediction lifecycle buttons (Open/Close & Start/Complete), bracket diagram, and leaderboard table with points and correct picks
- All 275 existing tests pass unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Prediction DAL and server actions** - `047e07a` (feat)
2. **Task 2: Predictive bracket UI and real-time hook** - `2c6a403` (feat)

## Files Created/Modified

- `src/lib/dal/prediction.ts` - Prediction CRUD: submitPredictions, getParticipantPredictions, scoreBracketPredictions, getMatchupPredictionStats, updatePredictionStatusDAL
- `src/actions/prediction.ts` - Server actions: submitPrediction (unauthenticated), updatePredictionStatus (teacher), getLeaderboard, getMyPredictions
- `src/components/bracket/predictive-bracket.tsx` - Dual-mode prediction UI with teacher/student views, lifecycle controls, leaderboard table
- `src/hooks/use-predictions.ts` - Real-time prediction hook with Supabase Realtime subscription
- `src/lib/realtime/broadcast.ts` - Added prediction_status_changed to BracketUpdateType union
- `src/components/bracket/bracket-detail.tsx` - Integrated PredictiveBracket routing for bracketType === 'predictive'
- `src/app/(dashboard)/brackets/[bracketId]/page.tsx` - Fixed totalRounds to use Math.ceil(Math.log2(effectiveSize)) for bye brackets

## Decisions Made

- **Delete + createMany for prediction upsert:** Instead of individual upserts per prediction, delete all existing predictions for the participant+bracket then bulk create. This is simpler, guarantees clean state on edit, and avoids partial update edge cases.
- **Bye matchup exclusion at DAL layer:** The scoring query explicitly filters `isBye: false` on resolved matchups so bye matchups are never scored. The prediction UI also filters out bye matchups from the form/diagram.
- **prediction_status_changed broadcast type:** Added as a new BracketUpdateType rather than reusing existing types, for clean separation of prediction lifecycle events from bracket voting events.
- **Dual-mode prediction UI:** Simple mode uses vertical matchup cards with click-to-select; advanced mode reuses BracketDiagram's onEntrantClick prop for interactive bracket filling. Both share the same submit/edit flow.
- **totalRounds fix:** Changed from `Math.log2(bracket.size)` to `Math.ceil(Math.log2(effectiveSize))` where effectiveSize is maxEntrants (full bracket size with byes) or size (for power-of-two brackets).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed totalRounds calculation for bye brackets**
- **Found during:** Task 2 (bracket detail page integration)
- **Issue:** `Math.log2(bracket.size)` produces fractional values for non-power-of-two sizes (e.g., Math.log2(5) = 2.32)
- **Fix:** Changed to `Math.ceil(Math.log2(effectiveSize))` using maxEntrants when available
- **Files modified:** src/app/(dashboard)/brackets/[bracketId]/page.tsx
- **Committed in:** 2c6a403 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Bug fix necessary for correct bracket rendering with non-power-of-two sizes. No scope creep.

## Issues Encountered

- TypeScript error: server action return types included undefined in union, requiring explicit null guards (`&& leaderboardResult.scores`) in usePredictions hook. Fixed inline.

## User Setup Required

None - all changes are code-only, no external configuration needed.

## Next Phase Readiness

- Prediction pipeline complete: DAL, server actions, UI, and real-time hook all wired
- Ready for student bracket page integration (07-12) -- student pages can import PredictiveBracket with isTeacher=false
- Scoring engine (07-05) is fully consumed by the DAL layer; leaderboard ready for display
- Broadcast infrastructure supports prediction lifecycle events for real-time student notifications

---
*Phase: 07-advanced-brackets*
*Completed: 2026-02-01*
