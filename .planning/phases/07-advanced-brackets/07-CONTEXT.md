# Phase 7: Advanced Brackets - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers on Pro Plus can create double-elimination, round-robin, and predictive brackets. All bracket types support non-power-of-two entrant counts with automatic byes. Existing single-elimination brackets are enhanced with drag-and-drop reorder and expanded sizing. Play-in rounds available as a toggle for large brackets. Sports integration (Phase 8) and analytics (Phase 9) are separate.

</domain>

<decisions>
## Implementation Decisions

### Double-Elimination Layout & Navigation
- Tabbed layout: Winners / Losers / Grand Finals / Overview tabs
- Each tab renders full SVG bracket diagram (consistent with single-elimination)
- Overview tab shows remaining entrants and their bracket position across both brackets
- Grand Finals tab revealed only when both finalists are determined (not visible earlier)
- Tab badges show active matchup count (e.g., "Winners (2 active)")
- All tabs visible to students (no restricted views)

### Double-Elimination Mechanics
- Standard reset match in grand finals: losers bracket winner must beat winners champ twice
- If winners champ wins match 1 of grand finals, show winner immediately (no "if necessary" placeholder)
- Losers bracket seeded to avoid rematches (re-seed entries from winners bracket)
- Entrants who drop from winners to losers get a color/badge indicator (not animated connector)
- Expanded size range: up to 64 entrants, with play-in toggle for 8 additional teams (72 total, NCAA March Madness style)

### Double-Elimination Advancement
- Claude's Discretion: whether to advance winners and losers brackets independently or synchronized

### Round-Robin Standings & Pacing
- League table display: W-L-T record, points, rank (not matrix grid)
- Teacher chooses pacing mode when creating: round-by-round or all-at-once
- Auto-generated rounds for round-by-round mode (balanced so each entrant plays once per round)
- Head-to-head tiebreaker when W-L records are tied
- Max 8 entrants (28 matchups)
- Final standings as conclusion (no champion reveal animation)

### Round-Robin Student Voting
- Teacher sets voting style: Simple (one matchup at a time) or Advanced (grid of all matchups)
- Teacher toggles live vs. suspenseful standings (live updates vs. reveal after round closes)

### Predictive Bracket Lifecycle
- Separate prediction phase status: Draft -> Predictions Open -> Active (resolving) -> Completed
- Full bracket predictions upfront (March Madness pool style, not round-by-round)
- Students can edit predictions until bracket activates (predictions phase closes)
- Predictions hidden from other students until each matchup resolves

### Predictive Bracket Scoring & Leaderboard
- Escalating scoring by round (later rounds worth more, e.g., R1=1pt, R2=2pt, Finals=4pt)
- No upset bonus -- keep scoring simple
- Live leaderboard updating as matchups resolve
- Student-facing leaderboard: rank + total score only
- Teacher-facing leaderboard: full breakdown (click student to see correct/wrong per pick, highlighted green/red)
- Per-matchup prediction stats shown after resolution ("23 of 30 predicted Team A")

### Predictive Bracket Student UI
- Teacher chooses prediction mode: Simple (form-based dropdown/card picks) or Advanced (click on SVG bracket diagram)
- Teacher chooses resolution mode: manual (teacher picks winners) or vote-based (student votes determine results)
- Brackets can be duplicated to other sessions (like polls), but one bracket = one prediction pool

### Bye Handling
- Byes supported for all bracket types (single-elim, double-elim, predictive; round-robin inherently supports any count)
- Grayed 'BYE' slot in bracket diagram for bye matchups
- Top seeds get byes (by seeding order, not random)
- Byes handled silently (no preview/confirmation step)
- Byes auto-update when drag-and-drop reorders entrants (top seeds always get byes)
- Minimum 3 entrants (no warning needed)

### Bracket Sizing
- Single-elimination: 3 to 64 entrants (expanded from 4/8/16)
- Double-elimination: up to 64 entrants with play-in toggle for 8 extra (72 total)
- Expanded presets: 4, 8, 16, 32, 64 plus Custom option for any number
- Auto-zoom to fit viewport for large brackets (32+/64) with pinch-to-zoom for detail

### Drag-and-Drop Entrant Reorder
- Drag-and-drop works in ALL bracket modes (single-elim, double-elim, round-robin, predictive)
- Retroactively added to existing single-elimination creation wizard
- Reordering entrants reshuffles bye assignments (top seeds always get byes)

### Claude's Discretion
- Double-elimination advancement order (independent vs. synchronized)
- Exact escalating point values per round for predictive scoring
- Play-in round matchup generation and seeding logic
- Auto-zoom breakpoints and pinch-to-zoom implementation
- Round-robin auto-round generation algorithm

</decisions>

<specifics>
## Specific Ideas

- Play-in games modeled after NCAA March Madness "First Four" -- 8 extra teams play down to fill the 64-team main bracket
- "Simple vs. Advanced" pattern used consistently: teacher sets voting style for round-robin (one-at-a-time vs. grid) and prediction mode for predictive brackets (form-based vs. bracket diagram clicks)
- Double-elimination overview tab inspired by "who's still alive" tournament trackers
- Bracket duplication across sessions follows the existing poll duplication pattern

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 07-advanced-brackets*
*Context gathered: 2026-02-01*
