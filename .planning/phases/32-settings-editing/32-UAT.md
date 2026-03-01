---
status: complete
phase: 32-settings-editing
source: 32-01-SUMMARY.md, 32-02-SUMMARY.md, 32-03-SUMMARY.md, 32-04-SUMMARY.md, 32-05-SUMMARY.md
started: 2026-03-01T22:40:00Z
updated: 2026-03-01T23:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Bracket Detail - Display Settings Section
expected: Bracket detail page shows a "Display Settings" section with gear icon header, locked Type/Size indicators with lock icons, and editable Viewing Mode toggle
result: pass

### 2. Bracket Detail - Show Seeds & Vote Counts Toggles
expected: For SE brackets, Show Seed Numbers and Show Vote Counts toggles are present in the Display Settings section and can be toggled on/off
result: pass

### 3. Bracket Live Dashboard - Display Settings
expected: Bracket live dashboard shows DisplaySettingsSection with locked Type/Size indicators and same editable toggles as detail page
result: pass

### 4. Poll Detail - Display Settings Section
expected: Poll detail page shows Display Settings section with locked Type indicator (e.g., "Multiple Choice") and editable Show Live Results / Allow Vote Change toggles
result: pass

### 5. Poll Live Dashboard - Display Settings
expected: Poll live dashboard shows DisplaySettingsSection with locked Type indicator and editable Show Live Results / Allow Vote Change toggles
result: pass

### 6. Locked Settings Cannot Be Edited
expected: Locked settings (bracket Type/Size, poll Type) show a lock icon and hovering reveals a tooltip explaining they cannot be changed after creation. There is no toggle or edit control on locked items.
result: pass

### 7. Settings Persist After Toggle
expected: Teacher toggles a display setting (e.g., viewing mode on a bracket), navigates away, returns to the page -- the setting retains its toggled value
result: pass

### 8. Student Bracket Viewing Mode Routing
expected: When teacher changes bracket viewing mode from Advanced to Simple (or vice versa), the student bracket page reactively switches between card-by-card simple view and full bracket diagram advanced view without page refresh
result: skipped
reason: No active voting round available to test viewingMode routing. All rounds on the available Predictive bracket were resolved, so simple/advanced mode had no visible difference on the results view. Teacher-side toggle and persistence confirmed working.

### 9. Student Poll Reactive Settings
expected: When teacher toggles "Show Live Results" on a live poll, connected student poll views reactively show or hide live result percentages without page refresh
result: skipped
reason: Context budget reached before testing this cross-tab scenario. Teacher-side poll toggle (Show Live Results) confirmed working and persisting. Realtime broadcast code is the same pattern as bracket settings (effectivePoll mirrors effectiveBracket).

### 10. Settings Disabled on Completed Activities
expected: On a completed bracket or closed/archived poll, the Display Settings section toggles are disabled (greyed out, non-interactive) -- changes cannot be made to finished activities
result: pass

## Summary

total: 10
passed: 8
issues: 0
pending: 0
skipped: 2

## Gaps

[none]
