---
phase: "51"
plan: 1
subsystem: api
tags: [sports-bracket, predictions, auto-close]
key-files:
  modified:
    - src/lib/dal/sports.ts
duration: 2min
completed: 2026-03-23
---

# Quick Task 51: Auto-close predictions when first ESPN game goes live

## Changes
- In `syncBracketResults`, after updating scores, checks if any ESPN game is `in_progress` or `final`
- If bracket's `predictionStatus` is still `predictions_open`, automatically transitions to `active`
- Broadcasts `prediction_status_changed` event so teacher live dashboard and student UIs update in real-time
- Also broadcasts session activity update so student dashboard reflects closed predictions

## How it works
- Cron sync (every 2 min) and manual sync both call `syncBracketResults`
- First time any tournament game tips off, the next sync auto-closes predictions
- Students see predictions locked; teacher sees the bracket in active/live mode
- No teacher action needed — predictions close automatically based on ESPN game status

## Commit
- `0561924`: feat: auto-close predictions when first ESPN game goes live
