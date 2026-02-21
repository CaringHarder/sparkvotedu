# Stack Research: v1.2 Classroom Hardening

**Domain:** EdTech classroom voting platform -- security hardening, identity overhaul, realtime debugging
**Researched:** 2026-02-21
**Confidence:** HIGH (existing stack verified against installed versions; no new packages needed)

---

## Executive Summary

v1.2 requires **zero new npm packages**. Every change is achievable with the existing stack (Next.js 16.1.6, Prisma 7.3.0, Supabase JS 2.93.3, Zod 4.3.6). The work is schema changes, SQL policies, broadcast debugging, and UI updates -- not library additions.

The key insight: Prisma connects to Supabase PostgreSQL via a `bypassrls` database user, so RLS policies protect the Supabase REST API surface (anon key) without affecting server-side Prisma queries. The `@fingerprintjs/fingerprintjs` package should be removed after the name-based identity migration is complete.

---

## Current Stack (Verified from package.json)

| Technology | Installed Version | Role in v1.2 |
|------------|-------------------|---------------|
| Next.js | 16.1.6 | No changes needed |
| React | 19.2.3 | No changes needed |
| Prisma | 7.3.0 (client + CLI) | Schema migration for name-based identity |
| @prisma/adapter-pg | 7.3.0 | No changes needed (direct PostgreSQL connection) |
| @supabase/supabase-js | ^2.93.3 | RLS policies + Realtime debugging |
| @supabase/ssr | ^0.8.0 | No changes needed |
| Zod | ^4.3.6 | Validation schema updates for name-based join |
| @fingerprintjs/fingerprintjs | ^5.0.1 | **REMOVE** after migration |
| stripe | ^20.3.0 | No changes needed |
| motion (Framer Motion) | ^12.29.2 | No changes needed |
| Tailwind CSS | ^4 | CSS contrast fixes only |

---

## What Changes (No New Packages)

### 1. Name-Based Student Identity

**What changes:** The `StudentParticipant` model, join flow, and identity hooks.

**Schema migration (Prisma):**

```prisma
model StudentParticipant {
  id           String    @id @default(uuid())
  funName      String    @map("fun_name")
  firstName    String    @map("first_name")        // NEW: student's real first name
  deviceId     String?   @map("device_id")          // CHANGE: nullable (no longer primary identifier)
  fingerprint  String?                               // KEEP nullable, will stop populating
  // ... rest unchanged

  @@unique([sessionId, deviceId])                    // KEEP for backward compat
  @@unique([sessionId, funName])                     // KEEP
  @@index([sessionId, firstName])                    // NEW: for duplicate detection
  @@map("student_participants")
}
```

**Migration approach:** Use `prisma migrate dev --create-only` then hand-edit the SQL to:
1. Add `first_name` column (NOT NULL with default empty string for existing rows)
2. Make `device_id` nullable (ALTER COLUMN ... DROP NOT NULL)
3. Add index on `(session_id, first_name)` for name lookup

**Case-insensitive duplicate detection:** Use Prisma `mode: 'insensitive'` in application code, not CITEXT. Rationale:
- Only one comparison point (join flow) needs case-insensitivity
- CITEXT requires PostgreSQL extension activation in Supabase (extra admin step)
- Prisma's `mode: 'insensitive'` generates case-insensitive comparison in PostgreSQL natively
- Sufficient for 30-student classroom sessions

```typescript
// In DAL: case-insensitive lookup
const existing = await prisma.studentParticipant.findFirst({
  where: {
    sessionId,
    firstName: { equals: firstName, mode: 'insensitive' },
  },
})
```

**What to remove after migration:**
- `src/lib/student/fingerprint.ts` -- FingerprintJS wrapper
- `src/lib/student/session-identity.ts` -- localStorage device ID
- `src/hooks/use-device-identity.ts` -- composite identity hook
- `@fingerprintjs/fingerprintjs` from package.json

**What to update:**
- `src/actions/student.ts` -- `joinSession()` takes `{code, firstName}` instead of `{code, deviceId, fingerprint}`
- `src/components/student/join-form.tsx` -- adds first name input field after class code
- `src/lib/dal/student-session.ts` -- identity lookup by `(sessionId, firstName)` case-insensitive
- `src/types/student.ts` -- `DeviceIdentity` type replaced with `StudentIdentity`

### 2. Supabase RLS Policies (Pure SQL -- No Packages)

**Architecture context:** The app has TWO data access paths:

| Path | Connection | RLS Behavior |
|------|------------|--------------|
| Prisma (server actions, API routes) | `DATABASE_URL` with `prisma` user (has `bypassrls`) | **Bypasses RLS** -- Prisma handles auth in application code |
| Supabase client (anon key in browser) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Subject to RLS** -- this is the attack surface |

