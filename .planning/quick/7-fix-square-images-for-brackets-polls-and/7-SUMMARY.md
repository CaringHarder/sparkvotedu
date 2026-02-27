---
phase: quick-7
plan: 1
subsystem: ui
tags: [tailwind, bracket, images, simple-mode, responsive]

requires:
  - phase: quick-6
    provides: predictive bracket light mode visibility fixes
provides:
  - Square entrant images across all bracket components
  - Enlarged simple bracket cards with entrant images for younger students
  - Wider simple voting containers (max-w-2xl) for better screen utilization
affects: [bracket, simple-voting, matchup-cards]

tech-stack:
  added: []
  patterns: [rounded-lg for square images, flex-col card layout with images]

key-files:
  created: []
  modified:
    - src/components/bracket/predictive-bracket.tsx
    - src/components/bracket/matchup-vote-card.tsx
    - src/components/student/simple-voting-view.tsx
    - src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx

key-decisions:
  - "Use rounded-md for small predictive bracket logos, rounded-lg for large matchup card images"
  - "Images sized h-28/w-28 at mobile, h-36/w-36 at sm breakpoint for clear visibility"

patterns-established:
  - "Square images with rounded corners (rounded-md/rounded-lg) for entrant logos, never rounded-full"
  - "Simple mode containers use max-w-2xl (672px) for wider card presentation"

requirements-completed: [IMG-SQUARE, SIMPLE-ENLARGE]

duration: 2min
completed: 2026-02-26
---

# Quick Task 7: Fix Square Images and Enlarge Simple Bracket Cards Summary

**Square entrant images (rounded-md/rounded-lg) in predictive brackets, large entrant images in MatchupVoteCard, and wider simple voting containers (max-w-2xl) for younger students**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T03:33:54Z
- **Completed:** 2026-02-27T03:36:16Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Changed all 3 entrant logo images in predictive bracket from circles (rounded-full) to squares (rounded-md)
- Added large square entrant images (h-28/h-36) to MatchupVoteCard with conditional rendering on logoUrl
- Enlarged card text to 2xl/3xl, padding to p-6/px-6 py-6, and container to max-w-2xl for younger students
- Widened SimpleVotingView and RRSimpleVoting containers from max-w-md to max-w-2xl

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix round images to square in predictive bracket** - `6919fdb` (fix)
2. **Task 2: Enlarge simple bracket matchup cards and add entrant images** - `d2fd9e9` (feat)

## Files Created/Modified
- `src/components/bracket/predictive-bracket.tsx` - Changed rounded-full to rounded-md on 3 entrant logo img tags
- `src/components/bracket/matchup-vote-card.tsx` - Added entrant images, vertical layout, enlarged text/padding, wider max-width
- `src/components/student/simple-voting-view.tsx` - Widened container to max-w-2xl, increased heading text, removed inner max-w-md constraints
- `src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx` - Widened RRSimpleVoting from max-w-md to max-w-2xl, removed confirmation card max-w-md

## Decisions Made
- Used rounded-md for small (h-4/h-5) logos in predictive bracket cards vs rounded-lg for large (h-28/h-36) images in matchup vote cards -- different corner radii appropriate for different sizes
- Kept eslint-disable-next-line for img elements since project uses S3 URLs not optimized with next/image

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All bracket image shapes are now consistently square with rounded corners
- Simple mode provides significantly larger, more readable cards for younger students
- No blockers for future work

---
*Quick Task: 7-fix-square-images-for-brackets-polls-and*
*Completed: 2026-02-26*

## Self-Check: PASSED
- All 5 files verified present
- Both task commits (6919fdb, d2fd9e9) verified in git log
