# Phase 2: Polish Student Dashboard Ended Activity UX - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Improve how ended/completed/closed activities appear on the student dashboard grid. Students should clearly see which activities are still open for voting vs. finished. This covers the activity card visual treatment, grid sorting/grouping, card interaction behavior, and status indicator design. Adding new activity types, modifying teacher-side workflows, or changing the existing inner read-only views is out of scope.

</domain>

<decisions>
## Implementation Decisions

### Ended card visual treatment
- Closed activity cards dim to ~50-60% opacity compared to active cards
- The "Voted" badge does NOT persist on closed cards — once an activity ends, it shows "Closed" regardless of whether the student voted
- Paused activities keep the same look as active (no distinct paused visual on the grid) — the pause overlay inside the activity is sufficient

### Card sorting & grouping
- Grid splits into two sections: active cards at top, closed cards in a separate "Closed" section below
- The "Closed" section has a minimal text divider: small muted text "Closed" with horizontal lines on each side
- Section is NOT collapsible — always visible, keeps it simple
- When all activities are closed (none active), show a friendly message at top ("No active activities right now — hang tight!") followed by the Closed section with the ended cards still visible

### Ended card interaction
- Tapping a closed card navigates to the existing read-only view (bracket results or poll closed page) — no changes to those inner views needed
- No result hints/snippets on the grid card itself — just activity name + "Closed" badge
- Auto-navigation skips closed activities — if the only activity is closed, show the grid with friendly message + closed section instead of auto-redirecting into read-only view
- Reopened activities (teacher uses Reopen) animate back from Closed section to Active section with reverse animation (slide up, opacity restores)

### Status indicator design
- "Closed" badge: plain text in grey, no icon — muted grey text on light grey background pill
- "Active" indicator: keep the current pulsing green dot unchanged
- Section header: minimal text divider style (small muted "Closed" text centered between horizontal lines)

### Animations
- When an activity ends in real-time, the card dims and animates (slides down) from the Active area to the Closed section
- Reopened activity reverses the animation (slides back up to Active, opacity restores)
- Consistent with Phase 26 animation patterns (soft, not jarring)

### Claude's Discretion
- Exact opacity percentage (somewhere in 50-60% range)
- Animation timing and easing curves
- Friendly message wording/styling for "no active activities" state
- How to handle the AnimatePresence layout shifts during section transitions
- Exact Tailwind classes for the section divider and badge pill

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `activity-card.tsx`: Current card component — needs status-aware rendering added. Already receives `status` in the Activity interface but ignores it
- `activity-grid.tsx`: Grid component with auto-navigation logic — needs section splitting and auto-nav guard for closed activities
- `use-realtime-activities.ts`: Hook that provides activities with status field already wired through
- `empty-state.tsx`: Has `waiting` and `removed` variants — needs a new "no active" variant or the friendly message can live in the grid component
- AnimatePresence/Framer Motion: Already used for card removal animations (Phase 26 fade-out pattern)

### Established Patterns
- Phase 26 card removal: opacity fade (100% → 0%) over ~200ms, then remaining cards slide together
- Realtime status updates already flow through Supabase channel → hook → component re-render
- Activity API already returns status for both brackets (`active`/`paused`/`completed`) and polls (`active`/`paused`/`closed`)

### Integration Points
- `activity-grid.tsx`: Main integration point — split activities by status, render two sections
- `activity-card.tsx`: Status badge rendering, opacity conditional
- Auto-navigation logic in grid: add closed-activity guard
- Realtime hook already provides status changes — no backend work needed

</code_context>

<specifics>
## Specific Ideas

- "Closed" as the label text (not "Ended" or "Completed") — matches poll status terminology
- Section divider should feel minimal: `────── Closed ──────`
- Friendly "no active" message tone: reassuring, like waiting for the teacher to start something

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-polish-student-dashboard-ended-activity-ux*
*Context gathered: 2026-03-17*
