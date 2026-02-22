# Phase 22: UX Polish - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Classroom presentation readability on projectors, session identification by name, and consistent activation terminology across brackets and polls. No new features — polish and unification of existing UI.

</domain>

<decisions>
## Implementation Decisions

### Medal card presentation
- Full-screen results view — teacher clicks a button to enter a dedicated presentation mode that fills the projector
- Larger font sizes in presentation mode for readability from 30+ feet away
- Presentation mode is a distinct view, not just the dashboard with bigger text

### Medal card visual design (Claude's Discretion)
- Color scheme for gold/silver/bronze cards — Claude picks best approach for projector readability
- How non-medal items (4th+) display alongside medal cards — Claude determines visual hierarchy
- Card layout, shadows, spacing — Claude's call

### Session naming interaction
- Click-to-edit: teacher clicks session name directly and it becomes an inline text field, Enter or click-away to save
- Prompt on session creation with an optional name field — gentle nudge upfront, can skip
- Fallback for unnamed sessions: "Unnamed Session — Feb 21" format (date included)

### Session name visibility (Claude's Discretion)
- Claude audits all places sessions appear (dropdowns, headers, breadcrumbs, lists) and applies names where it makes sense
- Dashboard and session selection dropdowns are the minimum

### Activation terminology
- Unified to "Start" / "Active" (NOT "Go Live" / "Live" as originally spec'd)
- End action: "End" button
- Status badges can be feature-appropriate — polls and brackets may have slightly different state labels if their lifecycles differ
- The key unification: no more mixed "Activate" / "Go Live" — everything uses "Start"

### Button styling (Claude's Discretion)
- Claude audits current button styles across brackets and polls and unifies where it makes sense
- Goal is visual consistency without unnecessary disruption

</decisions>

<specifics>
## Specific Ideas

- Teacher wants simpler language ("Start" / "End") over flashier terms ("Go Live" / "Launch") — this is a classroom tool, not a streaming platform
- Full-screen presentation mode is important — teachers project results for the whole class to see
- Session naming should feel effortless — click-to-edit, not a modal or separate settings page

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-ux-polish*
*Context gathered: 2026-02-21*
