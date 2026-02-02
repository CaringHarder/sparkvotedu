---
status: investigating
trigger: "RR Simple vs Advanced Matchup Card Layout Not Distinct"
created: 2026-02-02T00:00:00Z
updated: 2026-02-02T00:01:00Z
---

## Current Focus

hypothesis: CONFIRMED - votingStyle prop only affects card styling (border/padding/background), NOT layout filtering (one-at-a-time vs full round)
test: code review complete - documented all findings
expecting: documentation complete with required changes identified
next_action: final summary

## Symptoms

expected: Simple mode should show ONE matchup card at a time (sequential with prev/next), Advanced mode should show ENTIRE round at once
actual: No visual distinction in layout behavior between simple and advanced modes - all matchups shown in both modes
errors: None
reproduction: View RR bracket in simple mode - all matchups show. View in advanced mode - all matchups show.
started: After implementation of votingStyle prop in 07-26

## Eliminated

## Evidence

- timestamp: 2026-02-02T00:00:00Z
  checked: round-robin-matchups.tsx lines 145-161
  found: roundMatchups.map() renders ALL matchups in the expanded round. No filtering based on votingStyle
  implication: votingStyle currently ONLY affects individual card styling, not the number of cards displayed

- timestamp: 2026-02-02T00:00:01Z
  checked: round-robin-matchups.tsx MatchupCard component (lines 185-390)
  found: votingStyle controls CSS classes (isAdvanced flag at line 206) for border/padding/shadow/gradient
  implication: Simple mode: 'border p-2.5'. Advanced mode: 'border-2 p-4 shadow-sm' + gradient bg + vote counts display (lines 381-387)

- timestamp: 2026-02-02T00:00:02Z
  checked: live-dashboard.tsx line 1013
  found: Teacher view passes votingStyle from bracket.roundRobinVotingStyle (defaults to 'simple')
  implication: Teacher receives correct votingStyle prop

- timestamp: 2026-02-02T00:00:03Z
  checked: Student page.tsx RRLiveView line 665
  found: Student view passes votingStyle from bracket.roundRobinVotingStyle (defaults to 'simple')
  implication: Student receives correct votingStyle prop

- timestamp: 2026-02-02T00:00:04Z
  checked: round-robin-matchups.tsx lines 145-161 rendering logic
  found: When round is expanded, ALL matchups rendered via roundMatchups.map() with NO filtering
  implication: Currently displays ALL matchups regardless of votingStyle (simple vs advanced)

- timestamp: 2026-02-02T00:00:05Z
  checked: Overall architecture
  found: votingStyle prop is correctly plumbed from bracket config → LiveDashboard/RRLiveView → RoundRobinMatchups → MatchupCard
  implication: Infrastructure is in place, just missing the filtering logic

## Resolution

root_cause: votingStyle prop implementation incomplete - only affects card styling CSS, missing layout filtering logic for simple mode (one-at-a-time with navigation)

fix: Need to implement in round-robin-matchups.tsx:
1. Add local state for currentMatchupIndex (useState) when votingStyle='simple'
2. Filter roundMatchups to show ONLY roundMatchups[currentMatchupIndex] in simple mode
3. Add Previous/Next navigation buttons to cycle through matchups
4. Keep existing "show all matchups" behavior when votingStyle='advanced'
5. Navigation should wrap (last matchup → first matchup, first → last)
6. Show "Matchup X of Y" indicator in simple mode

verification:
files_changed: [src/components/bracket/round-robin-matchups.tsx]
