---
phase: "05-polls"
plan: "08"
subsystem: "poll-session-assignment"
tags: [polls, session-assignment, ui, gap-closure]

dependency-graph:
  requires: ["05-02", "05-03"]
  provides: ["poll-session-assignment-ui", "nullable-assignPollToSession"]
  affects: ["UAT-tests-9-16"]

tech-stack:
  added: []
  patterns: ["nullable-session-schema", "optimistic-session-assignment", "bracket-detail-mirror"]

file-tracking:
  key-files:
    created: []
    modified:
      - src/actions/poll.ts
      - src/lib/dal/poll.ts
      - src/app/(dashboard)/polls/[pollId]/page.tsx
      - src/components/poll/poll-detail-view.tsx

decisions:
  - id: "05-08-01"
    decision: "Nullable sessionId in assignPollToSession schema matches bracket pattern exactly"
    context: "Enables both assign and unlink from same action"
  - id: "05-08-02"
    decision: "Session assignment UI placed inline (not sidebar) since polls have no diagram"
    context: "Brackets use sidebar layout with diagram; polls use full-width inline section"

metrics:
  duration: "~2.0m"
  completed: "2026-01-31"
---

# Phase 05 Plan 08: Poll Session Assignment UI Summary

**One-liner:** Nullable assignPollToSession schema + session dropdown UI on poll detail page, mirroring bracket-detail pattern

## What Was Done

### Task 1: Make assignPollToSession schema nullable and support unlinking
- Changed `assignPollToSessionSchema.sessionId` from `z.string().uuid()` to `z.string().uuid().nullable()`
- Updated DAL signature `assignPollToSessionDAL` to accept `string | null`
- Made session ownership check conditional: only runs when `sessionId` is not null (skip for unlink)
- Exact mirror of `assignBracketToSession` pattern in `src/actions/bracket.ts`

### Task 2: Session fetch + assignment UI on poll detail page
- **Server component** (`page.tsx`): Added `prisma.classSession.findMany` to fetch teacher's active sessions, serialized and passed as `sessions` prop
- **Client component** (`poll-detail-view.tsx`):
  - Added `SessionInfo` interface and `sessions` to props
  - Added `currentSessionId` and `sessionError` state
  - Added `handleSessionAssign` function with optimistic update and error revert
  - Added session assignment UI section with dropdown, Unlink button, and Linked indicator
  - Added `Link2` and `Unlink` icons from lucide-react
  - Imported `assignPollToSession` from actions

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| 05-08-01 | Nullable sessionId schema | Matches bracket pattern, single action for assign + unlink |
| 05-08-02 | Inline session section (not sidebar) | Polls lack diagram so no sidebar layout needed |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `npx tsc --noEmit`: Zero errors
- `assignPollToSession` imported in poll-detail-view.tsx: Confirmed
- `classSession.findMany` in poll detail page.tsx: Confirmed
- Nullable schema confirmed via grep

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 37b9204 | feat | make assignPollToSession schema nullable for unlink support |
| 1a3229b | feat | add session assignment UI to poll detail page |

## Next Phase Readiness

This plan unblocks UAT Tests 9-16 (student voting and live results). Teachers can now:
1. Assign a poll to an active session from the poll detail page
2. Unlink a poll from a session
3. Students in that session will see the poll in their activity grid

No blockers or concerns for downstream work.
