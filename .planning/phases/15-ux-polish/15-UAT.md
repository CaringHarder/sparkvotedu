---
status: diagnosed
phase: 15-ux-polish
source: [15-01-SUMMARY.md, 15-02-SUMMARY.md]
started: 2026-02-16T20:00:00Z
updated: 2026-02-16T21:15:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Full-Width Visual Bracket Placement
expected: In the bracket creation wizard, go to Step 2 (Entrants). Toggle to "Visual Placement" mode. The bracket visualization should expand to fill the full available dashboard width -- noticeably wider than the default ~672px constrained layout.
result: issue
reported: "does something funny with the directions at the top when in visual placement full screen -- Add Entrants header and description text wraps to narrow column"
severity: cosmetic

### 2. Input Controls Stay Readable in Full-Width Mode
expected: While in full-width visual placement mode (Step 2), the input controls above the bracket (tab buttons, manual entry, CSV upload, topic picker, entrant counter, placement toggle) should remain at a narrower readable width (~672px max), not stretch to full width.
result: pass

### 3. Other Wizard Steps Unaffected
expected: Steps 1 (Info) and 3 (Review) in the bracket creation wizard should remain at the normal constrained width (~672px). Switching between steps should not cause any layout jumps or regressions. List reorder mode in Step 2 should also stay constrained.
result: pass

### 4. Join Class Button in Landing Page Header
expected: On the landing page (logged out), the navigation bar should show a "Join Class" button (or "Join" on mobile) before the Log In and Sign Up buttons. Clicking it should navigate to /join.
result: issue
reported: "pass, but now we should remove anything with join class in the hero or body -- redundant Student? Enter your class code section in hero"
severity: cosmetic

### 5. Landing Page Logo Sizing
expected: On the landing page, both the nav bar logo and the hero section logo should display at correct proportions (16:9 aspect ratio) -- not stretched or squished. The nav logo should fit neatly within the header bar.
result: issue
reported: "pass on proportions, but hero logo should be much bigger and better contrast the blue background. Nav logo in corner uses black font on black background -- needs white/light variant for dark backgrounds"
severity: cosmetic

### 6. Hero-to-Content Gradient Transition
expected: On the landing page, there should be a smooth gradient transition from the blue hero section to the white content sections below it -- no hard color cut-off between the two areas.
result: pass

## Summary

total: 6
passed: 3
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "Visual bracket placement expands to full width with properly laid out header text"
  status: failed
  reason: "User reported: Add Entrants header and description text wraps to narrow column in full-width visual placement mode"
  severity: cosmetic
  test: 1
  root_cause: "CardHeader gets max-w-2xl constraint (bracket-form.tsx:693) inside full-width Card, combined with @container/card-header grid layout in card.tsx:23 causes text to wrap in narrow column"
  artifacts:
    - path: "src/components/bracket/bracket-form.tsx"
      issue: "CardHeader max-w-2xl constraint too narrow in full-width mode (line 693)"
    - path: "src/components/ui/card.tsx"
      issue: "@container/card-header grid layout compounds narrow wrapping (line 23)"
  missing:
    - "Remove max-w-2xl from CardHeader in full-width mode, or let CardContent handle width constraints instead"

- truth: "Join Class action only appears in nav header, not duplicated in hero body"
  status: failed
  reason: "User reported: redundant Student? Enter your class code section still in hero body now that Join Class is in nav"
  severity: cosmetic
  test: 4
  root_cause: "HomeJoinInput component and 'Student? Enter your class code' text at hero-section.tsx:54-60 not removed after Join Class button added to nav"
  artifacts:
    - path: "src/components/landing/hero-section.tsx"
      issue: "Redundant class code input section at lines 54-60"
  missing:
    - "Remove the Student class code input section (lines 54-60) from hero-section.tsx"

- truth: "Landing page logos display with proper contrast against their backgrounds"
  status: failed
  reason: "User reported: hero logo should be much bigger and better contrast the blue background; nav logo uses black font on black background -- needs white/light variant"
  severity: cosmetic
  test: 5
  root_cause: "logo-horizontal.png has light/dark text designed for light backgrounds; used against blue hero gradient and dark nav background without contrast-appropriate variants"
  artifacts:
    - path: "src/components/landing/hero-section.tsx"
      issue: "Hero logo too small (w-56/w-72/w-80) and wrong variant for blue background (lines 14-21)"
    - path: "src/components/landing/landing-nav.tsx"
      issue: "Nav logo uses dark-text variant on dark background (lines 13-28)"
  missing:
    - "White/light logo variant for hero on blue background"
    - "Increase hero logo size (w-64/w-80/w-96)"
    - "Ensure nav logo has adequate contrast for both light and dark modes"
