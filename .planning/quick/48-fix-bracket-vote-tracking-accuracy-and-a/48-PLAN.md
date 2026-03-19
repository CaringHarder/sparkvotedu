---
phase: 48
title: Fix bracket vote tracking accuracy and add prediction submission indicator
plans: 1
must_haves:
  truths:
    - Sports brackets show prediction submitters in participation sidebar
    - Prediction submitters loaded on initial page load (not just realtime)
    - Sidebar shows "predicted" label for predictive/sports brackets
  artifacts:
    - src/lib/dal/prediction.ts (getPredictionSubmitterIds function)
    - src/components/teacher/participation-sidebar.tsx (voteLabel prop)
    - src/components/teacher/live-dashboard.tsx (prediction tracking wiring)
  key_links:
    - live page → getPredictionSubmitterIds → predictionSubmitterIds prop → mergedVoterIds['predictions']
---

# Quick Task 48: Fix bracket vote tracking accuracy and add prediction submission indicator

## Task 1: Wire prediction submitter tracking for sports/predictive brackets

**files:** src/lib/dal/prediction.ts, src/app/(dashboard)/brackets/[bracketId]/live/page.tsx, src/components/teacher/live-dashboard.tsx, src/components/teacher/participation-sidebar.tsx

**action:**
1. Add `getPredictionSubmitterIds()` DAL function
2. Load on bracket live page and pass as prop
3. Seed `mergedVoterIds['predictions']` with initial data
4. Include `isSports` in prediction voter tracking
5. Add `voteLabel` prop to sidebar for "predicted" vs "voted"

**verify:** TypeScript compiles, sidebar shows prediction counts

**done:**
- Sports brackets show prediction submitters in sidebar
- Initial load includes prediction submitters
- Label says "predicted" during prediction phase
