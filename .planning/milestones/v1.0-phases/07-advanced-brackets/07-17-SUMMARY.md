# Phase 7 Plan 17: DE Student Voting + Real-Time Subscription Summary

**One-liner:** DE bracket voting via onEntrantClick/votedEntrantIds prop threading through DoubleElimDiagram + GrandFinalsCard, with useRealtimeBracket subscription for all non-SE bracket types on student page.

## What Was Done

### Task 1: Add voting props to DoubleElimDiagram and GrandFinalsCard
- Added optional `onEntrantClick` and `votedEntrantIds` props to `DoubleElimDiagramProps` interface
- Threaded both props to all 4 `BracketDiagram` instances (2 winners tab, 2 losers tab -- zoom-wrapped and non-zoom-wrapped)
- Refactored `GrandFinalsCard` to accept voting props with full interactive UI:
  - Clickable entrant divs when `status === 'voting'` and `onEntrantClick` provided
  - Voted highlight (border-primary, bg-primary/10) with check mark
  - Hover states (cursor-pointer, hover:border-primary/50) for clickable entrants
  - Accessible role="button" and tabIndex for keyboard navigation
  - "Tap to vote" text when clickable, "Voting in progress" when read-only
- All existing call sites compile unchanged (props are optional)

### Task 2: Wire DE voting and real-time subscription on student bracket page
- Created `DEVotingView` wrapper component with:
  - `useRealtimeBracket(bracket.id)` for live matchup updates
  - `castVote` integration with optimistic updates and error revert
  - Voting status indicators ("Tap to vote" badge, voted count, polling indicator)
  - Full prop threading to `DoubleElimDiagram` (onEntrantClick + votedEntrantIds)
- Created `RRLiveView` wrapper component with:
  - `useRealtimeBracket(bracket.id)` for real-time matchup updates
  - Student voting via `castVote` with optimistic updates
  - Props forwarded to `RoundRobinMatchups` (onStudentVote + votedMatchups)
- Created `PredictiveLiveView` wrapper component with:
  - `useRealtimeBracket(bracket.id)` for real-time bracket state
  - Merged real-time matchups into bracket object for `AdvancedVotingView`
- Replaced static DE/RR/predictive 'ready' state rendering with interactive wrapper components
- All hooks called unconditionally inside dedicated wrapper components (no conditional hook violations)

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Wrapper components for hook isolation | Hooks must be called unconditionally; separate components per bracket type avoid conditional hook violations |
| Optimistic vote updates with revert | Follows AdvancedVotingView pattern for responsive UX; reverts setVotes on castVote error |
| Unicode check mark in GrandFinalsCard | Matches BracketDiagram SVG pattern for voted entrant indicator |
| RR voting wired pre-emptively | RoundRobinMatchups already has onStudentVote/votedMatchups props; wiring completes the circuit |

## Deviations from Plan

None -- plan executed exactly as written.

## Key Files

### Created
_(none)_

### Modified
- `src/components/bracket/double-elim-diagram.tsx` -- Added onEntrantClick/votedEntrantIds props, interactive GrandFinalsCard
- `src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx` -- Added DEVotingView, RRLiveView, PredictiveLiveView wrapper components

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | ec452a1 | feat(07-17): add voting props to DoubleElimDiagram and GrandFinalsCard |
| 2 | c30f322 | feat(07-17): wire DE voting and real-time subscription on student bracket page |

## Verification

- [x] `npx tsc --noEmit` passes with no errors
- [x] DoubleElimDiagram renders identically when called without new props (backwards compatible)
- [x] Student page DE path renders DoubleElimDiagram with onEntrantClick and votedEntrantIds
- [x] useRealtimeBracket is imported and called for DE, RR, and predictive bracket types on student page
- [x] GrandFinalsCard shows clickable entrants when status is 'voting' and onEntrantClick is provided
- [x] onEntrantClick threaded to 5 locations in DoubleElimDiagram (4 BracketDiagram + 1 GrandFinalsCard)

## Duration

~3.1 minutes
