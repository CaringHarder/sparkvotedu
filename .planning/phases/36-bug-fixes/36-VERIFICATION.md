---
phase: 36-bug-fixes
verified: 2026-03-02T12:00:00Z
status: passed
score: 9/9 must-haves verified
gaps: []
human_verification:
  - test: "Verify 2-option poll renders as large side-by-side cards on a real device"
    expected: "Two large cards centered side-by-side on tablet/desktop, stacked vertically on mobile"
    why_human: "CSS layout behavior with sm: breakpoints cannot be confirmed programmatically"
  - test: "Verify fullscreen overlay stays open when teacher presses Esc"
    expected: "Overlay remains visible even after browser exits fullscreen; only pressing F or clicking Exit closes it"
    why_human: "Fullscreen API behavior and event ordering depends on browser implementation"
  - test: "Verify student sees live vote bars updating in real time when Show Live Results is ON"
    expected: "Vote count bars appear below the voting cards and update as classmates vote without page refresh"
    why_human: "Supabase realtime channel subscription requires a live environment to verify"
  - test: "Verify bracket SE/DE green dots appear correctly as students vote"
    expected: "Green dot appears on a student's indicator and they sort to bottom after casting a vote in any voting matchup"
    why_human: "Requires live SE/DE bracket session with actual student votes"
  - test: "Verify Start on draft poll navigates to live dashboard without reloading detail page"
    expected: "Click Start -> poll activates -> browser navigates directly to /polls/{id}/live"
    why_human: "Navigation behavior after server action requires browser interaction"
---

# Phase 36: Bug Fixes Verification Report

**Phase Goal:** Fix nine known bugs affecting poll duplication, poll layout, duplicate name flow, poll quick create parity, live results display, fullscreen mode, poll realtime updates, bracket vote indicators, and Go Live/Start flow
**Verified:** 2026-03-02T12:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|---------|
| 1  | Teacher duplicates a poll, removes options, saves -- only remaining options persist | VERIFIED | `updatePollOptionsDAL` in `src/lib/dal/poll.ts` (lines 177-187) uses `tx.pollOption.deleteMany({ where: { pollId, id: { notIn: optionIds } } })` inside a transaction, delete-first before position updates |
| 2  | Student viewing a poll with exactly 2 options sees them as side-by-side larger cards, centered on screen (stacking vertically on mobile) | VERIFIED | `simple-poll-vote.tsx` (lines 66, 114-119) has `const is2Options = poll.options.length === 2` and renders `flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6` when 2 options |
| 3  | When a student enters a name already taken, the duplicate name prompt says "Name taken. Add your last initial to join." with the original name kept in the input | VERIFIED | `name-disambiguation.tsx` (lines 187-189, 35) renders the exact message in `text-destructive` and initializes `newName` state from `firstName` prop; blocking same name resubmission client-side (lines 49-51) |
| 4  | Poll Quick Create includes an "Assign to session" dropdown matching the bracket Quick Create layout exactly | VERIFIED | `poll-form.tsx` (lines 272-290) renders the dropdown with `h2` "Assign to session (optional)" and `<option value="">No session (assign later)</option>` inside `{isQuickCreate && ...}` guard |
| 5  | When "Show Live Results" is toggled ON, students see vote counts and bars updating in real time | VERIFIED | `simple-poll-vote.tsx` (lines 225-265) renders result bars when `showLiveResults && voteCounts && total > 0`; student page (line 112) destructures `showLiveResults` from `useRealtimePoll` and passes it as prop (lines 396-398) |
| 6  | Fullscreen mode stays open until Esc or F is pressed -- no auto-close | VERIFIED | `presentation-mode.tsx` uses `onExitRef` pattern (lines 32-35), fullscreen mount effect has no `onExit` call (lines 38-49), only explicit keydown handlers (Esc/F on lines 54-78) or exit button call `onExitRef.current()` |
| 7  | Poll teacher live dashboard updates in real time as students vote (no manual refresh needed) | VERIFIED | `polls/[pollId]/live/client.tsx` (lines 99-107) owns single `useRealtimePoll(poll.id, sessionId)` subscription; `PollResults` receives data as props (`realtimeVoteCounts`, `realtimeTotalVotes` at lines 209-210) instead of calling its own hook |
| 8  | Bracket vote indicators update correctly when students vote -- green dot + sort to bottom | VERIFIED | `live-dashboard.tsx` (lines 808-819) unions voter IDs across all voting matchups (`votingMatchups = currentMatchups.filter(m => m.status === 'voting' && m.round === currentRound)`) when no `selectedMatchupId`; `hasActiveVotingContext` (line 824) also checks `currentMatchups.some((m) => m.status === 'voting')` |
| 9  | Go Live button hidden on draft bracket/poll detail pages until Start is clicked; clicking Start auto-navigates to live dashboard | VERIFIED | Poll: `poll-detail-view.tsx` (line 241) `{poll.status !== 'draft' && (...Go Live...)}` + `handleStatusChange` (lines 188-190) does `router.push(\`/polls/${poll.id}/live\`)` on `newStatus === 'active'`. Bracket: `bracket-detail.tsx` (line 201) `{bracket.status !== 'draft' && ...}` + `bracket-status.tsx` (lines 57-59) `router.push(\`/brackets/${bracketId}/live\`)` on `newStatus === 'active'` |

