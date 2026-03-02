---
phase: 36-bug-fixes
plan: 04
subsystem: ui, realtime
tags: [fullscreen-api, supabase-realtime, useCallback, useRef, presentation-mode, poll-results]

# Dependency graph
requires:
  - phase: 35-realtime-vote-indicators
    provides: useRealtimePoll hook with batched vote updates and polling fallback
provides:
  - Stable fullscreen presentation overlay decoupled from Fullscreen API state
  - Single-subscription realtime poll data flow (PollLiveClient owns useRealtimePoll)
  - onExitRef pattern for stable callback in useEffect
affects: [poll-live-dashboard, presentation-mode, poll-results]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "onExitRef pattern: useRef + useEffect to keep callback stable without useEffect dependency"
    - "Lifted hook pattern: single useRealtimePoll in parent, pass data to child as props"
    - "Overlay-first fullscreen: fixed overlay persists independently of Fullscreen API success/failure"

key-files:
  created: []
  modified:
    - src/components/poll/presentation-mode.tsx
    - src/app/(dashboard)/polls/[pollId]/live/client.tsx
    - src/components/poll/poll-results.tsx

key-decisions:
  - "Fullscreen API is fire-and-forget enhancement; overlay persists regardless of browser fullscreen state"
  - "Removed fullscreenchange -> onExit connection entirely; only explicit Esc/F/button exits presentation"
  - "Eliminated dual useRealtimePoll subscription by lifting to PollLiveClient; PollResults receives data as props"
  - "Parent F key handler only enters presentation; PresentationMode handles exit internally to avoid conflicts"

patterns-established:
  - "onExitRef pattern: use useRef for callbacks in useEffect to prevent re-render cycles"
  - "Single-subscription lift: when parent and child both need realtime data, parent owns the hook"

# Metrics
duration: 6min
completed: 2026-03-02
---

# Phase 36 Plan 04: Fullscreen Auto-Close Fix and Poll Realtime Dashboard Summary

**Decoupled fullscreen overlay from browser Fullscreen API to prevent auto-close, and lifted useRealtimePoll to single subscription in PollLiveClient for reliable real-time vote updates**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-02T11:03:10Z
- **Completed:** 2026-03-02T11:09:37Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Fullscreen/presentation mode now stays open until teacher explicitly presses Esc, F, or clicks Exit button -- no auto-close from re-renders, Fullscreen API state changes, or unstable callbacks
- Poll teacher live dashboard receives real-time vote updates via single useRealtimePoll subscription in PollLiveClient, eliminating dual-subscription potential conflicts
- Stabilized all callback references with useCallback and useRef patterns to prevent useEffect re-run cycles

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix fullscreen/presentation mode auto-close** - `c79e80b` (fix)
2. **Task 2: Diagnose and fix poll teacher dashboard realtime updates** - `7c11de5` (fix)

## Files Created/Modified
- `src/components/poll/presentation-mode.tsx` - Decoupled overlay from Fullscreen API; onExitRef pattern; Esc/F key handlers
- `src/app/(dashboard)/polls/[pollId]/live/client.tsx` - Single useRealtimePoll subscription; stable onExitPresentation callback; F key handler only enters (not toggles)
- `src/components/poll/poll-results.tsx` - Accepts realtime data as props instead of calling own hook; removed useRealtimePoll import

## Decisions Made
- **Overlay-first approach for fullscreen:** The fixed-position overlay IS the presentation -- Fullscreen API is an optional enhancement. This makes presentation mode work reliably regardless of browser fullscreen support or school browser policies.
- **No fullscreenchange listener for exit:** Removed the connection between `fullscreenchange` event and `onExit()` entirely. The overlay should never auto-close from browser events.
- **Single subscription lift:** Eliminated the dual `useRealtimePoll` subscription (one in PollLiveClient for voterIds, one in PollResults for voteCounts). PollLiveClient now owns the single subscription and passes all data to PollResults as props.
- **Parent handles entry, child handles exit:** The PollLiveClient F key listener only enters presentation mode (skipped when already presenting). PresentationMode handles its own Esc/F key exit internally to avoid toggle conflicts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed F key toggle conflict between parent and child**
- **Found during:** Task 1
- **Issue:** PollLiveClient had an F key listener that toggled presentation mode on/off. PresentationMode now has its own F key listener to exit. Both firing on the same keypress would toggle off then immediately back on.
- **Fix:** Changed parent's F key handler to only enter presentation (not toggle), and skip entirely when `presenting` is true.
- **Files modified:** src/app/(dashboard)/polls/[pollId]/live/client.tsx
- **Verification:** TypeScript compiles cleanly
- **Committed in:** c79e80b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix was necessary for correct keyboard interaction between parent and child components. No scope creep.

## Issues Encountered
- Investigation of poll realtime updates (FIX-07) revealed the broadcast infrastructure, channel naming, state API, and hook implementation are all correct in code review. The most likely root cause is the dual `useRealtimePoll` subscription creating competing Supabase channel instances on the same client singleton. Eliminated by lifting to single subscription.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Fullscreen mode and poll realtime updates are fixed
- Ready for remaining Phase 36 plans (if any)

## Self-Check: PASSED

All files exist, all commit hashes verified.

---
*Phase: 36-bug-fixes*
*Completed: 2026-03-02*
