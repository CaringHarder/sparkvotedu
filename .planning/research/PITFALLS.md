# Pitfalls Research: v1.2 Classroom Hardening

**Domain:** Classroom Hardening -- Identity Migration, RLS Hardening, Realtime Debugging, UX Terminology
**Researched:** 2026-02-21
**Confidence:** HIGH (codebase analysis + official Supabase documentation + verified patterns)

---

## Critical Pitfalls

### Pitfall 1: RLS Breaks Supabase Realtime (If Using postgres_changes)

**What goes wrong:**
After enabling RLS on tables, Supabase Realtime `postgres_changes` subscriptions stop receiving events because the subscribing user no longer has SELECT access. Developers panic thinking RLS broke the app.

**Why it happens:**
`postgres_changes` checks RLS policies to determine if the subscriber can see the changed row. With deny-all RLS (no policies), the subscriber sees nothing.

**Consequences:** Silent failure -- no errors, just no events.

**Prevention:** SparkVotEDU does NOT use `postgres_changes`. Verified by code review: all realtime hooks (`use-realtime-bracket.ts`, `use-realtime-poll.ts`, `use-realtime-activities.ts`, `use-student-session.ts`) use Broadcast or Presence channels only. Broadcast does not check RLS on data tables. **No risk for this project.**

**Detection:** After enabling RLS, test all four realtime patterns: vote on a poll, advance a bracket, activate an activity, check student presence. All should continue working.

### Pitfall 2: Prisma Migration Breaks on device_id NOT NULL Change

**What goes wrong:**
Making `device_id` nullable generates `ALTER COLUMN device_id DROP NOT NULL`. But if you also modify the `@@unique([sessionId, deviceId])` constraint (e.g., removing it or adding a new one), Prisma generates `DROP CONSTRAINT` then `CREATE CONSTRAINT`, which can fail on existing data.

**Why it happens:**
Prisma's migration engine tries to drop and recreate constraints when their definition changes. If the constraint columns have changed, the recreation may fail on existing data.

**Consequences:** Failed migration in production. Database in inconsistent state.

**Prevention:**
1. Use `prisma migrate dev --create-only` to generate SQL, review before applying
2. Keep `@@unique([sessionId, deviceId])` as-is (existing rows all have device_id values)
3. PostgreSQL allows multiple NULLs in unique constraints (NULLs are not equal for uniqueness), so new rows with NULL device_id are fine
4. Test the migration against a copy of production data first

**Detection:** Migration failure error from `prisma migrate deploy`.

### Pitfall 3: Missing poll_activated Broadcast (Confirmed Bug)

**What goes wrong:**
The bracket live dashboard updates in real-time but the poll live dashboard does not. Developers instinctively blame Supabase Realtime configuration when the actual root cause is a missing server-side broadcast call.

**Why it happens:**
In `src/actions/poll.ts:235`, when activating a poll, `broadcastActivityUpdate(sessionId)` is called but `broadcastPollUpdate(pollId, 'poll_activated')` is not. The `useRealtimePoll` hook listens for `poll_activated` to trigger `fetchPollState()`. The event never fires.

**Consequences:** Teacher sees stale poll data until they manually refresh the page.

**Prevention:** This is a known bug to fix, not prevent. The fix is adding one line: `broadcastPollUpdate(pollId, 'poll_activated').catch(console.error)`.

**Detection:** Cast a vote from a student device. Watch the teacher's poll live dashboard. If it does not update within 2 seconds, the broadcast is not working.

### Pitfall 4: Case-Insensitive Matching Creates Unintended Identity Merges

**What goes wrong:**
"Emma" and "emma" match case-insensitively. If a student joins as "Emma" and later a different person on a different device joins as "emma", they get the existing participant record (returning: true). The second person votes as the first person's identity.

**Why it happens:**
Case-insensitive matching is intentional for UX (students should not need to remember capitalization). But it means different people with the same name are treated as the same person returning.

**Consequences:** Vote integrity compromised if two different people share a first name in the same session.

**Prevention:**
1. On duplicate detection, ALWAYS prompt -- never silently merge
2. Flow: "Emma is already in this session. Is this you coming back? [Yes, that's me] [No, I'm a different Emma]"
3. "No, I'm different" creates a new participant with differentiated name
4. "Yes, that's me" returns the existing participant
5. This makes the collision explicit and user-controlled

**Detection:** Monitor for sessions where the same participant has votes from wildly different time ranges (indicating two people sharing an identity).

---

## Moderate Pitfalls

### Pitfall 5: Service Role Key Leaks into Client Bundle

**What goes wrong:**
`SUPABASE_SERVICE_ROLE_KEY` is used in `src/lib/realtime/broadcast.ts` and `src/lib/supabase/admin.ts`. If either is accidentally imported from a `'use client'` component, Next.js bundles the env var into client JS.

