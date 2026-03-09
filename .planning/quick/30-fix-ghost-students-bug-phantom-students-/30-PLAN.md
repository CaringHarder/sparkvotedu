---
phase: 30-fix-ghost-students-bug
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/actions/student.ts
  - src/lib/dal/student-session.ts
  - src/components/student/join-wizard/join-wizard.tsx
  - src/components/student/join-wizard/types.ts
  - src/app/api/sessions/[sessionId]/participants/route.ts
autonomous: true
requirements: [GHOST-FIX]

must_haves:
  truths:
    - "New students clicking 'I'm new here!' do NOT create a DB record until wizard completion"
    - "Fun name splash screen still shows a unique fun name before the student enters their real name"
    - "Completing the wizard (emoji step) creates a single atomic participant record with all fields"
    - "Abandoning the wizard at any step leaves zero orphan records"
    - "Reclaiming an existing identity during last-initial step leaves zero orphan records"
    - "Teacher sidebar does not display participants with empty firstName"
    - "Existing completed participants are unaffected"
  artifacts:
    - path: "src/actions/student.ts"
      provides: "reserveFunName and createCompletedParticipant server actions"
      exports: ["reserveFunName", "createCompletedParticipant", "removeIncompleteParticipants"]
    - path: "src/components/student/join-wizard/types.ts"
      provides: "Updated WizardStep union without participantId in early steps"
    - path: "src/app/api/sessions/[sessionId]/participants/route.ts"
      provides: "Filtered participants excluding firstName=''"
  key_links:
    - from: "join-wizard.tsx handleSelectNew"
      to: "reserveFunName action"
      via: "server action call"
      pattern: "reserveFunName"
    - from: "join-wizard.tsx handleEmojiSelect"
      to: "createCompletedParticipant action"
      via: "server action call"
      pattern: "createCompletedParticipant"
    - from: "participants/route.ts"
      to: "prisma query"
      via: "where filter"
      pattern: "firstName.*not.*''"
---

<objective>
Fix the ghost students bug where phantom participants with fun names but no real names are created when students click "I'm new here!" and then abandon the wizard or get matched to an existing identity.

Purpose: Eliminate orphan DB records by deferring participant creation until wizard completion, while preserving the fun name splash UX.
Output: Updated server actions, wizard component, wizard types, and participants API with ghost filtering safety net.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/actions/student.ts
@src/lib/dal/student-session.ts
@src/components/student/join-wizard/join-wizard.tsx
@src/components/student/join-wizard/types.ts
@src/app/api/sessions/[sessionId]/participants/route.ts
@src/lib/student/fun-names.ts
@src/lib/realtime/broadcast.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create reserveFunName and createCompletedParticipant server actions, add ghost cleanup and API filter</name>
  <files>src/actions/student.ts, src/lib/dal/student-session.ts, src/app/api/sessions/[sessionId]/participants/route.ts</files>
  <action>
In `src/actions/student.ts`:

1. **Add `reserveFunName` server action** (export, place near `createWizardParticipant`):
   - Accepts `{ code: string }`, validates with same schema pattern as `createWizardParticipant`
   - Looks up session via `findSessionByCode`, returns error if not found, returns sessionEnded if ended
   - Calls a new DAL function `generateUniqueFunName(sessionId)` (see below) to get a unique fun name WITHOUT creating a DB record
   - Returns `{ funName: string; session: SessionInfo }` (NO participant, NO participantId)
   - Does NOT call `broadcastParticipantJoined` (no participant exists yet)

2. **Add `createCompletedParticipant` server action** (export):
   - Accepts `{ code: string; funName: string; firstName: string; lastInitial: string; emoji: string }`
   - Validates all fields with zod (create a `createCompletedParticipantSchema` - firstName 1-20 chars, lastInitial single letter A-Z, emoji from EMOJI_POOL validation, funName non-empty string)
   - Looks up session via `findSessionByCode`, returns error if not found
   - Calls `createParticipant(session.id, null, firstName, lastInitial, emoji)` -- this generates a NEW fun name (ignoring the reserved one) because the reserved name may have been taken by another student during the wizard delay
   - Actually, BETTER approach: pass the reserved funName to createParticipant. Modify `createParticipant` in the DAL to accept an optional `preferredFunName` parameter. If provided AND still unique in session, use it; otherwise generate a new one. This preserves the name the student saw.
   - Calls `broadcastParticipantJoined(session.id)` after successful creation
   - Returns `{ participant: StudentParticipantData; session: SessionInfo }` matching the JoinResult shape

