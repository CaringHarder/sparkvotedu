---
phase: quick-13
plan: 01
subsystem: ui
tags: [metadata-bar, bracket-detail, poll-detail, live-dashboard, shared-component, tailwind]

# Dependency graph
requires:
  - phase: quick-10
    provides: Badge styling patterns for bracket/poll cards (viewing mode, pacing, prediction mode, session)
provides:
  - Shared BracketMetadataBar and PollMetadataBar components
  - Metadata badges on bracket detail, bracket live, poll detail, and poll live pages
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared metadata bar component pattern: extract repeated badge rendering into reusable component"
    - "Session name lookup pattern: check active sessions first, fallback to direct query for ended sessions"

key-files:
  created:
    - src/components/shared/activity-metadata-bar.tsx
  modified:
    - src/components/bracket/bracket-detail.tsx
    - src/components/teacher/live-dashboard.tsx
    - src/components/poll/poll-detail-view.tsx
    - src/app/(dashboard)/polls/[pollId]/live/client.tsx
    - src/app/(dashboard)/brackets/[bracketId]/page.tsx
    - src/app/(dashboard)/brackets/[bracketId]/live/page.tsx
    - src/app/(dashboard)/polls/[pollId]/page.tsx
    - src/app/(dashboard)/polls/[pollId]/live/page.tsx

key-decisions:
  - "Metadata bar placed below header row as a separate visual line for clean separation"
  - "Live dashboard uses space-y-2 layout with metadata bar as second row inside the top bar card"
  - "Poll detail header simplified to just title + status; poll type and options moved to metadata bar"

patterns-established:
  - "Shared metadata bar pattern: BracketMetadataBar and PollMetadataBar accept serialized props and render consistent badges"

requirements-completed: [QUICK-13]

# Metrics
duration: 4min
completed: 2026-02-27
---

# Quick Task 13: Show Bracket/Poll Card Metadata Near Top Summary

**Shared BracketMetadataBar and PollMetadataBar components display bracket type, viewing mode, pacing, prediction mode, entrant/option count, session name, and created date on all detail and live pages**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-27T05:22:54Z
- **Completed:** 2026-02-27T05:27:33Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Created shared activity-metadata-bar.tsx with BracketMetadataBar and PollMetadataBar components
- Bracket detail and bracket live pages display bracket type, viewing mode, pacing (round robin), prediction mode (predictive), sport gender (sports), entrant count, session name, and created date
- Poll detail and poll live pages display poll type, option count, session name, and created date
- All badge styles exactly match the listing card badges from quick task 10
- Server pages look up session name from active sessions list or fall back to a direct query for ended sessions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared metadata bar component and wire session name into server pages** - `2fa0854` (feat)
2. **Task 2: Add metadata bars to bracket detail, bracket live, poll detail, and poll live pages** - `84f5d8e` (feat)

## Files Created/Modified
- `src/components/shared/activity-metadata-bar.tsx` - New shared component with BracketMetadataBar and PollMetadataBar
- `src/components/bracket/bracket-detail.tsx` - Added BracketMetadataBar below header, removed redundant inline entrant count
- `src/components/teacher/live-dashboard.tsx` - Added BracketMetadataBar as second row in top bar card
- `src/components/poll/poll-detail-view.tsx` - Added PollMetadataBar below header, moved poll type/options from header to bar
- `src/app/(dashboard)/polls/[pollId]/live/client.tsx` - Added PollMetadataBar below header
- `src/app/(dashboard)/brackets/[bracketId]/page.tsx` - Look up and pass sessionName prop to BracketDetail
- `src/app/(dashboard)/brackets/[bracketId]/live/page.tsx` - Expanded session query to include name, pass sessionName to LiveDashboard
- `src/app/(dashboard)/polls/[pollId]/page.tsx` - Look up and pass sessionName prop to PollDetailView
- `src/app/(dashboard)/polls/[pollId]/live/page.tsx` - Expanded session query to include name, pass sessionName to PollLiveClient

## Decisions Made
- Metadata bar is a separate visual row below the header for clean separation from title/status/actions
- Live dashboard wraps the top bar in a space-y-2 container to add the metadata bar as a second row
- Poll detail header simplified: removed inline poll type icon and options count (now in metadata bar) to match the bracket detail pattern
- Session name lookup uses a two-step approach: check active sessions first, then query directly for ended sessions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All bracket/poll detail and live pages now show metadata badges matching the listing card styles
- Teachers see at-a-glance context about bracket/poll type, mode, session, and creation date on every page

---
*Quick Task: 13-show-bracket-poll-card-metadata-near-top*
*Completed: 2026-02-27*
