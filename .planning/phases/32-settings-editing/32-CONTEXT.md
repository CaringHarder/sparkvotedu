# Phase 32: Settings Editing - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers can adjust display settings on brackets and polls after creation -- even while live -- without risking structural data corruption. Structural settings (bracket type, size, poll type) are visibly locked with clear indicators. This phase extends Phase 31.1's inline toggle pattern to cover all remaining display settings and all bracket types, and adds locked structural setting indicators.

</domain>

<decisions>
## Implementation Decisions

### Settings Surface
- More inline toggles (same QuickSettingsToggle pattern from 31.1) -- no drawer/modal
- Toggles appear on both detail page AND live dashboard (consistent with 31.1)
- Settings editable in draft, active, and paused states -- NOT on completed activities
- Instant save (toggle = save + broadcast) -- no batch Save button, matches 31.1 behavior
- All settings grouped in a subtle "Display Settings" section (light border/card with label)
- Display Settings section always visible (not collapsed)
- Existing 31.1 toggles should be reorganized into the group -- Claude's discretion on approach

### Bracket Display Settings
- Add toggles for: show seeds, show vote counts (no timer toggle)
- Show seeds and show vote counts only appear where relevant per bracket type -- Claude determines which types
- Extend viewing mode toggle (simple/advanced) to ALL bracket types: SE, DE, RR, and Predictive
  - Predictive already has simple/advanced views -- toggle should definitely be there
  - RR should offer simple mode matching the card-by-card matchup layout used by other types
  - DE gets simple/advanced toggle as well
- If simple mode student views don't exist for a bracket type, Claude determines what's needed

### Locked Settings Indicator
- Structural settings (bracket type, bracket size, poll type) shown as read-only text with lock icon (e.g., "Type: Single Elimination" with lock)
- NOT grayed-out toggles -- just text with lock icon, clearly non-interactive
- Both brackets AND polls show locked structural indicators
- Polls show poll type as locked (e.g., "Type: Multiple Choice" with lock)

### Real-Time Broadcast
- Show seeds and show vote counts changes broadcast to students in real time (same as viewing mode)
- Reuse existing 31.1 broadcast infrastructure for new settings
- All settings changes affect student views, not just teacher-side

### Claude's Discretion
- Save feedback visual treatment (brief checkmark, toast, or toggle-state-only)
- Section label styling (gear icon + text vs text only)
- Locked settings ordering within the Display Settings group (above or below editable toggles)
- Lock icon tooltip (whether to show "can't be changed after creation" on hover)
- Live dashboard settings placement adaptation to fit live layout
- Whether to reorganize existing 31.1 toggles into the new group or extend around them
- Which bracket types get which specific settings (show seeds, show vote counts relevance)
- Whether DE/RR/Predictive need new simple mode student views or existing views suffice

</decisions>

<specifics>
## Specific Ideas

- Follow the same QuickSettingsToggle component pattern established in Phase 31.1
- Predictive brackets already have simple/advanced views built -- just need the toggle wired
- RR simple mode should match the card-by-card matchup layout used by SE/Predictive simple modes
- Paused state is specifically editable to support the pause-edit-resume teacher workflow

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 32-settings-editing*
*Context gathered: 2026-03-01*