3. **Add `removeIncompleteParticipants` server action** (export):
   - Requires teacher authentication via `getAuthenticatedTeacher()`
   - Accepts `{ sessionId: string }`
   - Verifies teacher owns the session
   - Deletes all participants where `firstName = ''` AND `sessionId` matches
   - Returns `{ removed: number }` count

4. **Do NOT remove `createWizardParticipant` or `completeWizardProfile`** yet -- mark them with `@deprecated` JSDoc comments noting they will be removed after confirming the new flow works. This avoids breaking any other callers.

In `src/lib/dal/student-session.ts`:

5. **Add `generateUniqueFunName` function** (export):
   - Accepts `sessionId: string`
   - Fetches existing fun names from the session (same query as in `createParticipant`)
   - Calls `generateFunName(existingNames)` and returns the string
   - This is a read-only operation, no DB write

6. **Modify `createParticipant`** to accept optional `preferredFunName?: string` parameter (6th parameter):
   - If `preferredFunName` is provided, check if it's in the `existingNames` set
   - If unique, use it as `funName`; if taken, fall back to `generateFunName(existingNames)`
   - This preserves backward compatibility since the parameter is optional

In `src/app/api/sessions/[sessionId]/participants/route.ts`:

7. **Add ghost filter** to the participants query: add `where: { sessionId, NOT: { firstName: '' } }` (or equivalently `firstName: { not: '' }`). This is a safety net so even if ghost records exist, they don't show in the teacher sidebar.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
    - `reserveFunName` exported and returns funName + session without creating DB record
    - `createCompletedParticipant` exported and creates atomic participant with all fields
    - `removeIncompleteParticipants` exported and deletes ghost records for a session
    - `createParticipant` DAL accepts optional preferredFunName
    - `generateUniqueFunName` DAL function exported
    - Participants API filters out firstName='' records
    - TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Update wizard component and types to use reservation-based flow</name>
  <files>src/components/student/join-wizard/join-wizard.tsx, src/components/student/join-wizard/types.ts</files>
  <action>
In `src/components/student/join-wizard/types.ts`:

1. **Remove `participantId` from early wizard steps.** Update the WizardStep union:
   - `fun-name-splash`: change to `{ type: 'fun-name-splash'; funName: string }` (remove participantId)
   - `first-name`: change to `{ type: 'first-name'; funName: string }` (remove participantId)
   - `last-initial`: change to `{ type: 'last-initial'; funName: string; firstName: string }` (remove participantId)
   - `emoji-pick`: change to `{ type: 'emoji-pick'; funName: string; firstName: string; lastInitial: string }` (remove participantId)
   - `welcome`: keep participantId (participant exists at this point)
   - `new-match-found`: change to `{ type: 'new-match-found'; funName: string; firstName: string; lastInitial: string; candidates: DuplicateCandidate[] }` (remove participantId)

2. **Update WizardAction union:**
   - `SET_FUN_NAME`: change to `{ type: 'SET_FUN_NAME'; funName: string }` (remove participantId)

In `src/components/student/join-wizard/join-wizard.tsx`:

3. **Update imports:** Replace `createWizardParticipant, completeWizardProfile` with `reserveFunName, createCompletedParticipant` from `@/actions/student`.

4. **Update `wizardReducer`:**
   - `SET_FUN_NAME` case: return `{ type: 'fun-name-splash', funName: action.funName }` (no participantId)
   - `SPLASH_COMPLETE` case: return `{ type: 'first-name', funName: state.funName }` (no participantId)
   - `SUBMIT_FIRST_NAME` case: return with `funName` and `firstName` only (no participantId)
   - `SUBMIT_LAST_INITIAL` case: return with `funName`, `firstName`, `lastInitial` only
   - `SET_NEW_MATCH_FOUND` case: return without participantId
   - `DECLINE_MATCH` case: return without participantId
   - `SELECT_EMOJI` case: Do NOT transition to welcome here. Instead, stay on emoji-pick or transition to a loading state. The actual transition happens after the server call completes (see step 6).

5. **Update `handleSelectNew`:**
   - Call `reserveFunName({ code })` instead of `createWizardParticipant({ code })`
   - On success, dispatch `{ type: 'SET_FUN_NAME', funName: result.funName }` (no participantId)
   - Handle session/error responses same as before

