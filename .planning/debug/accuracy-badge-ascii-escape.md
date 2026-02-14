---
status: diagnosed
trigger: "student accuracy badges on bracket matchup cards show raw ASCII escape text instead of intended icon"
created: 2026-02-13T00:00:00Z
updated: 2026-02-13T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Double-escaped unicode strings render as literal text
test: Searched for escaped unicode patterns in source
expecting: Found exact cause
next_action: Return diagnosis

## Symptoms

expected: Accuracy badges on bracket matchup cards should show checkmark/cross icons
actual: Raw ASCII escape text "\u27" appears instead of icons
errors: Visual rendering issue - literal escape text displayed
reproduction: View student progressive reveal view for auto-mode predictive brackets
started: Unknown

## Eliminated

## Evidence

- timestamp: 2026-02-13
  checked: prediction-reveal.tsx lines 393 and 417
  found: JSX expressions use double-escaped unicode: {'\\u2713'} and {'\\u2717'}
  implication: The double backslash makes JavaScript treat this as a literal string "\\u2713" instead of the unicode character U+2713 (checkmark)

- timestamp: 2026-02-13
  checked: bracket-diagram.tsx lines 330 and 398
  found: The base bracket diagram correctly uses actual unicode characters in JSX: {' ✓'} (literal checkmark character)
  implication: Confirms the correct approach is to use actual characters or properly escaped unicode

- timestamp: 2026-02-13
  checked: Full codebase search for similar pattern
  found: Only 2 instances exist, both in prediction-reveal.tsx
  implication: Bug is isolated to this one file

## Resolution

root_cause: Lines 393 and 417 of prediction-reveal.tsx use double-escaped unicode sequences {'\\u2713'} and {'\\u2717'}. The double backslash (\\) prevents JavaScript from interpreting the escape sequence - instead of producing the unicode characters (checkmark and ballot X), it produces the literal strings "\u2713" and "\u2717" which render as raw text in the SVG.
fix: Not applied (diagnose-only mode)
verification: Not applicable
files_changed: []
