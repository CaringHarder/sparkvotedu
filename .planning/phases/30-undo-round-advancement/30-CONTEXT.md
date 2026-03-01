# Phase 30: Undo Round Advancement - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers can reverse the most recent round advancement in any bracket type (SE, DE, RR, predictive) while the bracket is still in progress (active or paused). This clears winners, votes, and any cascading downstream matchups. Reopening completed brackets/polls is Phase 31 — this phase only handles mid-tournament undo.

</domain>

<decisions>
## Implementation Decisions

### Undo trigger & placement
- Undo button lives in a **small grouped toolbar near the Advance Round button** — keep pause toggle where it is, add undo near advance with minimal layout changes
- Button uses a **dynamic label**: "Undo Round 3" (shows which round will be affected)
- **Type-specific labels**: "Undo Round X" for SE/DE, "Undo Round X Results" for RR, "Undo Resolution" for predictive
- Button is **hidden when unavailable** — only appears after the first round has been advanced
- Button only targets the round that was **just advanced** — not available while a current round is mid-vote (only after advance)
- **Tooltip on hover**: "Reverses the most recent round and clears downstream matchups"
- No keyboard shortcuts — undo is rare and destructive enough to require deliberate click/tap
- During processing, button area shows **"Undoing..." status text** that replaces the button temporarily

### Confirmation dialog
- **Always requires confirmation** — undo is destructive and should never be accidental
- Confirmation button is a **simple button click** (no type-to-confirm)
- Confirmation dialog content: Claude's discretion on exact format and detail level

### Cascade feedback
- Post-undo feedback: Claude's discretion on mechanism (toast vs inline)
- DE bracket confirmation detail: Claude's discretion on whether to add loser bracket context
- Bracket visualization update approach: Claude's discretion
- Error handling UX: Claude's discretion

### Undo availability & limits
- **Repeated single undo** — only the most recent round can be undone at any time, but after undoing, the new "most recent" becomes undoable — teacher can walk back step by step
- **Active/paused brackets only** — completed brackets cannot be undone (that's Phase 31: Reopen)
- No time limit — undo is always available on in-progress brackets
- **Auto-pauses on undo** — teacher can click undo whether bracket is active or paused; system automatically pauses as part of the undo operation

### Post-undo bracket state
- Students see the **existing "needs to cook" paused overlay** from Phase 29 — consistent pause experience, no undo-specific messaging
- **All votes from the undone round are cleared** — students vote fresh on reopened matchups (clean slate)
- For **predictive brackets**, student predictions are **preserved** — only the teacher's resolution of who won is reversed
- Teacher uses the **existing pause/resume toggle** to resume when ready — no special post-undo resume flow (consistent with Phase 29)

### Claude's Discretion
- Undo button icon and exact styling (destructive vs secondary)
- Confirmation dialog confirm button styling
- Cascade impact display format in confirmation (counts vs round-by-round)
- Post-undo feedback mechanism (toast vs inline)
- DE-specific confirmation context
- Bracket visualization update approach (instant vs animated)
- Error handling and retry UX
- Loading state design during undo processing
- Backend transaction strategy for atomic undo operations

</decisions>

<specifics>
## Specific Ideas

- Undo should feel safe — confirmation with impact info helps teachers understand what they're reversing
- Auto-pause on undo means teachers don't need to remember to pause first
- Step-by-step walkback (repeated single undo) gives maximum flexibility without a complex multi-round undo UI
- The undo button only appears after advancing (not during active voting) to keep the mental model simple: advance a round, then optionally undo it

</specifics>

<deferred>
## Deferred Ideas

- Poll undo / reopen — belongs in Phase 31 (Reopen Completed Activities)
- Completed bracket reopening — belongs in Phase 31 (Reopen Completed Activities)
- Undo on completed brackets — Phase 31 scope (reopen then undo if needed)

</deferred>

---

*Phase: 30-undo-round-advancement*
*Context gathered: 2026-03-01*
