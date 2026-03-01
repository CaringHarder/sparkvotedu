# Phase 31: Reopen Completed Activities - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers can bring completed brackets and closed polls back for additional voting, landing them in a paused state. Reopened activities preserve all existing data and allow students who haven't voted yet to participate. This builds on Phase 29's pause infrastructure -- reopened activities use the same paused state and resume flow.

</domain>

<decisions>
## Implementation Decisions

### Reopen button placement
- Available in two locations: triple-dot context menu on activity cards AND the live dashboard page
- On activity cards: added as a menu item in the existing triple-dot context menu alongside Edit, Duplicate, Delete
- No confirmation dialog -- reopening lands the activity in paused state, so no votes happen until the teacher explicitly resumes (safe by default)
- Only visible for completed brackets and closed polls in the current active session (archived sessions excluded)

### Champion & results handling
- Champion designation is cleared when reopening a completed bracket
- Bracket returns to the last completed round, clearing that round's results (functions like a single undo of the final state)
- Poll votes stay visible -- new votes add to existing totals
- Only students who haven't voted yet can vote -- students who already voted remain locked out (reopening is for catching students who missed it, not for revoting)

### Student transition
- Auto-update via realtime -- celebration/completion screen automatically transitions back to the voting/paused view without requiring a page refresh (consistent with how pause overlay works)
- When a bracket is reopened and lands in paused state, students see the 'needs to cook' paused overlay immediately (consistent with existing pause behavior)
- Students who navigated away from the activity are not pulled back -- if they return to the activity page, they see the updated state
- No limit on how many times an activity can be reopened

### Reopened state indicators
- No visual distinction -- once reopened, the activity looks and behaves like any other paused activity (clean, no 'Reopened' badge)
- Activity card status changes from 'Completed' to 'Paused' using the existing status badge system

### Claude's Discretion
- Reopen button placement on the live dashboard (where exactly it sits relative to existing controls)
- What already-voted students see when an activity is reopened (results view, waiting state, or voted confirmation)

</decisions>

<specifics>
## Specific Ideas

- Reopening should feel like the inverse of completing -- same simplicity, just going backwards
- The "only new students can vote" behavior is the key differentiator from just creating a new activity -- this is for catching latecomers
- Leverage Phase 29's pause infrastructure heavily -- reopened activities are just paused activities with preserved data

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 31-reopen-completed-activities*
*Context gathered: 2026-03-01*
