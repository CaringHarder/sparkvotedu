# Phase 28: RR All-at-Once Completion Fix - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix premature completion in round robin all-at-once brackets. The bracket must only transition to completed status after every matchup across all rounds is decided, and celebration must fire correctly on both teacher and student views. The `calculateRoundRobinStandings` function from Phase 24 must continue working correctly (non-regression).

</domain>

<decisions>
## Implementation Decisions

### Round progress visibility
- Students see NO round progress indicators — they just see matchups and vote
- Teacher live dashboard shows real-time round progress (e.g., "Rounds: 2/3 complete")
- Round status updates live as matchups resolve via existing realtime infrastructure
- Claude's discretion on exact format (text badge vs per-round sections — fit existing dashboard layout)

### Celebration & completion moment
- Claude's discretion on celebration timing (immediate vs brief pause after final matchup)
- Celebration requires manual dismiss — stays on screen until user taps/clicks
- After celebration dismisses, show final standings table with champion highlighted (both views)
- Celebration is identical on teacher and student views — same animation and content

### Mid-play teacher visibility
- Teacher can see which specific matchups are still awaiting votes in each round
- Claude's discretion on visual treatment for pending vs resolved matchups (fits existing card design)
- Claude's discretion on stale matchup indicators (time-based hints if it fits existing UX patterns)

### Matchup resolution & teacher override
- Teacher should be able to decide a matchup result or mark as tie when no students voted (zero-vote matchups)
- Tie matchups (equal votes) are automatically recorded as ties — standings use win/loss/tie points

### Tiebreaking
- Head-to-head result is the tiebreaker when teams have identical win/loss/tie records
- If head-to-head is also tied, Claude's discretion on secondary tiebreaker (total votes or similar)

### Disconnection handling
- Absent students don't block bracket completion — matchups complete based on votes received
- No minimum vote threshold — a matchup with any votes (even just 1) can resolve

### Claude's Discretion
- Celebration timing (immediate vs brief pause)
- Visual treatment for pending vs resolved matchups on teacher view
- Stale matchup time-based hints
- Secondary tiebreaker beyond head-to-head
- Exact round progress format on teacher dashboard

</decisions>

<specifics>
## Specific Ideas

- Teacher wants to be able to manually decide matchups or mark ties when no students vote — ensures brackets can always complete
- Final standings table should highlight the champion after celebration dismisses
- Round progress should feel lightweight and informational, not distracting

</specifics>

<deferred>
## Deferred Ideas

- Force-complete option for individual rounds (teacher override to force-resolve all matchups in a round) — new capability, future phase
- Student-facing round progress indicators — not needed for bug fix scope

</deferred>

---

*Phase: 28-rr-all-at-once-completion*
*Context gathered: 2026-02-26*
