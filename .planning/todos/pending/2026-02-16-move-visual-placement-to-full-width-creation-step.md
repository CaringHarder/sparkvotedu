---
created: 2026-02-16T11:55:48.185Z
title: Move visual placement to full-width creation step
area: ui
files:
  - src/components/bracket/bracket-form.tsx
  - src/components/bracket/visual-placement/placement-bracket.tsx
  - src/components/bracket/visual-placement/placement-matchup-grid.tsx
---

## Problem

During bracket creation, visual placement is squeezed into the narrow entrant column in Step 2 of the creation wizard. The edit page already uses the full viewport and works much better for visual placement. The creation wizard should match that pattern — visual placement benefits from more horizontal space to show the entrant pool sidebar + matchup grid without truncating names.

## Solution

Move visual placement into its own full-width step in the creation wizard (e.g., Step 3 before the final review step), similar to how the edit page renders it. This gives the entrant pool and matchup grid the full viewport width, making entrant names readable and the placement experience more comfortable.
