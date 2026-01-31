---
phase: 04-voting-and-real-time
plan: 04
subsystem: student-voting-ui
tags: [voting-ui, simple-mode, advanced-mode, optimistic-ui, bracket-diagram, real-time, student-facing]
requires: ["04-01", "04-02", "04-03"]
provides:
  - "MatchupVoteCard component with optimistic single-tap voting"
  - "SimpleVotingView for younger students (one matchup at a time)"
  - "AdvancedVotingView with full bracket diagram and clickable matchups"
  - "Student bracket voting page with viewingMode routing"
  - "Participant votes API endpoint for vote state restoration"
affects:
  - "04-05 (teacher live dashboard will observe student votes)"
  - "04-06 (timer and celebration UI may extend voting components)"
tech-stack:
  added: []
  patterns:
    - "Client component page with localStorage identity + API data fetch"
    - "SVG overlay pattern for interactive bracket diagram (clickable regions over base SVG)"
    - "React.memo on vote card to prevent re-render storms in bracket updates"
key-files:
  created:
    - src/components/bracket/matchup-vote-card.tsx
    - src/components/student/simple-voting-view.tsx
    - src/components/student/advanced-voting-view.tsx
    - src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx
    - src/app/api/brackets/[bracketId]/votes/route.ts
  modified: []
key-decisions:
  - id: 04-04-01
    description: "Client component page reads localStorage for participantId (no server-side identity resolution)"
    rationale: "Session layout already establishes client-side identity pattern; avoids server/client boundary complexity"
  - id: 04-04-02
    description: "SVG overlay with duplicated layout constants for interactive bracket diagram"
    rationale: "Avoids modifying base BracketDiagram component, keeps read-only and interactive versions independent"
  - id: 04-04-03
    description: "New /api/brackets/[bracketId]/votes?pid= endpoint for vote state restoration"
    rationale: "Client component cannot call server-side DAL directly; reuses existing public API pattern"
duration: ~5m
completed: 2026-01-31
---

# Phase 4 Plan 4: Student Voting UI Summary

**One-liner:** Age-split voting UI with MatchupVoteCard (optimistic taps), SimpleVotingView (sequential one-at-a-time), AdvancedVotingView (full bracket + click-to-vote modal), and student bracket page routing by viewingMode.

## Performance

- Duration: ~5 minutes
- TypeScript: 0 errors
- Files created: 5
- Deviations: 1 (Rule 2 - added votes API endpoint)

## Accomplishments

1. **MatchupVoteCard** -- Reusable voting card with two large entrant buttons, VS divider, optimistic checkmark feedback via useVote hook, status badges (Open/Waiting/Decided), auto-dismissing error toast, React.memo for performance
2. **SimpleVotingView** -- One matchup at a time for younger students: sequential Previous/Next navigation, progress indicator ("Matchup 2 of 4"), waiting state with pulse animation, all-voted celebration state, auto-navigation when new matchups open
3. **AdvancedVotingView** -- Full bracket diagram with interactive SVG overlay: animated dashed border on votable matchups, click-to-open voting modal, checkmark badges on voted matchups, bracket completion message
4. **Student bracket voting page** -- Client component reads localStorage for participant identity, fetches bracket state + votes from API, routes to Simple or Advanced view based on viewingMode, handles all edge cases (not found, draft, completed)
5. **Votes API endpoint** -- GET /api/brackets/[bracketId]/votes?pid= returns participant's vote map for state restoration on page load

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | MatchupVoteCard, SimpleVotingView, AdvancedVotingView | 43268b5 | matchup-vote-card.tsx, simple-voting-view.tsx, advanced-voting-view.tsx |
| 2 | Student bracket voting page and votes API | 76e3619 | bracket/[bracketId]/page.tsx, votes/route.ts |

## Files Created

- `src/components/bracket/matchup-vote-card.tsx` -- Single matchup voting card with optimistic feedback
- `src/components/student/simple-voting-view.tsx` -- One-at-a-time sequential voting for young students
- `src/components/student/advanced-voting-view.tsx` -- Full bracket with clickable votable matchups
- `src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx` -- Student bracket voting page
- `src/app/api/brackets/[bracketId]/votes/route.ts` -- Participant votes API endpoint

## Files Modified

None -- all files are new.

## Decisions Made

1. **Client component page with localStorage identity** (04-04-01): The student bracket page is a client component that reads `sparkvotedu_session_${sessionId}` from localStorage to get participantId. This follows the established Phase 2 pattern where the session layout is also a client component for the same reason. No server-side identity resolution needed.

2. **SVG overlay for interactive bracket** (04-04-02): Rather than modifying the existing read-only BracketDiagram component, the AdvancedVotingView renders an invisible SVG overlay with the same layout constants. Votable matchups get animated dashed borders and transparent click targets. This keeps the base diagram clean and reusable.

3. **New votes API endpoint** (04-04-03): Created `/api/brackets/[bracketId]/votes?pid=` to fetch a participant's vote map. The client component page cannot call server-side DAL functions directly, so this follows the existing pattern of public API endpoints for student-facing data (like the bracket state API from 04-03).

## Deviations from Plan

### Auto-added Functionality

**1. [Rule 2 - Missing Critical] Added /api/brackets/[bracketId]/votes API endpoint**
- **Found during:** Task 2
- **Issue:** The plan specified fetching initial votes via `prisma.vote.findMany` in a server component, but the page is a client component (needs localStorage access). No API endpoint existed for fetching participant votes.
- **Fix:** Created `src/app/api/brackets/[bracketId]/votes/route.ts` as a public GET endpoint that returns the participant's vote map.
- **Files created:** `src/app/api/brackets/[bracketId]/votes/route.ts`
- **Commit:** 76e3619

## Issues Encountered

None.

## Next Phase Readiness

- All student voting UI components are in place
- Teacher live dashboard (04-05) can now be built to observe the same bracket state
- Timer and celebration UI (04-06) can extend MatchupVoteCard and voting views
- The votes API endpoint is available for any future component that needs vote state
