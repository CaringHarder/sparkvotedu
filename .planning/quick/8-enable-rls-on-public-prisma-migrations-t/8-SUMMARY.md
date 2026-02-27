---
phase: quick-8
plan: 01
subsystem: database
tags: [rls, postgres, prisma, supabase, security]

# Dependency graph
requires:
  - phase: 19-classroom-hardening
    provides: "RLS pattern for application tables"
provides:
  - "RLS deny-all on _prisma_migrations table"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RLS on internal Prisma tables with no policies (deny-all)"

key-files:
  created:
    - "prisma/migrations/20260227033743_enable_rls_prisma_migrations/migration.sql"
  modified: []

key-decisions:
  - "Used prisma db execute + migrate resolve instead of migrate dev due to shadow database limitation with _prisma_migrations table"

patterns-established:
  - "Internal system tables can have RLS enabled via db execute + resolve when shadow database validation fails"

requirements-completed: [QUICK-8]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Quick Task 8: Enable RLS on _prisma_migrations Summary

**Deny-all RLS enabled on _prisma_migrations to resolve Supabase PostgREST security alert**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T03:37:22Z
- **Completed:** 2026-02-27T03:39:12Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Enabled Row Level Security on `public._prisma_migrations` table
- No policies added, creating deny-all behavior for `anon` and `authenticated` PostgREST roles
- Prisma migrations continue to work as superuser bypasses RLS
- Supabase security alert resolved

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Prisma migration to enable RLS on _prisma_migrations** - `0307de5` (feat)

## Files Created/Modified
- `prisma/migrations/20260227033743_enable_rls_prisma_migrations/migration.sql` - SQL migration enabling RLS on _prisma_migrations

## Decisions Made
- Used `prisma db execute` + `prisma migrate resolve --applied` instead of `prisma migrate dev` because the shadow database does not have the `_prisma_migrations` table (it is an internal Prisma table created by the migration engine, not by user migrations), causing P3006/P1014 errors during shadow database validation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Shadow database validation fails for _prisma_migrations ALTER**
- **Found during:** Task 1 (migration application)
- **Issue:** `prisma migrate dev` failed with P3006/P1014 because the shadow database does not have `_prisma_migrations` as a user-created table -- it is an internal migration engine table
- **Fix:** Applied SQL directly via `prisma db execute --stdin`, then marked migration as applied via `prisma migrate resolve --applied`
- **Files modified:** None (same migration file, different application method)
- **Verification:** PL/pgSQL assertion confirmed relrowsecurity = true; migrate status shows all migrations applied
- **Committed in:** 0307de5 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor deviation in migration application method. Same end result -- migration tracked in Prisma history and RLS enabled on the table.

## Issues Encountered
- `prisma db execute` does not return query results, only success/failure status. Used PL/pgSQL DO blocks with RAISE EXCEPTION for false conditions to verify RLS state programmatically.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All tables in the public schema now have RLS enabled
- Supabase security dashboard should show no remaining RLS alerts

## Self-Check: PASSED

- FOUND: prisma/migrations/20260227033743_enable_rls_prisma_migrations/migration.sql
- FOUND: commit 0307de5
- FOUND: 8-SUMMARY.md

---
*Quick Task: 8-enable-rls-on-public-prisma-migrations*
*Completed: 2026-02-27*
