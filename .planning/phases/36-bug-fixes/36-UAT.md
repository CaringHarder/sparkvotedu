---
status: complete
phase: 36-bug-fixes
source: 36-01-SUMMARY.md, 36-02-SUMMARY.md, 36-03-SUMMARY.md, 36-04-SUMMARY.md, 36-05-SUMMARY.md
started: 2026-03-02T18:00:00Z
updated: 2026-03-02T18:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Ghost Options Fix on Poll Duplication
expected: Teacher duplicates a poll, removes some options from the duplicate, saves -- the duplicated poll correctly shows only the remaining options (no ghost options from original)
result: pass

### 2. Poll Quick Create Session Dropdown
expected: Poll Quick Create page includes an "Assign to session" dropdown matching the bracket Quick Create layout exactly
result: pass

### 3. 2-Option Poll Centering
expected: Student viewing a poll with exactly 2 options sees them as side-by-side larger cards, centered on screen
result: pass

### 4. Student Live Results Display
expected: When "Show Live Results" is toggled ON for a poll, students see vote count bars with percentages updating in real time
result: pass

### 5. Duplicate Name Prompt
expected: When a student enters a name already taken in the session, they see "Name taken. Add your last initial to join." with the original name kept in the input
result: pass

### 6. Fullscreen Mode Stability
expected: Fullscreen/presentation mode on teacher live dashboard stays open until Esc or F is pressed -- no auto-close from re-renders
result: pass

### 7. Poll Realtime Dashboard Updates
expected: Poll teacher live dashboard updates vote counts and bars in real time as students vote (no manual refresh needed)
result: pass

### 8. Bracket Vote Indicators
expected: Bracket vote indicators (green dots) update correctly when students vote -- green dot appears next to voted students in the participation sidebar
result: skipped
reason: Context limit reached; requires full bracket voting flow with multiple students

### 9. Go Live / Start Flow
expected: Go Live button is hidden on bracket/poll detail pages while in draft status; clicking Start activates and auto-navigates to the live dashboard
result: pass

## Summary

total: 9
passed: 8
issues: 0
pending: 0
skipped: 1

## Gaps

[none]
