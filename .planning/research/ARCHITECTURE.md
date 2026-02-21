# Architecture Research: v1.2 Classroom Hardening

**Domain:** Integration architecture for name-based identity, RLS policies, realtime fixes, and UX improvements
**Researched:** 2026-02-21
**Confidence:** HIGH (based on thorough codebase analysis of 570+ files and verified Supabase documentation)

---

## Current Architecture Snapshot

The existing system has a clean three-layer architecture that the v1.2 features integrate into:

```
CLIENT LAYER
 Teacher UI (Supabase Auth)     Student UI (Anonymous)
       |                              |
       v                              v
 Server Components             Client Components
 + Server Actions              + localStorage identity
       |                              |
       +----------+-------------------+
                  |
           SERVER LAYER
                  |
     +------------+------------+
     |            |            |
  Prisma v7   Broadcast    Supabase
  (bypassrls  REST API     Realtime
   db user)   (service     (anon key
              role key)    WebSocket)
     |            |            |
     +-----+------+-----+-----+
           |             |
      PostgreSQL    Supabase
      (via Supabase) Realtime
                     Server
```

### Key Architectural Facts (from codebase analysis)

1. **Prisma connects via `DATABASE_URL` using `@prisma/adapter-pg`** -- direct PostgreSQL connection. The Prisma database user has `bypassrls` privilege, which **always bypasses RLS** regardless of policies.

2. **Supabase browser client uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`** (anon key) -- this IS subject to RLS. Used only for Realtime subscriptions and teacher auth, never for direct data queries.

3. **Server-side Supabase client uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`** -- used only for `supabase.auth` in the auth DAL. Not used for data queries.

4. **Admin Supabase client uses `SUPABASE_SERVICE_ROLE_KEY`** -- used for broadcast REST API and admin operations. Bypasses RLS.

5. **All data queries go through Prisma** (DAL layer). No direct Supabase client data access exists in the codebase. Zero uses of `supabase.from('table').select()` for application data.

6. **Broadcast uses REST API, not WebSocket** -- server actions call `fetch()` to `POST /realtime/v1/api/broadcast`. This is a one-way push; the server never subscribes to channels.

7. **Student identity is stored in localStorage** as `sparkvotedu_session_{sessionId}` containing `{ participantId, funName, sessionId, rerollUsed }`.

---

## Component 1: Name-Based Student Identity

### Current Identity Flow (BEING REPLACED)

```
Student opens /join ->
  JoinForm loads ->
    useDeviceIdentity() hook fires ->
      getOrCreateDeviceId() returns localStorage UUID
      getBrowserFingerprint() returns FingerprintJS hash
    ->
  Student enters 6-digit code, submits ->
    joinSession({ code, deviceId, fingerprint }) server action ->
      findActiveSessionByCode(code) via Prisma
      findParticipantByDevice(sessionId, deviceId)     -- primary lookup
      findParticipantByFingerprint(sessionId, fp)      -- fallback
      createParticipant(sessionId, deviceId, fp)       -- new student
    ->
  Result stored in localStorage ->
  Redirect to /session/{sessionId}/welcome
```

### New Identity Flow (NAME-BASED)

```
Student opens /join ->
  JoinForm loads (NO fingerprint/deviceId computation) ->
  Student enters 6-digit code + first name, submits ->
    joinSession({ code, firstName }) server action ->
      findActiveSessionByCode(code) via Prisma
      Case-insensitive lookup: firstName in session participants
        (Prisma mode: 'insensitive')
      IF no match -> create new participant (firstName + random fun name)
      IF exact match + not banned -> return existing (returning student)
      IF match + duplicate detected -> return { duplicate: true }
    ->
  IF duplicate: client prompts student to differentiate ->
    Student adds last initial ("Emma" -> "Emma S") ->
    Re-submits with differentiated name ->
  Result stored in localStorage (same key format, adds firstName) ->
  Redirect to /session/{sessionId}/welcome
```

### Schema Changes

