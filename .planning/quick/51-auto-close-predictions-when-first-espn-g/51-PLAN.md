---
phase: "51"
plan: 1
type: execute
wave: 1
files_modified:
  - src/lib/dal/sports.ts
autonomous: true
requirements: [AUTO-CLOSE-PREDICTIONS]
---

<objective>
Auto-close predictions when first ESPN game goes live during sync.
</objective>

## Tasks

### Task 1: Add auto-close logic to syncBracketResults

**Files:** `src/lib/dal/sports.ts`

**Changes:**
- After score updates, check if any game is `in_progress` or `final`
- If bracket's `predictionStatus` is still `predictions_open`, transition to `active`
- Broadcast prediction_status_changed and activity update for real-time UI updates
- Console log for monitoring
