# Phase 5: Polls - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers can create simple and ranked polls that students vote on with results displayed in real time. Polls support text + optional image options, tiered option limits, and Borda count aggregation for ranked polls. Poll lifecycle (draft/active/closed) is managed by the teacher. This phase also unifies brackets and polls under a shared "Brackets/Polls" navigation section.

</domain>

<decisions>
## Implementation Decisions

### Poll Creation UX
- Two creation paths: quick inline form (single page) for simple polls, multi-step wizard for more involved setups
- Poll type (simple/ranked) is a toggle within the creation flow, not a separate path
- Options support text + optional image (stored in Supabase Storage, max upload limit with auto-resize)
- Option limits tiered by account: free 2-6, pro 2-12, pro plus up to 32
- Polls are standalone until activated — created independently, assigned to a session when going live
- Polls have a question field + optional description field for context
- Teacher can duplicate any existing poll as a starting point for a new one
- Curated poll templates by category (icebreaker, classroom decisions, etc.) ship pre-built
- For ranked polls, teacher configures ranking depth: rank all options or just top N
- No timer on polls — teacher closes manually when ready
- Quick-create accessible from both dashboard (prep) and session page (on-the-fly)

### Results Visualization
- Simple polls: both horizontal bar chart and pie/donut chart available, teacher toggles between views
- Ranked polls: scored leaderboard showing options ranked by total Borda points with points per option
- Bouncy/playful animation style — bars pop and bounce as votes arrive, game show energy
- Participation rate prominently displayed at top: "X of Y voted (Z%)"
- Presentation mode available: full-screen results view optimized for projectors (big text, high contrast, minimal chrome)
- Reveal animation when teacher closes poll — brief winner/top result announcement animation

### Student Voting Experience
- Simple polls: tappable cards with big touch targets, submit button to confirm
- Selection feedback: selected card fills with brand color, unselected stay neutral
- Ranked polls: tap-to-rank interaction (1st tap = #1, 2nd tap = #2, etc.)
- Both undo-last-tap and reset-all buttons available for ranked polls
- Single submit tap — no confirmation dialog
- Votes always anonymous — students never see who voted for what, only aggregated results
- Teacher toggle per poll: students can change vote while open, or vote is final on submit
- Post-vote: "Vote submitted!" confirmation, then sees results only if teacher enabled live results
- Images display as thumbnail beside text on student cards (compact layout)

### Poll Placement & Access
- Unified "Brackets/Polls" sidebar navigation section replacing separate bracket section
- Status tabs (Active/Draft/Closed) with type badges (bracket icon vs poll icon) on each card
- Poll cards have distinct visual style (different color/icon) to distinguish from brackets at a glance
- Student session page: mixed activity list showing all active brackets and polls together, sorted by most recent
- Multiple polls can be active simultaneously in one session (good for stations/rotation)
- Teacher result visibility toggle per poll: show live results to students, or hide until closed
- Activity list only on session detail (no live event feed) — vote counts update in real time on list items
- Archive + delete for closed polls: archive hides from main view but keeps data, delete removes permanently

### Claude's Discretion
- Quick-create vs wizard UI component architecture
- Exact image resize dimensions and compression settings
- Template categories and specific template content
- Borda point scale (N-1, N-2... or other weighting)
- Presentation mode keyboard shortcut / entry method
- Reveal animation specifics (duration, effects)
- Card color palette for poll type distinction
- Archive UI pattern (separate tab vs toggle)

</decisions>

<specifics>
## Specific Ideas

- Quick inline form should feel instant — teacher types a question, adds options, hits publish. No friction for simple use cases
- Bouncy animations should match the SparkVotEDU brand energy (similar to Phase 4 celebration overlays)
- Tap-to-rank should show numbered badges (1, 2, 3...) appearing on cards as students tap, making the ranking order visually obvious
- Presentation mode should be something a teacher can throw up on a projector mid-class
- "Brackets/Polls" unification means refactoring current bracket sidebar navigation into the shared section

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-polls*
*Context gathered: 2026-01-31*