```prisma
model StudentParticipant {
  id           String    @id @default(uuid())
  firstName    String    @map("first_name")         // NEW: student's real first name
  funName      String    @map("fun_name")            // KEEP: random alliterative name for display
  deviceId     String?   @map("device_id")           // CHANGE: nullable (no longer required)
  fingerprint  String?                               // KEEP: nullable (deprecation path)
  recoveryCode String?   @map("recovery_code")       // KEEP
  rerollUsed   Boolean   @default(false) @map("reroll_used")
  banned       Boolean   @default(false)
  lastSeenAt   DateTime  @default(now()) @map("last_seen_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  sessionId    String    @map("session_id")
  session      ClassSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  votes       Vote[]
  pollVotes   PollVote[]
  predictions Prediction[]

  @@unique([sessionId, deviceId])       // KEEP: backward compat (deviceId now nullable)
  @@unique([sessionId, funName])        // KEEP: fun names still unique per session
  @@index([sessionId, firstName])       // NEW: for name-based lookup
  @@index([sessionId, fingerprint])     // KEEP
  @@index([recoveryCode])              // KEEP
  @@map("student_participants")
}
```

### Components to Create/Modify

| Component | Action | Purpose |
|-----------|--------|---------|
| `src/components/student/join-form.tsx` | **MODIFY** | Add first name input field, remove `useDeviceIdentity` dependency |
| `src/actions/student.ts` | **MODIFY** | Accept `firstName` instead of `deviceId/fingerprint`, add duplicate detection |
| `src/lib/dal/student-session.ts` | **MODIFY** | Add `findParticipantByFirstName()` with Prisma `mode: 'insensitive'` |
| `src/types/student.ts` | **MODIFY** | Add `firstName` to types, update `JoinResult` with `duplicate` flag |
| `src/hooks/use-device-identity.ts` | **DEPRECATE then DELETE** | No longer needed for join flow |
| `src/lib/student/fingerprint.ts` | **DEPRECATE then DELETE** | No longer needed |
| `src/lib/student/session-identity.ts` | **DEPRECATE then DELETE** | No longer needed |

### Data Flow: New Join Sequence

```
1. Student enters class code "123456" + first name "Emma" at /join
   -> Server action: joinSession({ code: "123456", firstName: "Emma" })
   -> Prisma: findActiveSessionByCode("123456")
   -> Prisma: findMany where sessionId + firstName (mode: 'insensitive') + not banned

2a. Zero matches -> Create new participant
    -> generateFunName() for display
    -> INSERT INTO student_participants (session_id, first_name, fun_name, ...)
    -> Return { participant, returning: false }

2b. Exactly one match -> Return existing participant (returning student)
    -> UPDATE last_seen_at
    -> Return { participant, returning: true }

2c. Name exists but this is a NEW student (duplicate name)
    -> Return { duplicate: true, existingName: "Emma" }
    -> Client shows: "Another Emma is already here. Please add your last initial."
    -> Student re-enters as "Emma S"
    -> Re-submits -> creates new participant

3. Store in localStorage (backward-compatible format):
   localStorage.setItem(`sparkvotedu_session_${sessionId}`, JSON.stringify({
     participantId: result.participant.id,
     funName: result.participant.funName,
     firstName: result.participant.firstName,    // NEW field
     sessionId: sessionId,
     rerollUsed: result.participant.rerollUsed,
   }))

4. Redirect to /session/{sessionId}/welcome
```

### Migration Strategy

The migration is additive, not destructive. All v1.1 sessions are already ended, making this effectively a clean break:

1. **Add `first_name` column** -- NOT NULL with default '' for existing rows (via hand-edited Prisma migration SQL)
2. **Make `device_id` nullable** -- existing rows keep their values
3. **Deploy new join flow** -- new students use name-based identity
4. **Existing data preserved** -- old participant records with deviceId remain intact, all FK references (votes, predictions) unchanged
5. **After classroom verification** -- remove FingerprintJS from package.json, delete 3 files

**PostgreSQL NULL uniqueness:** The `@@unique([sessionId, deviceId])` constraint remains. PostgreSQL allows multiple NULLs in unique constraints (NULLs are not considered equal for uniqueness), so new participants with NULL deviceId do not violate the constraint.

---

## Component 2: Supabase Row Level Security (RLS)

### The Deny-All Architecture

This is the most important architectural decision in v1.2. The key insight:

**Since ALL data access goes through Prisma (which bypasses RLS), and the Supabase client is only used for Auth and Realtime (never data queries), RLS should be deny-all with no policies.**

