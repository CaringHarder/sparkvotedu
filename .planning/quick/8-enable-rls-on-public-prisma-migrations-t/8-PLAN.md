---
phase: quick-8
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - prisma/migrations/<timestamp>_enable_rls_prisma_migrations/migration.sql
autonomous: true
requirements: [QUICK-8]

must_haves:
  truths:
    - "The _prisma_migrations table has RLS enabled"
    - "No RLS policies exist on _prisma_migrations (deny-all for API access)"
    - "Prisma migrations still work (superuser bypasses RLS)"
  artifacts:
    - path: "prisma/migrations/<timestamp>_enable_rls_prisma_migrations/migration.sql"
      provides: "SQL migration enabling RLS on _prisma_migrations"
      contains: "ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY"
  key_links:
    - from: "prisma/migrations/<timestamp>/migration.sql"
      to: "public._prisma_migrations"
      via: "ALTER TABLE ENABLE ROW LEVEL SECURITY"
      pattern: "ENABLE ROW LEVEL SECURITY"
---

<objective>
Enable Row Level Security on the `public._prisma_migrations` table to resolve the Supabase security alert.

Purpose: Supabase flags tables without RLS as publicly accessible via PostgREST. The `_prisma_migrations` table was missed when RLS was enabled on all 12 application tables in Phase 19. Enabling RLS with no policies creates a deny-all rule for non-superuser roles (like the PostgREST `anon` and `authenticated` roles), while Prisma's direct database connection as the `postgres` superuser bypasses RLS entirely.

Output: A Prisma migration that enables RLS on `_prisma_migrations`.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@prisma/schema.prisma
@prisma/migrations/20260221213903_phase19_rls_schema_wipe/migration.sql (lines 23-34 for RLS pattern)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Prisma migration to enable RLS on _prisma_migrations</name>
  <files>prisma/migrations/<timestamp>_enable_rls_prisma_migrations/migration.sql</files>
  <action>
Create a new Prisma migration using `npx prisma migrate dev --create-only --name enable_rls_prisma_migrations`.

This will create an empty migration directory. Edit the generated `migration.sql` to contain:

```sql
-- Enable deny-all RLS on _prisma_migrations table
-- Resolves Supabase security alert: table was publicly accessible via PostgREST
-- No policies added = deny all for anon/authenticated roles
-- Prisma connects as postgres superuser and bypasses RLS automatically
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
```

Then apply the migration with `npx prisma migrate dev`.

Follow the exact same pattern used in the Phase 19 migration (20260221213903_phase19_rls_schema_wipe) which enabled RLS on all 12 application tables.

Do NOT add any RLS policies. The deny-all default is the desired behavior -- no one should access this internal Prisma table through the Supabase API.
  </action>
  <verify>
Run the following SQL query against the database to confirm RLS is enabled:

```bash
npx prisma db execute --stdin <<< "SELECT relname, relrowsecurity FROM pg_class WHERE relname = '_prisma_migrations';"
```

Expected output: `relrowsecurity` should be `t` (true).

Also verify Prisma migrations still work by running `npx prisma migrate status` -- should show no pending migrations.
  </verify>
  <done>
The `_prisma_migrations` table has RLS enabled (relrowsecurity = true), no policies exist on it (deny-all), and `npx prisma migrate status` shows all migrations applied successfully.
  </done>
</task>

</tasks>

<verification>
1. `_prisma_migrations` table has `relrowsecurity = true` in `pg_class`
2. No RLS policies exist on `_prisma_migrations` (deny-all behavior)
3. `npx prisma migrate status` shows all migrations applied
4. The Supabase dashboard no longer flags `_prisma_migrations` as a security issue
</verification>

<success_criteria>
- RLS is enabled on `public._prisma_migrations` with no policies (deny-all)
- Prisma migrations continue to function normally (superuser bypasses RLS)
- Supabase security alert for this table is resolved
</success_criteria>

<output>
After completion, create `.planning/quick/8-enable-rls-on-public-prisma-migrations-t/8-SUMMARY.md`
</output>
