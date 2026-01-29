---
phase: 02-student-join-flow
plan: 01
subsystem: student-data-layer
tags: [prisma, database, class-codes, fun-names, typescript, student-session]
depends_on:
  requires: [01-01]
  provides: [ClassSession-model, StudentParticipant-model, generateClassCode, generateFunName, student-types]
  affects: [02-02, 02-03, 02-04, 02-05]
tech-stack:
  added: []
  patterns: [crypto-randomInt-for-codes, alliterative-name-generation, layered-word-lists-by-letter]
key-files:
  created:
    - src/lib/student/class-codes.ts
    - src/lib/student/fun-names.ts
    - src/lib/student/fun-names-words.ts
    - src/types/student.ts
  modified:
    - prisma/schema.prisma
key-decisions:
  - crypto.randomInt for secure class code generation (not Math.random)
  - Word lists keyed by letter for alliteration enforcement
  - 435 adjectives and 287 animals covering all 26 letters
  - DeviceIdentity, ClassSessionData, StudentParticipantData, JoinResult as core student types
duration: ~3 min
completed: 2026-01-29
---

# Phase 2 Plan 01: Database Schema & Core Utilities Summary

**One-liner:** Prisma models for ClassSession/StudentParticipant with class code generator (crypto.randomInt), alliterative fun name generator (435 adjectives, 287 animals), and TypeScript types for the student subsystem.

## Performance

- **Duration:** ~3 minutes
- **Started:** 2026-01-29T23:40:39Z
- **Completed:** 2026-01-29T23:43:40Z
- **Tasks:** 2/2
- **Files:** 5 (1 modified, 4 created)

## Accomplishments

1. **Prisma Schema Extended** -- Added ClassSession and StudentParticipant models with all specified fields, indexes, unique constraints, and relations. Teacher model updated with classSessions relation. Schema pushed to Supabase database successfully.

2. **Class Code Generator** -- generateClassCode() uses crypto.randomInt(100000, 1000000) for secure 6-digit code generation. Checks active/paused sessions for uniqueness with MAX_ATTEMPTS=10 retry. validateClassCode() validates 6-digit format.

3. **Fun Name Generator** -- generateFunName(existingNames) picks a random letter with both adjectives and animals, then selects alliterative "Adjective Animal" combinations. MAX_ATTEMPTS=100 with numeric fallback. Session-level uniqueness via Set parameter.

4. **Word Lists** -- 435 adjectives and 287 animals keyed by uppercase letter (A-Z). All 26 letters covered. Rare letters (Q, X, Z) have 5-8 entries. All words classroom-appropriate.

5. **Student Types** -- DeviceIdentity, ClassSessionData, StudentParticipantData, and JoinResult interfaces defined for the student subsystem.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add ClassSession and StudentParticipant models | `e050595` | prisma/schema.prisma |
| 2 | Create class code generator, fun name generator, word lists, and student types | `a3896a5` | src/lib/student/class-codes.ts, fun-names.ts, fun-names-words.ts, src/types/student.ts |

## Files Created

- `src/lib/student/class-codes.ts` -- generateClassCode() and validateClassCode()
- `src/lib/student/fun-names.ts` -- generateFunName() alliterative name generator
- `src/lib/student/fun-names-words.ts` -- ADJECTIVES and ANIMALS word lists (26 letters each)
- `src/types/student.ts` -- DeviceIdentity, ClassSessionData, StudentParticipantData, JoinResult

## Files Modified

- `prisma/schema.prisma` -- Added ClassSession, StudentParticipant models; Teacher.classSessions relation

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| crypto.randomInt for class codes | Cryptographically secure; plan and research explicitly require it over Math.random |
| Word lists keyed by letter (Record<string, string[]>) | Enables alliteration by directly selecting adjective and animal from the same letter |
| 435 adjectives, 287 animals | Exceeds plan minimums (400+, 250+); provides ~150k+ total combinations, far exceeding any classroom size |
| Math.random for fun name letter/word selection | Fun names are not security-sensitive; Math.random is acceptable for name variety |
| Separate fun-names-words.ts file | Isolates large word data from generator logic for maintainability |

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**Ready for 02-02** (Device fingerprinting system):
- ClassSession and StudentParticipant models are in the database
- DeviceIdentity type is defined in src/types/student.ts
- StudentParticipant has deviceId and fingerprint fields ready for the fingerprinting hook

**Ready for 02-03** (Join flow backend):
- generateClassCode() ready for session creation
- generateFunName() ready for join flow
- All student types defined for server action return types
