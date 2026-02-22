---
status: complete
phase: 21-poll-realtime-bug-fix
source: [21-01-SUMMARY.md, 21-02-SUMMARY.md]
started: 2026-02-22T00:00:00Z
updated: 2026-02-22T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Poll activation reaches students in real-time
expected: Open teacher dashboard in one tab and student view in another. Activate a poll from the teacher dashboard. The student view should show the poll as active within 2 seconds without manually refreshing.
result: pass

### 2. Live vote count updates on teacher dashboard
expected: With the teacher poll live dashboard open, have a student cast a vote. The teacher's "X of Y voted" participation indicator should update within 2 seconds without a manual page refresh. The vote count on the bar chart should also increment.
result: pass

### 3. Participation denominator updates dynamically
expected: On the teacher poll live dashboard, the "of Y" number in "X of Y voted" should reflect the current session participant count. If a new student joins the session while the poll is active, Y should increase on the next poll state refresh (within a few seconds).
result: issue
reported: "the active 2nd user joined the session, but the active didn't change until the 2nd user submitted a vote."
severity: major

### 4. Poll close reflects on activity grid
expected: While viewing the teacher dashboard with an active poll, close the poll. The student activity grid should also show the poll as closed without manually refreshing.
result: skipped
reason: Poll live page does not have a student participation sidebar like brackets do. Broadcast wiring is in place but no UI to observe it on the poll page.

### 5. Leading option visual distinction in bar chart
expected: On the teacher poll live dashboard with votes cast, the option with the most votes should have a bold vote count and a subtle blue/primary left-border accent. Non-leading options should have no left border accent. If all options are tied at zero, no option should be highlighted.
result: pass

### 6. Stable vote count layout (no jitter)
expected: As votes come in on the teacher live dashboard, the vote count numbers should not cause the layout to shift or jump. Numbers should use fixed-width digit spacing (e.g., "9 votes" and "10 votes" should occupy similar visual space).
result: pass

### 7. Connection status indicator
expected: If the realtime connection falls back to polling mode (e.g., WebSocket unavailable), a small amber "Near-realtime" badge with a pulsing dot should appear on the teacher live dashboard. When WebSocket is connected normally, no badge should appear.
result: skipped

## Summary

total: 7
passed: 4
issues: 1
pending: 0
skipped: 2

## Gaps

- truth: "Participation denominator updates when a new student joins the session while a poll is active"
  status: failed
  reason: "User reported: the active 2nd user joined the session, but the active didn't change until the 2nd user submitted a vote."
  severity: major
  test: 3
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