```
BEFORE v1.2:
  curl with anon key -> GET /rest/v1/teachers?select=* -> ALL teacher data (EXPOSED)
  curl with anon key -> GET /rest/v1/subscriptions?select=* -> ALL billing data (EXPOSED)
  Prisma server action -> prisma.teacher.findMany() -> ALL data (working)

AFTER v1.2:
  curl with anon key -> GET /rest/v1/teachers?select=* -> [] (BLOCKED by RLS)
  curl with anon key -> GET /rest/v1/subscriptions?select=* -> [] (BLOCKED by RLS)
  Prisma server action -> prisma.teacher.findMany() -> ALL data (still working, bypassrls)
  service_role key -> ALL data (still working, service_role bypasses RLS)
```

### Why Deny-All Instead of Per-Row Policies

| Approach | Deny-All (Recommended) | Per-Row Owner-Based |
|----------|----------------------|---------------------|
| **SQL complexity** | 12 ALTER TABLE statements | 12 ALTER TABLEs + 24+ CREATE POLICY statements with FK-chain subqueries |
| **Maintenance** | None -- no policies to update when schema changes | Must update policies when table relationships change |
| **Risk of breaking Prisma** | Zero -- Prisma bypasses RLS entirely | Zero (same), but more SQL to get wrong |
| **Risk of breaking Realtime** | Zero -- Broadcast does not use data table RLS | Zero (same) |
| **Protection level** | Complete -- no access via PostgREST | Partial -- authenticated teachers can read their own data via PostgREST |
| **When to prefer** | When the ORM handles all data access | When the Supabase client is the primary data access path |

SparkVotEDU uses Prisma for ALL data access. The Supabase client is only used for Auth, Realtime, and Storage. Per-row policies would add complexity without adding security value because no legitimate code path uses `supabase.from()` for data.

### Implementation

Single SQL migration (12 lines):

```sql
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

Applied via `npx prisma migrate dev --create-only --name enable-rls` then `npx prisma migrate deploy`.

### Verification Matrix

| Test | Expected | Why |
|------|----------|-----|
| Prisma `findMany` on any table | Works unchanged | bypassrls user |
| Server action vote submission | Works unchanged | Goes through Prisma |
| Supabase Realtime broadcast (server) | Works unchanged | service_role key bypasses RLS |
| Supabase Realtime subscription (client) | Works unchanged | Broadcast channels do NOT check data table RLS |
| Supabase Presence (student session) | Works unchanged | Presence uses realtime infrastructure, not data tables |
| `supabase.from('teachers').select('*')` from browser | Returns empty `[]` | RLS denies access for anon/authenticated role |
| `curl` with anon key to PostgREST | Returns empty `[]` | Same as above |
| Supabase Storage upload URLs | Works unchanged | Storage uses `storage.objects` table, not public schema |
| Supabase Auth sign-in/sign-out | Works unchanged | Auth uses `auth` schema, not public schema |

---

## Component 3: Realtime Subscription Fixes

### Current Realtime Architecture (Four Channel Patterns)

| Pattern | Channel Topic | Direction | Used By |
|---------|--------------|-----------|---------|
| **Broadcast** (vote updates) | `poll:{pollId}`, `bracket:{bracketId}` | Server -> Client | Teacher dashboard, student views |
| **Broadcast** (lifecycle) | Same channels | Server -> Client | Status changes (poll closed, bracket advanced) |
| **Broadcast** (activities) | `activities:{sessionId}` | Server -> Client | Student activity list |
| **Presence** | `session:{sessionId}` | Bidirectional | Student roster, connected count |

### Confirmed Bug: Missing `poll_activated` Broadcast

In `src/actions/poll.ts`, the `updatePollStatus` function:

```typescript
// Lines 235-246:
if (status === 'active' && result.sessionId) {
  broadcastActivityUpdate(result.sessionId).catch(console.error)
  // BUG: Missing broadcastPollUpdate(pollId, 'poll_activated')
}

if (status === 'closed') {
  broadcastPollUpdate(pollId, 'poll_closed').catch(console.error)  // This exists
}