The RLS policies protect against direct Supabase REST API access using the anon key (publicly visible in client JS bundle). An attacker with the anon key and project URL can call `supabase.from('teachers').select('*')` directly.

**Policy strategy:** Since all mutations go through Prisma server actions (which bypass RLS), and the Supabase browser client is only used for Auth and Realtime (not data queries), the simplest correct approach is: **enable RLS with no policies on all tables**. This denies everything via PostgREST while Prisma continues unaffected.

```sql
-- Deny-all pattern: RLS enabled + no policies = no access for anon/authenticated
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
-- No policies means anon and authenticated roles get zero access
-- Prisma (bypassrls user) and service_role both bypass RLS
```

**Per-table RLS plan:**

| Table | Enable RLS | Policies Needed | Rationale |
|-------|-----------|-----------------|-----------|
| `teachers` | YES | None (deny all) | Only accessed via Prisma server-side |
| `class_sessions` | YES | None (deny all) | Only accessed via Prisma server-side |
| `student_participants` | YES | None (deny all) | Join flow goes through server action |
| `brackets` | YES | None (deny all) | Created/managed via Prisma |
| `bracket_entrants` | YES | None (deny all) | Created via Prisma |
| `matchups` | YES | None (deny all) | All mutations via server actions |
| `votes` | YES | None (deny all) | Cast via `castVote` server action |
| `polls` | YES | None (deny all) | Created/managed via Prisma |
| `poll_options` | YES | None (deny all) | Created via Prisma |
| `poll_votes` | YES | None (deny all) | Cast via `castPollVote` server action |
| `subscriptions` | YES | None (deny all) | Managed by Stripe webhook handler |
| `predictions` | YES | None (deny all) | Created via server action |

**Why "enable RLS + no policies" works:** In PostgreSQL, enabling RLS with no policies means the `anon` and `authenticated` roles get zero access. The Prisma connection user has `bypassrls` privilege, so server-side operations continue unaffected. The `service_role` key (used for admin operations and Realtime broadcast) also bypasses RLS.

**Implementation method:** A single SQL migration file applied via Prisma:

```bash
npx prisma migrate dev --create-only --name enable-rls-all-tables
```

Then hand-edit the migration SQL:

