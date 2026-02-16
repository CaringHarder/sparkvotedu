---
status: diagnosed
trigger: "Presentation mode (F key toggle, full-screen dark overlay) becomes unavailable once a predictive auto-resolution bracket is marked as completed. Works during revealing phase but disappears on completed state."
created: 2026-02-13T00:00:00Z
updated: 2026-02-13T00:00:00Z
---

## Current Focus

hypothesis: The 'completed' status branch in TeacherPredictiveView does not render presentation mode UI or check presentationMode state
test: Compare the 'revealing' branch JSX with the 'completed' branch JSX
expecting: The 'completed' branch is missing the presentation mode overlay, the Maximize2 toggle button, and the tab switcher
next_action: CONFIRMED - report root cause

## Symptoms

expected: After marking bracket as completed, teacher should still be able to press F or click the presentation mode button to enter full-screen dark overlay showing bracket + leaderboard
actual: Presentation mode button and overlay are completely absent in the completed state; pressing F does nothing visible (the state variable toggles but nothing renders it)
errors: None (silent UI omission)
reproduction: 1. Open auto-resolution predictive bracket as teacher. 2. Progress through to 'revealing' state. 3. Confirm presentation mode works (F key or button). 4. Click 'Complete Bracket'. 5. Notice presentation mode is gone.
started: Since implementation of the completed state branch

## Eliminated

(none needed - root cause found on first hypothesis)

## Evidence

- timestamp: 2026-02-13T00:00:00Z
  checked: TeacherPredictiveView function in predictive-bracket.tsx, auto-mode branch structure
  found: |
    The function uses early returns based on predictionStatus, structured as:
    - Line 177: 'predictions_open' | 'draft' -> no presentation mode (expected)
    - Line 237: 'tabulating' -> no presentation mode (expected)
    - Line 255: 'previewing' -> no presentation mode (expected)
    - Line 278: 'revealing' -> HAS presentation mode (lines 282-367 for overlay, lines 400-407 for toggle button)
    - Line 457: 'completed' -> NO presentation mode (lines 457-483)
  implication: The 'completed' branch was written as a minimal static view without carrying over presentation mode capabilities from the 'revealing' branch

- timestamp: 2026-02-13T00:00:00Z
  checked: The F key useEffect handler (lines 104-114)
  found: |
    The useEffect at line 104 registers the F key listener unconditionally at mount time and correctly toggles the `presentationMode` state variable.
    This listener IS active during 'completed' state. The state variable DOES toggle.
    However, the 'completed' branch return (lines 457-483) never checks `presentationMode` and never renders the presentation overlay.
  implication: The F key listener is a red herring - it works fine. The issue is purely in the render output of the 'completed' branch.

- timestamp: 2026-02-13T00:00:00Z
  checked: What the 'completed' branch renders vs what it should render
  found: |
    CURRENT 'completed' branch (lines 457-483):
    - Status header with badge + "All rounds revealed" text
    - BracketDiagram (always visible, not tabbed)
    - PredictionLeaderboard (always visible, not tabbed)
    - NO presentation mode overlay check
    - NO Maximize2 button
    - NO tab switcher (bracket/leaderboard tabs)

    WHAT 'revealing' branch has that 'completed' should also have:
    1. `if (presentationMode)` check -> renders full-screen dark overlay (lines 282-367)
    2. Maximize2 icon button to enter presentation mode (lines 400-407)
    3. Tab switcher between bracket and leaderboard views (lines 411-451)
  implication: Three distinct pieces are missing from the 'completed' branch

## Resolution

root_cause: |
  In `src/components/bracket/predictive-bracket.tsx`, the `TeacherPredictiveView` function's
  `completed` status branch (lines 457-483) is a stripped-down static view that omits all
  presentation mode functionality. Specifically, it is missing:

  1. The `if (presentationMode)` conditional that renders the full-screen dark overlay
     (compare with lines 282-367 in the 'revealing' branch)
  2. The Maximize2 icon button that allows clicking to enter presentation mode
     (compare with lines 400-407 in the 'revealing' branch)
  3. The bracket/leaderboard tab switcher UI (compare with lines 411-451)

  The F key event listener (lines 104-114) IS still active and toggles the `presentationMode`
  state variable, but the 'completed' branch never reads that state, so the toggle has
  no visible effect.

fix: (not applied - diagnosis only)
verification: (not applied - diagnosis only)
files_changed: []
