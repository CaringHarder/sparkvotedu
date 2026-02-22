---
phase: 21-poll-realtime-bug-fix
verified: 2026-02-21T22:00:00Z
status: human_needed
score: 11/11 must-haves verified
re_verification:
  previous_status: human_needed
  previous_score: 9/9
  gaps_closed:
    - "participant-join broadcast wired: broadcastParticipantJoined exists in broadcast.ts and is called in both joinSession and joinSessionByName after new participant creation"
    - "useRealtimePoll subscribes to activities:{sessionId} for participant_joined events and calls fetchPollState to refresh participantCount denominator"
    - "poll-results.tsx call site updated to pass poll.sessionId to useRealtimePoll"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Activate a poll and observe teacher live dashboard"
    expected: "Dashboard updates vote counts within 2 seconds of a student submitting a vote, without manual page refresh"
    why_human: "Requires live WebSocket broadcast path through Supabase Realtime — cannot be verified by static code inspection"
  - test: "Activate a poll and verify the poll:{pollId} channel receives the broadcast"
    expected: "useRealtimePoll hook receives 'poll_activated' event and immediately calls fetchPollState, updating pollStatus and participantCount"
    why_human: "End-to-end WebSocket delivery through Supabase Realtime cannot be verified programmatically without a live environment"
  - test: "Open teacher live dashboard on one browser tab; open student join page on another; have a new student join the session while a poll is active"
    expected: "Teacher's 'X of Y voted' denominator (the Y) updates within seconds when the new student joins, before that student casts any vote"
    why_human: "Requires real-time network round-trip (joinSessionByName -> broadcastParticipantJoined -> Supabase -> participant_joined event -> useRealtimePoll re-fetch -> React render)"
  - test: "Close a poll while teacher dashboard is visible"
    expected: "Student activity grid also updates (closed status badge) without teacher manually refreshing; reveals poll winner animation"
    why_human: "Requires the broadcastActivityUpdate to reach the student-side useRealtimeActivities hook in a live environment"
---

# Phase 21: Poll Realtime Bug Fix Verification Report

**Phase Goal:** Teacher poll live dashboard reflects student votes in real-time without stale data
**Verified:** 2026-02-21
**Status:** human_needed (all automated checks passed; 4 items require live-environment testing)
**Re-verification:** Yes — after plan 03 gap closure (participant-join broadcast)

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Poll activation broadcasts to both `poll:{pollId}` channel AND `activities:{sessionId}` channel | VERIFIED | `src/actions/poll.ts` lines 238-243: `broadcastPollUpdate(pollId, 'poll_activated')` + `broadcastActivityUpdate(result.sessionId)` both called in the `status === 'active'` block |
| 2 | Poll close broadcasts to both `poll:{pollId}` channel AND `activities:{sessionId}` channel | VERIFIED | `src/actions/poll.ts` lines 245-250: `broadcastPollUpdate(pollId, 'poll_closed')` + `broadcastActivityUpdate(result.sessionId)` both called in the `status === 'closed'` block |
| 3 | Poll state API returns `participantCount` for the session | VERIFIED | `src/app/api/polls/[pollId]/state/route.ts` lines 36-42: queries `prisma.studentParticipant.count({ where: { sessionId, banned: false } })` and includes `participantCount` in the JSON response |
| 4 | `useRealtimePoll` hook exposes `participantCount` in its return value | VERIFIED | `src/hooks/use-realtime-poll.ts` line 161: return value includes `participantCount`; line 44 declares state; lines 62-64 update it on every `fetchPollState` call |
| 5 | Teacher live dashboard participation indicator updates dynamically (not frozen at page load) | VERIFIED | `src/components/poll/poll-results.tsx` lines 45-55: `participantCount` destructured from `useRealtimePoll(poll.id, poll.sessionId)`; `liveParticipantCount` uses SSR fallback pattern |
| 6 | Poll bar chart bars animate smoothly with spring physics when vote counts change | VERIFIED | `src/components/poll/bar-chart.tsx` lines 87-92: spring physics `stiffness: 200, damping: 15, mass: 0.8` unchanged |
| 7 | Vote count numbers use `tabular-nums` CSS for stable layout | VERIFIED | `src/components/poll/bar-chart.tsx` line 71: `tabular-nums transition-all duration-300` on vote count span; `src/components/poll/poll-results.tsx` line 134: `tabular-nums` on participation text |
| 8 | Leading poll option has subtle visual distinction (bold count + left accent border) | VERIFIED | `src/components/poll/bar-chart.tsx` lines 40-44: `leadingId` computed with zero-guard; lines 62-66: `border-l-2 border-primary pl-2` on leader; lines 71-74: `font-semibold text-foreground` on leader count |
| 9 | Prop chain is consistent: `page.tsx` -> `client.tsx` -> `poll-results.tsx` all use `initialParticipantCount` | VERIFIED | Grep confirms `initialParticipantCount` at `page.tsx:80`, `client.tsx:19,36,86`, `poll-results.tsx:25,41,55`; `connectedStudents` not found anywhere in the poll live dashboard files |
| 10 | When a new student joins via `joinSessionByName`, a `participant_joined` broadcast is emitted on `activities:{sessionId}` | VERIFIED | `src/actions/student.ts` line 299: `broadcastParticipantJoined(session.id).catch(() => {})` called immediately after `createParticipant` in the `existing.length === 0` branch of `joinSessionByName`; import at line 20 |
| 11 | `useRealtimePoll` subscribes to `activities:{sessionId}` for `participant_joined` events and calls `fetchPollState` on receive | VERIFIED | `src/hooks/use-realtime-poll.ts` lines 128-138: conditional `activitiesChannel` subscription block; event listener calls `fetchPollState()`; cleanup at line 154: `if (activitiesChannel) supabase.removeChannel(activitiesChannel)`; `sessionId` in dependency array at line 159 |

