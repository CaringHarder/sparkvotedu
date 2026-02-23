---
status: complete
phase: 23-session-archiving
source: 23-01-SUMMARY.md, 23-02-SUMMARY.md, 23-03-SUMMARY.md
started: 2026-02-23T19:00:00Z
updated: 2026-02-23T19:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Archive a Session from Session Card
expected: On the /sessions page, each session card has a three-dot menu icon in the top-right corner. Clicking it opens a dropdown with "Archive Session". Selecting Archive opens a confirmation dialog. Clicking "Archive" in the dialog removes the session from the main list.
result: pass

### 2. Archived Sessions Page via Sidebar
expected: The sidebar nav shows an "Archived" link (with Archive icon). Clicking it navigates to /sessions/archived and shows a list of archived sessions with participant, bracket, and poll counts on each card.
result: pass

### 3. Sidebar Active State
expected: When on /sessions/archived, the "Archived" sidebar link is highlighted as active. The "Sessions" link is NOT highlighted (it correctly defers to the more specific match).
result: pass

### 4. Search Archived Sessions
expected: The archived sessions page has a search field. Typing a session name filters the displayed sessions in real-time (with slight debounce). If no matches, a "no results" state is shown.
result: pass

### 5. Recover an Archived Session
expected: On the archived sessions page, each session card has a "Recover" button. Clicking it (no confirmation needed) moves the session back to the main /sessions list. The session appears as ended (not active).
result: pass

### 6. Permanently Delete an Archived Session
expected: Each archived session card has a "Delete" button (styled subtle/secondary, not red). Clicking it opens a confirmation dialog. Confirming permanently removes the session and all its brackets/polls.
result: pass

### 7. Student Blocked from Archived Session
expected: When a student enters a join code for an archived session, they see a muted (not red/destructive) "This session is no longer available" message with a fallback form to try another code.
result: skipped

## Summary

total: 7
passed: 6
issues: 0
pending: 0
skipped: 1

## Gaps

[none yet]