```sql
-- Enable RLS on all 12 public tables
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

Then `npx prisma migrate deploy` in production.

**Verification:** After applying, test with the anon key:
```javascript
const { data, error } = await supabase.from('teachers').select('*')
// Should return empty array (RLS blocks access)
```

### 3. Supabase Realtime Debugging (No Packages)

**Current architecture (already correct):**
- Server actions broadcast via REST API (`POST /realtime/v1/api/broadcast`) using service_role key
- Clients subscribe via WebSocket using anon key
- Both bracket and poll hooks use Broadcast channel (not postgres_changes)
- Transport fallback to HTTP polling if WebSocket fails within 5 seconds

**Root cause identified via code review: Missing `poll_activated` broadcast**

When a poll status changes to `active`, `broadcastPollUpdate(pollId, 'poll_activated')` is NOT called. In `src/actions/poll.ts` line 235:

```typescript
// Line 235-237: Only broadcasts activity update, NOT poll_activated
if (status === 'active' && result.sessionId) {
  broadcastActivityUpdate(result.sessionId).catch(console.error)
  // MISSING: broadcastPollUpdate(pollId, 'poll_activated')
}
```

But `use-realtime-poll.ts` line 107 listens for `poll_activated` to trigger `fetchPollState()`. The client is listening for an event that is never sent. Additionally, because the initial `fetchPollState()` only fires after WebSocket reaches `SUBSCRIBED` status, there is a timing window where early votes are missed if the subscription establishment is slow.

However, **vote broadcasts do work** -- `broadcastPollVoteUpdate` IS called in `castPollVote`. The issue is more nuanced: the teacher must be on the `/polls/[pollId]/live` page BEFORE a student votes, so the `useRealtimePoll` subscription is established. If the teacher activates the poll and then navigates to the live page, the first votes may arrive before the subscription is ready.

**Fix (one line + one investigation):**
1. Add `broadcastPollUpdate(pollId, 'poll_activated')` in `updatePollStatus` when `status === 'active'`
2. Investigate whether the initial `fetchPollState()` on SUBSCRIBED status properly catches votes cast before the subscription was established

**Debugging tools (already available in @supabase/supabase-js 2.93.3):**

```typescript
// Enable Supabase Realtime debug logging (no package needed)
const supabase = createClient(url, key, {
  realtime: {
    logger: console.log,     // Log all realtime events
    heartbeatIntervalMs: 15000,
    reconnectAfterMs: (tries) => Math.min(tries * 1000, 10000),
  },
})
```

**Supabase Dashboard tools:**
- Realtime Inspector (Dashboard > Realtime > Inspector) -- watch live channel traffic
- Realtime Reports (Project Settings > Product Reports > Realtime) -- connection metrics

### 4. Presentation Mode Contrast (CSS Only)

No stack changes. This is a Tailwind CSS adjustment to ranked poll card styles in `src/components/poll/ranked-leaderboard.tsx`. The existing `tailwindcss@4` handles all styling needs.

### 5. Session Naming (No Migration Needed)

The `ClassSession` model already has a `name` field (nullable String). The only work is:
- UI to display session name (or code as fallback) in teacher dashboard dropdowns
- Inline edit component using existing shadcn/ui `Input` and `Button`
- Server action to update session name via Prisma

No schema migration needed -- the `name` column already exists in the schema.

### 6. UX Terminology (UI Only)

Pure copy/label changes across bracket and poll components. No stack implications.

---

## What NOT to Add

| Avoid | Why | What to Do Instead |
|-------|-----|---------------------|
| `prisma-extension-supabase-rls` | Unnecessary complexity -- Prisma user already has `bypassrls`, and we want to DENY client access, not enable row-scoped access | Enable RLS + no policies (deny-all pattern) |
| `@shoito/prismarls` | CLI tool for auto-generating RLS SQL -- overkill for 12 identical ALTER TABLE statements | Hand-write the 12-line SQL migration |
| CITEXT PostgreSQL extension | Requires Supabase admin action to enable extension, adds schema complexity | Use Prisma `mode: 'insensitive'` for case-insensitive name comparison |
| Socket.IO or Pusher | Tempting when debugging realtime -- but the issue is a missing broadcast event, not a transport problem | Fix the missing `broadcastPollUpdate(pollId, 'poll_activated')` call |
| Any auth library for students | Students should NOT have accounts -- first name + session code is the identity | Application-level identity in Prisma, not Supabase Auth |
| Supabase CLI / local dev environment | Would be nice for testing RLS policies locally, but adds setup complexity for a 12-line SQL change | Test RLS directly against Supabase project via dashboard or curl |
| `unique-names-generator` | Already using custom `generateFunName()` -- no need for another name generator package | Keep existing fun name generation logic |
| React Hook Form | Currently not used for student-facing forms (only teacher forms). The name entry form is simple enough (one input) that raw React state suffices. | Use controlled `<input>` + Zod validation, same as existing `JoinForm` |

---

## Package to Remove

| Package | Current Version | Why Remove |
|---------|----------------|------------|
| `@fingerprintjs/fingerprintjs` | ^5.0.1 | Device fingerprinting failed in real-world test (24 students, 6 unique fingerprints on identical Chromebooks). Being replaced by name-based identity. Remove after migration to avoid dead code and unnecessary ~50KB client bundle weight. |

**Removal timing:** After the name-based identity migration is deployed and verified in a real classroom session. Do not remove prematurely -- keep as fallback during transition.

**Files to delete alongside:**
- `src/lib/student/fingerprint.ts`
- `src/lib/student/session-identity.ts`
- `src/hooks/use-device-identity.ts`

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Deny-all RLS (no policies) | Per-row owner-based RLS policies | If the app used the Supabase client for data queries (it does not -- all data goes through Prisma). Per-row policies add value when `supabase.from()` is the primary data access pattern. |
| Prisma `mode: 'insensitive'` for name matching | PostgreSQL CITEXT extension | If many columns needed case-insensitive behavior (e.g., email, username, display name). For a single field (firstName) in a single lookup (join flow), Prisma's built-in mode is simpler. |
| Single SQL migration for all 12 tables | Table-by-table staged rollout | If the app used `supabase.from()` for data queries -- breaking one table at a time would be safer. Since Prisma bypasses RLS, all 12 can be enabled atomically with zero risk. |
| Fix missing broadcast event | Replace Supabase Realtime with Socket.IO/Pusher | Only if Supabase Realtime itself is unreliable (it is not -- brackets work fine). The poll issue is a missing server-side broadcast call, not infrastructure. |
| Raw React state for name input | React Hook Form for name input | If the form had many fields or complex validation. The name entry form is one text input -- React Hook Form adds unnecessary weight. |

---

## Version Compatibility (Verified)

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| Prisma 7.3.0 | @prisma/adapter-pg 7.3.0 | Supabase PostgreSQL 15 | Uses PrismaPg adapter for direct connection. `bypassrls` user works correctly. Hand-edited migrations (`--create-only`) supported. |
| @supabase/supabase-js 2.93.3 | @supabase/ssr 0.8.0 | Next.js 16.1.6 | Realtime Broadcast via REST API confirmed working. `logger` option available on Realtime config for debugging. |
| Zod 4.3.6 | N/A | Prisma 7.3.0 | Validation schemas need update for `firstName` field -- straightforward `.string().min(1).max(50)` addition. |
| Next.js 16.1.6 | React 19.2.3 | All dependencies | No version conflicts. Server actions support the async broadcast calls. |
| Tailwind CSS 4.x | tw-animate-css 1.4.0 | shadcn/ui components | CSS variable-based theming works for presentation mode contrast overrides. |

---

## Database Connection Architecture

```
Browser (Student)                    Browser (Teacher)
    |                                    |
    v                                    v