6. **Update `handleEmojiSelect`:**
   - This is the critical change. Currently it dispatches SELECT_EMOJI immediately and saves in background.
   - New flow: Call `createCompletedParticipant({ code, funName: step.funName, firstName: step.firstName, lastInitial: step.lastInitial, emoji })` FIRST
   - On success: set sessionStorage via `setSessionParticipant` using the returned participant data (including the ACTUAL funName from the server, which may differ from the reserved one if there was a collision)
   - Set localStorage via `setStoredIdentity` with the returned participant data
   - Then dispatch `SELECT_EMOJI` to transition to welcome screen, passing `participantId: result.participant.id`
   - Update the SELECT_EMOJI reducer case to accept and store participantId: `{ type: 'SELECT_EMOJI'; emoji: string; emojiChar: string; participantId: string }` -- add participantId to this action type
   - On error: show error message, don't transition
   - Show loading state during the server call (set loading=true before, false after)

7. **Update the `last-initial` handler's reclaim path:**
   - When a match is found and student reclaims existing identity (the `result.participant` branch at ~line 552-582), NO cleanup is needed because no wizard participant was created. The student simply reclaims their existing record. This path is now cleaner.

8. **Update the `new-match-found` render section** (~line 608-654):
   - The `onClaimed` handler: when student reclaims, same as above -- no orphan to clean up. Just set session/localStorage and dispatch SET_RETURNING_WELCOME as before.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
    - Wizard types no longer carry participantId in early steps (fun-name-splash through emoji-pick)
    - handleSelectNew calls reserveFunName (no DB record created)
    - handleEmojiSelect calls createCompletedParticipant (atomic DB record with all fields)
    - broadcastParticipantJoined only fires from createCompletedParticipant (not on reservation)
    - Reclaim flow during last-initial step leaves no orphan records
    - Fun name splash screen still displays correctly
    - TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 3: Clean up existing ghost records and smoke test</name>
  <files>src/actions/student.ts</files>
  <action>
1. **Verify the full flow compiles and the dev server starts** by running `npm run build` (or at minimum `npx tsc --noEmit`). Fix any type errors.

2. **Write a quick inline verification** by checking the key paths:
   - Grep for any remaining references to `createWizardParticipant` in join-wizard.tsx (should be NONE -- only in student.ts as deprecated)
   - Grep for any remaining references to `completeWizardProfile` in join-wizard.tsx (should be NONE)
   - Verify `reserveFunName` is imported in join-wizard.tsx
   - Verify `createCompletedParticipant` is imported in join-wizard.tsx
   - Verify the participants API route has the `firstName: { not: '' }` filter

3. **Document for the teacher** how to clean existing ghosts: The `removeIncompleteParticipants` action exists but needs a UI trigger. For now, note in the summary that the teacher can use this via a quick one-off script or the action can be wired to a button in a future task. The API safety net (filter in participants route) means existing ghosts are immediately invisible in the sidebar even before cleanup.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit && echo "TYPE CHECK PASSED" && grep -c "reserveFunName" src/components/student/join-wizard/join-wizard.tsx && grep -c "createCompletedParticipant" src/components/student/join-wizard/join-wizard.tsx && grep -c "createWizardParticipant" src/components/student/join-wizard/join-wizard.tsx</automated>
  </verify>
  <done>
    - TypeScript compiles clean
    - join-wizard.tsx references reserveFunName (count > 0)
    - join-wizard.tsx references createCompletedParticipant (count > 0)
    - join-wizard.tsx does NOT reference createWizardParticipant (count = 0)
    - Ghost participants invisible in teacher sidebar via API filter
    - removeIncompleteParticipants action available for explicit cleanup
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with zero errors
2. `npm run build` completes successfully
3. No references to `createWizardParticipant` or `completeWizardProfile` in join-wizard.tsx
4. Participants API excludes `firstName = ''` records
5. Manual smoke test: join as new student, abandon at first-name step, verify no ghost record in DB
</verification>

<success_criteria>
- Zero ghost participants created when students abandon the wizard at any step
- Zero ghost participants created when students reclaim existing identity during last-initial step
- Fun name splash screen still shows a unique name before student enters their real name
- Completed wizard creates a single participant record with all fields populated
- Teacher sidebar no longer shows ghost participants (API filter safety net)
- removeIncompleteParticipants action available for cleaning existing ghosts
- All existing completed participants unaffected
</success_criteria>

<output>
After completion, create `.planning/quick/30-fix-ghost-students-bug-phantom-students-/30-SUMMARY.md`
</output>