**Score:** 9/9 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/dal/poll.ts` | `deleteMany` with `notIn` in `updatePollOptionsDAL` | VERIFIED | Lines 180-187: `tx.pollOption.deleteMany({ where: { pollId, id: { notIn: optionIds } } })`, guarded with `optionIds.length > 0` |
| `src/app/(dashboard)/polls/new/page.tsx` | Server component fetching active sessions | VERIFIED | No `"use client"` directive; uses `getAuthenticatedTeacher` + `prisma.classSession.findMany` (lines 6-24) |
| `src/components/poll/poll-creation-page.tsx` | Client wrapper receiving `sessions` prop | VERIFIED | Lines 1, 20: `"use client"` wrapper with `sessions` prop, passes to `PollForm mode="quick"` (line 70) |
| `src/components/poll/poll-form.tsx` | Session dropdown in Quick Create mode | VERIFIED | Lines 41-42, 86, 272-290: `sessions` prop with default `[]`, dropdown renders in `isQuickCreate` guard with "No session (assign later)" default |
| `src/components/student/simple-poll-vote.tsx` | 2-option centered layout and live results | VERIFIED | Lines 66-74 (detection/computation), 114-119 (conditional flex layout), 129 (card width), 225-265 (live results section) |
| `src/components/student/name-disambiguation.tsx` | "Name taken" prompt, input pre-filled | VERIFIED | Lines 35 (`newName` init from `firstName`), 187-189 (message text), 49-51 (same-name block), 234-244 ("Returning student?" secondary path) |
| `src/components/poll/presentation-mode.tsx` | Stable overlay, only exits on Esc/F/button | VERIFIED | Lines 32-35 (`onExitRef` pattern), 38-49 (fullscreen-only effect, no `onExit` call), 52-83 (keydown handlers), 85-90 (exit button handler) |
| `src/app/(dashboard)/polls/[pollId]/live/client.tsx` | Single `useRealtimePoll` subscription, stable `onExitPresentation` | VERIFIED | Line 78 (`useCallback(() => setPresenting(false), [])`), lines 99-107 (single hook call), lines 209-210 (props passed to `PollResults`) |
| `src/components/teacher/live-dashboard.tsx` | SE/DE voter ID union across voting matchups | VERIFIED | Lines 807-819: conditional union when `selectedMatchupId` is null for SE/DE path; lines 823-825: `hasActiveVotingContext` checks voting matchups |
| `src/components/poll/poll-detail-view.tsx` | Go Live hidden for draft, Start navigates to live | VERIFIED | Line 241 `{poll.status !== 'draft' && ...}`, lines 188-190 `router.push(\`/polls/${poll.id}/live\`)` |
| `src/components/bracket/bracket-detail.tsx` | Go Live hidden for draft brackets | VERIFIED | Line 201: `{bracket.status !== 'draft' && !isPredictiveAuto && ...}` |
| `src/components/bracket/bracket-status.tsx` | Start navigates to live dashboard | VERIFIED | Lines 57-59: `else if (newStatus === 'active') { router.push(\`/brackets/${bracketId}/live\`) }` |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `poll-form.tsx` | `src/actions/poll.ts` | `createPoll` receives `sessionId` | VERIFIED | `poll-form.tsx` line 172: `...(selectedSessionId ? { sessionId: selectedSessionId } : {})` in `createPoll` call |
| `src/lib/dal/poll.ts` | `prisma.pollOption.deleteMany` | `notIn` sync pattern | VERIFIED | Lines 181-186: `deleteMany` with `id: { notIn: optionIds }` filter |
| `simple-poll-vote.tsx` | `voteCounts` prop | Shows bars when `showLiveResults === true` | VERIFIED | Lines 225, 231: `{showLiveResults && voteCounts && total > 0 && ...}` renders count + bar per option |
| `student poll page` | `simple-poll-vote.tsx` | Passes `voteCounts`, `totalVotes`, `showLiveResults` | VERIFIED | Lines 396-398: all three props passed from page's `useRealtimePoll` output |
| `presentation-mode.tsx` | `onExitRef` | Only exits on explicit Esc/F/button, not `fullscreenchange` | VERIFIED | No `fullscreenchange` listener; `onExitRef.current()` only called in keydown handler or `handleExitClick` |
| `polls/[pollId]/live/client.tsx` | `useRealtimePoll` | Single subscription lifted to parent | VERIFIED | Hook called once at line 107; `PollResults` does not call its own hook (confirmed: `poll-results.tsx` only imports props) |
| `live-dashboard.tsx` | `mergedVoterIds` | Union across voting matchups for SE/DE | VERIFIED | Lines 810-819: `votingMatchups` filter + `allVoterIds` Set union |
| `poll-detail-view.tsx` | `router.push` | Navigate to `/polls/{id}/live` on activation | VERIFIED | Line 189: `router.push(\`/polls/${poll.id}/live\`)` inside `newStatus === 'active'` guard |
| `bracket-status.tsx` | `router.push` | Navigate to `/brackets/{id}/live` on activation | VERIFIED | Line 58: `router.push(\`/brackets/${bracketId}/live\`)` inside `newStatus === 'active'` guard |

---

## Commit Verification

All 7 task commits verified in git history:

| Commit | Plan | Fix |
|--------|------|-----|
| `d790549` | 36-01 Task 1 | Ghost option deleteMany notIn sync |
| `04c8856` | 36-01 Task 2 | Session dropdown in Poll Quick Create |
| `bf637bb` | 36-02 Task 1 | 2-option centering and student live results |
| `1980604` | 36-03 + 36-05 Task 2 | Duplicate name prompt + Go Live/Start flow |
| `c79e80b` | 36-04 Task 1 | Fullscreen auto-close fix |
| `7c11de5` | 36-04 Task 2 | Lifted useRealtimePoll to single subscription |
| `dc0201a` | 36-05 Task 1 | SE/DE bracket voter ID aggregation |

---

## Anti-Patterns Found

No blocker anti-patterns found in phase 36 modified files. The files searched were:

- `src/lib/dal/poll.ts` — clean
- `src/actions/poll.ts` — clean (not fully read, but SUMMARY confirms no console.log)
- `src/components/poll/poll-form.tsx` — 3 matches are lint hints in comments, not stubs
- `src/components/poll/presentation-mode.tsx` — clean
- `src/app/(dashboard)/polls/[pollId]/live/client.tsx` — clean
- `src/components/student/simple-poll-vote.tsx` — clean
- `src/components/student/name-disambiguation.tsx` — 1 match is a comment, not a stub
- `src/components/teacher/live-dashboard.tsx` — clean
- `src/components/poll/poll-detail-view.tsx` — clean
- `src/components/bracket/bracket-detail.tsx` — clean
- `src/components/bracket/bracket-status.tsx` — clean

---

## Human Verification Required

### 1. 2-Option Poll Visual Layout

**Test:** Open a poll with exactly 2 options as a student on both mobile (narrow) and tablet/desktop viewports
**Expected:** On desktop/tablet: two large cards side-by-side, centered. On mobile: two cards stacked vertically. Cards taller than the default 3+ option grid cards (min-h-[120px] vs min-h-[80px])
**Why human:** CSS flex/responsive breakpoints with `sm:` variants cannot be confirmed programmatically

### 2. Fullscreen Overlay Persistence

**Test:** Open a poll live dashboard, press F to enter presentation mode, then press Esc
**Expected:** The fixed overlay closes; browser exits fullscreen. The overlay should NOT close on its own after a few seconds during normal use
**Why human:** Fullscreen API event ordering (browser's native Esc handling vs keydown listener) requires browser interaction to verify

### 3. Student Live Results Real-Time Update

**Test:** Enable "Show Live Results" on an active poll; have a student join and cast a vote
**Expected:** The student sees vote count bars appear and update in real time below the voting cards without refreshing the page
**Why human:** Supabase realtime channel subscription requires a live Supabase connection and actual concurrent users

### 4. SE/DE Bracket Green Dot Vote Indicators

**Test:** Start an active SE bracket session, have 2 students vote in the current round matchup
**Expected:** On teacher's live dashboard, each student's dot turns green and they sort to the bottom of the participation sidebar after voting (matching poll vote indicator behavior from Phase 35)
**Why human:** Requires live bracket session with real students voting; SE/DE matchup state transitions cannot be simulated statically

### 5. Start Button Navigation Flow (Bracket + Poll)

**Test:** On a draft poll detail page, click "Start". On a draft bracket detail page, click "Start"
**Expected:** For poll: "Go Live" button is not visible initially; after Start, browser navigates directly to `/polls/{id}/live`. For bracket: same -- "Go Live" hidden, Start navigates to `/brackets/{id}/live`
**Why human:** React `startTransition` + server action + `router.push` sequence requires real browser interaction to observe

---

## Summary

All 9 success criteria are verified in the codebase. Implementation evidence exists at the code level for every truth:

- **FIX-01 (ghost options):** `updatePollOptionsDAL` correctly deletes removed options via `deleteMany` with `notIn` filter, delete-first in transaction.
- **FIX-02 (2-option layout):** `SimplePollVote` detects `options.length === 2` and applies centered flex layout with larger card dimensions.
- **FIX-03 (duplicate name):** `NameDisambiguation` shows the exact required message, keeps original name in input, blocks same-name resubmission, and hides candidate list behind "Returning student?" link.
- **FIX-04 (Quick Create session dropdown):** `polls/new/page.tsx` is a server component fetching sessions; `PollForm` renders the dropdown with exact required label and default option text.
- **FIX-05 (student live results):** `SimplePollVote` renders real-time vote bars when `showLiveResults && voteCounts && total > 0`; student page passes all three realtime props.
- **FIX-06 (fullscreen auto-close):** `PresentationMode` uses `onExitRef` pattern, no `fullscreenchange`-to-exit connection, overlay is overlay-first independent of Fullscreen API.
- **FIX-07 (poll dashboard realtime):** Single `useRealtimePoll` subscription in `PollLiveClient`; `PollResults` receives data as props, confirmed by grep showing no own hook call in `poll-results.tsx`.
- **FIX-08 (bracket vote indicators):** SE/DE path in `currentVoterIds` useMemo unions voter IDs across all voting matchups when no specific matchup selected; `hasActiveVotingContext` also covers no-selection case.
- **FIX-09 (Go Live/Start flow):** Both poll and bracket detail pages gate "Go Live" on `status !== 'draft'`; both `handleStatusChange` handlers navigate to live dashboard when activating.

No gaps. Five items flagged for human verification due to browser/realtime behavior that cannot be confirmed programmatically.

---

_Verified: 2026-03-02T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
