---
status: passed
phase: 31
name: Reopen Completed Activities
verified: "2026-03-01"
---

# Phase 31 Verification: Reopen Completed Activities

## Goal
Teachers can bring completed brackets and closed polls back for additional voting instead of recreating them from scratch.

## Must-Have Verification

### 1. Bracket Reopen (completed → paused)
**Status:** PASSED
- `reopenBracketDAL` in `src/lib/dal/bracket.ts` uses undo engine to clear final round, then transitions `completed → paused`
- Context menu "Reopen" item appears for completed brackets (verified via Playwright)
- Reopen button appears on bracket live dashboard when status is `completed`
- Playwright test: clicked Reopen on completed SE bracket → card status changed to "Paused"

### 2. Poll Reopen (closed → paused)
**Status:** PASSED
- `reopenPollDAL` in `src/lib/dal/poll.ts` transitions `closed → paused` with `allowVoteChange=false`
- Context menu "Reopen" item appears for closed polls (verified via Playwright)
- Poll live dashboard Reopen button calls `reopenPoll` action
- Playwright test: clicked Reopen on closed poll → card status changed to "Paused"

### 3. Student celebration screen clears on reopen
**Status:** PASSED (code review)
- `src/hooks/use-realtime-bracket.ts`: handles `bracket_reopened` event, resets `bracketCompleted` state
- `src/hooks/use-realtime-poll.ts`: handles `poll_reopened` event
- `src/components/student/simple-voting-view.tsx`: resets celebration/reveal state on reopen
- `src/components/student/advanced-voting-view.tsx`: resets celebration/reveal/hasShownRevealRef on reopen

## Additional Checks
- Broadcast events: `bracket_reopened` and `poll_reopened` added to `src/lib/realtime/broadcast.ts`
- Zod schemas: `reopenBracketSchema` and `reopenPollSchema` in `src/lib/utils/validation.ts`
- Server actions: `reopenBracket` and `reopenPoll` with auth + validation
- Paused status badge: orange styling in activities-list.tsx
- No console errors during Playwright testing

## Score: 3/3 must-haves verified
