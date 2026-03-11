---
phase: quick-32
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(dashboard)/sessions/[sessionId]/page.tsx
  - src/app/(dashboard)/sessions/[sessionId]/session-detail.tsx
  - src/components/teacher/student-roster.tsx
  - src/components/teacher/student-management.tsx
  - src/lib/dal/student-session.ts
  - src/actions/class-session.ts
autonomous: true
requirements: [QUICK-32]

must_haves:
  truths:
    - "Session participant list shows lastInitial after firstName (e.g. 'Turbo Tiger (David R.)')"
    - "Teacher can edit a participant's name via the dropdown menu on the session page"
    - "Teacher can unban a banned participant's device from the session page"
  artifacts:
    - path: "src/lib/dal/student-session.ts"
      provides: "unbanParticipant DAL function"
      contains: "unbanParticipant"
    - path: "src/actions/class-session.ts"
      provides: "unbanStudent server action"
      contains: "unbanStudent"
  key_links:
    - from: "src/components/teacher/student-management.tsx"
      to: "src/actions/class-session.ts"
      via: "unbanStudent server action call"
      pattern: "unbanStudent"
    - from: "src/components/teacher/student-roster.tsx"
      to: "src/components/teacher/teacher-edit-name-dialog.tsx"
      via: "TeacherEditNameDialog rendered with participant data"
      pattern: "TeacherEditNameDialog"
---

<objective>
Add three features to the teacher's session detail participant list: (1) show lastInitial after firstName, (2) add name editing via existing TeacherEditNameDialog, (3) add unban device action for banned participants.

Purpose: Session page participant management is missing key features already available on the dashboard live page.
Output: Updated session detail page with full participant management parity.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/(dashboard)/sessions/[sessionId]/page.tsx
@src/app/(dashboard)/sessions/[sessionId]/session-detail.tsx
@src/components/teacher/student-roster.tsx
@src/components/teacher/student-management.tsx
@src/components/teacher/teacher-edit-name-dialog.tsx
@src/components/teacher/participation-sidebar.tsx
@src/actions/class-session.ts
@src/lib/dal/student-session.ts

<interfaces>
<!-- Key types and contracts the executor needs -->

From src/components/teacher/teacher-edit-name-dialog.tsx:
```typescript
interface TeacherEditNameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participantId: string
  currentFirstName: string
  currentLastInitial?: string | null
  funName: string
  emoji: string | null
}
```

From src/lib/dal/student-session.ts (existing pattern to follow for unban):
```typescript
export async function banParticipant(participantId: string) {
  return prisma.studentParticipant.update({
    where: { id: participantId },
    data: { banned: true },
  })
}
```

From prisma/schema.prisma (StudentParticipant fields available):
```
firstName, funName, emoji, lastInitial, deviceId, recoveryCode, rerollUsed, banned, lastSeenAt, createdAt, sessionId
```

