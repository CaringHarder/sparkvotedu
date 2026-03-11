---
phase: quick-31
plan: 01
type: tdd
wave: 1
depends_on: []
files_modified:
  - src/actions/student.ts
  - src/actions/__tests__/student-lookup.test.ts
autonomous: true
requirements: [QUICK-31]
must_haves:
  truths:
    - "When multiple students share a firstName in the current session, all are shown as candidates instead of auto-reclaiming one"
    - "When exactly one student matches firstName in current session, auto-reclaim still works"
    - "Cross-session candidates still deduplicate by funName+emoji and include lastInitial"
  artifacts:
    - path: "src/actions/student.ts"
      provides: "lookupStudentByFirstName with multi-match current-session handling"
      contains: "currentSessionMatches"
    - path: "src/actions/__tests__/student-lookup.test.ts"
      provides: "Tests for multi-match current-session scenario"
  key_links:
    - from: "src/actions/student.ts"
      to: "src/components/student/join-wizard/returning-disambiguation.tsx"
      via: "LookupResult.candidates"
      pattern: "candidates.*DuplicateCandidate"
---

<objective>
Fix lookupStudentByFirstName to handle multiple current-session matches by showing disambiguation instead of auto-reclaiming the first match.

Purpose: When two "David"s are in the same session, the wrong one gets auto-reclaimed because `.find()` grabs the first match. The fix checks the count of current-session matches before deciding behavior.

Output: Updated server action + tests covering the multi-match scenario.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/actions/student.ts (lines 588-685 — lookupStudentByFirstName function)
@src/actions/__tests__/student-lookup.test.ts
@src/types/student.ts (LookupResult, DuplicateCandidate interfaces)
@src/components/student/join-wizard/returning-disambiguation.tsx (already handles candidates display)

<interfaces>
<!-- The ReturningDisambiguation component already accepts DuplicateCandidate[] with lastInitial -->
From src/types/student.ts:
```typescript
export interface DuplicateCandidate {
  id: string
  funName: string
  emoji: string | null
  lastInitial: string | null
}

export interface LookupResult {
  participant?: StudentParticipantData
  session?: ClassSessionData
  returning?: boolean
  sessionEnded?: boolean
  candidates?: DuplicateCandidate[]
  isNew?: boolean
  allowNew?: boolean
  error?: string
}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add test for multiple current-session matches, then fix lookupStudentByFirstName</name>
  <files>src/actions/__tests__/student-lookup.test.ts, src/actions/student.ts</files>
  <behavior>
    - Test: When 2+ matches share firstName in the CURRENT session, return candidates (not auto-reclaim)
    - Test: When exactly 1 match in current session, auto-reclaim still works (existing behavior preserved)
    - Test: When multiple current-session matches exist alongside cross-session matches, all are shown as candidates
  </behavior>
  <action>
RED: Add 3 test cases to the `lookupStudentByFirstName` describe block:

1. "shows candidates when multiple current-session matches exist" — mock findReturningByFirstName returning 2 matches both with sessionId === mockSession.id. Mock prisma.studentParticipant.findUnique. Assert result has `candidates` (not `participant`/`returning`), candidates length is 2, and no auto-reclaim occurred (createReturningParticipant not called).

2. "auto-reclaims when exactly one current-session match" — existing test already covers this at line 206, but verify it still passes after the fix. The existing test has sessionId: 'session-old' (not current session) so add a NEW test where ONE match has sessionId === mockSession.id ('session-1'). Mock prisma.studentParticipant.findUnique to return the participant. Assert result.returning === true and result.participant is defined.

3. "shows all candidates when multiple current-session + cross-session matches" — mock 2 current-session matches + 1 cross-session match. Assert candidates length is 3 (all shown), allowNew is true.

Run tests (expect failures).

GREEN: Fix `lookupStudentByFirstName` in src/actions/student.ts (lines 641-656):

Replace the current logic:
```typescript
const currentSessionMatch = matches.find((m) => m.sessionId === session.id)
if (currentSessionMatch) {
  // ... auto-reclaim single match
}
```

With:
```typescript
const currentSessionMatches = matches.filter((m) => m.sessionId === session.id)
if (currentSessionMatches.length === 1) {
  // Auto-reclaim only when exactly ONE current-session match
  const currentSessionMatch = currentSessionMatches[0]
  const { prisma } = await import('@/lib/prisma')
  const existing = await prisma.studentParticipant.findUnique({
    where: { id: currentSessionMatch.id },
  })
  if (existing) {
    broadcastParticipantJoined(session.id).catch(() => {})
    return {
      participant: toParticipantData(existing),
      session: sessionInfo,
      returning: true,
    }
  }
}
```

When currentSessionMatches.length > 1: skip auto-reclaim, fall through to the deduplication logic below. But also include current-session matches in the candidates (don't filter them out). Update the crossSessionMatches filter:

```typescript
// If multiple current-session matches, include them in candidates
const candidateMatches = currentSessionMatches.length > 1
  ? matches  // Include all (current + cross-session)
  : matches.filter((m) => m.sessionId !== session.id)  // Exclude the single auto-reclaimed match
```

Then use `candidateMatches` instead of `crossSessionMatches` for the rest of the dedup logic.

Run tests again — all should pass.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx vitest run src/actions/__tests__/student-lookup.test.ts</automated>
  </verify>
  <done>
    - Multiple current-session matches return candidates array instead of auto-reclaiming
    - Single current-session match still auto-reclaims
    - All new and existing tests pass
  </done>
</task>

</tasks>

<verification>
npx vitest run src/actions/__tests__/student-lookup.test.ts
</verification>

<success_criteria>
- lookupStudentByFirstName returns candidates when 2+ students share a firstName in the current session
- Single current-session match auto-reclaim is preserved
- Existing tests continue to pass
- ReturningDisambiguation component needs no changes (already handles candidates)
</success_criteria>

<output>
After completion, create `.planning/quick/31-fix-returning-student-search-to-handle-m/31-SUMMARY.md`
</output>