**Score:** 11/11 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/actions/poll.ts` | Dual-channel broadcast on poll activation and close | VERIFIED | Lines 238-257: all three lifecycle statuses (active, closed, archived) call both `broadcastPollUpdate` and `broadcastActivityUpdate` with correct guards |
| `src/app/api/polls/[pollId]/state/route.ts` | Dynamic participant count in poll state response | VERIFIED | Lines 36-42: `participantCount` queried from `prisma.studentParticipant.count`; line 77: included in `NextResponse.json` |
| `src/hooks/use-realtime-poll.ts` | `participantCount` state exposed to consumers; `sessionId` param accepted; `participant_joined` listener active | VERIFIED | Line 38: function signature `(pollId: string, sessionId?: string | null, batchIntervalMs = 2000)`; lines 128-138: activities channel subscription; line 161: `participantCount` in return value |
| `src/components/poll/poll-results.tsx` | Dynamic participation indicator using hook `participantCount`; passes `poll.sessionId` to hook | VERIFIED | Lines 45-46: `useRealtimePoll(poll.id, poll.sessionId)`; line 55: `liveParticipantCount` fallback; line 134: `tabular-nums` |
| `src/app/(dashboard)/polls/[pollId]/live/client.tsx` | Removes static `participantCount` prop dependency; uses `initialParticipantCount` | VERIFIED | Interface uses `initialParticipantCount`; no `connectedStudents` reference; passes `initialParticipantCount` to `PollResults` |
| `src/components/poll/bar-chart.tsx` | Leading option styling and `tabular-nums` count transition | VERIFIED | Lines 40-44: leader detection; lines 62-74: border and font-weight treatment; line 71: `tabular-nums` |
| `src/lib/realtime/broadcast.ts` | `broadcastParticipantJoined` function broadcasts `participant_joined` on `activities:{sessionId}` | VERIFIED | Lines 134-142: function defined; topic `activities:${sessionId}`; event `participant_joined`; empty payload `{}` |
| `src/actions/student.ts` | `broadcastParticipantJoined` called after new participant creation in both join flows | VERIFIED | Line 20: import; line 153: fire-and-forget call in `joinSession` Step 4; line 299: fire-and-forget call in `joinSessionByName` Step 4; returning-student paths (byDevice, byFingerprint, claimIdentity) correctly omitted |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/actions/poll.ts` | `src/lib/realtime/broadcast.ts` | `broadcastPollUpdate` and `broadcastActivityUpdate` calls | WIRED | Both functions imported at lines 28-29; called at lines 239, 241, 246, 248, 253, 255 |
| `src/hooks/use-realtime-poll.ts` | `src/app/api/polls/[pollId]/state/route.ts` | `fetchPollState` fetches `participantCount` | WIRED | `fetchPollState` fetches `/api/polls/${pollId}/state`; API response includes `participantCount`; hook sets state at lines 62-64 |
| `src/components/poll/poll-results.tsx` | `src/hooks/use-realtime-poll.ts` | `useRealtimePoll` returns `participantCount` | WIRED | Line 5: import; lines 45-46: `participantCount` destructured from `useRealtimePoll(poll.id, poll.sessionId)`; line 55: used in `liveParticipantCount` |
| `src/app/(dashboard)/polls/[pollId]/live/client.tsx` | `src/components/poll/poll-results.tsx` | `PollResults` receives `initialParticipantCount` from server | WIRED | Lines 82-89: `<PollResults ... initialParticipantCount={initialParticipantCount} />` |
| `src/app/(dashboard)/polls/[pollId]/live/page.tsx` | `src/app/(dashboard)/polls/[pollId]/live/client.tsx` | SSR `participantCount` passed as `initialParticipantCount` | WIRED | Line 80: `initialParticipantCount={participantCount}` where `participantCount` is from server DB query lines 41-49 |
| `src/actions/student.ts` | `src/lib/realtime/broadcast.ts` | `broadcastParticipantJoined` called after new participant creation | WIRED | Line 20: `import { broadcastParticipantJoined } from '@/lib/realtime/broadcast'`; line 153 (joinSession) and line 299 (joinSessionByName): fire-and-forget calls |
| `src/hooks/use-realtime-poll.ts` | `activities:{sessionId}` channel | subscribes to `participant_joined` event and calls `fetchPollState` | WIRED | Lines 131-137: channel subscription conditional on `sessionId`; `.on('broadcast', { event: 'participant_joined' }, () => { fetchPollState() })`; cleanup at line 154 |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FIX-01 | 21-02, 21-03 | Teacher dashboard participation indicator updates in real-time | SATISFIED | Dynamic `participantCount` from `useRealtimePoll` wired into `PollResults`; SSR fallback prevents flash; participant-join broadcast closes the stale-denominator gap |
| FIX-02 | 21-01 | Poll activation broadcasts to the `poll:{pollId}` channel | SATISFIED | `broadcastPollUpdate(pollId, 'poll_activated')` called unconditionally in the `status === 'active'` block; does not require `sessionId` guard |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None detected | — | — | — | — |

