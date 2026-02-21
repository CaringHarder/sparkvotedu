# Project Research Summary

**Project:** SparkVotEDU v1.2 Classroom Hardening
**Domain:** EdTech classroom voting platform — identity overhaul, security hardening, realtime fixes, UX polish
**Researched:** 2026-02-21
**Confidence:** HIGH

## Executive Summary

SparkVotEDU v1.2 is a hardening milestone for an already-live classroom voting platform (570+ files). The six features in scope integrate cleanly with the existing Next.js 16.1.6 + Prisma 7.3.0 + Supabase architecture because they are modifications to existing components, not new subsystems. Zero new npm packages are required. The single package to remove is `@fingerprintjs/fingerprintjs` (^5.0.1) — but only after name-based identity is verified in a real classroom, as a deliberate safety step.

The most important architectural insight from research: Prisma connects to PostgreSQL via the `@prisma/adapter-pg` adapter using a `bypassrls` database user, which means RLS policies apply only to direct PostgREST access (the anon key in the browser), never to Prisma server actions. Since all data mutations in SparkVotEDU flow through Prisma server actions, the correct RLS implementation is deny-all — enable RLS on all 12 tables with zero policies. This completely locks down the publicly-exposed Supabase REST API surface while leaving every existing code path unchanged. Per-row owner-based policies are unnecessary complexity; they would protect a data access path that no legitimate code uses.

The poll realtime bug has a confirmed root cause from code analysis: `updatePollStatus` in `src/actions/poll.ts:235` fires `broadcastActivityUpdate(sessionId)` on activation but never fires `broadcastPollUpdate(pollId, 'poll_activated')`. The `useRealtimePoll` hook listens for `poll_activated` to trigger its initial data fetch. This is a one-line fix. All four research threads agree on the same diagnosis and the same phase ordering: security/schema first, identity second, realtime fix and UX polish in parallel, cleanup last.

## Key Findings

### Recommended Stack

All six v1.2 features are achievable with the current installed stack. No dependency resolution, no version pinning, no new packages. The implementation footprint is: SQL migrations (Prisma managed), Prisma schema edits, TypeScript changes to existing server actions and DAL functions, and Tailwind CSS class updates. Zod validation schemas need minor additions for the `firstName` field using the already-installed Zod 4.3.6.

**Core technologies and their v1.2 roles:**
- **Prisma 7.3.0** — schema migration (add `first_name`, make `device_id` nullable), case-insensitive name lookup via `mode: 'insensitive'`, hand-edited SQL migrations via `--create-only`
- **@supabase/supabase-js 2.93.3** — RLS policy enablement (SQL via Prisma migration), Realtime debug logging (built-in `logger` config option), Broadcast REST API (already used)
- **Next.js 16.1.6** — no changes needed; server actions continue handling all data mutations
- **Tailwind CSS 4** — CSS-only contrast fix for ranked poll medal cards
- **@fingerprintjs/fingerprintjs ^5.0.1** — REMOVE after classroom verification (not before)

**What not to add:** No CITEXT PostgreSQL extension (Prisma `mode: 'insensitive'` handles the single case-insensitive comparison), no Socket.IO or Pusher (the infrastructure works — brackets prove it), no per-row RLS policies (unnecessary when Prisma bypasses RLS entirely), no auth library for students (name-based identity stays application-level).

### Expected Features

**Must fix — P0 (product broken without these):**
- **Name-based student identity** — Device fingerprinting failed in production. 24 students on identical school Chromebooks produced 6 unique fingerprints. localStorage UUIDs wiped by IT policies. Students cannot be identified. Replace with session code + first name. Case-insensitive duplicate detection via Prisma. Duplicate names prompt differentiation ("Another Emma is here — please add your last initial"), never auto-merge.
- **RLS security hardening** — Supabase anon key is visible in client JavaScript. Without RLS, anyone can read all teacher data, student records, votes, subscriptions, and billing via `curl`. Enable RLS on all 12 public tables with deny-all pattern. Zero application code changes needed.
- **Poll live update fix** — Real-time is the core product value. If poll results freeze when projected in a classroom, the product appears broken. One-line fix in `src/actions/poll.ts`.