if (status === 'archived') {
  broadcastPollUpdate(pollId, 'poll_archived').catch(console.error)  // This exists
}
```

The `useRealtimePoll` hook (line 107) listens for `poll_activated` to trigger `fetchPollState()`. This event is never sent, so the hook never gets the activation signal.

**Vote broadcasts DO work** -- `broadcastPollVoteUpdate` is called in `castPollVote` and uses the exact same `broadcastMessage` function that works for brackets. The issue is specific to the activation lifecycle event.

### Fix

Add one line to `src/actions/poll.ts`:

```typescript
if (status === 'active' && result.sessionId) {
  broadcastActivityUpdate(result.sessionId).catch(console.error)
  broadcastPollUpdate(pollId, 'poll_activated').catch(console.error)  // ADD THIS
}
```

### Additional Investigation Points

After applying the fix, verify these edge cases:

1. **Subscription timing:** Teacher navigates to `/polls/[pollId]/live` AFTER activating the poll. The `useRealtimePoll` hook subscribes to `poll:{pollId}` and calls `fetchPollState()` when WebSocket reaches SUBSCRIBED. This should catch up on any votes cast between activation and page load.

2. **Batch flush on poll close:** When `poll_closed` event fires, `fetchPollState()` is called immediately. But `pendingVoteCounts.current` might still contain unflushed data from the 2-second batch interval. The fetch overwrites `setVoteCounts()`, but the flush interval might subsequently overwrite with stale data. Clear `pendingVoteCounts.current = {}` inside `fetchPollState`.

3. **Transport fallback consistency:** If WebSocket fails and the hook switches to HTTP polling (3-second interval), vote updates come from `/api/polls/[pollId]/state`. This endpoint returns all current data, so the fallback path works independently of broadcast. Verify the endpoint returns correct data.

---

## Component 4: Presentation Mode Contrast

### Current Implementation

`PresentationMode` component uses CSS class overrides:

```tsx
<div className="fixed inset-0 z-50 flex flex-col bg-gray-950 text-white">
  <div className="[&_*]:text-white [&_.text-muted-foreground]:text-white/60
                  [&_.bg-muted]:bg-white/10 [&_.border]:border-white/20
                  [&_.bg-card]:bg-white/5 [&_.text-foreground]:text-white">
    {children}
  </div>
</div>
```

### Issue

Ranked poll leaderboard cards use specific Tailwind classes (`bg-amber-100 text-amber-800`, etc.) that are NOT caught by the generic `[&_*]:text-white` override. The amber/gray/orange background colors have insufficient contrast on projectors with washed-out output.

### Fix Approach

Option A (recommended): Darken the medal card backgrounds in `ranked-leaderboard.tsx`:
```typescript
const MEDAL_STYLES: Record<number, string> = {
  0: 'bg-amber-200 text-amber-900 border-amber-400',   // Gold - darker
  1: 'bg-gray-200 text-gray-900 border-gray-400',       // Silver - darker
  2: 'bg-orange-200 text-orange-900 border-orange-400',  // Bronze - darker
}
```

This achieves WCAG AAA (7:1+) contrast while preserving medal color identity. No component architecture change needed.

---

## Component 5: Session Management

### Current State

- `ClassSession` model has `name: String?` (already exists, nullable)
- `createClassSession(teacherId, name?)` DAL supports optional name
- Dashboard shows `session.name || 'Unnamed Session'` but no edit UI
- Session dropdowns show `Session {code}` instead of name

### Changes

| Location | Change |
|----------|--------|
| Session select dropdowns (poll detail, bracket detail) | Show `s.name \|\| Session ${s.code}` |
| Session detail page | Add inline edit (pencil icon, input field, save) |
| New server action: `updateSessionName(sessionId, name)` | Prisma update with teacher ownership check |
| New DAL: `updateSessionName(sessionId, teacherId, name)` | Prisma query |

No schema migration needed.

---

## Component 6: Status Terminology

**UI-only change.** Database `status: 'active'` stays unchanged. Map in display layer:

| Database Value | Display Label | Button Label |
|---------------|--------------|-------------|
| `draft` | Draft | "Start" or "Go Live" |
| `active` | Live | "Close" / "End Voting" |
| `closed` | Closed | "Reopen" |
| `completed` | Completed | N/A |

Affected components: `bracket-status.tsx`, `bracket-detail.tsx`, `bracket-card.tsx`, `poll-detail-view.tsx`, `predictive-bracket.tsx`, and associated status badges.

---

## Recommended Build Order

```
Phase 1: Security + Schema Foundation
  |  - RLS on all 12 tables (12-line SQL migration)
  |  - Schema: add first_name, make device_id nullable
  |  - Verify: Prisma operations unchanged, Realtime unchanged, Storage unchanged
  |
  +--> Phase 2: Name-Based Identity (depends on schema)
  |     - Modify join-form.tsx (add first name input)
  |     - Modify actions/student.ts (accept firstName, duplicate detection)
  |     - Modify dal/student-session.ts (case-insensitive name lookup)
  |     - Update types/student.ts
  |     - Update localStorage contract (add firstName field)
  |
  +--> Phase 3: Realtime Fix (independent)
  |     - Add broadcastPollUpdate('poll_activated') in updatePollStatus
  |     - Clear pending batch on fetchPollState
  |     - Add Realtime debug logging for investigation
  |
  +--> Phase 4: UX Polish (independent)
  |     - Presentation mode contrast fix (CSS)
  |     - Session name display + inline edit
  |     - "Go Live" terminology across components
  |
  +--> Phase 5: Cleanup (after classroom verification)
        - npm uninstall @fingerprintjs/fingerprintjs
        - Delete: fingerprint.ts, session-identity.ts, use-device-identity.ts

