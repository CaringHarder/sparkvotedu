# Phase 19: Security & Schema Foundation - Research

**Researched:** 2026-02-21
**Domain:** PostgreSQL Row Level Security, Prisma schema migration, data wipe, name field validation
**Confidence:** HIGH

## Summary

Phase 19 has three distinct workstreams: (1) enable deny-all RLS on all 12 public Supabase tables, (2) migrate the `student_participants` schema to support name-based identity (add `first_name`, make `device_id` nullable), and (3) wipe all existing application data for a clean slate. All three are database-level operations with zero application code changes required for the core functionality.

The most critical architectural fact: Prisma connects to PostgreSQL via the `postgres` user (superuser) through the `@prisma/adapter-pg` adapter using `DATABASE_URL`. Superusers and roles with the `BYPASSRLS` attribute always bypass RLS. This means enabling RLS with no policies creates a perfect deny-all wall for PostgREST/anon key access while leaving every Prisma server action completely unaffected. The Supabase browser client (`createBrowserClient` with anon key) is used in this project only for Auth JWT operations and Realtime WebSocket subscriptions -- never for data table queries. Storage operations use the admin client (service role key) server-side. Therefore, deny-all RLS has zero impact on existing functionality.

The project has historically used `prisma db push` (not `prisma migrate`) for schema changes. For Phase 19, the project-level research recommends switching to `prisma migrate dev --create-only` to generate a hand-editable SQL migration file. This is the correct approach because the RLS `ALTER TABLE` statements are not representable in the Prisma schema -- they must be appended as raw SQL to the migration file. The project currently has no `prisma/migrations` directory, so a baseline migration or initial migration setup may be needed before the RLS/schema migration can be applied.

