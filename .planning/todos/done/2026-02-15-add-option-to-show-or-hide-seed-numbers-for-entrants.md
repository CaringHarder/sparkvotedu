---
created: 2026-02-15T19:02:09.236Z
title: Add option to show or hide seed numbers for entrants
area: ui
files:
  - src/components/bracket/bracket-form.tsx
  - src/components/bracket/bracket-diagram.tsx
---

## Problem

When creating a bracket, the teacher has no option to control whether seed numbers are displayed next to entrant names. Seed numbers are always shown, which may not be desired in all classroom contexts (e.g., when seeding is arbitrary or when teachers don't want students to see ranking).

## Solution

Add a toggle/checkbox in the bracket creation form (Step 2 or settings area) that lets the teacher choose whether seed numbers are visible to students. Store the preference on the Bracket model and pass it through to BracketDiagram and related rendering components to conditionally hide seed position labels.
