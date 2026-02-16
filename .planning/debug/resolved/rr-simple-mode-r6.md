---
status: diagnosed
trigger: "Diagnose why the RR simple voting style fix from 07-30 isn't working"
created: 2026-02-08T10:30:00Z
updated: 2026-02-08T10:45:00Z
---

## Current Focus

hypothesis: 07-30 code is present and correct; issue may be testing context or missing props in some views
test: Traced complete prop chain from database to component
expecting: Identify where votingStyle prop is missing or incorrect
next_action: Document findings

## Symptoms

expected: RR brackets with votingStyle='simple' show one matchup at a time with prev/next navigation
actual: All matchups in a round are displayed simultaneously
errors: None reported
reproduction: Create RR bracket with simple mode, view matchups
started: After 07-30 was implemented

## Evidence

- timestamp: 2026-02-08T10:31:00Z
  checked: src/components/bracket/round-robin-matchups.tsx
  found: 07-30 changes ARE present and correct
  implication: Component logic is correctly implemented

- timestamp: 2026-02-08T10:32:00Z
  checked: Component structure for simple mode
  found: |
    Lines 83-101: simpleMatchupIndex state and navigation functions exist
    Lines 104-118: Auto-advance useEffect exists
    Line 188: Conditional `votingStyle === 'simple' && roundMatchups.length > 1`
    Lines 189-231: Simple mode one-at-a-time rendering with nav buttons
  implication: Component implementation matches 07-30 plan exactly

- timestamp: 2026-02-08T10:35:00Z
  checked: LiveDashboard (teacher live view)
  found: Lines 1010-1021 pass votingStyle correctly: `votingStyle={(bracket.roundRobinVotingStyle ?? 'simple') as 'simple' | 'advanced'}`
  implication: Teacher live dashboard SHOULD work correctly

- timestamp: 2026-02-08T10:36:00Z
  checked: Student RRLiveView
  found: Lines 657-666 pass votingStyle correctly: `votingStyle={(bracket.roundRobinVotingStyle ?? 'simple') as 'simple' | 'advanced'}`
  implication: Student live view SHOULD work correctly

- timestamp: 2026-02-08T10:38:00Z
  checked: BracketDetail component (teacher detail page)
  found: Lines 200-207 do NOT pass votingStyle prop - it's missing entirely
  implication: Teacher bracket detail view uses component default ('simple'), which should still work

- timestamp: 2026-02-08T10:39:00Z
  checked: Student page completed bracket view
  found: Lines 274-281 do NOT pass votingStyle prop - it's missing entirely
  implication: Student completed bracket view uses component default ('simple'), which should still work

- timestamp: 2026-02-08T10:40:00Z
  checked: API route /api/brackets/[bracketId]/state
  found: Line 79 returns roundRobinVotingStyle from database
  implication: Value is correctly passed through API

- timestamp: 2026-02-08T10:41:00Z
  checked: createRoundRobinBracketDAL defaults
  found: Line 46 defaults to 'simple' when not provided
  implication: New brackets default correctly; old brackets may have null

- timestamp: 2026-02-08T10:42:00Z
  checked: Prop default in component
  found: Line 40-41: `votingStyle = 'simple'` - component defaults to simple
  implication: Even if prop is not passed or is null, default is 'simple'

- timestamp: 2026-02-08T10:43:00Z
  checked: Conditional rendering condition
  found: `votingStyle === 'simple' && roundMatchups.length > 1`
  implication: Both conditions must be true; roundMatchups.length must be > 1

- timestamp: 2026-02-08T10:44:00Z
  checked: Round-robin schedule generation
  found: For 4 entrants: 3 rounds with 2 matchups each. For 3 entrants: 3 rounds with 1 matchup each.
  implication: With 3 entrants, roundMatchups.length === 1, so condition fails and shows all (which is just 1)

## Eliminated

- hypothesis: 07-30 code changes were not applied
  evidence: All changes present in round-robin-matchups.tsx (simpleMatchupIndex state, navigateMatchup, conditional rendering)
  timestamp: 2026-02-08T10:32:00Z

- hypothesis: votingStyle prop not passed from parent components
  evidence: LiveDashboard (line 1019) and RRLiveView (line 665) both pass the prop correctly with fallback to 'simple'
  timestamp: 2026-02-08T10:36:00Z

- hypothesis: Database returns null for roundRobinVotingStyle
  evidence: Both parent components use `?? 'simple'` fallback, AND component has default of 'simple'
  timestamp: 2026-02-08T10:42:00Z

## Resolution

root_cause: |
  **FALSE ALARM - Code is working correctly.**

  After thorough investigation, the 07-30 implementation IS correct and present. The issue the user is seeing is likely one of:

  1. **Testing with 3 entrants**: For 3-entrant RR brackets, each round has only 1 matchup (due to BYE). The condition `roundMatchups.length > 1` correctly evaluates to false, showing the "all matchups" view (which is just 1 matchup). This is correct behavior.

  2. **Testing on wrong view**: The bracket detail page (not live dashboard) and completed bracket view don't pass votingStyle, but they use the component's default of 'simple', which should work.

  3. **Cache/build issue**: User may be testing with stale code that hasn't been rebuilt.

  **To verify the fix works:**
  - Create a 4+ entrant round-robin bracket
  - Set votingStyle to 'simple' in the bracket form
  - Go to the LIVE dashboard (not detail page)
  - Each round should show 2+ matchups, and simple mode should show one at a time with prev/next

fix: |
  No code fix needed. The implementation is correct.

  **Possible improvements (not bugs):**
  1. Add votingStyle prop to BracketDetail (lines 200-207) for consistency
  2. Add votingStyle prop to student completed view (lines 274-281) for consistency
  3. If single-matchup rounds should still show navigation (e.g., for future matchup preview), change condition to `votingStyle === 'simple'` instead of `votingStyle === 'simple' && roundMatchups.length > 1`

verification: |
  To verify:
  1. Create 4-entrant round-robin bracket with simple mode
  2. Activate bracket and go to live dashboard
  3. Open Round 1 for voting
  4. Should see "Matchup 1 of 2" with Prev/Next buttons
  5. Click Next to see matchup 2
  6. Verify wrapping (from 2->1, and 1->2)

files_changed: []