**Should have — P2 (improve classroom experience, not broken):**
- **Session name display and edit** — `ClassSession.name` column already exists in schema. Teachers creating multiple daily sessions need names (not codes) in dropdowns. Add inline edit and display fallback: `s.name || Session ${s.code}`.
- **Terminology unification** — "Activate" (polls) vs "Go Live" (brackets) confuses teachers. Unify to "Go Live" for activation, "Live Dashboard" for the live view. Database `status: 'active'` stays unchanged — display layer mapping only.
- **Presentation mode contrast** — Ranked poll medal cards use amber-100/gray-100/orange-100 backgrounds that wash out on classroom projectors. Darken to -200 variants with -900 text. CSS class change in one file.

**Defer to v1.3+:**
- Full student accounts (COPPA/FERPA burden, passwords)
- Per-row RLS policies (no code path uses `supabase.from()`)
- Dark mode theme for presentation
- Realtime Authorization for broadcast channels (UUIDs in topic names are unguessable; full auth is v1.3)

### Architecture Approach

SparkVotEDU has a clean three-layer architecture: client components make calls to Next.js server actions, which use Prisma for all data access and the Supabase service_role key for Realtime broadcasts. The Supabase browser client is used only for teacher Auth (JWT) and Realtime WebSocket subscriptions — never for data queries. This separation is what makes deny-all RLS the obvious choice and makes all six v1.2 features lower-risk than they appear.

**Major components and their v1.2 responsibilities:**

1. **Student Identity Layer** — `src/actions/student.ts`, `src/lib/dal/student-session.ts`, `src/components/student/join-form.tsx`, `src/types/student.ts` — Replace device fingerprint flow with name-based flow. Add `findParticipantByFirstName()` with case-insensitive matching. Remove `useDeviceIdentity` hook dependency.

2. **RLS Security Layer** — Single SQL migration file (12 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statements). No policies. Applied via `npx prisma migrate dev --create-only --name enable-rls-all-tables`. Zero application code changes.

3. **Realtime Broadcast Layer** — `src/actions/poll.ts` (add one `broadcastPollUpdate(pollId, 'poll_activated')` call). Secondary investigation: clear `pendingVoteCounts.current` in `fetchPollState` to prevent stale batch data overwriting fresh fetch results on poll close.

4. **Presentation/UX Layer** — `src/components/poll/ranked-leaderboard.tsx` (darken `MEDAL_STYLES`), session dropdown components (display name fallback), ~6 component files (button label copy changes).

5. **Cleanup Layer** — `npm uninstall @fingerprintjs/fingerprintjs`, delete `src/lib/student/fingerprint.ts`, `src/lib/student/session-identity.ts`, `src/hooks/use-device-identity.ts`. Runs last, only after classroom verification.

**Key patterns to follow:**
- Deny-all RLS with Prisma bypass (enable + no policies)
- Additive schema migration (add `first_name` non-null with default, make `device_id` nullable, keep constraint)
- Server-side broadcast with client subscription (already implemented; poll fix adds a missing call)
- Case-insensitive identity with soft duplicate detection (prompt, never auto-merge)

**Anti-patterns to avoid:**
- Per-row RLS policies when Prisma handles authorization
- `postgres_changes` subscriptions (O(n) DB load per vote; Broadcast is O(1))
- Keeping FingerprintJS as a fallback (two code paths, proven broken on school hardware)
- Changing database enum value `'active'` to `'live'` (map in display layer only)

### Critical Pitfalls

1. **RLS breaks postgres_changes subscriptions** — After enabling RLS, `postgres_changes` realtime subscriptions stop receiving events because RLS denies the subscriber SELECT access. SparkVotEDU does NOT use `postgres_changes` (verified via code review: all hooks use Broadcast or Presence), so this is not a risk here. Verify post-deploy by checking all four realtime patterns (vote, bracket advance, activity, presence).

