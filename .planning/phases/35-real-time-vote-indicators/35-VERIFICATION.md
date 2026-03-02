---
phase: 35-real-time-vote-indicators
verified: 2026-03-01T00:00:00Z
status: human_needed
score: 9/9 automated must-haves verified
re_verification: false
human_verification:
  - test: "SE Bracket: green dot appears within seconds of student voting"
    expected: "Green dot appears next to voted student's name within ~2 seconds. Not-voted students are at the top of the sidebar list."
    why_human: "Real-time WebSocket behavior cannot be verified statically; requires live two-browser test"
  - test: "Poll live dashboard shows ParticipationSidebar with live green dots"
    expected: "After student casts a poll vote, green dot appears within seconds on teacher's poll live page sidebar. Vote progress shows correct count."
    why_human: "Visual UI and live update timing require human observation"
  - test: "RR bracket: green dot only after student votes on ALL round matchups"
    expected: "Partial voting shows no dot. Dot appears only after all matchups in the round are voted."
    why_human: "Set intersection logic correctness under real data requires end-to-end test"
  - test: "Round advancement resets vote indicators"
    expected: "After teacher advances to next round, all green dots disappear and sidebar shows 0 of N voted."
    why_human: "State reset on structural events requires live bracket progression test"
  - test: "Predictive bracket: green dot after complete prediction submitted"
    expected: "Green dot appears when student submits a full prediction, not on partial entry."
    why_human: "Prediction submission flow and 'predictions' key tracking require end-to-end test"
---

# Phase 35: Real-Time Vote Indicators Verification Report

**Phase Goal:** Teachers see at a glance which students have voted on the current round or poll, with green dot indicators that update live as votes come in
**Verified:** 2026-03-01
**Status:** human_needed — all automated code checks PASS; live behavior requires human end-to-end testing
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | vote_update broadcast payloads include participantId | VERIFIED | `broadcast.ts:76` — `...(participantId ? { participantId } : {})` in broadcastVoteUpdate payload |
| 2 | poll_vote_update broadcast payloads include participantId | VERIFIED | `broadcast.ts:169` — same optional spread in broadcastPollVoteUpdate payload |
| 3 | Bracket state polling API returns voterIds per matchup | VERIFIED | `state/route.ts:51,67` — `Promise.all([getVoteCountsForMatchup, getVoterParticipantIds])` and `voterIds` in response |
| 4 | Poll state polling API returns voterIds array | VERIFIED | `polls/[pollId]/state/route.ts:49,83` — `getPollVoterParticipantIds` started early, included in JSON response |
| 5 | Green dot appears for bracket votes (realtime hook accumulates voterIds) | VERIFIED | `use-realtime-bracket.ts:61,203-207` — voterIds state + pendingVoterUpdates accumulation in vote_update handler |
| 6 | Not-voted students sort to top of sidebar | VERIFIED | `participation-sidebar.tsx:39` — `if (aVoted !== bVoted) return aVoted - bVoted` (not-voted = 0 sorts first) |
| 7 | Vote indicators reset on round advancement | VERIFIED | `use-realtime-bracket.ts:216` — comment confirms pendingVoterUpdates cleared; fetchBracketState overwrites voterIds on round_advanced/round_undone/bracket_reopened |
| 8 | Poll live dashboard shows ParticipationSidebar with realtime voterIds | VERIFIED | `client.tsx:10,98-102,330,333` — ParticipationSidebar imported and rendered with mergedVoterIds |
| 9 | mergedVoterIds unifies SSR initial data with realtime broadcast data | VERIFIED | `live-dashboard.tsx:505-513` (brackets) and `client.tsx:98-102` (polls) — Set-based union useMemo |

