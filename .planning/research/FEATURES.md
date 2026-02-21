# Feature Research: v1.2 Classroom Hardening

**Domain:** Classroom voting platform -- identity, security, real-time updates, UX polish
**Researched:** 2026-02-21
**Confidence:** HIGH (codebase fully audited; patterns verified against Supabase official docs, WCAG standards, and classroom tool UX analysis)

---

## Context

This is a SUBSEQUENT MILESTONE research document. SparkVotEDU v1.1 shipped and is live at sparkvotedu.com. First classroom deployment with 24 students revealed six issues that need fixing. This document maps those issues into a feature landscape with complexity, dependencies, and implementation patterns.

**Key constraint:** All six features touch existing production code. This is a hardening/fix milestone, not a greenfield build. Schema changes must be additive (no destructive migrations on production data). All v1.1 sessions are already ended, so the identity transition is effectively a clean break.

---

## Table Stakes (Must Fix -- Product Broken Without These)

### 1. Name-Based Student Identity (Replaces Failed Device Fingerprinting)

| Aspect | Detail |
|--------|--------|
| **What** | Replace device fingerprinting (localStorage UUID + FingerprintJS) with session code + first name for student identity. Case-insensitive name matching via Prisma `mode: 'insensitive'`. Duplicate names prompt second student to differentiate (e.g., add last initial). Random fun names still assigned for Kahoot-style anonymity display. |
| **Why Critical** | Device fingerprinting FAILED in production. 24 students on identical Chromebooks produced only 6 unique fingerprints. localStorage UUIDs wiped by school IT policies. Students cannot reliably rejoin sessions or be distinguished from each other. This is a P0 -- the product literally cannot identify students. |
| **Complexity** | HIGH |
| **Touches** | Schema (StudentParticipant model), join flow (JoinForm, student actions), identity hooks (useDeviceIdentity -- to be deleted), DAL layer, student types |

**Implementation pattern:**
- Student enters 6-digit class code (unchanged)
- Student enters their first name (new step, replaces "Preparing device identity...")
- Server normalizes: Prisma `mode: 'insensitive'` handles case-insensitive matching
- Duplicate check: if same name exists in session, return `{ duplicate: true }` to client
- Client prompts: "Another Emma is already here. Please add your last initial."
- Random fun name still assigned from word lists (used for display in voting views)
- Identity key becomes `sessionId + firstName` instead of `sessionId + deviceId`

**Competitor patterns (Kahoot, Blooket):**

| Tool | Join Flow | Identity | Duplicate Handling |
|------|-----------|----------|-------------------|
| Kahoot | Enter PIN, then nickname | Nickname (optional: first name + last initial) | Appends random number |
| Blooket | Enter ID, then username | Username (random or student-entered) | Rejects, student must choose another |
| **SparkVotEDU v1.2** | Enter 6-digit code, then first name | First name (case-insensitive) + fun name for display | Prompts to differentiate (add last initial) |

### 2. Supabase RLS Security Hardening (All 12 Public Tables)

| Aspect | Detail |
|--------|--------|
| **What** | Enable Row Level Security on all 12 tables in the public schema using the deny-all pattern (RLS enabled with no policies). This blocks all PostgREST access via the anon key while Prisma (bypassrls) continues unaffected. |
| **Why Critical** | Security emergency. The Supabase anon key is embedded in client-side JavaScript. Without RLS, anyone who inspects the client code can use that key to read all teacher data, student data, votes, subscriptions, and billing information via `curl` or the Supabase JS client. |
| **Complexity** | LOW (12 ALTER TABLE statements, no policies to maintain) |
| **Touches** | SQL migration only. Zero application code changes. |

**Why deny-all instead of per-row policies:** SparkVotEDU uses Prisma for ALL data access. The Supabase client is only used for Auth, Realtime, and Storage -- never for data queries. Per-row policies (e.g., `USING (teacher_id = auth.uid())`) would add 24+ policy statements that provide no additional value because no legitimate code path uses `supabase.from()`. Deny-all is simpler, more secure, and zero-maintenance.

### 3. Poll Live Update Bug Fix

| Aspect | Detail |
|--------|--------|
| **What** | Teacher dashboard does not update in real-time when students submit poll choices. The bracket live dashboard works correctly using the identical architecture. |
| **Why Critical** | Real-time is the core value proposition. "See participation happen in real time" is in the product description. If the teacher projects poll results and they do not update, the product appears broken in front of a classroom. |
| **Complexity** | LOW |
| **Touches** | `src/actions/poll.ts` (add one broadcast call) |

**Root cause confirmed via code review:**

In `src/actions/poll.ts:235`, when a poll status changes to `active`:
- `broadcastActivityUpdate(sessionId)` is called (student activity list updates)
- `broadcastPollUpdate(pollId, 'poll_activated')` is NOT called (MISSING)

The `useRealtimePoll` hook listens for `poll_activated` to trigger `fetchPollState()`. This event is never sent. Vote-level broadcasts (`poll_vote_update`) are wired correctly via `broadcastPollVoteUpdate` in `castPollVote`.

**Fix:** Add `broadcastPollUpdate(pollId, 'poll_activated').catch(console.error)` in the `status === 'active'` branch.

---

## Differentiators (Polish That Improves Classroom Experience)

Features that are not broken but create friction.

### 4. Session Name Display and Editability

| Aspect | Detail |
|--------|--------|
| **What** | Session dropdowns show "Session 123456" (the code) instead of name. Teachers want "Period 3 History". Names should be editable from the session detail page. |
| **Why Valuable** | Teachers create multiple sessions per day. Remembering which code maps to which class is cognitive overhead. |
| **Complexity** | LOW |
| **Touches** | Session select dropdowns, session detail page (add inline edit), new server action + DAL |

