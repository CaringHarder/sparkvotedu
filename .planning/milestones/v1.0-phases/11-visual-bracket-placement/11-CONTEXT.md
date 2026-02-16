# Phase 11: Visual Bracket Placement - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers can drag entrants from a pool into bracket diagram positions, swap entrants within the bracket, and toggle between list reorder and visual placement modes. This is a seeding interface enhancement — it does not change bracket creation logic, tournament engines, or voting flows.

</domain>

<decisions>
## Implementation Decisions

### Drag Interaction Model
- Dual interaction: drag-and-drop on desktop, click-to-select then click-to-place as fallback (especially for mobile/touch)
- Dragging an entrant onto an occupied slot swaps their positions automatically
- Both drag-back-to-pool and click-X-button methods for removing a placed entrant
- Auto-seed button places entrants in their current list order (seed 1 in slot 1, etc.) — no random shuffle option
- Empty slots highlight (glow) when an entrant is being dragged, showing valid drop targets
- Entrants in the pool show their seed number as numbered badges
- Seed numbers stay fixed from the original list — placing seed 3 in slot 1 keeps them labeled as seed 3
- Large brackets (32+) use existing section navigation (Top/Bottom, quadrants) for navigating the bracket during placement

### Placement Layout
- During placement, only Round 1 matchup slots and bye slots are shown — later rounds are hidden
- Entrant pool position is Claude's discretion (left sidebar, top panel, etc.)
- Empty slot visual treatment is Claude's discretion

### Mode Switching
- Toggle between list reorder (current behavior) and visual bracket placement — integration point is Claude's discretion
- Switching between modes preserves placements — list reorder reflects visual positions and vice versa
- Visual placement available for all bracket types (SE, DE, round-robin, predictive)
- Visual placement available in both creation wizard and when editing draft bracket entrants

### Bye Slot Handling
- Byes auto-placed by the seeding algorithm but teachers can move them to different slots
- Bye slots show 'BYE' label in italic muted style (consistent with existing Phase 7 bye rendering)
- Moving a bye to an occupied slot swaps positions — entrant moves to where the bye was
- No reset button for bye positions — teacher must manually move byes back if desired

### Claude's Discretion
- Entrant pool position relative to bracket diagram (left sidebar, top panel, etc.)
- Empty slot visual treatment (dashed border, dimmed seed label, etc.)
- Where in the creation flow the visual placement toggle appears (Step 3 toggle vs separate step)
- Drag-and-drop library choice (dnd-kit, native HTML5 DnD, etc.)
- How round-robin visual placement works (no bracket diagram — may need different visual approach)

</decisions>

<specifics>
## Specific Ideas

- Round-robin brackets don't have a traditional bracket diagram — visual placement for RR may need a matchup grid or matrix approach rather than a tree layout
- The existing bracket creation flow already has list reorder with HTML5 native drag-and-drop (Phase 3, 03-06) — visual placement extends this rather than replacing it
- Section navigation from Phase 7 (07-24, 07-27) should be reused for navigating large brackets during placement

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-visual-bracket-placement*
*Context gathered: 2026-02-15*
