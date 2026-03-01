# Phase 29: Pause/Resume & Go Live - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers can freeze any active bracket or poll to stop voting, then resume when ready. Students see a playful "needs to cook" overlay with server-side vote enforcement. All "View Live" buttons rename to "Go Live" with visual state indicators.

</domain>

<decisions>
## Implementation Decisions

### Student pause overlay
- Playful & fun cooking theme — animated bubbling pot, steam, personality-driven
- Dimmed overlay approach: voting UI stays visible but dimmed/blurred underneath, overlay sits on top
- Looping subtle animation while paused — steam rising, pot bubbling, keeps the screen alive
- Dual messaging: big "Let it cook!" headline with smaller "Voting will resume soon" subtext underneath
- Visual feedback only — no audio or haptic feedback (classrooms are noisy enough)

### Teacher pause/resume controls
- Toggle switch (not a button) — flips between Active/Paused states
- Placed in top toolbar/header area of live dashboard — always visible, next to existing controls
- Amber/yellow banner across dashboard when paused saying "Activity Paused" — impossible to miss
- Instant toggle — no confirmation dialog. Speed matters in the classroom; undo is just toggling back

### Pause behavior & transitions
- Overlay appears immediately when teacher pauses — no grace period, even if student is mid-selection
- Energetic reveal on resume — quick animation (slide/burst) that signals "go go go!" to students
- Activities start live when activated (current behavior preserved) — pause is a mid-activity tool, not a gate

### "Go Live" rename
- Label-only rename: "View Live" → "Go Live" everywhere, same navigation behavior
- Visual state indicator on the button when activity is already live (e.g., green dot, pulsing, different color) vs not yet active
- Only this specific rename — no audit of other labels
- "Go Live" button always visible regardless of activity state (draft, active, paused, completed)

### Claude's Discretion
- Exact cooking animation design and assets (pot style, steam particles, colors)
- Overlay z-index, backdrop blur amount, and dimming opacity
- Toggle switch component choice and styling details
- Banner positioning and dismiss behavior
- Resume animation specifics (slide direction, burst effect, duration)
- "Go Live" button state indicator design (dot vs pulse vs color change)
- Server-side vote rejection error message format

</decisions>

<specifics>
## Specific Ideas

- Cooking theme should feel like a game pause — fun, not an error state
- "Let it cook!" as the primary overlay message with cooking emoji
- Resume should feel energetic — students should get hyped when voting reopens
- Banner for paused state should be unmistakable — teacher must know at a glance

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 29-pause-resume-go-live*
*Context gathered: 2026-02-28*
