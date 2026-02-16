---
status: diagnosed
trigger: "Duplicate DE Celebration on Teacher Page"
created: 2026-02-02T00:00:00Z
updated: 2026-02-02T00:50:00Z
---

## Current Focus

hypothesis: Fallback celebration effect has missing dependency causing it to fire when it shouldn't
test: CONFIRMED - hasShownRevealRef not in dependency array of fallback effect
expecting: Root cause identified - fallback fires at T+2s before chained celebration at T+5s
next_action: Investigation complete - root cause documented

## Symptoms

expected: Single celebration sequence (WinnerReveal -> CelebrationScreen) when DE bracket completes
actual: OLD celebration fires first, THEN new chained celebration fires after
errors: None - both celebrations work, just duplicated
reproduction: Complete a double-elimination bracket on teacher page
started: After Plan 07-25 added new chained celebration system

## Eliminated

## Evidence

- timestamp: 2026-02-02T00:05:00Z
  checked: live-dashboard.tsx celebration triggers
  found: Three celebration trigger paths exist
  implication: Multiple paths can fire celebration independently

- timestamp: 2026-02-02T00:10:00Z
  checked: Lines 300-313 of live-dashboard.tsx
  found: Two celebration triggering mechanisms:
    1. handleRevealComplete callback (line 301-305): Fires 1 second after WinnerReveal dismisses
    2. Fallback useEffect (line 308-313): Fires 2 seconds if bracketCompleted && !revealState && !hasShownRevealRef
  implication: These are the NEW chained celebration paths added in Plan 07-25

- timestamp: 2026-02-02T00:15:00Z
  checked: Lines 282-298 of live-dashboard.tsx (fallback reveal effect)
  found: Fallback effect that triggers WinnerReveal when bracketCompleted fires
  implication: This fallback was added to handle race conditions where status-transition detection misses the GF decision

- timestamp: 2026-02-02T00:20:00Z
  checked: useRealtimeBracket hook (use-realtime-bracket.ts)
  found: bracketCompleted state is set to true when:
    1. Bracket status === 'completed' in fetch response (line 94-95)
    2. bracket_update event with type === 'bracket_completed' is received (line 147-149)
  implication: bracketCompleted can be set to true INDEPENDENTLY of the WinnerReveal status-transition detection

- timestamp: 2026-02-02T00:25:00Z
  checked: Lines 230-276 of live-dashboard.tsx (status-transition detection)
  found: Status-transition effect that watches for newly decided final matchups and triggers WinnerReveal
  implication: This is the PRIMARY path for triggering WinnerReveal (set hasShownRevealRef and setRevealState)

- timestamp: 2026-02-02T00:30:00Z
  checked: Execution flow analysis
  found: When DE bracket completes, the following sequence occurs:
    1. Final GF matchup is decided
    2. Status-transition effect (lines 230-276) detects it, sets hasShownRevealRef=true, triggers WinnerReveal
    3. WinnerReveal completes, calls handleRevealComplete
    4. handleRevealComplete chains to celebration after 1 second
    5. SIMULTANEOUSLY: bracketCompleted flag is set by useRealtimeBracket
    6. Fallback celebration effect (lines 308-313) evaluates its condition
    7. Condition is: bracketCompleted && !revealState && !hasShownRevealRef
  implication: Race condition in step 6-7 is the root cause

- timestamp: 2026-02-02T00:35:00Z
  checked: Fallback celebration effect dependency array (line 313)
  found: Dependencies are [bracketCompleted, revealState]
  missing: hasShownRevealRef is NOT in dependency array
  implication: Effect does NOT re-evaluate when hasShownRevealRef changes, only when bracketCompleted or revealState changes

- timestamp: 2026-02-02T00:40:00Z
  checked: Race condition timing
  found: Critical timing sequence:
    1. Status-transition sets hasShownRevealRef=true and revealState={...}
    2. handleRevealComplete is called, sets revealState=null after 1 second
    3. Fallback celebration effect (lines 308-313) triggers when revealState changes to null
    4. At that moment: bracketCompleted=true, revealState=null, hasShownRevealRef=true
    5. Effect checks !hasShownRevealRef.current which is true (should prevent firing)
    6. BUT: Effect already scheduled celebration before hasShownRevealRef was set
  implication: The fallback effect fires BEFORE the primary reveal path completes

- timestamp: 2026-02-02T00:45:00Z
  checked: Why old celebration fires first
  found: The "old" celebration is actually the fallback celebration effect (lines 308-313)
    - This fallback was intended as a safety net for missed reveals
    - It fires 2 seconds after bracketCompleted is true
    - The "new" celebration (from handleRevealComplete) fires 1 second after WinnerReveal dismisses (which takes 4 seconds)
    - So fallback fires at T+2 seconds, chained celebration fires at T+5 seconds
  implication: The fallback is firing when it shouldn't because it's not properly guarded

## Resolution

root_cause: Fallback celebration effect (lines 308-313) fires when it shouldn't because hasShownRevealRef is NOT in its dependency array. When bracketCompleted becomes true, the fallback effect schedules celebration for 2 seconds later. Meanwhile, the primary path triggers WinnerReveal, sets hasShownRevealRef=true, and chains to celebration after 5 seconds (4-second reveal + 1-second delay). The fallback's setTimeout executes first (at T+2s) before the chained celebration (at T+5s), causing duplicate celebrations.

fix: Add hasShownRevealRef to the fallback celebration effect's dependency array, OR add hasShownRevealRef.current check INSIDE the effect before scheduling the timeout

verification: Test by completing a DE bracket and verifying only ONE celebration fires (after WinnerReveal)

files_changed: [src/components/teacher/live-dashboard.tsx]
