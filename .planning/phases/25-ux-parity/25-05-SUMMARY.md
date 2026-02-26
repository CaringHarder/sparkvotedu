---
phase: 25-ux-parity
plan: 05
status: complete
started: 2026-02-26
completed: 2026-02-26
duration: 1min
tasks_completed: 1
tasks_total: 1
files_modified: 2
one_liner: "Optimistic rename display in bracket and poll card h3 elements eliminates stale name flash"
gap_closure: true
---

## Summary

Fixed the stale name flash after inline rename on bracket and poll cards by rendering the optimistic local state (`renameValue`) instead of the server prop (`bracket.name` / `poll.question`) in the `<h3>` display element.

## Changes

| File | Change |
|------|--------|
| src/components/bracket/bracket-card.tsx | Changed `<h3>` to render `{renameValue}` instead of `{bracket.name}` |
| src/components/poll/poll-card.tsx | Changed `<h3>` to render `{renameValue}` instead of `{poll.question}` |

## Verification

- `renameValue` used in h3 elements in both card components
- All other references to `bracket.name` and `poll.question` remain unchanged
- TypeScript compilation passes

## Outcome

After inline rename and pressing Enter, the new name appears immediately without any flash of the old name. The `renameValue` local state serves as the optimistic display value.