Phases 2, 3, and 4 can run in parallel after Phase 1.
Phase 5 runs after Phase 2 is verified in a real classroom.
```

---

## Patterns to Follow

### Pattern 1: Deny-All RLS with Prisma Bypass

**What:** Enable RLS on all tables but create no policies. Prisma (bypassrls) handles all legitimate data access. PostgREST is completely locked down.

**When:** When the ORM is the sole data access path and the Supabase client is only used for Auth/Realtime/Storage.

**Why this works:** Zero risk of breaking existing code. Zero maintenance burden. Complete protection against direct API abuse.

### Pattern 2: Case-Insensitive Identity with Soft Duplicate Detection

**What:** Match student identity by `(sessionId, firstName)` case-insensitively using Prisma `mode: 'insensitive'`. Report duplicates to the client for user-driven resolution rather than blocking.

**When:** When uniqueness is desired but hard enforcement creates worse UX than soft guidance. In a classroom of 30, name collisions (multiple Emmas) are statistically likely.

### Pattern 3: Additive Schema Migration

**What:** Add new columns as non-null with defaults. Make old columns nullable but do not drop them. Keep old constraints intact.

**When:** Production schema changes where rollback must be possible. The `device_id` column becomes nullable but is not removed.

### Pattern 4: Server-Side Broadcast with Client Subscription

**What:** Server actions broadcast via Supabase REST API. Clients subscribe via WebSocket with HTTP polling fallback.

**When:** Server is the source of truth. Already implemented correctly in SparkVotEDU. The poll fix is adding a missing broadcast call, not changing the pattern.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Per-Row RLS Policies with Prisma

**What:** Writing `USING (auth.uid() = teacher_id)` policies when Prisma handles authorization.

**Why bad:** Prisma bypasses RLS. You would maintain two authorization systems that never interact. When they drift, you get confusing bugs. Deny-all is simpler and more secure.

### Anti-Pattern 2: Using postgres_changes for Classroom Realtime

**What:** Subscribing to database change events instead of Broadcast.

**Why bad:** O(n) database load per vote (one notification per subscriber). With 30 students, each vote triggers 30 database notifications. Broadcast is O(1).

### Anti-Pattern 3: Keeping FingerprintJS as Fallback

**What:** Maintaining two identity systems with cascading fallback logic.

**Why bad:** Creates branching code paths. The fingerprint path is proven broken on school hardware. One code path, one mental model is better.

### Anti-Pattern 4: Changing Database Enum Values for UI Labels

**What:** Changing `status: 'active'` to `status: 'live'` in the database.

**Why bad:** Requires migrating all existing rows, updating every query. Map to "Live" in the UI display layer only.

---

## Sources

- **Supabase RLS Documentation:** [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- HIGH confidence
- **Supabase Broadcast:** [Broadcast | Supabase Docs](https://supabase.com/docs/guides/realtime/broadcast) -- HIGH confidence
- **Supabase + Prisma:** [Prisma | Supabase Docs](https://supabase.com/docs/guides/database/prisma) -- HIGH confidence
- **Supabase Broadcast Issues:** [Discussion #39091](https://github.com/orgs/supabase/discussions/39091) -- MEDIUM confidence
- **Prisma Case-Insensitive Filtering:** Prisma documentation for `mode: 'insensitive'` -- HIGH confidence
- **Codebase Analysis:** Direct examination of all referenced source files -- HIGH confidence

---
*Architecture research for: SparkVotEDU v1.2 Classroom Hardening*
*Researched: 2026-02-21*