**Primary recommendation:** Use a single Prisma migration containing data wipe (TRUNCATE CASCADE), RLS enablement (12 ALTER TABLE statements), and schema changes (ADD COLUMN first_name, ALTER COLUMN device_id). Apply via `prisma migrate dev --create-only` with hand-edited SQL. Verify with curl against anon key and Prisma operations post-deploy.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- No backward compatibility needed -- forget all existing students
- Full app data reset: wipe all student-related data (student_participants, votes, poll responses, bracket entries)
- Also wipe teacher-created content (sessions, brackets, polls) -- complete clean slate
- No maintenance window needed -- deploy anytime, seamless cutover
- Full Unicode support -- accents, apostrophes, hyphens, international characters (Jose, O'Brien, Mary-Jane, Le)
- No emojis allowed in names -- strip or reject
- 2 character minimum length
- Whitespace trimming and normalization (leading/trailing spaces removed, internal multi-spaces collapsed)
- Profanity filtering: block with friendly message ("Please enter your real first name")
- Deploy anytime -- no scheduling constraints, no maintenance page
- Seamless cutover -- no downtime messaging
- In-app banner on first teacher login after migration: "We've upgraded! Previous sessions have been cleared."
- Banner is dismissible, shown once

### Claude's Discretion
- Maximum name length (reasonable limit)
- Name casing strategy (preserve vs auto-capitalize)
- Profanity filter implementation approach
- RLS policy SQL specifics
- Migration script ordering and safety checks
- Banner component implementation and dismissal mechanism

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-01 | All 12 public Supabase tables have RLS enabled with deny-all policy | 12 ALTER TABLE ENABLE ROW LEVEL SECURITY statements. PostgreSQL default-deny when RLS enabled with no policies. All 12 tables identified via Prisma schema @@map directives. |
| SEC-02 | Prisma server-side operations continue to function after RLS enablement (bypass verified) | Prisma connects via postgres superuser which always bypasses RLS. Verified via PostgreSQL docs and Supabase roles documentation. |
| SEC-03 | Direct PostgREST/Supabase client access returns no data for unauthenticated requests | Anon key creates session with anon role. Without policies, anon role has no access. curl verification pattern documented. |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 7.3.0 | Schema migration, data wipe SQL | Already installed. `--create-only` flag produces hand-editable SQL migration files |
| @prisma/adapter-pg | 7.3.0 | PostgreSQL driver adapter | Already installed. Connects via DATABASE_URL (postgres superuser, bypasses RLS) |
| pg | 8.17.2 | PostgreSQL driver | Already installed. Used by Prisma adapter |
| Zod | 4.3.6 | Name field validation | Already installed. Add firstName validation schema |
| @supabase/supabase-js | 2.93.3 | Verification testing | Already installed. Used only for auth/realtime, not data access |

### New (To Add)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @2toad/profanity | 3.2.0 | Profanity detection in student names | Server-side name validation. Full TypeScript support. `profanity.exists(name)` returns boolean. |

### Alternatives Considered (Profanity Filter)
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @2toad/profanity | leo-profanity | leo-profanity has higher npm downloads but @2toad/profanity has better TypeScript support, configurable options (wholeWord, unicode boundaries), and active maintenance |
| @2toad/profanity | Custom word list | Incomplete coverage. Profanity lists are deceptively complex -- variations, slang, Unicode substitutions. Use a library. |
| @2toad/profanity | No filter at all | User decision requires profanity filtering with friendly message |

**Installation:**
```bash
npm install @2toad/profanity
```

### Discretion Recommendations

**Maximum name length:** 50 characters. Covers the longest common names internationally (e.g., Thai, Sri Lankan names) while preventing abuse. PostgreSQL `VARCHAR(50)` or Prisma `@db.VarChar(50)`.

**Name casing strategy:** Preserve as entered. Do not auto-capitalize. Reasons: (1) some names are intentionally lowercase (e.g., cultural preferences), (2) case-insensitive matching happens at lookup time via Prisma `mode: 'insensitive'`, not at storage time. Store "jake" as "jake", match it as the same student as "Jake".

**Profanity filter approach:** Use `@2toad/profanity` with `exists()` check server-side in the join action. Block submission with friendly message "Please enter your real first name." Configuration: `wholeWord: true` (avoid false positives on names like "Dick" -- but note this may need whitelisting), `languages: ['en']`.

**Banner dismissal mechanism:** Use localStorage key `sparkvotedu_upgrade_banner_dismissed` with value of timestamp. Check on teacher dashboard mount. Show banner if key is absent. On dismiss, set key. This is simpler than a database column and appropriate for a one-time informational banner.

## Architecture Patterns

### Database Connection Architecture
```
Browser (anon key) --> PostgREST --> anon role --> RLS BLOCKS (deny-all)
Browser (anon key) --> Realtime --> Broadcast channels --> WORKS (no data table access)
Browser (anon key) --> Auth --> auth schema --> WORKS (separate schema, not public)
Server (Prisma) --> @prisma/adapter-pg --> postgres superuser --> BYPASSES RLS
Server (service_role) --> Storage --> storage schema --> WORKS (separate schema)
Server (service_role) --> Realtime REST broadcast --> WORKS (bypasses RLS)
```

### Migration Strategy: db push to migrate transition

The project has historically used `prisma db push` (no migrations directory exists). Phase 19 must transition to `prisma migrate` because RLS statements cannot be expressed in the Prisma schema -- they require raw SQL in a migration file.

**Approach:**
1. Create baseline migration to capture current schema state
2. Create the RLS + schema migration as a separate, hand-edited migration
3. Future phases continue using `prisma migrate dev`

**Baseline steps:**
```bash
mkdir -p prisma/migrations/0_baseline
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0_baseline/migration.sql
npx prisma migrate resolve --applied 0_baseline
```

### Pattern 1: Deny-All RLS
**What:** Enable RLS on every table in the public schema without creating any policies. PostgreSQL's default behavior when RLS is enabled with no policies is to deny all access for non-superuser/non-bypassrls roles.
**When to use:** When all legitimate data access goes through a server-side ORM with a superuser/bypassrls connection, and you need to lock down the publicly-exposed REST API.
**SQL:**
```sql
-- Source: PostgreSQL docs + Supabase RLS docs
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bracket_entrants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
```

### Pattern 2: Data Wipe with TRUNCATE CASCADE
**What:** Delete all data from tables while respecting foreign key constraints via CASCADE. TRUNCATE is faster than DELETE and resets auto-increment sequences.
**When to use:** Full app data reset. Foreign key cascade order matters -- parent tables cascade to children.
**SQL:**
```sql
-- TRUNCATE CASCADE handles FK ordering automatically
-- Order: parent tables first, CASCADE handles children
TRUNCATE TABLE public.teachers CASCADE;
-- CASCADE will automatically truncate:
--   class_sessions (FK to teachers)
--   brackets (FK to teachers)
--   polls (FK to teachers)
--   student_participants (FK to class_sessions)
--   bracket_entrants (FK to brackets)
--   matchups (FK to brackets)
--   votes (FK to matchups, student_participants, bracket_entrants)
--   poll_options (FK to polls)
--   poll_votes (FK to polls, student_participants, poll_options)
--   subscriptions (FK to teachers)
--   predictions (FK to brackets, student_participants, matchups)
```

**Important:** TRUNCATE CASCADE on `teachers` will wipe ALL data in the entire application because every other table has a direct or transitive FK relationship to `teachers`. This achieves the complete clean slate.

**Alternative safer approach:** If we want to preserve teacher accounts but wipe content:
```sql
-- Wipe in dependency order (children first)
TRUNCATE TABLE public.predictions CASCADE;
TRUNCATE TABLE public.votes CASCADE;
TRUNCATE TABLE public.poll_votes CASCADE;
TRUNCATE TABLE public.poll_options CASCADE;
TRUNCATE TABLE public.matchups CASCADE;
TRUNCATE TABLE public.bracket_entrants CASCADE;
TRUNCATE TABLE public.student_participants CASCADE;
TRUNCATE TABLE public.polls CASCADE;
TRUNCATE TABLE public.brackets CASCADE;
TRUNCATE TABLE public.class_sessions CASCADE;
TRUNCATE TABLE public.subscriptions CASCADE;
-- teachers table preserved
```

**Decision needed by planner:** The CONTEXT.md says "complete clean slate" -- wipe teacher-created content. But it does NOT say delete teacher accounts themselves. Teachers should be preserved (they have Supabase Auth accounts linked via supabaseAuthId). The planner should use the "preserve teachers, wipe content" approach.

### Pattern 3: Additive Schema Migration
**What:** Add `first_name` column and make `device_id` nullable without breaking existing data (which will be wiped anyway, but the schema change itself is additive).
**Prisma schema changes:**
```prisma
model StudentParticipant {
  id           String    @id @default(uuid())
  firstName    String    @map("first_name") @db.VarChar(50)
  funName      String    @map("fun_name")
  deviceId     String?   @map("device_id")  // Changed: now optional
  fingerprint  String?
  // ... rest unchanged

  @@unique([sessionId, deviceId])
  @@unique([sessionId, funName])
  @@index([sessionId, fingerprint])
  @@index([recoveryCode])
  @@index([sessionId, firstName])  // NEW: for name-based lookup
  @@map("student_participants")
}
```

### Pattern 4: Name Validation Schema
**What:** Zod schema for first name validation with Unicode support, emoji rejection, profanity check.
**Example:**
```typescript
// Source: Zod 4.x docs + project pattern
import { z } from 'zod'
import { profanity } from '@2toad/profanity'

// Emoji regex: matches most emoji Unicode ranges
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu

export const firstNameSchema = z
  .string()
  .trim()
  .transform(val => val.replace(/\s+/g, ' '))  // Collapse internal whitespace
  .pipe(
    z.string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must be 50 characters or less')
      .refine(val => !EMOJI_REGEX.test(val), 'Please use letters only -- no emojis')
      .refine(val => !profanity.exists(val), 'Please enter your real first name')
  )
```

### Anti-Patterns to Avoid
- **Per-row RLS policies:** No legitimate code path uses `supabase.from()` for data access. Per-row policies add complexity without security value. Deny-all is correct.
- **Using Supabase SQL Editor to verify RLS:** The SQL Editor runs as superuser, which bypasses RLS. Always verify with curl using the anon key.
- **Running data wipe in application code:** Use SQL migration, not Prisma `deleteMany`. TRUNCATE CASCADE is atomic, faster, and resets sequences.
- **Changing `device_id` to DROP COLUMN:** Keep it nullable. Phase 20 (name-based identity) may use it as a secondary signal. Future cleanup phase will remove it.
- **Using `prisma db push` for this migration:** `db push` cannot run raw SQL (like ALTER TABLE ENABLE ROW LEVEL SECURITY). Must use `prisma migrate`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Profanity detection | Custom word list with string matching | @2toad/profanity | Profanity lists need thousands of words, variations, Unicode substitutions. Libraries handle edge cases. |
| Emoji detection/stripping | Simple regex for common emojis | Comprehensive Unicode range regex | Emojis span multiple Unicode blocks including skin tone modifiers, ZWJ sequences, flags. Must cover all ranges. |
| Data wipe ordering | Manual DELETE in dependency order | TRUNCATE CASCADE | CASCADE handles FK ordering automatically. TRUNCATE is atomic and fast. |
| RLS policy management | Custom middleware or API gateway | PostgreSQL native RLS | Built into PostgreSQL. Zero overhead. Cannot be bypassed at the application layer. |

**Key insight:** Every security-critical operation in this phase (RLS, data wipe, schema migration) should be done in SQL, not application code. SQL operations are atomic, transactional, and cannot be partially applied.

## Common Pitfalls

### Pitfall 1: Forgetting to Baseline Before First Migration
**What goes wrong:** Running `prisma migrate dev` on a project that has been using `prisma db push` fails because Prisma has no migration history. It may try to recreate all tables or detect drift.
**Why it happens:** `prisma db push` does not create a `_prisma_migrations` table or migration files. The database is in sync with the schema, but Prisma Migrate does not know that.
**How to avoid:** Create a baseline migration using `prisma migrate diff --from-empty --to-schema-datamodel`, then mark it as applied with `prisma migrate resolve --applied`.
**Warning signs:** Error messages about "database schema is not empty" or "migration drift detected" when running `prisma migrate dev`.

### Pitfall 2: RLS Blocking Supabase Realtime postgres_changes
**What goes wrong:** After enabling RLS, `postgres_changes` realtime subscriptions stop receiving events because the subscriber (anon role) cannot SELECT from the table.
**Why it happens:** `postgres_changes` subscriptions require SELECT access to the underlying table. Deny-all RLS blocks this.
**How to avoid:** Verify that SparkVotEDU uses only Broadcast and Presence channels (not postgres_changes). Confirmed via code review: all hooks in `src/hooks/` use `.on('broadcast', ...)` or `.on('presence', ...)`. No `postgres_changes` usage found.
**Warning signs:** Realtime features stop working after RLS deployment.

### Pitfall 3: TRUNCATE Failing Due to Missing CASCADE
**What goes wrong:** `TRUNCATE TABLE teachers` fails with foreign key violation errors because child tables reference the teachers table.
**Why it happens:** TRUNCATE without CASCADE does not follow FK relationships.
**How to avoid:** Always use `TRUNCATE TABLE ... CASCADE`. Or truncate in reverse dependency order.
**Warning signs:** "cannot truncate a table referenced in a foreign key constraint" error.

### Pitfall 4: Testing RLS as Superuser
**What goes wrong:** Developer tests RLS in Supabase SQL Editor or psql as postgres user, sees data returned, concludes RLS is not working.
**Why it happens:** Superusers and table owners always bypass RLS. The SQL Editor in Supabase runs as a privileged role.
**How to avoid:** Test with curl using the anon key: `curl -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" "$SUPABASE_URL/rest/v1/teachers?select=*"`. Should return `[]`.
**Warning signs:** Seeing data in SQL Editor after enabling RLS.

### Pitfall 5: Name Validation Edge Cases
**What goes wrong:** Names like "O'Brien", "Mary-Jane", "Jose" (with accent), or "Le" (2 chars) get rejected.
**Why it happens:** Overly restrictive regex (e.g., `[a-zA-Z]+`) rejects valid characters.
**How to avoid:** Allow full Unicode minus emojis. The emoji regex targets specific Unicode blocks. All other Unicode characters (accents, CJK, Arabic, etc.) pass through. Min length 2 handles short names like "Le", "Li", "Bo".
**Warning signs:** International students cannot join sessions.

### Pitfall 6: Banner Showing After Every Login
**What goes wrong:** The upgrade banner appears every time the teacher visits the dashboard, not just once.
**Why it happens:** Dismissal state not persisted, or persistence mechanism breaks (e.g., localStorage cleared by browser).
**How to avoid:** Use localStorage with a specific key. Check for key presence, not value. If localStorage is unavailable (private browsing), fail silently (don't show banner rather than showing it forever).
**Warning signs:** Teacher complaints about persistent banner.

## Code Examples

### Enable RLS via Migration SQL
```sql
-- Source: PostgreSQL docs https://www.postgresql.org/docs/current/ddl-rowsecurity.html
-- Source: Supabase RLS docs https://supabase.com/docs/guides/database/postgres/row-level-security

-- Enable RLS on all 12 public tables (deny-all, no policies)
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bracket_entrants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
```

### Data Wipe (Preserve Teacher Accounts)
```sql
-- Wipe all content data while preserving teacher accounts
-- Teachers have Supabase Auth accounts (supabase_auth_id) that must remain linked
-- Using individual TRUNCATE CASCADE for clarity and safety

-- Child tables with no further dependents
TRUNCATE TABLE public.predictions CASCADE;
TRUNCATE TABLE public.votes CASCADE;
TRUNCATE TABLE public.poll_votes CASCADE;

-- Mid-level tables
TRUNCATE TABLE public.poll_options CASCADE;
TRUNCATE TABLE public.matchups CASCADE;
TRUNCATE TABLE public.bracket_entrants CASCADE;
TRUNCATE TABLE public.student_participants CASCADE;

-- Parent content tables
TRUNCATE TABLE public.polls CASCADE;
TRUNCATE TABLE public.brackets CASCADE;
TRUNCATE TABLE public.class_sessions CASCADE;

-- Subscriptions (billing state -- discuss with planner whether to wipe)
TRUNCATE TABLE public.subscriptions CASCADE;
```

### Schema Migration SQL (Prisma-generated + hand-edited)
```sql
-- Add first_name column to student_participants
ALTER TABLE public.student_participants
  ADD COLUMN "first_name" VARCHAR(50) NOT NULL DEFAULT '';

-- Make device_id nullable
ALTER TABLE public.student_participants
  ALTER COLUMN "device_id" DROP NOT NULL;

-- Add index for name-based lookup
CREATE INDEX "student_participants_session_id_first_name_idx"
  ON public.student_participants ("session_id", "first_name");
```

### Prisma Schema Changes
```prisma
// Source: Prisma 7 schema syntax
model StudentParticipant {
  id           String    @id @default(uuid())
  firstName    String    @map("first_name") @db.VarChar(50)
  funName      String    @map("fun_name")
  deviceId     String?   @map("device_id")    // NOW NULLABLE
  fingerprint  String?
  recoveryCode String?   @map("recovery_code")
  rerollUsed   Boolean   @default(false) @map("reroll_used")
  banned       Boolean   @default(false)
  lastSeenAt   DateTime  @default(now()) @map("last_seen_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  sessionId    String    @map("session_id")
  session      ClassSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  votes       Vote[]
  pollVotes   PollVote[]
  predictions Prediction[]

  @@unique([sessionId, deviceId])
  @@unique([sessionId, funName])
  @@index([sessionId, fingerprint])
  @@index([recoveryCode])
  @@index([sessionId, firstName])
  @@map("student_participants")
}
```

### Verification: curl Test for RLS
```bash
# Source: Supabase securing your API docs
# Replace with actual values from Supabase Dashboard > Settings > API

SUPABASE_URL="https://your-project.supabase.co"
ANON_KEY="your-anon-key"

# Test each table -- all should return empty []
for table in teachers class_sessions student_participants brackets bracket_entrants matchups votes polls poll_options poll_votes subscriptions predictions; do
  echo "Testing $table..."
  curl -s -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" \
    "$SUPABASE_URL/rest/v1/$table?select=*"
  echo ""
done
```

### Name Validation Utility
```typescript
// Source: @2toad/profanity README https://github.com/2Toad/Profanity
import { profanity } from '@2toad/profanity'

// Configure profanity filter
// wholeWord: true avoids false positives on names like "Dick", "Fanny"
// Note: may need to whitelist legitimate names that trigger false positives
const profanityConfig = { wholeWord: true, languages: ['en'] }

/**
 * Validate and normalize a first name for student session joining.
 * Returns { valid: true, name: string } or { valid: false, error: string }
 */
export function validateFirstName(raw: string):
  | { valid: true; name: string }
  | { valid: false; error: string } {

  // Trim and normalize whitespace
  const name = raw.trim().replace(/\s+/g, ' ')

  if (name.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' }
  }

  if (name.length > 50) {
    return { valid: false, error: 'Name must be 50 characters or less' }
  }

  // Check for emojis
  const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu
  if (EMOJI_REGEX.test(name)) {
    return { valid: false, error: 'Please use letters only -- no emojis' }
  }

  // Check profanity
  if (profanity.exists(name)) {
    return { valid: false, error: 'Please enter your real first name' }
  }

  return { valid: true, name }
}
```

### Upgrade Banner Component
```typescript
// Dismissible one-time banner for teacher dashboard
'use client'

import { useState, useEffect } from 'react'

const BANNER_KEY = 'sparkvotedu_upgrade_banner_dismissed'

export function UpgradeBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(BANNER_KEY)) {
        setVisible(true)
      }
    } catch {
      // localStorage unavailable (private browsing) -- don't show
    }
  }, [])

  function dismiss() {
    setVisible(false)
    try {
      localStorage.setItem(BANNER_KEY, new Date().toISOString())
    } catch {
      // Silently fail
    }
  }

  if (!visible) return null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
      <p className="text-sm text-blue-800">
        We&apos;ve upgraded! Previous sessions have been cleared.
      </p>
      <button
        onClick={dismiss}
        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        Dismiss
      </button>
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `prisma db push` (schema sync) | `prisma migrate dev --create-only` (migration files) | Phase 19 | Enables hand-edited SQL for RLS statements not expressible in Prisma schema |
| No RLS on any table | Deny-all RLS on all 12 tables | Phase 19 | Blocks all PostgREST data access via anon key |
| Device fingerprint identity | Name-based identity (schema prep) | Phase 19 schema, Phase 20 code | device_id nullable, first_name column added |

**Deprecated/outdated:**
- `prisma db push` for production changes: replaced by `prisma migrate` for auditability and raw SQL support
- Device fingerprint as primary identity: failed in production (6 fingerprints for 24 identical Chromebooks)

## Migration Script Ordering and Safety

The migration SQL should execute in this order for safety:

1. **Data wipe first** -- TRUNCATE CASCADE before schema changes. This prevents any issues with NOT NULL constraints on new columns or existing data incompatibility.
2. **Schema changes second** -- ADD COLUMN first_name, ALTER COLUMN device_id, CREATE INDEX. Clean slate means no data migration needed.
3. **RLS enablement last** -- ALTER TABLE ENABLE ROW LEVEL SECURITY on all 12 tables. Doing this last ensures the schema is correct before locking down access.

All three steps should be in a single migration file for atomicity. If any step fails, the entire migration rolls back.

## Open Questions

1. **Subscription data wipe**
   - What we know: The decision says "complete clean slate" for teacher-created content. Subscriptions are billing state, not content.
   - What's unclear: Should Stripe subscription records be wiped? Teachers have active billing relationships.
   - Recommendation: Preserve subscriptions table data. Wipe content tables only. A teacher who pays for Pro should not lose their subscription record.

2. **Prisma migration baseline approach**
   - What we know: The project has no `prisma/migrations` directory. Schema was managed via `prisma db push`.
   - What's unclear: Whether `prisma migrate dev` will work on the production database without a baseline, or if it will try to recreate all tables.
   - Recommendation: Create baseline migration first (`prisma migrate diff --from-empty --to-schema-datamodel`), mark as applied, then create the Phase 19 migration. Test this flow against the dev/staging database before production.

3. **Profanity filter false positives on legitimate names**
   - What we know: Names like "Dick", "Fanny", "Willy" are legitimate first names that may trigger profanity filters.
   - What's unclear: How @2toad/profanity handles these with `wholeWord: true`.
   - Recommendation: Test with known edge-case names during implementation. Add a whitelist for legitimate names that trigger false positives. The `profanity.whitelist.addWords()` API supports this.

## Sources

### Primary (HIGH confidence)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) -- superuser/BYPASSRLS bypass, default-deny with no policies, FORCE ROW LEVEL SECURITY
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) -- enable RLS syntax, service key bypass, anon key behavior
- [Supabase Postgres Roles](https://supabase.com/docs/guides/database/postgres/roles) -- anon, authenticated, service_role, postgres roles and their RLS behavior
- [Supabase + Prisma Integration](https://supabase.com/docs/guides/database/prisma) -- connection string configuration, custom role setup
- [Prisma Baselining Documentation](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining) -- baseline migration for existing databases
- [Prisma Customizing Migrations](https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations) -- --create-only flag for hand-edited SQL
- SparkVotEDU codebase analysis -- all 12 tables confirmed, connection patterns verified, no PostgREST data access confirmed

### Secondary (MEDIUM confidence)
- [@2toad/profanity GitHub README](https://github.com/2Toad/Profanity/blob/main/README.md) -- API documentation, TypeScript usage, configuration options
- [Prisma + Supabase RLS Discussion #18642](https://github.com/prisma/prisma/discussions/18642) -- community confirmation that Prisma ignores RLS via bypassrls
- [SparkVotEDU Project Research Summary](.planning/research/SUMMARY.md) -- prior research confirming deny-all RLS approach and architecture

### Tertiary (LOW confidence)
- Profanity filter false positive behavior with legitimate names -- needs runtime testing, not documented in library

## Metadata

**Confidence breakdown:**
- RLS implementation: HIGH -- PostgreSQL official docs, Supabase official docs, and codebase verification all confirm deny-all is correct
- Schema migration: HIGH -- Prisma docs clearly document --create-only and baseline workflows
- Data wipe: HIGH -- TRUNCATE CASCADE is standard PostgreSQL, FK relationships verified in schema
- Name validation: MEDIUM -- Zod patterns are established, but profanity filter edge cases need runtime testing
- Banner component: HIGH -- standard React pattern with localStorage, no external dependencies

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable PostgreSQL/Prisma patterns, unlikely to change)
