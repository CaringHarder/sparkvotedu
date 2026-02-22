---
status: complete
phase: 20-name-based-student-identity
source: 20-01-SUMMARY.md, 20-02-SUMMARY.md, 20-03-SUMMARY.md
started: 2026-02-21T23:55:00Z
updated: 2026-02-22T00:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Join with Session Code
expected: Navigate to /join. Enter a valid session code. You should be redirected to /join/[code] where you see a name entry form with the session name displayed as context.
result: pass

### 2. Enter Name and Get Fun Name
expected: On the name entry page (/join/[code]), enter your first name and submit. You should be redirected to the welcome screen showing "You're now [Fun Name]!" with your assigned anonymous fun name.
result: pass

### 3. Case-Insensitive Name Recognition
expected: After joining as "Jake", leave and rejoin the same session typing "jake" (lowercase). You should be recognized as the same student (not created as a duplicate).
result: pass

### 4. Duplicate Name Disambiguation
expected: Have a second student (or tab) join with the same first name as an existing participant. Instead of joining directly, they should see an "Is this you?" prompt showing the existing student's fun name.
result: pass

### 5. Claim Identity (Two-Click)
expected: On the disambiguation screen, click "That's me!" on an existing identity. A "Confirm" button should appear (two-click safety). Confirming should log you in as that student with their fun name.
result: pass

### 6. Differentiate Name
expected: On the disambiguation screen, choose to differentiate instead of claiming. An inline text input should appear pre-filled with your entered name so you can add a last initial (e.g., "Jake M"). Submitting should create a new participant.
result: pass

### 7. Teacher Roster Shows Name Mapping
expected: On the teacher dashboard session detail, the student roster should display each student in "Fun Name (Real Name)" format -- e.g., "Speedy Penguin (Jake M)".
result: pass

### 8. Participation Sidebar Shows Real Names
expected: On the teacher participation sidebar (tile grid), each student tile should show the fun name with their real first name displayed in smaller text below it.
result: pass

### 9. Student Edit Name
expected: As a joined student, click the settings dropdown in the session header. An "Edit Name" option should appear. Clicking it opens a dialog where you can change your first name. After saving, the name updates.
result: pass

### 10. Bracket Live Page Shows Real Names
expected: On the teacher bracket live page, the participation sidebar should also show real names below fun names (same as session detail sidebar).
result: pass

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
