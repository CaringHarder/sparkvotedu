---
created: 2026-02-15T19:10:29.028Z
title: Add visual bracket placement with drag-and-drop seeding
area: ui
files:
  - src/components/bracket/bracket-form.tsx
  - src/components/bracket/bracket-diagram.tsx
  - src/lib/bracket/seeding.ts
---

## Problem

The current bracket creation flow only offers a linear list for reordering entrants (drag-and-drop in a numbered list). This assumes teachers understand traditional bracketology seeding (1st seed vs last seed, NCAA-style). Many teachers may not understand this convention, or may want non-standard matchups (e.g., 1st seed vs 2nd seed in round 1). There's no way to visually see and adjust who plays whom directly on the bracket diagram.

## Solution

Add a visual bracket placement mode in the bracket creation/edit flow where teachers can:
- See the actual bracket diagram with empty slots
- Drag entrants from a pool directly into bracket positions
- Swap entrants between positions by dragging within the bracket
- See matchup pairings update in real-time as they place entrants
- Option to start with standard seeding (current behavior) or blank bracket
- Support both the linear list reorder (current) and visual bracket placement as togglable modes

Key considerations:
- Should work alongside existing seed-based ordering (not replace it)
- Must handle bye slots correctly for non-power-of-2 brackets
- Mobile-friendly touch drag support needed
- Preview of resulting R1 matchups should update live as entrants are placed