Supabase anon key ---------> Supabase Auth (JWT)
    |                                    |
    | WebSocket (Realtime)               | WebSocket (Realtime)
    | REST (HTTP polling fallback)       |
    |                                    |
    +---------> Supabase Broadcast <-----+
                     ^
                     | REST API (service_role key)
                     |
              Next.js Server Actions
                     |
                     | Direct PostgreSQL (bypassrls)
                     v
              Prisma 7.3.0 + PrismaPg adapter
                     |
                     v
              Supabase PostgreSQL 15
              (RLS enabled, no policies = deny all for anon)
```

**Key security boundary after v1.2:** RLS blocks the anon key from direct table access via PostgREST. All legitimate data access flows through Prisma server actions which bypass RLS via the `bypassrls` database role. Realtime Broadcast uses the service_role key which also bypasses RLS.

---

## Migration Execution Order

This order matters due to dependencies:

1. **RLS enablement** (SQL migration) -- independent, deploy first for immediate security hardening
2. **Schema migration** (add `first_name`, make `device_id` nullable) -- independent of RLS, can happen same deploy
3. **Name-based identity code** (actions, DAL, hooks, join form UI) -- depends on schema migration (#2)
4. **Realtime bug fix** (add missing `poll_activated` broadcast call) -- independent, one-line fix
5. **Remove FingerprintJS** (package.json, delete 3 files) -- LAST, only after name-based identity is verified in a real classroom
6. **UI polish** (presentation mode, session naming, terminology) -- independent of all above

---

## Sources

- **Supabase RLS Documentation (HIGH confidence):** https://supabase.com/docs/guides/database/postgres/row-level-security -- Verified enable RLS syntax, deny-all pattern (RLS enabled + no policies = no access), performance tips (wrap auth.uid() in SELECT, add indexes, specify target roles)
- **Supabase Realtime Broadcast (HIGH confidence):** https://supabase.com/docs/guides/realtime/broadcast -- Verified REST API broadcast format (`POST /realtime/v1/api/broadcast`), client subscription pattern, public vs private channel distinction
- **Supabase Realtime Troubleshooting (HIGH confidence):** https://supabase.com/docs/guides/realtime/troubleshooting -- Debug logger configuration, heartbeat monitoring, channel management
- **Supabase + Prisma Integration (HIGH confidence):** https://supabase.com/docs/guides/database/prisma -- Confirmed Prisma user setup with `bypassrls`, connection pooler vs direct connection
- **Prisma RLS Discussion (MEDIUM confidence):** https://github.com/prisma/prisma/discussions/18642 -- Community confirmation that Prisma as postgres/bypassrls user ignores RLS entirely
- **Prisma 7.0 Release (HIGH confidence):** https://www.prisma.io/blog/announcing-prisma-orm-7-0-0 -- Verified v7 features (Rust-free client, ESM, SQL Comments). Hand-edited migrations via `--create-only` confirmed supported.
- **@supabase/supabase-js npm (HIGH confidence):** https://www.npmjs.com/package/@supabase/supabase-js -- Latest version 2.97.0 (installed ^2.93.3 is compatible). Node.js 18 dropped in 2.79.0. Realtime logger option confirmed available.
- **Supabase Broadcast Issues (MEDIUM confidence):** https://github.com/orgs/supabase/discussions/39091 -- Known issues with broadcast messages not reaching clients due to private/public channel type mismatch. SparkVotEDU uses public channels (no `private: true` flag), so this should not apply.
- **PostgreSQL CITEXT vs LOWER() (MEDIUM confidence):** https://www.postgresql.org/docs/current/citext.html -- CITEXT internally calls LOWER(). For single-field case-insensitive lookup, Prisma's `mode: 'insensitive'` is equivalent and simpler.
- **package.json (HIGH confidence):** Direct inspection of installed versions at `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/package.json` -- all versions verified against actual project state
- **Source code review (HIGH confidence):** Read all relevant files (realtime hooks, broadcast module, student actions, join form, Supabase clients, Prisma schema, DAL layer, poll actions, live dashboard components) to verify architecture and identify the missing `poll_activated` broadcast

---

*Stack research for: SparkVotEDU v1.2 Classroom Hardening*
*Researched: 2026-02-21*
