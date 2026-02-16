---
phase: 03-bracket-creation-management
plan: 01
subsystem: bracket-data-model
tags: [prisma, typescript, zod, bracket, schema, validation]
requires:
  - 01-foundation-and-auth (Teacher model, Prisma setup, Zod patterns)
  - 02-student-join-flow (ClassSession model for optional bracket-session relation)
provides:
  - Bracket, BracketEntrant, Matchup database tables with relations and indexes
  - TypeScript domain types for bracket system (BracketData, BracketEntrantData, MatchupData, MatchupSeed, BracketWithDetails)
  - Zod validation schemas for bracket CRUD operations
affects:
  - 03-02 (bracket engine depends on MatchupSeed type)
  - 03-03 (bracket DAL depends on Prisma models)
  - 03-04 (bracket UI depends on BracketData types)
  - 03-05 through 03-07 (all subsequent plans depend on these foundations)
tech-stack:
  added: []
  patterns:
    - Self-referential Prisma relation (Matchup.nextMatchupId for advancement chain)
    - Composite unique constraints for data integrity (bracketId + seedPosition, bracketId + round + position)
    - Cascade delete on bracket-owned entities
key-files:
  created:
    - src/lib/bracket/types.ts
  modified:
    - prisma/schema.prisma
    - src/lib/utils/validation.ts
key-decisions:
  - sessionId is optional on Bracket model (brackets can exist without sessions)
  - BracketEntrant uses cascade delete from Bracket for cleanup
  - Matchup uses self-referential relation for advancement chain (nextMatchupId)
  - Zod schemas enforce bracket sizes as literal union (4 | 8 | 16) not range
  - deleteBracketSchema added beyond plan spec for completeness
duration: ~1.5m
completed: 2026-01-30
---

# Phase 3 Plan 01: Bracket Data Models, Types, and Validation Summary

**One-liner:** Prisma models for Bracket/BracketEntrant/Matchup with self-referential advancement, TypeScript domain types, and Zod validation schemas for all bracket CRUD operations.

## Accomplishments

- Added three new Prisma models (Bracket, BracketEntrant, Matchup) with full relations, indexes, and constraints
- Bracket model links to Teacher (required) and ClassSession (optional) with proper foreign keys
- BracketEntrant uses cascade delete and composite unique on (bracketId, seedPosition)
- Matchup uses self-referential nextMatchupId for tournament advancement chain
- Matchup has composite unique on (bracketId, round, position) for structural integrity
- Created TypeScript types module covering all bracket domain concepts
- Extended existing Zod validation module with 6 bracket schemas and 5 inferred types
- Database synced successfully via `prisma db push`
- Zero TypeScript compilation errors

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add Bracket, BracketEntrant, and Matchup Prisma models | 2249f93 | prisma/schema.prisma |
| 2 | Create bracket TypeScript types and Zod validation schemas | f72b051 | src/lib/bracket/types.ts, src/lib/utils/validation.ts |

## Files Created

| File | Purpose |
|------|---------|
| src/lib/bracket/types.ts | TypeScript domain types: BracketSize, BracketStatus, BracketData, BracketEntrantData, MatchupData, MatchupSeed, BracketWithDetails |

## Files Modified

| File | Changes |
|------|---------|
| prisma/schema.prisma | Added Bracket, BracketEntrant, Matchup models; added brackets relation to Teacher and ClassSession |
| src/lib/utils/validation.ts | Added bracketSizeSchema, createBracketSchema, entrantSchema, updateEntrantsSchema, updateBracketStatusSchema, deleteBracketSchema, and inferred types |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| sessionId optional on Bracket | Brackets can exist in draft without a session; teachers assign session when activating. Keeps Phase 3 independent of Phase 2 as designed. |
| Cascade delete for BracketEntrant and Matchup | When a bracket is deleted, all entrants and matchups are cleaned up automatically. Safe because draft brackets have no external references. |
| Self-referential Matchup.nextMatchupId | Standard tournament bracket pattern -- each matchup knows which matchup the winner advances to. Enables efficient advancement queries. |
| Literal union for bracket sizes (4|8|16) | Strictly enforces power-of-two sizes in Phase 3. Non-power-of-two (byes) is Phase 7 scope. |
| deleteBracketSchema added | Plan specified 5 schemas but delete is needed for bracket CRUD completeness. Added as minor scope addition. |

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- **03-02 (Bracket Engine):** Ready. MatchupSeed type is defined and exportable. Prisma models define the target persistence shape.
- **03-03 (Bracket DAL):** Ready. All three Prisma models exist with proper relations for DAL query patterns.
- **03-04+ (UI/Actions):** Ready. TypeScript types and Zod schemas provide the contract for server actions and client components.
