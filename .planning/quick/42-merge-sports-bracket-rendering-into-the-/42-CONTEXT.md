# Quick Task 42: Merge sports bracket rendering into the standard MatchupBox to fix prediction UX - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Task Boundary

Merge sports bracket rendering into the standard MatchupBox to fix prediction UX. See handoff doc: .planning/quick/sports-bracket-prediction-ux-handoff.md

</domain>

<decisions>
## Implementation Decisions

### Sports file cleanup
- Claude's discretion on whether to keep sports-matchup-box.tsx as helpers or delete entirely

### Name truncation
- Use abbreviation (e.g. "DUKE") when scores are visible, full name when no scores
- This maximizes readability during live/final games where score display competes for horizontal space

### Winner highlight style
- Use the standard MatchupBox primary color-mix highlight (`color-mix(in oklch, var(--primary) 8%, transparent)`)
- Do NOT use the green `rgba(34,197,94,0.1)` from the current overlay — it clashes with the vote highlight green used in prediction mode

</decisions>

<specifics>
## Specific Ideas

- Handoff doc at `.planning/quick/sports-bracket-prediction-ux-handoff.md` has detailed step-by-step implementation approach
- 5 bugs all stem from same root cause: overlay architecture hiding click handlers and vote indicators
- Key fix: remove `<g style={isSports ? {display:'none'} : undefined}>` wrapper and render sports text inline in the standard flow

</specifics>
