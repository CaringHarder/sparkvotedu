---
status: testing
phase: 26-student-activity-removal
source: 26-01-SUMMARY.md, 26-02-SUMMARY.md
started: 2026-02-26T11:30:00Z
updated: 2026-02-26T11:30:00Z
---

## Current Test

number: 1
name: Delete Bracket - Student Dashboard Removal
expected: |
  Setup: Open teacher dashboard in one browser, student dashboard (joined to same session) in another.
  Action: Teacher clicks triple-dot menu on a bracket card and selects Delete, confirms.
  Expected: Within ~2 seconds, the bracket card fades out from the student's activity grid. No page refresh needed.
awaiting: user response

## Tests

### 1. Delete Bracket - Student Dashboard Removal
expected: Teacher deletes a bracket from dashboard. Within ~2 seconds, the bracket card fades out from the student's activity grid with a smooth animation. No page refresh needed.
result: [pending]

### 2. Delete Poll - Student Dashboard Removal
expected: Teacher deletes a poll from dashboard (via context menu). Within ~2 seconds, the poll card fades out from the student's activity grid with a smooth animation. No page refresh needed.
result: [pending]

### 3. Card Reflow After Removal
expected: After a card is removed from the student grid, the remaining cards slide together smoothly to fill the gap -- no empty space left behind.
result: [pending]

### 4. Empty State After All Activities Removed
expected: When teacher removes the last activity from a session, the student dashboard shows a contextual empty state message like "No activities right now" (different from the initial "Hang tight!" message shown before any activities exist).
result: [pending]

### 5. Mid-Activity Bracket Deletion
expected: Student is actively viewing a bracket page. Teacher deletes that bracket. Student sees a friendly toast message ("Your teacher ended this activity") and is automatically redirected back to the session dashboard.
result: [pending]

### 6. Mid-Activity Poll Deletion
expected: Student is actively viewing a poll page. Teacher deletes that poll. Student sees a friendly toast message and is automatically redirected back to the session dashboard.
result: [pending]

### 7. Stale Tab Recovery
expected: Student has the dashboard open, switches away to another tab for a while, then switches back. The student dashboard refetches and shows the current state of activities (any deletions that happened while away are reflected).
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0

## Gaps

[none yet]
