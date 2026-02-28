---
phase: quick-15
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/student/session-store.ts
  - src/components/student/name-entry-form.tsx
  - src/components/student/name-disambiguation.tsx
  - src/components/student/session-header.tsx
  - src/app/(student)/session/[sessionId]/layout.tsx
  - src/app/(student)/session/[sessionId]/page.tsx
  - src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx
  - src/app/(student)/session/[sessionId]/poll/[pollId]/page.tsx
autonomous: true
requirements: [BUG-15]

must_haves:
  truths:
    - "Multiple tabs in the same browser each maintain independent student identities"
    - "A student who refreshes their tab retains their identity (sessionStorage persists across refresh)"
    - "Existing join flow (enter name, get fun name, see activities) still works end-to-end"
    - "Bracket and poll voting pages correctly identify the participant for that tab"
    - "Last session code auto-fill on the /join page still works (localStorage is fine for this)"
  artifacts:
    - path: "src/lib/student/session-store.ts"
      provides: "Centralized sessionStorage helper for per-tab session identity"
      exports: ["getSessionParticipant", "setSessionParticipant", "updateSessionParticipant"]
    - path: "src/components/student/name-entry-form.tsx"
      provides: "Uses sessionStorage for identity caching after join"
      contains: "sessionStore"
    - path: "src/app/(student)/session/[sessionId]/layout.tsx"
      provides: "Reads participant from sessionStorage (not localStorage)"
      contains: "sessionStore"
  key_links:
    - from: "src/components/student/name-entry-form.tsx"
      to: "src/lib/student/session-store.ts"
      via: "setSessionParticipant after successful join"
      pattern: "setSessionParticipant"
    - from: "src/app/(student)/session/[sessionId]/layout.tsx"
      to: "src/lib/student/session-store.ts"
      via: "getSessionParticipant to load identity on mount"
      pattern: "getSessionParticipant"
    - from: "src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx"
      to: "src/lib/student/session-store.ts"
      via: "getSessionParticipant to get participantId for voting"
      pattern: "getSessionParticipant"
---

<objective>
Fix the localStorage session caching bug where multiple tabs in the same browser share student identity instead of being independent.

Purpose: When a teacher demos with multiple tabs in one browser (simulating different students), all tabs currently resolve to the same student identity because localStorage is shared across all tabs. This causes incorrect participant counts and merged identities. Switching session identity storage from localStorage to sessionStorage makes each tab independent while preserving same-tab refresh persistence.

Output: All session identity reads/writes use sessionStorage (per-tab), eliminating cross-tab identity bleeding. A new helper module centralizes the storage pattern.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/student/session-identity.ts
@src/components/student/name-entry-form.tsx
@src/components/student/name-disambiguation.tsx
@src/components/student/session-header.tsx
@src/app/(student)/session/[sessionId]/layout.tsx
@src/app/(student)/session/[sessionId]/page.tsx
@src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx
@src/app/(student)/session/[sessionId]/poll/[pollId]/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create session-store helper and migrate all writes from localStorage to sessionStorage</name>
  <files>
    src/lib/student/session-store.ts
    src/components/student/name-entry-form.tsx
    src/components/student/name-disambiguation.tsx
    src/components/student/session-header.tsx
  </files>
  <action>
Create a new file `src/lib/student/session-store.ts` that provides a centralized helper for per-tab session identity using sessionStorage. This replaces the scattered inline localStorage calls. The module should:

1. Define the `SessionParticipantStore` interface matching the existing shape:
   ```ts
   interface SessionParticipantStore {
     participantId: string
     firstName: string
     funName: string
     sessionId: string
     rerollUsed: boolean
   }
   ```

2. Export three functions:
   - `getSessionParticipant(sessionId: string): SessionParticipantStore | null` -- reads from `sessionStorage` using key `sparkvotedu_session_{sessionId}`, returns parsed object or null. Returns null during SSR (typeof window === 'undefined') or on parse error.
   - `setSessionParticipant(sessionId: string, data: SessionParticipantStore): void` -- writes to `sessionStorage`. Fail-silent on error.
   - `updateSessionParticipant(participantId: string, updates: Partial<SessionParticipantStore>): void` -- finds the session entry in sessionStorage whose participantId matches, merges updates, writes back. Used by session-header for reroll/name-edit. Fail-silent on error. Iterates sessionStorage keys starting with `sparkvotedu_session_`.

Then update the three WRITE files:

**name-entry-form.tsx** (line ~83-98): Replace the inline `localStorage.setItem(sparkvotedu_session_...)` block with:
```ts
import { setSessionParticipant } from '@/lib/student/session-store'
// ...
setSessionParticipant(result.session.id, {
  participantId: result.participant.id,
  firstName: result.participant.firstName,
  funName: result.participant.funName,
  sessionId: result.session.id,
  rerollUsed: result.participant.rerollUsed,
})
```
KEEP the `localStorage.setItem('sparkvotedu_last_session_code', code)` line -- this is convenience auto-fill, not identity, and should remain in localStorage (shared across tabs is fine for this).