**Prevention:**
1. Both files are already server-only (no `'use client'` directive)
2. Env var naming: `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix) prevents client-side exposure
3. Verify: grep for `NEXT_PUBLIC_SERVICE_ROLE` or `NEXT_PUBLIC_SUPABASE_SERVICE` -- should return zero results

### Pitfall 6: Batch Flush Interval Hides Votes on Poll Close

**What goes wrong:**
The `useRealtimePoll` hook batches vote updates every 2 seconds. When `poll_closed` fires, `fetchPollState()` is called immediately, which sets `setVoteCounts(data.voteCounts)`. But `pendingVoteCounts.current` might still have stale data from before the fetch. The next flush interval overwrites the fresh fetch data with stale pending data.

**Prevention:**
Clear `pendingVoteCounts.current = {}` and `pendingTotalVotes.current = null` inside `fetchPollState()` callback, before setting state from the fetch response.

### Pitfall 7: localStorage Cache Points to Ended Session

**What goes wrong:**
If a teacher creates two sessions with the same 6-digit code (end one, create another), the student's browser has `sparkvotedu_session_{oldSessionId}` cached. On the next visit, the student might navigate to the old session's page, which shows an error or stale data.

**Prevention:**
On session pages, if the session status is `ended`, redirect to `/join` with a "Session has ended" message. Clear the localStorage entry.

---

## Minor Pitfalls

### Pitfall 8: Prisma Generate Needed After Schema Change

**What goes wrong:**
After modifying `schema.prisma`, developers forget to run `prisma generate`. TypeScript types are stale. Accessing `participant.firstName` fails at runtime (undefined in generated types).

**Prevention:** The build script already runs `prisma generate && next build`. During development, run `npx prisma generate` after any schema change. `npx prisma migrate dev` auto-generates.

### Pitfall 9: Presentation Mode Contrast Fix Breaks Dark Mode

**What goes wrong:**
Hardcoding high-contrast colors for presentation mode breaks the dark mode theme.

**Prevention:** Presentation mode already forces a dark background (`bg-gray-950`). The medal card colors should use static Tailwind classes that work against the dark presentation background. Test in both light and dark mode settings.

### Pitfall 10: Inline Session Name Edit Race Condition

**What goes wrong:**
Teacher edits session name, but a `router.refresh()` from another action resets the input before saving.

**Prevention:** Use optimistic updates with `useTransition` and `useOptimistic`. Update local state immediately, persist via server action, revert on failure.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| RLS enablement | Developers test in SQL Editor (which bypasses RLS as superuser) and think policies work | Test with `curl` using the anon key, or use `SET ROLE anon;` before queries in SQL Editor |
| RLS enablement | Worrying about breaking Realtime | App uses Broadcast (not postgres_changes). Broadcast does not check data table RLS. No risk. |
| Schema migration | NULL deviceId concern | PostgreSQL allows multiple NULLs in unique constraints. Keep existing constraint. |
| Name-based identity | Old students cannot rejoin with name match | Clean break -- all v1.1 sessions already ended. No active migration needed. |
| Name-based identity | Silent merge of different people with same name | Always prompt on duplicate, never auto-merge. Provide "Is this you?" / "I'm different" options. |
| Poll broadcast fix | Fix poll_activated but miss batch flush issue | Also clear pending batch refs in fetchPollState to prevent stale data overwrite. |
| FingerprintJS removal | Removing before name-based identity is verified | Remove LAST -- only after name-based identity is deployed and tested in a real classroom. |
| Presentation contrast | Only testing on a monitor, not a real projector | Test on a real projector from 20+ feet away. Projector wash-out reduces effective contrast by 30-50%. |
| Terminology changes | Missing some instances of "Activate" | Grep the entire codebase for "Activate", "activate", "Go Live", "Active" (display context). Create a single terminology constant. |

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| RLS lockout (if per-row policies were used and broke access) | LOW | `ALTER TABLE x DISABLE ROW LEVEL SECURITY;` -- no data loss, just restores access. With deny-all approach this is the fallback for any issues. |
| Identity migration creates duplicate participants | MEDIUM | Merge duplicates: update `votes`, `poll_votes`, `predictions` FK references to canonical participant, delete duplicate record. Manual SQL. |
| Poll realtime still not working after one-line fix | LOW | Add `console.log` in broadcast.ts for success case. Check Supabase Dashboard Realtime Inspector. If broadcasts appear but client does not receive, check channel topic string match. |
| Name collision not handled | LOW | Add duplicate detection retroactively. Existing participants unaffected -- only join flow needs updating. |
| Terminology inconsistency | LOW | Search-and-replace across affected files. No data migration needed. |

---

## "Looks Done But Isn't" Checklist

- [ ] **RLS:** Verified with `curl -H "apikey: ANON_KEY" "SUPABASE_URL/rest/v1/teachers?select=*"` returns empty `[]` (not all records)
- [ ] **RLS:** Verified Prisma operations still work (create a test bracket, cast a test vote)
- [ ] **RLS:** Verified Realtime Broadcast still delivers (activate a bracket, check student view updates)
- [ ] **RLS:** Verified Storage upload still works (upload a bracket/poll image)
- [ ] **Identity:** Verified case-insensitive matching ("Emma" and "emma" match)
- [ ] **Identity:** Verified duplicate name prompts differentiation (two "Jake"s in one session)
- [ ] **Identity:** Verified localStorage stores `firstName` field alongside existing fields
- [ ] **Poll fix:** Verified end-to-end: cast a student vote, teacher live dashboard updates within 2 seconds
- [ ] **Poll fix:** Verified batch flush does not overwrite fetch data on poll close
- [ ] **Terminology:** Grepped for ALL instances of old labels; no stragglers remain
- [ ] **Presentation:** Tested on a real projector or large display from 15+ feet

---

## Sources

- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- HIGH confidence
- [Supabase Realtime Troubleshooting](https://supabase.com/docs/guides/realtime/troubleshooting) -- HIGH confidence
- [Supabase Broadcast Docs](https://supabase.com/docs/guides/realtime/broadcast) -- HIGH confidence
- [PostgreSQL NULL Uniqueness](https://www.postgresql.org/docs/current/ddl-constraints.html) -- HIGH confidence (NULLs not equal for unique constraints)
- [Prisma + Supabase RLS Discussion](https://github.com/prisma/prisma/discussions/18642) -- MEDIUM confidence
- Source code analysis of SparkVotEDU -- HIGH confidence

---
*Pitfalls research for: SparkVotEDU v1.2 Classroom Hardening*
*Researched: 2026-02-21*
