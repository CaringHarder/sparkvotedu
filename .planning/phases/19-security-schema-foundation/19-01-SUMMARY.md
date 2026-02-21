---
phase: 19-security-schema-foundation
plan: 01
subsystem: database
tags: [rls, prisma, postgresql, security, migration, schema]

# Dependency graph
requires:
  - phase: 18-production-hardening
    provides: "Deployed production database with all v1.0+v1.1 tables"
provides:
  - "Deny-all RLS on all 12 public tables (PostgREST attack surface locked)"
  - "Prisma migration infrastructure (baseline + Phase 19 migration)"
  - "StudentParticipant.firstName VARCHAR(50) column for name-based identity"
  - "StudentParticipant.deviceId nullable for identity transition"
  - "Index on (sessionId, firstName) for Phase 20 lookups"
  - "Clean database slate (content wiped, teachers/subscriptions preserved)"
affects: [20-name-based-identity, 21-session-security, 22-observability]

# Tech tracking
tech-stack:
  added: []
  patterns: [prisma-migrate-with-baseline, deny-all-rls, hand-edited-migrations]

key-files:
  created:
    - prisma/migrations/0_baseline/migration.sql
    - prisma/migrations/20260221213903_phase19_rls_schema_wipe/migration.sql
    - prisma/migrations/migration_lock.toml
  modified:
    - prisma/schema.prisma
    - src/lib/dal/student-session.ts

key-decisions:
  - "Transitioned from prisma db push to prisma migrate with baseline approach"
  - "Hand-edited migration SQL to combine data wipe + schema changes + RLS enablement in one atomic migration"
  - "Deny-all RLS with no policies -- Prisma superuser bypasses RLS automatically"
  - "Added firstName default parameter to createParticipant DAL (Phase 20 will replace with name-based flow)"

patterns-established:
  - "Prisma Migrate workflow: baseline captures existing schema, new migrations are hand-editable"
  - "RLS deny-all pattern: ENABLE ROW LEVEL SECURITY with no policies = deny all for non-superuser roles"

requirements-completed: [SEC-01, SEC-02, SEC-03]

# Metrics
duration: 9min
completed: 2026-02-21
---

# Phase 19 Plan 01: Security & Schema Foundation Summary

**Deny-all RLS on 12 public tables via Prisma migration, plus StudentParticipant schema changes (firstName, nullable deviceId) with full content data wipe**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-21T21:35:56Z
- **Completed:** 2026-02-21T21:45:10Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Enabled deny-all Row Level Security on all 12 public Supabase tables -- anon key returns empty array for every table
- Transitioned project from `prisma db push` to `prisma migrate` with baseline migration capturing pre-Phase-19 schema
- Added `first_name` VARCHAR(50) column to student_participants and made `device_id` nullable for Phase 20 name-based identity
- Wiped all content data (sessions, brackets, polls, votes, students) while preserving 6 teacher accounts and 1 subscription
- Verified Prisma server-side operations work unaffected (postgres superuser bypasses RLS)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create baseline migration and Phase 19 migration (RLS + schema + data wipe)** - `d2a052f` (feat)
2. **Task 2: Verify RLS blocks anon access and Prisma operations still work** - verification-only, no commit needed

## Files Created/Modified
- `prisma/migrations/0_baseline/migration.sql` - Baseline migration capturing entire pre-Phase-19 schema (374 lines)
- `prisma/migrations/20260221213903_phase19_rls_schema_wipe/migration.sql` - Combined data wipe + schema changes + RLS enablement
- `prisma/migrations/migration_lock.toml` - Prisma migration lock file (postgresql)
- `prisma/schema.prisma` - Updated StudentParticipant model with firstName field and optional deviceId
- `src/lib/dal/student-session.ts` - Updated createParticipant to accept firstName parameter

## Decisions Made
- Transitioned from `prisma db push` to `prisma migrate` with baseline approach -- necessary for hand-editable SQL migrations (RLS statements)
- Hand-edited migration SQL to combine data wipe, schema changes, and RLS in one atomic migration (three sections in dependency order)
- Deny-all RLS with no policies -- PostgreSQL default when RLS is enabled with no policies is deny all for non-superuser roles
- Added `firstName` parameter to `createParticipant` DAL with default empty string -- Phase 20 will build the full name-based identity flow

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Prisma client constructor for verification scripts**
- **Found during:** Task 2 (Verification)
- **Issue:** Prisma v7 with client engine type requires `adapter` option, not `datasourceUrl`
- **Fix:** Used `@prisma/adapter-pg` pattern matching the project's existing `src/lib/prisma.ts`
- **Files modified:** None (only affected inline verification scripts)
- **Verification:** All Prisma operations succeed

**2. [Rule 3 - Blocking] Fixed baseline migration containing Prisma CLI output**
- **Found during:** Task 1 (Baseline creation)
- **Issue:** `prisma migrate diff --script` output included "Loaded Prisma config from prisma.config.ts" text in the SQL file
- **Fix:** Removed non-SQL text from baseline migration, re-registered checksum
- **Files modified:** prisma/migrations/0_baseline/migration.sql
- **Verification:** Migration status clean, shadow database passes

**3. [Rule 3 - Blocking] Dropped DEFAULT on first_name after migration applied**
- **Found during:** Task 1 (Schema alignment)
- **Issue:** Migration had `DEFAULT ''` for ADD COLUMN safety, but Prisma schema has no @default, causing drift
- **Fix:** Ran DROP DEFAULT and updated migration SQL to match, re-registered checksum
- **Files modified:** prisma/migrations/20260221213903_phase19_rls_schema_wipe/migration.sql
- **Verification:** `prisma migrate diff` shows "empty migration" (no drift)

**4. [Rule 3 - Blocking] Updated createParticipant DAL for firstName field**
- **Found during:** Task 1 (Build verification)
- **Issue:** `firstName` is now required on StudentParticipant model, but createParticipant didn't provide it
- **Fix:** Added `firstName` parameter with default empty string to createParticipant function
- **Files modified:** src/lib/dal/student-session.ts
- **Verification:** `npx next build` succeeds with no type errors
- **Committed in:** d2a052f (Task 1 commit)

---

**Total deviations:** 4 auto-fixed (4 blocking)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
- Prisma CLI stderr output mixed into migration SQL files when using `--script` flag with `prisma.config.ts` -- resolved by cleaning the generated SQL
- Migration checksum mismatch after hand-editing required manual checksum update in `_prisma_migrations` table

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- RLS foundation in place, ready for Phase 20 name-based student identity
- Migration infrastructure established for future schema changes
- `firstName` column ready for Phase 20 to populate via join form
- `deviceId` now nullable, supporting gradual transition from device-based to name-based identity

## Self-Check: PASSED

All files verified present:
- prisma/migrations/0_baseline/migration.sql
- prisma/migrations/20260221213903_phase19_rls_schema_wipe/migration.sql
- prisma/migrations/migration_lock.toml
- prisma/schema.prisma
- src/lib/dal/student-session.ts
- .planning/phases/19-security-schema-foundation/19-01-SUMMARY.md
- Commit d2a052f verified in git log

---
*Phase: 19-security-schema-foundation*
*Completed: 2026-02-21*
