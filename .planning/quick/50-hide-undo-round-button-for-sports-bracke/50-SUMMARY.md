---
phase: "50"
plan: 1
subsystem: ui
tags: [sports-bracket, undo-round, vote-indicator, dark-mode]
key-files:
  modified:
    - src/components/teacher/live-dashboard.tsx
    - src/components/teacher/participation-sidebar.tsx
duration: 2min
completed: 2026-03-23
---

# Quick Task 50: Hide undo round button and fix vote indicators

## Changes
- **Undo round button**: Hidden for sports brackets (`!isSports` guard) — ESPN controls results, undo doesn't function correctly
- **Per-student vote indicators**: Voted status now takes priority over disconnected state in tile styling. Students who submitted predictions but later disconnected now show faded green tiles instead of plain gray.
- **Dark mode**: Added proper dark mode variants for voted tiles (dark:bg-green-950, dark:border-green-700, dark:text-green-300)

## Commit
- `b34c9a5`: fix: hide undo round for sports brackets, fix per-student vote indicators
