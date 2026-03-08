---
phase: quick-25
plan: 01
subsystem: poll-presentation
tags: [ui, presentation, projector, charts]
key-files:
  created: []
  modified:
    - src/components/poll/bar-chart.tsx
    - src/components/poll/donut-chart.tsx
    - src/components/poll/presentation-mode.tsx
    - src/components/poll/poll-results.tsx
decisions:
  - "large prop approach keeps normal views pixel-identical while scaling presentation mode"
  - "max-w-screen-2xl (1536px) chosen over full-width for slight projector margins"
metrics:
  duration: 2min
  completed: "2026-03-08"
  tasks: 2
  files: 4
---

# Quick 25: Enlarge Poll Results Fullscreen Display Summary

Projector-sized charts in presentation mode via `large` prop on bar/donut charts and wider container layout.

## What Was Done

### Task 1: Add large prop to bar chart and donut chart (537f58a)

Added optional `large?: boolean` prop to both `AnimatedBarChart` and `DonutChart`. When true:

- **Bar chart:** h-8 -> h-14 bars, text-sm -> text-2xl labels, text-xs -> text-lg count inside bars, space-y-3 -> space-y-5
- **Donut chart:** h-48/h-56 -> h-80/h-96 SVG, text-[22px] -> text-[36px] center total, text-[10px] -> text-[16px] "votes" label, text-xs -> text-lg legend, h-2.5/w-2.5 -> h-4/w-4 legend dots, gap-x-4/gap-y-1 -> gap-x-6/gap-y-2

Default (no prop) renders identically to before.

### Task 2: Widen presentation container and pass large prop (e7ca610)

- **presentation-mode.tsx:** max-w-5xl -> max-w-screen-2xl (1536px), padding p-6 md:p-10 -> p-6 md:p-12 lg:p-16, title text-3xl/4xl -> text-4xl/5xl
- **poll-results.tsx:** Pass `large` to charts only in the `presenting` block (lines 270-273). Normal chart renders (lines 222-227) unchanged.

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- TypeScript compilation: clean (both tasks)
- Normal poll results: no `large` prop passed, identical behavior
- Presentation mode: `large` prop enables projector-sized rendering

## Self-Check: PASSED
