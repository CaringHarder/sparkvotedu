---
phase: quick-28
plan: 01
subsystem: poll-ui
tags: [ui, bar-chart, accessibility, contrast]
key-files:
  modified:
    - src/components/poll/bar-chart.tsx
decisions:
  - "Badge inside motion.div (right-1) so it animates with bar fill"
  - "bg-white/90 with text-gray-900 for universal contrast on all bar colors"
  - "overflow-visible on bar container so badge extends past narrow bars"
metrics:
  duration: "44s"
  completed: "2026-03-08"
  tasks_completed: 1
  tasks_total: 1
---

# Quick 28: Bar Chart Larger Vote Count Badge Summary

High-contrast circular badge overlay replaces hard-to-read white text inside bar chart bars, always visible regardless of bar width.

## What Changed

Replaced the conditional inline vote count text (`text-white`, hidden when bar < 15% width) with an always-visible circular badge (`rounded-full`, `bg-white/90`, `text-gray-900`). Removed `overflow-hidden` from the bar container so badges on narrow bars can extend visually. Badge scales between normal (`h-7 w-7 text-sm`) and presentation mode (`h-11 w-11 text-xl`).

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | a1277ae | Replace bar chart vote count with high-contrast circular badge |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