2. **Prisma migration breaks on device_id constraint change** — Making `device_id` nullable is safe only if the `@@unique([sessionId, deviceId])` constraint is preserved as-is. PostgreSQL allows multiple NULLs in unique constraints (NULLs are not equal for uniqueness), so new participants with `NULL deviceId` do not violate the constraint. Use `--create-only` to inspect generated SQL before applying.

3. **Silent identity merge on duplicate names** — Case-insensitive matching means "Emma" and "emma" are the same. If a different person joins with a matching name, they inherit the original student's participant record (and votes). Prevention: always prompt on collision — "Another Emma is already here. Is this you coming back? [Yes, that's me] [No, I'm different]". Never auto-merge, never auto-reject.

4. **Batch flush overwrites fresh fetch data on poll close** — `useRealtimePoll` batches vote updates every 2 seconds. When `poll_closed` fires, `fetchPollState()` sets fresh data from the server, but the pending batch flush interval may subsequently overwrite it with stale counts. Fix: clear `pendingVoteCounts.current = {}` inside `fetchPollState()` before setting state.

5. **Testing RLS in SQL Editor bypasses RLS** — The Supabase SQL Editor runs as superuser, which bypasses RLS. Test RLS correctness with `curl -H "apikey: ANON_KEY" "$SUPABASE_URL/rest/v1/teachers?select=*"` — should return empty `[]`. Never use the SQL Editor to verify deny-all behavior.

## Implications for Roadmap

Based on research, recommended phase structure:

### Phase 1: Security and Schema Foundation

**Rationale:** RLS hardening is a zero-risk immediate win — Prisma bypasses it entirely, so no code path can break. Schema migration must land before identity code ships because the code depends on the `first_name` column. Combining them in one phase means one migration, one deploy, one verification pass.

**Delivers:** All 12 tables RLS-protected, `first_name` column available in `student_participants`, `device_id` made nullable.

**Addresses:** RLS security hardening (table stakes), schema prerequisite for name-based identity.

**Avoids:** Leaving tables exposed while working on other features; shipping identity code against schema that doesn't support it yet.

**Implementation specifics:**
- `npx prisma migrate dev --create-only --name enable-rls-and-name-schema`
- Hand-edit migration SQL: 12 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statements, ADD COLUMN `first_name` NOT NULL DEFAULT '', ALTER COLUMN `device_id` DROP NOT NULL, ADD INDEX `(session_id, first_name)`
- Verify: Prisma operations unchanged, Realtime unchanged, Storage unchanged, `curl` with anon key returns `[]`

**Research flag:** Standard SQL patterns. No additional research needed. Implementation fully specified in STACK.md.

### Phase 2: Name-Based Student Identity

**Rationale:** The largest and most complex change. Depends on Phase 1 schema. This is the P0 fix that makes the product work in real classrooms.

**Delivers:** Students join with first name instead of device fingerprint. Duplicate names handled gracefully with explicit disambiguation prompt. Teacher sees real student names on participant roster.

**Addresses:** Name-based student identity (P0 table stakes).

**Avoids:** Breaking existing data (additive migration, `device_id` kept, FK references unchanged). Silent identity merges (always prompt on duplicate).

**Implementation specifics:**
- Modify `src/lib/dal/student-session.ts`: add `findParticipantByFirstName(sessionId, firstName)` with `mode: 'insensitive'`
- Modify `src/actions/student.ts`: accept `{ code, firstName }`, duplicate detection, return `{ duplicate: true }` case
- Modify `src/components/student/join-form.tsx`: add first name input, remove `useDeviceIdentity` hook
- Modify `src/types/student.ts`: add `firstName` to types, add `duplicate` flag to `JoinResult`
- Update localStorage contract: add `firstName` field alongside existing fields

**Research flag:** Technical approach fully specified. Name disambiguation UX wording should be validated with teachers before shipping ("Another Emma is already here" prompt). No deep research needed — judgment call.

### Phase 3: Realtime Bug Fix

**Rationale:** Independent of identity changes. One-line fix + investigation of secondary edge cases. Can proceed in parallel with Phase 2 work.

**Delivers:** Teacher poll live dashboard updates in real-time when students vote. Poll activation event properly signals the realtime hook.

**Addresses:** Poll live update bug (P0 table stakes).

**Avoids:** Shipping the name-based identity overhaul on top of broken realtime infrastructure; stale batch data overwriting fresh server state on poll close.

**Implementation specifics:**
- `src/actions/poll.ts:235`: add `broadcastPollUpdate(pollId, 'poll_activated').catch(console.error)` in the `status === 'active'` branch
- `useRealtimePoll` hook: clear `pendingVoteCounts.current` inside `fetchPollState()` before setting state
- Enable Supabase Realtime debug logging during investigation
- End-to-end test: student votes, teacher live dashboard updates within 2 seconds

**Research flag:** Root cause identified in source code. No research needed. Post-fix investigation may surface a subscription timing race condition (teacher navigates to live page after activation); `fetchPollState()` on SUBSCRIBED status should handle this, but verify.

### Phase 4: UX Polish

**Rationale:** All three polish items are pure UI changes with no schema or architectural dependencies. Bundle them in one phase for efficiency. Can proceed in parallel with Phases 2 and 3.

**Delivers:** Readable poll results on classroom projectors. Meaningful session names in dropdowns. Consistent "Go Live"/"Live Dashboard" terminology across brackets and polls.

**Addresses:** Presentation mode contrast, session name display + edit, status terminology unification.

**Avoids:** Scope creep into architectural changes; adding full dark mode theme (v1.3 scope).

**Implementation specifics:**
- `src/components/poll/ranked-leaderboard.tsx`: darken `MEDAL_STYLES` to -200 backgrounds, -900 text, -400 borders
- Session dropdowns: `s.name || 'Session ' + s.code` fallback display
- New server action `updateSessionName(sessionId, name)` + DAL method
- Inline edit component on session detail page with `useOptimistic` for race condition prevention
- ~6 component files: "Activate" -> "Go Live", "Go Live" button -> "Live Dashboard", status badge "Active" -> "Live"
- Grep for all instances before closing: `grep -r "Activate\|Go Live\|Active" src/components/`

**Research flag:** Standard UI patterns. No research needed. Terminology: create a single display-layer constant to prevent future drift.

### Phase 5: Cleanup

**Rationale:** Destructive step — removing working (if broken) fallback code. Must happen after Phase 2 is verified in a real classroom with school hardware (Chromebooks). Removing prematurely eliminates the ability to roll back.

**Delivers:** Smaller client bundle (~50KB removed), single identity code path, no dead code.

**Addresses:** FingerprintJS removal (final step of identity migration).

**Avoids:** Removing the safety net before the replacement is proven.

**Implementation specifics:**
- `npm uninstall @fingerprintjs/fingerprintjs`
- Delete `src/lib/student/fingerprint.ts`
- Delete `src/lib/student/session-identity.ts`
- Delete `src/hooks/use-device-identity.ts`
- Remove all imports referencing deleted files

**Research flag:** No research needed. Straightforward deletion after verification gate.

### Phase Ordering Rationale

- Security and schema are delivered first because they have zero risk and unblock everything else
- Schema must precede identity code because `first_name` column must exist before the DAL function references it
- Identity is the primary focus of the milestone and should receive the most implementation attention
- Realtime fix and UX polish are independent of identity and can run in parallel, keeping the team unblocked
- Cleanup is deliberately last — it is irreversible and should be gated on real classroom verification, not developer testing
- The "parallel after Phase 1" model (Phases 2, 3, 4 concurrent; Phase 5 after Phase 2 verified) matches how all four research files describe the dependency graph

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (Identity):** No technical research needed; UX wording for the duplicate name disambiguation prompt may benefit from a quick teacher-feedback loop before implementation locks in. The "Is this you coming back?" flow is specified but untested with real users.
- **Phase 3 (Realtime):** Post-fix investigation may reveal a subscription timing edge case (teacher navigates to live page after poll activation). If the one-line fix does not fully resolve the issue, enable Supabase Realtime debug logging and check Dashboard Realtime Inspector. Resolution path is clear; depth is uncertain.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Security/Schema):** Implementation is fully specified in STACK.md. 12-line SQL migration + 3-line schema edit.
- **Phase 4 (UX):** Pure CSS and copy changes. WCAG contrast targets are defined (WCAG AAA, 7:1+).
- **Phase 5 (Cleanup):** File deletion. No ambiguity.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against package.json. No new packages needed. bypassrls behavior confirmed via Supabase official docs and Prisma GitHub discussion. |
| Features | HIGH | All 6 features mapped to specific files, line numbers, and code paths via direct codebase analysis. Feature boundaries are clear. Deny-all RLS simplifies security feature significantly vs what developers often expect. |
| Architecture | HIGH | Prisma+RLS coexistence model verified via Supabase official docs and code review. Missing broadcast call located at exact line (`poll.ts:235`). All four realtime hook types confirmed as Broadcast/Presence (not postgres_changes). |
| Pitfalls | HIGH | Migration safety (additive schema), RLS Prisma bypass, missing broadcast, batch flush race condition — all identified via source code analysis and documented patterns. Key risk (deploying identity during active sessions) is mitigated by the fact all v1.1 sessions are already ended. |

