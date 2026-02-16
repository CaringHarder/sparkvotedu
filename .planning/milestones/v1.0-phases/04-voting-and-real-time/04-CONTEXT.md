# Phase 4: Voting & Real-Time - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Students can vote on bracket matchups with results updating live for everyone. Teachers can advance brackets through rounds, manage voting windows, and monitor student participation in real time. This phase connects the bracket system (Phase 3) with the student join flow (Phase 2) into an interactive classroom experience.

</domain>

<decisions>
## Implementation Decisions

### Voting Interaction
- Teacher-selectable viewing mode per bracket: **Simple** (younger students) or **Advanced** (older students)
- **Simple mode:** Students see one matchup at a time, no bracket overview, sequential voting
- **Advanced mode:** Students see all current-round matchups at once, can vote in any order, full bracket visible
- Single tap/click on an entrant to cast a vote — no confirmation step (classroom speed priority)
- After voting: entrant highlights with checkmark confirmation
- Vote counts are hidden from students until teacher reveals/advances the matchup
- Vote changeability: Claude's discretion

### Live Update Experience
- Teacher dashboard uses batched vote count updates (every few seconds), not real-time per-vote trickle
- Winner animates into the next round slot when bracket advances (slide/fade animation)
- **Simple mode students:** Only see their voting interface, no bracket overview updates
- **Advanced mode students:** See full bracket updating live as rounds advance, vote on active matchups
- Dramatic reveal moment with countdown/suspense animation when teacher reveals a winner — builds classroom excitement

### Round Advancement Flow
- Teacher can advance matchups individually (for drama) OR batch-advance the whole round at once
- On tied votes: teacher gets two options — break the tie manually, or extend voting
- Teacher controls whether students see vote counts at reveal time (toggle per bracket)
- Optional countdown timer per matchup or per round — teacher can set a time limit or leave voting open indefinitely
- Manual override shows no indication to students — teacher's choice appears seamless
- Undo available: teacher can revert a matchup advancement ONLY if the next round hasn't been opened for voting yet. Once voting opens on the next round, previous rounds are locked.
- Full celebration screen with confetti and champion announcement when the final bracket winner is crowned

### Connected Students Display
- Activity grid showing each student tile with voted/not-voted status per current matchup
- Vote choices stay private — teacher only sees WHETHER each student voted, not WHAT they chose
- Disconnected students appear greyed out in the grid (stay visible, don't disappear)
- Simple fraction text per matchup: "18/24 voted"
- Visual "All voted!" badge appears on a matchup when 100% participation is reached
- Activity grid lives in a collapsible sidebar — doesn't compete with the bracket diagram
- No redundant connected count in header — sidebar grid is the single participation view
- Ban/kick already handled by Phase 2 — no new removal functionality needed

### Claude's Discretion
- Vote changeability (locked immediately vs changeable until closed)
- Batched update interval timing
- Animation/transition implementation details
- Celebration screen visual design
- Timer UI design
- Real-time transport layer (WebSocket, SSE, or polling strategy)

</decisions>

<specifics>
## Specific Ideas

- Two viewing modes tied to age/complexity: "Simple" for younger students (one matchup at a time, minimal UI), "Advanced" for older students (full bracket, all matchups)
- The dramatic reveal should feel like a game show moment — countdown builds anticipation before the winner appears
- Celebration screen at championship should feel like a real event — confetti, big winner highlight
- Teacher override should be invisible to students — maintains classroom authority without awkwardness

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-voting-and-real-time*
*Context gathered: 2026-01-31*