**name-disambiguation.tsx** (two places -- handleClaim ~line 63-77, handleDifferentiate ~line 147-160): Same pattern -- replace `localStorage.setItem(sparkvotedu_session_...)` with `setSessionParticipant(...)`. KEEP the `sparkvotedu_last_session_code` writes in localStorage.

**session-header.tsx** (handleReroll ~line 37-52, handleNameUpdated ~line 55-73): Replace the `Object.keys(localStorage)` iteration with `updateSessionParticipant(participantId, { funName: newName, rerollUsed: true })` for reroll and `updateSessionParticipant(participantId, { firstName: newName })` for name edit. Import `updateSessionParticipant` from the new helper.
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no type errors. Grep for `localStorage.*sparkvotedu_session_` across the modified files -- should find ZERO matches (all session identity storage migrated to sessionStorage via the helper). The only remaining localStorage references in these files should be for `sparkvotedu_last_session_code`.
  </verify>
  <done>
All session identity WRITES go through sessionStorage via session-store.ts helper. No direct localStorage usage for `sparkvotedu_session_*` keys in the three write files.
  </done>
</task>

<task type="auto">
  <name>Task 2: Migrate all session identity reads from localStorage to sessionStorage</name>
  <files>
    src/app/(student)/session/[sessionId]/layout.tsx
    src/app/(student)/session/[sessionId]/page.tsx
    src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx
    src/app/(student)/session/[sessionId]/poll/[pollId]/page.tsx
  </files>
  <action>
Update the four READ files to use the `getSessionParticipant` helper instead of direct localStorage access:

**layout.tsx** (~line 38): Replace:
```ts
const stored = localStorage.getItem(`sparkvotedu_session_${sid}`)
if (stored) {
  const data: ParticipantStore = JSON.parse(stored)
  setParticipant(data)
}
```
With:
```ts
import { getSessionParticipant } from '@/lib/student/session-store'
// ...
const data = getSessionParticipant(sid)
if (data) {
  setParticipant(data)
}
```
Remove the try/catch wrapping since the helper handles errors internally. The `ParticipantStore` interface in layout.tsx can remain for the component state type -- it matches the helper's return shape.

**page.tsx** (~line 21-36): Replace the inline IIFE that reads from localStorage with:
```ts
import { getSessionParticipant } from '@/lib/student/session-store'
// ...
const stored = typeof window !== 'undefined' ? getSessionParticipant(sessionId) : null
const participantId = stored?.participantId ?? ''
```

**bracket/[bracketId]/page.tsx** (~line 142-152): Replace the `localStorage.getItem(sparkvotedu_session_...)` + JSON.parse block with:
```ts
import { getSessionParticipant } from '@/lib/student/session-store'
// ...
const stored = getSessionParticipant(sessionId)
const participantId = stored?.participantId ?? null
```
Remove the surrounding try/catch since the helper handles errors.

**poll/[pollId]/page.tsx** (~line 168-180): Same pattern as bracket page -- replace localStorage read with `getSessionParticipant(sessionId)` and extract `participantId`.

After all changes, do a final grep across the ENTIRE `src/` directory for `localStorage.*sparkvotedu_session_` -- the only remaining hits should be in the OLD `session-identity.ts` file (which is dead code from the pre-Phase-20 device-based flow). There should be zero hits in any of the 7 modified files.
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no type errors. Run `npx next build` to verify the build succeeds. Grep `src/` for `localStorage.*sparkvotedu_session_` -- only `session-identity.ts` should match (dead code). All 7 modified consumer files plus the new helper should use sessionStorage exclusively for session identity.
  </verify>
  <done>
All session identity reads use sessionStorage via the centralized helper. The full student flow (join -> welcome -> activity grid -> bracket/poll voting) uses per-tab storage. Multiple tabs in the same browser will each maintain independent student identities. Page refresh within a tab preserves the identity (sessionStorage persists on refresh). The `sparkvotedu_last_session_code` convenience key remains in localStorage (intentional -- it is not identity data).
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. `npx next build` succeeds
3. Grep for `localStorage.*sparkvotedu_session_` in modified files returns zero matches
4. Manual test: Open two tabs to same session code, enter different names in each -- both tabs should show different fun names and the teacher dashboard should show 2 participants (not 1)
5. Manual test: Refresh a tab after joining -- student identity persists (sessionStorage survives refresh)
</verification>

<success_criteria>
- Each browser tab maintains its own independent student identity via sessionStorage
- Same-tab page refresh preserves the student's identity
- Teacher dashboard shows correct participant count when multiple tabs join
- Build passes, no type errors
- No regression in the existing join/disambiguate/vote flows
</success_criteria>

<output>
After completion, create `.planning/quick/15-fix-localstorage-session-caching-bug-mul/15-SUMMARY.md`
</output>
