# Phase 33: Bracket Quick Create - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers can create a bracket in two clicks by picking a curated topic chip and an entrant count, skipping the multi-step wizard entirely. The bracket is created with SE type, simple display mode, no seeds as defaults. Bracket editing, poll quick create, and wizard changes beyond visual alignment are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Topic chip layout
- Flat chip grid — all curated topics in one grid, no grouping by subject headers
- Color-coded by subject (Science, History, Arts, etc.) but not separated into sections
- No search bar — there are ~10 curated topic lists, all visible at once
- No preview on click — clicking a chip highlights/selects it, no tooltip or expansion showing entrant names

### Entrant count picker
- Three options: 4, 8, 16
- No default pre-selected — teacher must explicitly pick a count
- Random selection of entrants from the topic list when count is less than total available (keeps it fresh across multiple brackets)

### Creation flow & landing
- No confirmation step — click Create and the bracket is created immediately (speed is the point)
- After creation, land on the newly created bracket's detail page (teacher can review, edit, or Go Live from there)
- Session picker: inline session dropdown on the Quick Create tab (teacher picks which class gets the bracket)

### Quick Create placement
- Tab toggle on the bracket creation page: "Quick Create" and "Step-by-Step"
- Step-by-Step is the default tab (existing wizard shows first)
- Existing wizard gets a minor visual refresh to feel cohesive with the new Quick Create tab
- Quick Create tab has: topic chip grid, entrant count picker, inline session picker, and Create button

### Claude's Discretion
- Subject color-coding implementation (colored border, badge, or tint — whatever fits the design system)
- Entrant count picker component style (segmented control, pill buttons, etc.)
- Bracket title naming approach when quick-created
- Handling when a topic has fewer items than the selected count (disable or adapt)
- Exact visual refresh scope for the Step-by-Step wizard tab

</decisions>

<specifics>
## Specific Ideas

- "Polls should match this behavior" — Phase 34 (Poll Quick Create) should use the same tab toggle pattern with "Quick Create / Step-by-Step" labels and Step-by-Step as default
- Quick Create / Step-by-Step label naming matches the existing poll creation terminology

</specifics>

<deferred>
## Deferred Ideas

- Poll creation page should adopt the same tab toggle pattern (Quick Create / Step-by-Step with Step-by-Step as default) — Phase 34 scope

</deferred>

---

*Phase: 33-bracket-quick-create*
*Context gathered: 2026-03-01*
