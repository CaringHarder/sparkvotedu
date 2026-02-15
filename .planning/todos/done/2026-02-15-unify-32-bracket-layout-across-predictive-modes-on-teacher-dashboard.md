---
created: 2026-02-15T13:36:11.970Z
title: Unify 32+ bracket layout across predictive modes on teacher dashboard
area: ui
files:
  - src/components/bracket/predictive-bracket.tsx
  - src/components/bracket/live-dashboard.tsx
  - src/components/bracket/bracket-detail.tsx
  - src/components/bracket/region-bracket-view.tsx
  - src/components/student/advanced-voting-view.tsx
  - src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx
---

## Problem

Teacher dashboard renders 32+ entrant predictive brackets differently depending on resolution mode (manual, vote-based, auto). All three modes show the full bracket in a single linear scrolling column instead of using the regional split layout (Top/Bottom for 32, Quadrants for 64) that single-elimination brackets use.

Three specific issues observed from screenshots:
1. **"32.1 predictive advanced manual"** (manual mode) — shows full linear bracket, no halves/quadrants
2. **"32.2 predictive advanced auto"** (auto mode) — shows full linear bracket, no halves/quadrants
3. **"32.2 predictive advanced vote"** (vote-based mode) — shows full linear bracket, no halves/quadrants

Additionally, predictive manual mode appears to function the same way as vote-based mode — these should be unified to reduce code paths.

On the student side: during prediction filling, the full bracket scroll view is acceptable (students need to see everything to make picks). But after predictions close, the student view should switch to the halves/quadrants layout matching 32+ SE behavior.

## Solution

1. **Teacher dashboard**: Add RegionBracketView conditional for 32+ entrants in PredictiveBracket teacher views (preview, revealing, completed states) — matching the pattern already used in AdvancedVotingView
2. **Unify manual + vote-based**: Predictive manual and vote-based modes share the same bracket visualization and should render identically on the teacher dashboard
3. **Student post-prediction**: After predictions close, student view should use RegionBracketView for 32+ brackets instead of the full linear diagram
