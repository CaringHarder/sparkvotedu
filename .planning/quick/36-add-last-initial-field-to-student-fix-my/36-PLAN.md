# Quick Task 36: Add last initial field to student Fix My Name dialog

## Task
The "Fix My Name" dialog only shows firstName. Add lastInitial field so students can fix both.

## Files
- `src/components/student/edit-name-dialog.tsx` — add lastInitial input field
- `src/components/student/session-header.tsx` — pass lastInitial prop through
- `src/app/(student)/session/[sessionId]/layout.tsx` — add lastInitial to store interface, pass to header
- `src/actions/student.ts` — accept optional lastInitial in updateParticipantName
- `src/lib/dal/student-session.ts` — update updateFirstName to save lastInitial
