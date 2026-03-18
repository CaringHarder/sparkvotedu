---
created: 2026-03-18T02:20:03.550Z
title: Add close bracket button to completed brackets
area: ui
files:
  - src/components/teacher/live-dashboard.tsx:1322-1345
  - src/components/teacher/round-advancement-controls.tsx:296-314
  - src/components/student/activity-grid.tsx:15
---

## Problem

When a bracket is completed (all rounds decided), the teacher sees a "Bracket Complete!" label and can "Undo Round" but there is no way to explicitly **close** the bracket. The Active/Paused toggle is hidden for completed brackets, so the status stays as `active` in the database.

This means the student dashboard (which partitions by `completed`/`closed` status) never shows completed brackets in the "Closed" section — they remain in the Active section indefinitely.

The "Complete" state is intentionally separate from "Closed" because teachers may want to undo the final round. A "Close" button should appear alongside the "Undo Round" button once a bracket is completed, giving the teacher an explicit action to finalize it.

## Solution

Add a "Close Bracket" button to the live dashboard header that appears when `bracket.status === 'active'` AND all rounds are decided (same condition as "Bracket Complete!" label). Clicking it should:

1. Set bracket status to `completed` (or `closed`) in the database
2. Student dashboard will automatically pick it up via realtime and move the card to the Closed section
3. Add a "Reopen" button (already exists for `completed` status) so teachers can undo if needed
