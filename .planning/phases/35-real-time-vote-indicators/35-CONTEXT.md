# Phase 35: Real-Time Vote Indicators - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers see per-student green dot indicators on the live dashboard as students vote, updating live across all activity types (SE, DE, RR, predictive brackets, and polls). This is a live dashboard enhancement only -- no new pages, no student-facing changes.

</domain>

<decisions>
## Implementation Decisions

### Indicator visual style
- Small solid green dot next to each student's name -- simple status indicator style
- No animation on arrival -- dot appears instantly when vote is recorded
- Indicators live in the existing ParticipationSidebar -- no new UI sections
- Live dashboard only -- detail page stays as-is

### Student list behavior
- Not-voted students float to the top of the list -- teacher immediately sees who's still missing
- No visual separator between not-voted and voted groups -- sort order + dot presence is enough
- Late joiners appear in the not-voted group immediately without a dot

### Multi-round handling
- Dots reset completely when a bracket advances to a new round -- shows current round status only
- For Round Robin: green dot appears only after student has voted on ALL matchups in the round (not partial)
- For polls: dot appears when student has fully submitted their vote (accounts for poll type differences)
- For predictive brackets: dot appears only after student submits their complete prediction, not during partial fills
- On undo round advancement: dots reset for that round since votes were wiped

### Claude's Discretion
- Whether to show a vote progress summary (e.g., "7 of 12 voted") -- decide based on existing dashboard layout
- Which students to show (activity participants vs all session students) -- decide based on current sidebar data availability
- Vote indicator behavior during paused state -- decide based on current pause visual treatment
- Transition animation when student moves from not-voted to voted group -- decide what works with existing sidebar

</decisions>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches. Key constraint is that this enhances the existing ParticipationSidebar rather than creating new UI.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 35-real-time-vote-indicators*
*Context gathered: 2026-03-01*
