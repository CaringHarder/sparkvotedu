---
phase: quick-30
plan: 01
subsystem: student-join-wizard
tags: [bugfix, ghost-students, wizard-flow, data-integrity]
dependency_graph:
  requires: []
  provides: [reserveFunName, createCompletedParticipant, removeIncompleteParticipants, generateUniqueFunName]
  affects: [join-wizard, teacher-sidebar, participants-api]
tech_stack:
  added: []
  patterns: [reservation-based-creation, atomic-participant-creation, ghost-filtering]
key_files:
  created: []
  modified:
    - src/actions/student.ts
    - src/lib/dal/student-session.ts
    - src/components/student/join-wizard/join-wizard.tsx
    - src/components/student/join-wizard/types.ts
    - src/app/api/sessions/[sessionId]/participants/route.ts
decisions:
  - Defer participant DB creation until wizard completion (emoji step) instead of on "I'm new here!" click
  - Pass reserved funName as preference to createParticipant; fall back to new name on collision
  - Keep deprecated createWizardParticipant/completeWizardProfile for backward safety
  - Add API-level ghost filter as defense-in-depth (firstName not empty)
metrics:
  duration: 3m 27s
  completed: 2026-03-09
  tasks_completed: 3
  tasks_total: 3
---

# Quick Task 30: Fix Ghost Students Bug Summary

Reservation-based wizard flow that defers participant DB creation until wizard completion, eliminating phantom records from abandoned wizards.

## What Changed

### Task 1: Server actions and DAL changes (e1bcdd3)

**New server actions in `src/actions/student.ts`:**
- `reserveFunName({ code })` -- generates a unique fun name for the session without creating a DB record. Returns `{ funName, session }`.
- `createCompletedParticipant({ code, funName, firstName, lastInitial, emoji })` -- creates participant atomically with all fields populated. Validates emoji against EMOJI_POOL. Uses reserved funName if still unique, otherwise generates new one.
- `removeIncompleteParticipants({ sessionId })` -- teacher-authenticated action to delete ghost records (firstName='') from a session.

**DAL changes in `src/lib/dal/student-session.ts`:**
- Added `generateUniqueFunName(sessionId)` -- read-only function that returns a unique fun name without DB write.
- Modified `createParticipant` to accept optional 6th parameter `preferredFunName`. If provided and unique, uses it; otherwise falls back to generated name.

**API filter in `src/app/api/sessions/[sessionId]/participants/route.ts`:**
- Added `firstName: { not: '' }` to the participants query. Ghost records with empty firstName are now invisible in the teacher sidebar even if they exist.

**Deprecated (not removed):**
- `createWizardParticipant` -- marked @deprecated, still exported for safety
- `completeWizardProfile` -- marked @deprecated, still exported for safety

### Task 2: Wizard component and types update (a6821af)

**Types (`src/components/student/join-wizard/types.ts`):**
- Removed `participantId` from early wizard steps: `fun-name-splash`, `first-name`, `last-initial`, `emoji-pick`, `new-match-found`
- Added `participantId` to `SELECT_EMOJI` action (comes from server response)
- `welcome` step retains `participantId` (participant exists at that point)

**Component (`src/components/student/join-wizard/join-wizard.tsx`):**
- `handleSelectNew` now calls `reserveFunName` instead of `createWizardParticipant`. No DB record created.
- `handleEmojiSelect` now calls `createCompletedParticipant` FIRST (await), then transitions to welcome on success. Shows loading state during server call. Shows error if creation fails.
- Reducer updated: `SET_FUN_NAME` no longer carries participantId. `SELECT_EMOJI` now receives participantId from the action (from server response).
- Reclaim paths (last-initial lookup, new-match-found) are naturally clean -- no orphan participant to delete since none was created.

### Task 3: Verification

- TypeScript compiles clean (`npx tsc --noEmit` passes)
- `npm run build` completes successfully
- Zero references to `createWizardParticipant` in join-wizard.tsx
- Zero references to `completeWizardProfile` in join-wizard.tsx
- `reserveFunName` imported and called in join-wizard.tsx
- `createCompletedParticipant` imported and called in join-wizard.tsx
- Participants API has `firstName: { not: '' }` filter

## Deviations from Plan

None -- plan executed exactly as written.

## Notes

- **Existing ghost cleanup:** The `removeIncompleteParticipants` action is available but has no UI trigger yet. The API-level filter means existing ghosts are already invisible in the teacher sidebar. A future task could wire a "Clean up" button for teachers.
- **Fun name collision handling:** If two students reserve the same fun name concurrently, the second one to complete the wizard gets a different name (the `preferredFunName` collision fallback). The name shown on splash may differ from the final name -- this is an acceptable edge case for concurrent joins.

## Self-Check: PASSED

- [x] src/actions/student.ts modified with new actions
- [x] src/lib/dal/student-session.ts modified with generateUniqueFunName and preferredFunName
- [x] src/components/student/join-wizard/join-wizard.tsx updated to new flow
- [x] src/components/student/join-wizard/types.ts updated (no participantId in early steps)
- [x] src/app/api/sessions/[sessionId]/participants/route.ts has ghost filter
- [x] Commit e1bcdd3 exists
- [x] Commit a6821af exists
