# Phase 8: Sports Integration - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers can browse real sports tournaments (NCAA March Madness), import them as classroom prediction brackets, and results auto-update from live game data. Manual override available for delayed or incorrect results.

</domain>

<decisions>
## Implementation Decisions

### Sport & league scope
- NCAA March Madness only — men's AND women's tournaments
- Active season only — tournaments surface when they're happening (March-April), no historical bracket browsing
- No pro leagues (NBA, NFL, etc.) at launch — those would be future phases

### Data provider strategy
- Abstracted data layer — TypeScript interface for sports data provider, so implementation can be swapped later
- SportsDataIO as initial provider — free perpetual trial for development, ~$300-600/mo for live production data, unlimited API calls on paid plans
- Provider interface should cover: tournament listing, bracket/seeding data, live scores, game results, team metadata (name, logo)
- Research reference: `march_madness_api_analysis (1).docx` in project root — comprehensive 6-provider comparison

### Data freshness & updates
- Auto-update with manual override — game results automatically populate bracket as games finish
- Teacher can manually override any result if API data is delayed or incorrect (matches existing override pattern from predictive brackets)
- Polling interval and caching strategy: Claude's discretion based on SportsDataIO's API capabilities

### Team logos
- Primary source: SportsDataIO API logo URLs
- Fallback: ESPN's public CDN for team logos (widely used, reliable coverage)
- Logos displayed in matchup boxes alongside team names and scores

### Claude's Discretion
- Bracket diagram approach: reuse existing BracketDiagram SVG or create sports-themed variant — pick what minimizes new components while looking good
- Game status display: whether to show LIVE/FINAL/upcoming badges on matchups, or keep it simple with just scores
- Polling/caching architecture for live score updates
- How to handle the 68-team tournament format (play-in/First Four games) within existing bracket structures

</decisions>

<specifics>
## Specific Ideas

- The existing predictive bracket infrastructure (Phase 7/7.1) is the natural foundation — sports brackets ARE prediction brackets with an external data source for results instead of student votes
- Abstract provider interface should make it possible to add NBA, NFL, etc. in future phases with just a new provider implementation
- The report recommends: "abstract your data layer behind an internal service so that swapping providers later requires minimal refactoring"
- SportsDataIO offers visualization widgets — evaluate whether any are useful or if our existing bracket diagram is better

</specifics>

<deferred>
## Deferred Ideas

- Pro league support (NBA playoffs, NFL playoffs, NHL, MLB) — future phase, same provider abstraction
- Historical tournament browsing (past years' brackets for off-season classroom use) — future enhancement
- Player stats and play-by-play data — not needed for bracket predictions, could enhance engagement later
- Odds/betting data display — not appropriate for edu context

</deferred>

---

*Phase: 08-sports-integration*
*Context gathered: 2026-02-15*