Current page.tsx serialization (missing lastInitial and emoji):
```typescript
participants: session.participants.map((p) => ({
  id: p.id,
  funName: p.funName,
  firstName: p.firstName,
  banned: p.banned,
  rerollUsed: p.rerollUsed,
  lastSeenAt: p.lastSeenAt.toISOString(),
  createdAt: p.createdAt.toISOString(),
})),
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add lastInitial + emoji to data flow and display lastInitial in roster</name>
  <files>
    src/app/(dashboard)/sessions/[sessionId]/page.tsx
    src/app/(dashboard)/sessions/[sessionId]/session-detail.tsx
    src/components/teacher/student-roster.tsx
  </files>
  <action>
1. In `page.tsx` (line 31-38), add `lastInitial` and `emoji` to the serialized participant object:
   - Add `lastInitial: p.lastInitial ?? null,`
   - Add `emoji: p.emoji ?? null,`

2. In `session-detail.tsx`, update the `ParticipantData` interface (line 20-28) to add:
   - `lastInitial: string | null`
   - `emoji: string | null`

3. In `student-roster.tsx`, update the `ParticipantData` interface (line 6-14) to add:
   - `lastInitial: string | null`
   - `emoji: string | null`

4. In `student-roster.tsx` line 88, update the display string from:
   `{p.funName}{p.firstName ? ` (${p.firstName})` : ''}`
   to:
   `{p.funName}{p.firstName ? ` (${p.firstName}${p.lastInitial ? ` ${p.lastInitial}.` : ''})` : ''}`

   This produces "Turbo Tiger (David R.)" format matching the dashboard live page.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Session page participant list shows "FunName (FirstName L.)" format with lastInitial displayed. TypeScript compiles cleanly.</done>
</task>

<task type="auto">
  <name>Task 2: Add name editing and unban device to student management</name>
  <files>
    src/lib/dal/student-session.ts
    src/actions/class-session.ts
    src/components/teacher/student-management.tsx
    src/components/teacher/student-roster.tsx
  </files>
  <action>
**Unban DAL + server action:**

1. In `src/lib/dal/student-session.ts`, add `unbanParticipant` function right after `banParticipant` (around line 173):
   ```typescript
   export async function unbanParticipant(participantId: string) {
     return prisma.studentParticipant.update({
       where: { id: participantId },
       data: { banned: false },
     })
   }
   ```

2. In `src/actions/class-session.ts`:
   - Add `unbanParticipant as unbanParticipantDAL` to the import from `@/lib/dal/student-session` (line 18-19)
   - Add `unbanStudent` server action after `banStudent` (around line 108), following the exact same pattern as `banStudent` but calling `unbanParticipantDAL`:
   ```typescript
   export async function unbanStudent(participantId: string) {
     const teacher = await getAuthenticatedTeacher()
     if (!teacher) { return { error: 'Not authenticated' } }
     try {
       await unbanParticipantDAL(participantId)
       return { success: true }
     } catch {
       return { error: 'Failed to unban student' }
     }
   }
   ```

**Student management -- add unban + edit name actions:**

3. In `src/components/teacher/student-management.tsx`:
   - Add imports: `import { unbanStudent } from '@/actions/class-session'` and `import { TeacherEditNameDialog } from './teacher-edit-name-dialog'`
   - Expand props interface to include `firstName`, `lastInitial`, `emoji`, and `sessionActive`:
     ```typescript
     interface StudentManagementProps {
       participantId: string
       funName: string
       firstName: string
       lastInitial: string | null
       emoji: string | null
       banned: boolean
       sessionActive: boolean
       onAction: () => void
     }
     ```
   - Update `ActionType` to: `type ActionType = 'remove' | 'ban' | 'unban' | null`
   - Add state for edit dialog: `const [editOpen, setEditOpen] = useState(false)`
   - In `handleConfirm`, add the `'unban'` case calling `await unbanStudent(participantId)`
   - **Remove the early return** `if (banned) return null` on line 53. Instead, when `banned` is true, render a different dropdown with just "Allow Device" (unban). When `banned` is false AND `sessionActive` is true, render the existing dropdown plus "Edit Name" option.
   - For the non-banned dropdown menu items (when sessionActive is true), add "Edit Name" item at the top that calls `setEditOpen(true)` instead of setting confirmAction.
   - For banned participants (regardless of sessionActive), show the three-dot menu with a single "Allow Device" item that sets `setConfirmAction('unban')`.
   - Add confirmation dialog text for unban: title = `Allow ${funName}'s device?`, description = `This will allow ${funName}'s device to rejoin the session.`, button = `Allow Device`.
   - Render `<TeacherEditNameDialog>` at the bottom of the fragment, passing `open={editOpen}`, `onOpenChange={(open) => { setEditOpen(open); if (!open) onAction(); }}`, `participantId`, `currentFirstName={firstName}`, `currentLastInitial={lastInitial}`, `funName`, `emoji`.

4. In `src/components/teacher/student-roster.tsx`:
   - Update the `StudentManagement` usage (around line 103-108) to pass the new props:
     ```tsx
     <StudentManagement
       participantId={p.id}
       funName={p.funName}
       firstName={p.firstName}
       lastInitial={p.lastInitial}
       emoji={p.emoji}
       banned={p.banned}
       sessionActive={sessionActive}
       onAction={onRefresh}
     />
     ```
   - **Change the condition** on line 102 from `{sessionActive && !p.banned && (` to just `{(sessionActive || p.banned) && (` -- this ensures banned participants always show the management dropdown (for unban), and active session participants show it for remove/ban/edit. Actually simpler: just always render `<StudentManagement>` and let the component decide visibility based on its props. Change to:
     ```tsx
     <StudentManagement
       participantId={p.id}
       funName={p.funName}
       firstName={p.firstName}
       lastInitial={p.lastInitial}
       emoji={p.emoji}
       banned={p.banned}
       sessionActive={sessionActive}
       onAction={onRefresh}
     />
     ```
     Remove the conditional wrapping entirely. The component itself will return null when there are no applicable actions (not banned AND not active session).
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>
    - "Edit Name" appears in dropdown for non-banned participants (active sessions), opens TeacherEditNameDialog
    - "Allow Device" appears in dropdown for banned participants, calls unbanStudent server action with confirmation
    - StudentManagement component handles all three states: active+unbanned (remove/ban/edit), banned (unban), inactive+unbanned (nothing rendered)
    - TypeScript compiles cleanly
  </done>
</task>

</tasks>

<verification>
1. TypeScript compiles: `npx tsc --noEmit`
2. Dev server loads session detail page without errors
3. Visual check: participant names show "FunName (FirstName L.)" format
4. Dropdown for non-banned active participants shows: Edit Name, Remove, Ban Device
5. Dropdown for banned participants shows: Allow Device
6. Edit Name opens dialog with current firstName and lastInitial pre-filled
7. Allow Device unbans and refreshes the list
</verification>

<success_criteria>
- Session participant list displays lastInitial after firstName
- Name editing works via reused TeacherEditNameDialog component
- Banned participants can be unbanned via "Allow Device" action
- All TypeScript types are correct and compile cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/32-session-page-add-name-edit-unban-device-/32-SUMMARY.md`
</output>