**Overall confidence:** HIGH

### Gaps to Address

- **Realtime secondary edge cases:** The missing `poll_activated` broadcast is the confirmed root cause, but there may be a subscription timing issue when a teacher navigates to the live poll page after activation. `fetchPollState()` fires on SUBSCRIBED status and should catch this, but it needs end-to-end verification with real devices (not just unit testing).

- **Name disambiguation UX wording:** The duplicate detection flow is architecturally specified, but the exact prompt copy ("Another Emma is already here. Is this you coming back?") has not been tested with students. The system correctly detects collisions; whether students understand the prompt is a UX validation question for Phase 2.

- **Projector contrast validation:** The WCAG AAA (7:1+) contrast target is computed for monitors. Real classroom projectors wash out colors by an estimated 30-50%. Phase 4 implementation should be tested on an actual projector before shipping, not just a monitor or browser dev tools color picker.

## Sources

### Primary (HIGH confidence)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — deny-all pattern, bypassrls behavior, policy syntax
- [Supabase Realtime Broadcast](https://supabase.com/docs/guides/realtime/broadcast) — REST broadcast API, channel subscription patterns
- [Supabase Realtime Troubleshooting](https://supabase.com/docs/guides/realtime/troubleshooting) — debug logger config, heartbeat monitoring
- [Supabase + Prisma Integration](https://supabase.com/docs/guides/database/prisma) — bypassrls user setup, connection architecture
- [Prisma 7.0 Release Notes](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0) — hand-edited migrations via --create-only confirmed
- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) — v2.97.0 latest, ^2.93.3 installed and compatible
- [W3C WCAG 2.2 Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) — contrast ratio targets for presentation mode
- [PostgreSQL NULL Uniqueness](https://www.postgresql.org/docs/current/ddl-constraints.html) — NULLs not equal in unique constraints
- SparkVotEDU codebase direct analysis — all referenced files, line numbers, and code paths verified

### Secondary (MEDIUM confidence)
- [Prisma + Supabase RLS Discussion #18642](https://github.com/prisma/prisma/discussions/18642) — community confirmation Prisma ignores RLS via bypassrls
- [Supabase Broadcast Issues #39091](https://github.com/orgs/supabase/discussions/39091) — known private/public channel mismatch issue (does not apply here; SparkVotEDU uses public channels)
- [Kahoot Player Identifier Help](https://support.kahoot.com/hc/en-us/articles/360036178314-Player-identifier) — competitive pattern for name-based identity and duplicate handling

---
*Research completed: 2026-02-21*
*Ready for roadmap: yes*
