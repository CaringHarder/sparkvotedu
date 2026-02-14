---
status: diagnosed
trigger: "Live dashboard and student bracket page don't show bracket-type-specific views"
created: 2026-02-01T00:00:00Z
updated: 2026-02-01T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Three independent root causes across two pages and one API endpoint
test: Code reading and comparison with working bracket-detail.tsx
expecting: Missing bracketType routing in live-dashboard and student page, plus missing data in state API
next_action: Report diagnosis

## Symptoms

expected: Double-elimination brackets show DE tabs (winners/losers/grand_finals), round-robin brackets show standings+matchup grid, predictive brackets show prediction UI -- on both the live dashboard and student page
actual: All bracket types fall back to single-elimination BracketDiagram on live dashboard and student page
errors: None (silent fallback, no crash)
reproduction: Create any non-single-elimination bracket, go live, observe live dashboard or student view
started: These pages were originally built for single-elimination only; bracket-type routing was never added

## Eliminated

(none needed -- root cause confirmed on first hypothesis)

## Evidence

- timestamp: 2026-02-01T00:01:00Z
  checked: bracket-detail.tsx lines 37-39 and 151-222
  found: BracketDetail correctly checks bracketType and routes to PredictiveBracket, RoundRobinStandings+RoundRobinMatchups, DoubleElimDiagram, or BracketDiagram
  implication: This is the reference implementation showing how routing SHOULD work

- timestamp: 2026-02-01T00:02:00Z
  checked: live-dashboard.tsx (entire file, 452 lines)
  found: LiveDashboard ALWAYS renders BracketDiagram (line 431). No bracketType check, no imports for DoubleElimDiagram, RoundRobinStandings, RoundRobinMatchups, or PredictiveBracket. The bracket prop DOES include bracketType (set on line 86 of live/page.tsx), but LiveDashboard never reads it.
  implication: ROOT CAUSE 1 -- LiveDashboard has no type-based routing

- timestamp: 2026-02-01T00:03:00Z
  checked: student bracket page toBracketWithDetails() function, lines 266-327
  found: Line 306 HARDCODES bracketType to 'single_elimination' regardless of actual bracket type. Also hardcodes bracketRegion to null (line 280), roundRobinRound to null (line 282), and zeroes out all type-specific config fields (predictionStatus, roundRobinPacing, etc. lines 314-319).
  implication: ROOT CAUSE 2 -- Student page loses all bracket type information during data conversion

- timestamp: 2026-02-01T00:04:00Z
  checked: /api/brackets/[bracketId]/state/route.ts (entire file, 79 lines)
  found: The state API response (lines 63-72) returns only: id, name, status, viewingMode, showVoteCounts, votingTimerSeconds, entrants, matchups. It does NOT return: bracketType, bracketRegion (per matchup), roundRobinRound (per matchup), predictionStatus, roundRobinPacing, roundRobinVotingStyle, roundRobinStandingsMode, predictiveMode, predictiveResolutionMode, playInEnabled, maxEntrants.
  implication: ROOT CAUSE 3 -- Even if student page tried to use bracketType, the API doesn't provide it

- timestamp: 2026-02-01T00:05:00Z
  checked: student page view routing logic, lines 232-259
  found: Student page only routes on viewingMode ('simple' vs 'advanced'), never on bracketType. SimpleVotingView and AdvancedVotingView both render only BracketDiagram internally. No imports for DE/RR/Predictive components.
  implication: Student page would need entirely new routing logic even after API is fixed

- timestamp: 2026-02-01T00:06:00Z
  checked: BracketStateResponse interface in student page, lines 14-35
  found: The TypeScript interface for the state API response has no bracketType, bracketRegion, or roundRobinRound fields -- confirming the API gap at the type level
  implication: Fix requires changes at interface, API, conversion, and rendering layers

## Resolution

root_cause: |
  THREE INDEPENDENT ROOT CAUSES that all contribute to the same symptom:

  1. LIVE DASHBOARD (live-dashboard.tsx): No bracketType routing at all.
     The component always renders BracketDiagram. It receives bracket.bracketType
     from the page but never checks it. Missing imports for DE/RR/Predictive components.

  2. STUDENT PAGE DATA CONVERSION (student bracket page.tsx, toBracketWithDetails):
     Line 306 hardcodes `bracketType: 'single_elimination'`. All type-specific
     fields (bracketRegion, roundRobinRound, predictionStatus, roundRobinPacing, etc.)
     are hardcoded to null/false/default values.

  3. STATE API MISSING FIELDS (api/brackets/[bracketId]/state/route.ts):
     The API endpoint does not return bracketType, or any type-specific bracket
     fields. Matchup objects lack bracketRegion and roundRobinRound. This means
     even if the student page tried to route by type, the data isn't available.

fix: (not applied -- diagnosis only)
verification: (not applied)
files_changed: []