No TODOs, FIXMEs, placeholder returns, or empty handlers were found in any of the phase-modified files. TypeScript compiles clean (`npx tsc --noEmit` produced no output).

---

## Human Verification Required

All automated code checks pass. The following items require a live Supabase + browser environment to confirm end-to-end behavior.

### 1. Student vote propagates to teacher dashboard within 2 seconds

**Test:** Open teacher live dashboard at `/polls/{pollId}/live` on one browser tab. Open student vote page on a second tab. Cast a vote.
**Expected:** Teacher's "X of Y voted" participation bar and chart bars update within 2 seconds without manual refresh.
**Why human:** Requires the full realtime path: `castPollVote` server action -> `broadcastPollVoteUpdate` -> Supabase Realtime -> `poll_vote_update` event -> `useRealtimePoll` batch flush (2-second interval) -> React re-render. Static code inspection cannot confirm the Supabase channel subscription is live and delivering events.

### 2. Poll activation reaches the `poll:{pollId}` channel

**Test:** Activate a poll from the teacher dashboard while a client is subscribed to `useRealtimePoll`.
**Expected:** `useRealtimePoll` hook receives a `poll_activated` event on the `poll:{pollId}` channel and calls `fetchPollState` immediately, updating `pollStatus` and `participantCount` in the hook's state.
**Why human:** End-to-end delivery through Supabase Realtime cannot be verified without a live environment. Code correctness is confirmed (the broadcast call is present and wired to the correct channel), but network delivery requires human observation.

### 3. New student join updates teacher participation denominator in real-time

**Test:** Activate a poll. Open teacher live dashboard showing "0 of N voted". Open a second browser window and have a new student join the session by name.
**Expected:** The teacher's "X of Y voted" denominator (the Y) increments within a few seconds — before the new student casts any vote. This confirms the `participant_joined` broadcast path is working end-to-end.
**Why human:** Requires: `joinSessionByName` -> `broadcastParticipantJoined` -> Supabase Realtime `activities:{sessionId}` -> `useRealtimePoll` `participant_joined` listener -> `fetchPollState()` -> `participantCount` state update -> React re-render. Two-browser test in a live environment is required.

### 4. Dual-channel broadcast keeps student activity grid in sync

**Test:** Close a poll while a teacher dashboard and student activity grid are both open.
**Expected:** The student activity grid updates the poll status badge (closed state) within a few seconds without student manually refreshing. Teacher dashboard also shows the reveal animation.
**Why human:** Requires `broadcastActivityUpdate` (to `activities:{sessionId}`) to reach the `useRealtimeActivities` hook on the student side. Two-browser test needed.

---

## Re-verification Summary

Plan 03 closed the final UAT gap. All three must-have groups from plans 01, 02, and 03 are now verified in code:

- **Plan 01 (dual-channel broadcast + participantCount API):** Confirmed in previous verification. No regressions detected. `src/actions/poll.ts` and `src/app/api/polls/[pollId]/state/route.ts` unchanged.
- **Plan 02 (dynamic dashboard participation display):** Confirmed in previous verification. `src/components/poll/poll-results.tsx` call site updated to pass `poll.sessionId` in plan 03 (minor addition, no regression).
- **Plan 03 (participant-join broadcast):** All three new artifacts verified — `broadcastParticipantJoined` in `broadcast.ts`, both call sites in `student.ts`, and the activities channel subscription in `use-realtime-poll.ts`. Commits `104e7f6` and `5c0bf12` confirmed in git log and match expected file changes.

No gaps remain in automated verification. The 4 human verification items are behavioral/network concerns that are structurally enabled by the code but require a live Supabase environment and a real browser session to confirm.

---

_Verified: 2026-02-21_
_Verifier: Claude (gsd-verifier)_