**Score:** 9/9 truths verified by static analysis

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/realtime/broadcast.ts` | broadcastVoteUpdate and broadcastPollVoteUpdate with participantId param | VERIFIED | Lines 71,76,164,169 — optional participantId param + conditional spread in both functions |
| `src/lib/dal/poll.ts` | getPollVoterParticipantIds function | VERIFIED | Line 445 — `export async function getPollVoterParticipantIds(pollId: string): Promise<string[]>` |
| `src/app/api/brackets/[bracketId]/state/route.ts` | voterIds per matchup in state response | VERIFIED | Lines 51,67 — parallel fetch + voterIds in matchup objects |
| `src/app/api/polls/[pollId]/state/route.ts` | voterIds in poll state response | VERIFIED | Lines 49,69,83 — parallel promise + voterIds in response JSON |
| `src/hooks/use-realtime-bracket.ts` | voterIds state accumulated from vote_update events | VERIFIED | Lines 61,189-207,280 — state declared, participantId extracted, accumulated, returned |
| `src/components/teacher/participation-sidebar.tsx` | Not-voted-first sort and always-visible green dots | VERIFIED | Lines 10,20,39,87 — hasActiveVotingContext prop, aVoted-bVoted comparator |
| `src/components/teacher/live-dashboard.tsx` | mergedVoterIds wired to sidebar for all bracket types | VERIFIED | Lines 217,505-513,795-811,814,1884 — full mergedVoterIds + hasActiveVotingContext wiring |
| `src/hooks/use-realtime-poll.ts` | voterIds state accumulated from poll_vote_update events | VERIFIED | Lines 21,48,77-78,189 — state, fetchPollState sync, returned in hook |
| `src/app/(dashboard)/polls/[pollId]/live/page.tsx` | SSR-loaded participants and initial voterIds | VERIFIED | Lines 3,43-67,101-102 — getPollVoterParticipantIds imported, parallel Promise.all, passed to client |
| `src/app/(dashboard)/polls/[pollId]/live/client.tsx` | ParticipationSidebar with realtime voterIds | VERIFIED | Lines 10,38,59,98-102,330,333 — full wiring |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/actions/vote.ts` | `src/lib/realtime/broadcast.ts` | broadcastVoteUpdate with participantId | VERIFIED | `vote.ts:73` — `broadcastVoteUpdate(matchup.bracketId, matchupId, voteCounts, totalVotes, participantId)` |
| `src/actions/poll.ts` | `src/lib/realtime/broadcast.ts` | broadcastPollVoteUpdate with participantId | VERIFIED | `poll.ts:485,498` — both simple and ranked paths pass participantId as 4th arg |
| `src/hooks/use-realtime-bracket.ts` | `src/components/teacher/live-dashboard.tsx` | voterIds return value from hook | VERIFIED | `live-dashboard.tsx:217` — `voterIds: realtimeVoterIds` destructured from hook |
| `src/components/teacher/live-dashboard.tsx` | `src/components/teacher/participation-sidebar.tsx` | voterIds prop | VERIFIED | `live-dashboard.tsx:1884` — `hasActiveVotingContext={hasActiveVotingContext}` plus currentVoterIds prop |
| `src/hooks/use-realtime-poll.ts` | `src/app/(dashboard)/polls/[pollId]/live/client.tsx` | voterIds return value from hook | VERIFIED | `client.tsx` — `const { voterIds: realtimeVoterIds } = useRealtimePoll(...)` pattern confirmed by mergedVoterIds useMemo referencing realtimeVoterIds |
| `src/app/(dashboard)/polls/[pollId]/live/client.tsx` | `src/components/teacher/participation-sidebar.tsx` | ParticipationSidebar component with voterIds prop | VERIFIED | `client.tsx:330,333` — ParticipationSidebar rendered with `voterIds={mergedVoterIds}` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| LIVE-01 | 35-02 | Green dot per student who voted on current round/poll | VERIFIED | voterIds wired to sidebar; green dot rendered per voterIds membership |
| LIVE-02 | 35-02, 35-03 | Dots update live without page refresh | VERIFIED (automated) | Realtime broadcast + pendingVoterUpdates flush interval pattern in place; live behavior needs human test |
| LIVE-03 | 35-02, 35-03 | Works across all activity types (SE, DE, RR, predictive, polls) | VERIFIED (automated) | Branch logic in live-dashboard.tsx:795-811 covers all bracket types; poll sidebar added in plan 03 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | No placeholder, TODO, or stub patterns detected in modified files |

### Human Verification Required

#### 1. SE Bracket Live Green Dot

**Test:** Open the app in two windows (teacher + student). Create an SE bracket, assign to a session, go live, open a matchup for voting. On the student window, cast a vote.
**Expected:** Within ~2 seconds, a green dot appears next to the voted student's name in the teacher's ParticipationSidebar. Not-voted students are above voted students in the list. Vote progress shows "1 of N voted".
**Why human:** WebSocket event timing and real DOM rendering cannot be verified statically.

#### 2. Poll Live Dashboard Sidebar

**Test:** Create a simple poll, assign to session, activate. Open the poll live page as teacher. On a student window, cast a poll vote.
**Expected:** ParticipationSidebar is visible on the poll live page. Green dot appears within seconds. Not-voted students are at the top. Vote progress is accurate.
**Why human:** Visual layout and live update require running application.

#### 3. RR Bracket: All-Matchup Green Dot Rule

**Test:** Create a Round Robin bracket, go live, open a round with multiple matchups. Have a student vote on some (but not all) matchups.
**Expected:** No green dot after partial voting. After voting on ALL matchups in the round, green dot appears.
**Why human:** Set intersection logic correctness under real DB data requires end-to-end test.

#### 4. Round Advancement Resets Dots

**Test:** On an active SE bracket with voted students (green dots visible), teacher advances to next round.
**Expected:** All green dots disappear immediately. Sidebar shows "0 of N voted" for the new round.
**Why human:** State reset on structural broadcast event (round_advanced) requires live test.

#### 5. Predictive Bracket Prediction Tracking

**Test:** Create a predictive bracket, go live, open predictions. Student submits a complete prediction.
**Expected:** Green dot appears for that student in the sidebar.
**Why human:** Prediction submission flow uses the special 'predictions' key in voterIds map; requires live bracket in predictive mode.

### Gaps Summary

No automated gaps found. All code artifacts exist, are substantive, and are correctly wired:

- Plan 01 data plumbing: participantId in broadcast payloads (both bracket and poll), voterIds in both state APIs, getPollVoterParticipantIds DAL function — all verified.
- Plan 02 bracket wiring: useRealtimeBracket accumulates voterIds, live-dashboard computes mergedVoterIds with all bracket-type branches (SE/DE, RR intersection, predictive 'predictions' key), sidebar sorts not-voted first with hasActiveVotingContext gating — all verified.
- Plan 03 poll wiring: useRealtimePoll returns voterIds, poll live page loads SSR participants and initialVoterIds, PollLiveClient renders ParticipationSidebar with merged voterIds — all verified.

The phase goal requires human end-to-end testing to confirm the live real-time behavior (green dots appearing within seconds, correct reset on round advancement, RR intersection logic under real data).

---

_Verified: 2026-03-01_
_Verifier: Claude (gsd-verifier)_
