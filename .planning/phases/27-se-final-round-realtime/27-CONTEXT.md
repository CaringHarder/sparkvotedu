# Phase 27: SE Final Round Realtime Fix - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix realtime vote count display in single elimination and predictive bracket final/later rounds. Votes save correctly, advancement works, celebrations fire -- but the live vote count UI does not update in realtime on certain rounds. Also verify double elimination is not affected.

Scope expanded from SE-only to include predictive bracket vote display issues since they likely share a root cause.

</domain>

<decisions>
## Implementation Decisions

### Bug reproduction
- 100% reproducible on SE brackets when reaching the final round
- Tested with 8-team SE brackets (3 rounds, final is round 3)
- Earlier rounds (1 and 2) show realtime vote counts correctly in SE
- Only the final round fails to display live vote counts
- Votes are being saved correctly -- the issue is purely UI/realtime display
- Teacher can still advance the winner and bracket completes normally
- Celebration fires correctly when the final matchup is decided

### Expected fix behavior
- Final round should behave identically to earlier rounds -- same realtime vote count updates
- No special final-round behavior needed beyond what earlier rounds already do
- Celebration and completion chain are already working -- don't touch those
- Fix is specifically about making vote counts update live on the final round display

### Investigation scope
- SE final round: vote counts don't update in realtime (primary target)
- Predictive brackets: vote counts don't show on some rounds (not just final) -- include in fix
- Double elimination: untested, verify during investigation and fix if affected
- Round robin: not affected (handled separately in Phase 28)
- Likely a shared root cause between SE and predictive issues -- investigate as one problem

### Testing approach
- Primary test case: 8-team SE bracket (matches original reproduction)
- Predictive test case: 8-team predictive bracket (mirror SE setup)
- DE sanity check: verify DE final round realtime works (fix if broken)
- Single student voter is sufficient for verification
- Verify vote counts update in realtime on ALL rounds, not just the final

### Claude's Discretion
- Root cause investigation approach (route caching, subscription lifecycle, state management)
- Whether to check from teacher view, student view, or both during investigation
- Fix implementation strategy based on what investigation reveals

</decisions>

<specifics>
## Specific Ideas

- Earlier rounds work fine in SE, so the realtime subscription/channel infrastructure is correct -- something specific to the final round (or round advancement to it) breaks the display
- Predictive brackets show votes on "some rounds" but not others -- partial failure suggests a round-specific rendering or subscription issue rather than a global one
- The fact that votes save and advancement works rules out backend/API issues -- this is a frontend realtime display bug

</specifics>

<deferred>
## Deferred Ideas

- Predictive bracket early-round vote display was originally considered out of scope but has been pulled into Phase 27 since it likely shares a root cause
- No other deferred ideas -- discussion stayed within phase scope

</deferred>

---

*Phase: 27-se-final-round-realtime*
*Context gathered: 2026-02-26*
