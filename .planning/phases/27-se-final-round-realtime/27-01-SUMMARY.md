---
phase: 27-se-final-round-realtime
plan: 01
subsystem: realtime
tags: [supabase, next.js, caching, fetch, useRef, realtime, brackets]

# Dependency graph
requires:
  - phase: 04-voting-and-realtime
    provides: "useRealtimeBracket hook and bracket state API route"
  - phase: 07-advanced-brackets
    provides: "SE, predictive, and DE bracket types"
provides:
  - "Cache-busted fetchBracketState with no-store + timestamp"
  - "Stale response sequence guard via useRef counter"
  - "Force-dynamic API route preventing Next.js GET caching"
affects: [28-rr-all-at-once-completion]

# Tech tracking
tech-stack:
  added: []
  patterns: ["cache-busting fetch with timestamp + no-store", "useRef sequence counter for stale response guard", "force-dynamic export on Next.js API routes"]

key-files:
  created: []
  modified:
    - "src/hooks/use-realtime-bracket.ts"
    - "src/app/api/brackets/[bracketId]/state/route.ts"

key-decisions:
  - "Belt-and-suspenders cache busting: both timestamp query param and cache no-store header"
  - "useRef sequence counter pattern to guard against out-of-order fetch responses"
  - "force-dynamic on API route to prevent Next.js framework-level GET caching"

patterns-established:
  - "Cache-bust pattern: timestamp query param + cache no-store for realtime-critical fetches"
  - "Stale response guard: useRef sequence counter to discard out-of-order async responses"

requirements-completed: [FIX-02]

# Metrics
duration: ~15min
completed: 2026-02-26
---

# Phase 27 Plan 01: SE Final Round Realtime Fix Summary

**Cache-busted bracket state fetch with stale response sequence guard and force-dynamic API route to fix final round vote count display**

## Performance

- **Duration:** ~15 min (code fix + manual verification across 3 bracket types)
- **Started:** 2026-02-26T14:20:00Z
- **Completed:** 2026-02-26T14:42:00Z
- **Tasks:** 2 (1 auto, 1 human-verify checkpoint)
- **Files modified:** 2

## Accomplishments
- Fixed SE bracket final round vote counts not updating in realtime on teacher live dashboard
- Added cache-busting fetch (timestamp + no-store) to prevent stale bracket state responses
- Added useRef sequence counter to guard against out-of-order fetch responses from rapid events
- Marked API route as force-dynamic to prevent Next.js GET response caching
- Verified fix works across all three bracket types: SE, predictive, and double elimination
- Confirmed no regression on earlier rounds (1, 2)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix fetchBracketState caching and stale response race condition** - `d83b422` (fix)
2. **Task 2: Verify realtime vote counts on SE final round, predictive, and DE brackets** - checkpoint:human-verify (approved, no code changes)

## Files Created/Modified
- `src/hooks/use-realtime-bracket.ts` - Added cache-busting fetch with timestamp + no-store, added fetchSeqRef sequence guard to discard stale responses
- `src/app/api/brackets/[bracketId]/state/route.ts` - Added `export const dynamic = 'force-dynamic'` to prevent Next.js GET caching

## Decisions Made
- Belt-and-suspenders cache busting: both timestamp query param (prevents fetch deduplication) and cache: 'no-store' header (prevents browser/Next.js caching) -- either alone might be insufficient in edge cases
- useRef sequence counter pattern chosen over AbortController because we want to let all fetches complete but only apply the latest result
- force-dynamic on the API route as server-side insurance even though client-side cache busting should suffice

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - the three targeted fixes (cache-bust, sequence guard, force-dynamic) resolved the issue on first implementation. All three bracket types passed manual verification.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 27 complete, ready for Phase 28 (RR all-at-once completion fix)
- The cache-busting and sequence guard patterns established here may inform similar fixes in Phase 28 if the RR completion issue involves stale state
- No blockers for Phase 28

## Self-Check: PASSED

- FOUND: src/hooks/use-realtime-bracket.ts
- FOUND: src/app/api/brackets/[bracketId]/state/route.ts
- FOUND: d83b422 (Task 1 commit)
- FOUND: 27-01-SUMMARY.md

---
*Phase: 27-se-final-round-realtime*
*Completed: 2026-02-26*