**Current code:** `Session {s.code}` -- fix to `{s.name || `Session ${s.code}`}`

The `ClassSession.name` field already exists in the schema (nullable String). No migration needed.

### 5. Activate vs Go Live Terminology Unification

| Aspect | Detail |
|--------|--------|
| **What** | Inconsistent button labels: "Activate" on polls, "Go Live" on brackets, "Close Predictions & Go Live" on predictive brackets. |
| **Why Valuable** | Teachers confused about the relationship between actions. |
| **Complexity** | LOW |
| **Touches** | Button labels in ~6 component files. No logic changes. |

**Recommended unification:**

| Action | Current | Recommended |
|--------|---------|-------------|
| draft -> active | "Activate" | "Go Live" |
| View live dashboard | "Go Live" | "Live Dashboard" |
| Status badge for active | "Active" | "Live" |

**Database status value stays `'active'`** -- only display labels change.

### 6. Presentation Mode Readability (Ranked Poll Contrast Fix)

| Aspect | Detail |
|--------|--------|
| **What** | Ranked poll leaderboard medal cards use light backgrounds (amber-100, gray-100, orange-100) that are unreadable on projectors with washed-out output. |
| **Why Valuable** | Teachers project results on classroom screens. WCAG AA (4.5:1) is met on monitors but effective contrast drops below readable levels on projectors. |
| **Complexity** | LOW |
| **Touches** | `MEDAL_STYLES` in `ranked-leaderboard.tsx` (3 CSS class strings) |

**Fix:** Darken backgrounds to -200 variants (amber-200, gray-200, orange-200) and darken text to -900 variants. Achieves WCAG AAA (7:1+).

---

## Anti-Features (Do NOT Build for v1.2)

| Feature | Why It Might Seem Needed | Why It Is Wrong for v1.2 |
|---------|--------------------------|--------------------------|
| Full student accounts (email/password) | "Name-based identity is not secure enough" | Adds COPPA/FERPA compliance burden. Students forget passwords. First name is intentionally lightweight. |
| Per-row RLS policies | "If we are doing RLS, do it properly" | Prisma bypasses RLS. Per-row policies add complexity without value. Deny-all is more secure and simpler. |
| Custom WebSocket server | "Supabase Realtime is unreliable" | The infrastructure works (brackets prove it). The bug is a missing broadcast call, not a transport problem. |
| Dark mode theme for presentation | "Projectors need dark backgrounds" | The contrast fix solves readability. A full theme system is v1.3 scope. |
| Automatic name suggestions on duplicate | "Auto-suggest 'Sarah M'" | The system does not know the student's last initial. The student provides differentiation. |
| Fingerprint fallback mode | "Keep as a backup identity method" | Creates two code paths. Fingerprinting does not work on school hardware. Clean removal is better. |
| Per-table RLS for Realtime channels | "Secure the broadcast channels" | SparkVotEDU uses public broadcast channels. UUIDs in topic names are unguessable. Realtime Authorization is v1.3 scope. |

---

## Feature Dependencies

```
RLS enablement ---------> (independent, deploy first)
     |
     +-- Zero risk to Prisma (bypassrls)
     +-- Zero risk to Realtime (Broadcast, not postgres_changes)

Schema migration -------> Name-based identity code -------> Remove FingerprintJS
     |                    (join flow, DAL, hooks, UI)       (cleanup after verification)
     |
     +-- first_name column must exist before identity code ships

Poll broadcast fix -----> (independent, deploy anytime)
     |
     +-- One-line addition in actions/poll.ts

Session naming UI ------> (independent, ClassSession.name already exists)

Presentation contrast --> (independent, CSS only)

Terminology changes ----> (independent, copy only)
```

No circular dependencies. RLS and the poll fix can ship independently and immediately.

---

## Prioritization

| Order | Feature | Rationale |
|-------|---------|-----------|
| 1 | RLS enablement | Immediate security win. Zero risk. 12 lines of SQL. |
| 2 | Poll broadcast fix | One-line fix restores core value proposition. |
| 3 | Name-based student identity | Largest feature. Most complex. Highest classroom impact. |
| 4 | Session name display + edit | Quick UX win. Low risk. |
| 5 | Terminology clarification | Copy changes only. Can combine with #4. |
| 6 | Presentation contrast | CSS-only change. Can combine with #4 and #5. |

Features 4-6 can be a single "UX Polish" phase.

**Priority levels:**
- P0: Must fix before next classroom deployment (Features 1-3)
- P2: Polish that improves experience (Features 4-6)

---

## Sources

- **Supabase RLS documentation (HIGH):** [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- **Supabase Realtime Broadcast (HIGH):** [Broadcast | Supabase Docs](https://supabase.com/docs/guides/realtime/broadcast)
- **Supabase Realtime Troubleshooting (MEDIUM):** [Realtime Troubleshooting | Supabase Docs](https://supabase.com/docs/guides/realtime/troubleshooting)
- **Kahoot Player Identifier (MEDIUM):** [Kahoot Help Center](https://support.kahoot.com/hc/en-us/articles/360036178314-Player-identifier)
- **WCAG 2.2 Contrast (HIGH):** [W3C Understanding Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- **SparkVotEDU codebase (HIGH):** Direct code review of schema.prisma, student actions, realtime hooks, broadcast.ts, poll actions, join-form.tsx, ranked-leaderboard.tsx

---
*Feature research for: SparkVotEDU v1.2 Classroom Hardening*
*Researched: 2026-02-21*
