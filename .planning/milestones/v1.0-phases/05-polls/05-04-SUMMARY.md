---
phase: 05-polls
plan: 04
subsystem: student-poll-voting-ui
tags: [student-voting, simple-poll, ranked-poll, tap-to-rank, poll-hook, client-component]
requires:
  - 05-01 (PollWithOptions type, PollOptionData type)
  - 05-02 (castPollVote server action, /api/polls/[pollId]/state endpoint)
  - 04-04 (localStorage participantId pattern, student bracket page pattern)
  - 02-04 (localStorage key pattern sparkvotedu_session_{sessionId})
provides:
  - SimplePollVote component with tappable card grid and selection feedback
  - RankedPollVote component with tap-to-rank, numbered badges, undo, reset
  - Student poll voting page at /session/[sessionId]/poll/[pollId]
  - usePollVote hook for simple and ranked poll vote state management
affects:
  - 05-05 (Live results dashboard may embed poll voting components)
  - 05-06 (Poll results view may show post-submission state from these components)
tech-stack:
  added: []
  patterns:
    - "usePollVote hook handles both simple (selectedOptionId) and ranked (rankings array) state"
    - "Tap-to-rank: sequential taps assign ascending rank numbers with colored badges"
    - "localStorage participantId read in useEffect to avoid SSR hydration mismatch"
    - "Vote restoration from existingVotes prop initializes hook state on return"
key-files:
  created:
    - src/hooks/use-poll-vote.ts
    - src/components/student/simple-poll-vote.tsx
    - src/components/student/ranked-poll-vote.tsx
    - src/app/(student)/session/[sessionId]/poll/[pollId]/page.tsx
  modified: []
key-decisions:
  - "Single usePollVote hook serves both simple and ranked polls with pollType parameter"
  - "Rank badges use gold/silver/bronze color scheme (amber-400, gray-300, amber-600) for top 3"
  - "Submit button text changes dynamically: 'Rank N more' -> 'Submit Rankings' when complete"
  - "Vote change flow: submitted=true blocks input, enableChangeVote resets submitted to allow edits"
  - "Student poll page fetches from /api/polls/[pollId]/state, same public endpoint pattern as brackets"
duration: ~2.7m
completed: 2026-01-31
---

# Phase 5 Plan 4: Student Poll Voting UI Summary

**Simple and ranked poll voting components with tap-to-rank interaction, usePollVote hook for optimistic submission, and student poll page routing by poll type with localStorage identity.**

## Performance

- **Duration:** ~2.7 minutes
- **Start:** 2026-01-31T22:25:17Z
- **End:** 2026-01-31T22:27:59Z
- **Tasks:** 2/2 completed
- **Type checks:** Zero new errors introduced (pre-existing error in parallel 05-03 file)

## Accomplishments

1. **usePollVote Hook (src/hooks/use-poll-vote.ts, 176 lines)** -- Unified poll vote state management:
   - Simple mode: selectedOptionId state, selectOption callback
   - Ranked mode: rankings array, addRanking (tap-to-rank), undoLastRanking, resetRankings
   - Submission: submitting/submitted/error state, submitVote calls castPollVote server action
   - Vote restoration: existingVotes prop initializes state for returning students
   - Vote change: canChangeVote derived from allowVoteChange, enableChangeVote resets submission

2. **SimplePollVote Component (src/components/student/simple-poll-vote.tsx, 174 lines)** -- Tappable card grid:
   - Poll question heading with optional description
   - Responsive 2-column (mobile) / 3-column (desktop) grid of option cards
   - Selection feedback: primary color fill, ring highlight, check icon badge
   - Image thumbnail support when option has imageUrl
   - Submit button disabled until selection made, "Vote submitted!" success state
   - Change Vote button when allowVoteChange is true
   - Min-height 80px cards for big touch targets

3. **RankedPollVote Component (src/components/student/ranked-poll-vote.tsx, 229 lines)** -- Tap-to-rank:
   - Tap an unranked option to assign next rank number (1, 2, 3...)
   - Rank badges: gold (#1), silver (#2), bronze (#3), muted (4+)
   - "Ranked X of Y" counter with instructional text
   - Undo Last: removes most recent ranking
   - Reset All: clears all rankings
   - Submit enabled only when rankings.length === maxRankings (rankingDepth or all options)
   - Dynamic button text: "Rank N more" when incomplete, "Submit Rankings" when ready
   - 1-column layout on mobile, 2-column on tablet+ for readability

4. **Student Poll Page (src/app/(student)/session/[sessionId]/poll/[pollId]/page.tsx, 291 lines)** -- Page routing:
   - Reads participantId from localStorage (sparkvotedu_session_{sessionId})
   - Fetches poll data from GET /api/polls/[pollId]/state
   - Routes to SimplePollVote or RankedPollVote based on pollType
   - Edge case states: loading spinner, no-identity, not-found, draft, closed, archived
   - Back link to session page (/session/{sessionId})
   - toPollWithOptions converter maps API response to PollWithOptions type

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Simple poll voting + hook | db52463 | src/hooks/use-poll-vote.ts, src/components/student/simple-poll-vote.tsx |
| 2 | Ranked poll voting + page | fcc80cf | src/components/student/ranked-poll-vote.tsx, src/app/(student)/session/[sessionId]/poll/[pollId]/page.tsx |

## Files Created

- `src/hooks/use-poll-vote.ts` -- Unified poll vote hook (simple + ranked modes)
- `src/components/student/simple-poll-vote.tsx` -- Tappable card grid for simple polls
- `src/components/student/ranked-poll-vote.tsx` -- Tap-to-rank for ranked polls
- `src/app/(student)/session/[sessionId]/poll/[pollId]/page.tsx` -- Student poll voting page

## Files Modified

None -- all 4 files are new creations with no overlap with parallel 05-03 execution.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Single usePollVote hook for both poll types | Reduces duplication; pollType parameter selects simple vs ranked behavior within one hook |
| Gold/silver/bronze badge colors | Universal visual hierarchy for top 3 rankings; amber-400, gray-300, amber-600 Tailwind classes |
| Dynamic submit button text | Guides student through ranking process: "Rank 3 more" communicates remaining work |
| enableChangeVote resets submitted flag | Clean state machine: submitted->editable transition without losing existing selections |
| toPollWithOptions converter in page | Adapts API response shape to PollWithOptions type used by voting components |

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None -- all files compiled cleanly. Pre-existing TypeScript error in `src/app/(dashboard)/polls/[pollId]/page.tsx` is from the parallel 05-03 plan (missing `@/components/poll/poll-detail-view` module), not introduced by this plan.

## Next Phase Readiness

- **05-05 (Live Results):** Voting components submit via castPollVote and show success state; live results dashboard can receive broadcast updates.
- **05-06 (Results/Charts):** Poll state API provides vote counts and Borda scores for chart rendering.
- **Activities integration:** ActivityCard already supports type='poll' and routes to `/session/{sessionId}/poll/{pollId}`.

No blockers for any subsequent Phase 5 plan.
