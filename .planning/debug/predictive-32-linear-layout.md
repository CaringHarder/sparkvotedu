---
status: diagnosed
trigger: "32+ entrant predictive brackets render in single-column linear layout instead of split/quadrant layout; accuracy overlay misaligns"
created: 2026-02-14T00:00:00Z
updated: 2026-02-14T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Two separate but related issues in BracketAccuracyView and AdvancedPredictionMode
test: Code analysis comparing SE rendering path vs predictive rendering path
expecting: Predictive path lacks RegionBracketView usage and BracketAccuracyView builds its own SVG overlay on top of a BracketDiagram with mismatched layout assumptions
next_action: Return diagnosis

## Symptoms

expected: 32+ entrant predictive brackets should render in split/quadrant layout like single-elimination brackets
actual: Bracket renders in single-column linear layout (all matchups stacked, requires scrolling); accuracy overlay misaligns
errors: No errors - visual/layout issue
reproduction: Create a 32+ entrant predictive bracket, view on student side after reveal
started: Likely since predictive bracket feature was built - split layout was only implemented for SE

## Eliminated

## Evidence

- timestamp: 2026-02-14T00:10:00Z
  checked: AdvancedVotingView (SE student voting) - lines 166-173
  found: For 32+ entrants, AdvancedVotingView uses RegionBracketView (tabbed region navigation) instead of bare BracketDiagram. The conditional is `(bracket.maxEntrants ?? bracket.size) >= 32`. RegionBracketView splits matchups into regions (Top Half/Bottom Half for 32, Region 1-4 for 64) with BracketMiniMap navigation.
  implication: SE brackets solved this problem by using RegionBracketView for 32+ entrants.

- timestamp: 2026-02-14T00:11:00Z
  checked: BracketDiagram - lines 524-526, 601-610
  found: BracketDiagram DOES have built-in zoom support via BracketZoomWrapper for 32+ entrants (needsZoom = !skipZoom && effectiveSize >= 32). But this only wraps the single linear SVG in a scrollable/zoomable container - it does NOT split into regions.
  implication: BracketDiagram's built-in zoom helps with scrolling but doesn't solve the layout problem of having all matchups stacked linearly.

- timestamp: 2026-02-14T00:12:00Z
  checked: PredictionReveal -> BracketAccuracyView (prediction-reveal.tsx lines 248-453)
  found: BracketAccuracyView renders BracketDiagram directly (line 338-341) with bracketSize prop, but NEVER uses RegionBracketView. It also renders a SEPARATE SVG overlay on top (lines 345-449) that computes its own viewBox dimensions using the same layout constants (MATCH_WIDTH, MATCH_HEIGHT, etc.) and getMatchPosition(). HOWEVER, BracketDiagram for 32+ entrants wraps its content in BracketZoomWrapper which adds CSS scale transform. The overlay SVG is positioned absolute over the BracketDiagram but does NOT account for the zoom wrapper's scale transform, scrollable container, or the extra DOM layers BracketZoomWrapper introduces.
  implication: This is the TWO-PART root cause: (1) BracketAccuracyView uses plain BracketDiagram instead of RegionBracketView, so 32+ bracket is linear; (2) The overlay SVG viewBox matches the raw SVG but the BracketZoomWrapper changes the actual visual layout via CSS transform + scroll container, so overlay misaligns.

- timestamp: 2026-02-14T00:13:00Z
  checked: AdvancedPredictionMode in predictive-bracket.tsx (lines 860-1044)
  found: AdvancedPredictionMode (used during predictions_open for advanced bracket-click mode) also uses bare BracketDiagram (line 1023-1030) with bracketSize but NOT RegionBracketView. Same issue - 32+ entrant brackets render linearly.
  implication: The predictions_open phase also has the same linear layout problem for 32+ entrants in advanced mode.

- timestamp: 2026-02-14T00:14:00Z
  checked: TeacherPredictiveView in predictive-bracket.tsx (lines 82-589)
  found: Teacher view also uses bare BracketDiagram for all statuses (predictions_open, revealing, completed, presentation mode). Same linear layout for 32+ entrants.
  implication: The 32+ layout problem affects teacher view too, but the primary user report is about the student reveal experience.

- timestamp: 2026-02-14T00:15:00Z
  checked: PredictiveStudentView in page.tsx (lines 698-860)
  found: For manual/vote_based mode with active status, the student view routes to AdvancedVotingView (line 844) which DOES use RegionBracketView for 32+. So manual-mode predictive brackets in active state would correctly show regional layout. But auto-mode routes to PredictionReveal (line 797) which uses BracketAccuracyView with bare BracketDiagram.
  implication: Confirms the issue is specifically in PredictionReveal/BracketAccuracyView and AdvancedPredictionMode, not the routing logic.

- timestamp: 2026-02-14T00:16:00Z
  checked: RegionBracketView (region-bracket-view.tsx)
  found: RegionBracketView is a well-designed component that splits matchups into regions (2 for 32-entrant, 4 for 64-entrant), provides tab navigation with BracketMiniMap, and even supports consolidated mirrored views when early rounds are decided. It passes skipZoom to BracketDiagram since each region is small enough not to need zoom. It supports onEntrantClick, votedEntrantIds, and allowPendingClick - exactly the props needed for prediction mode.
  implication: RegionBracketView could be reused for predictive brackets, but the accuracy overlay SVG would need to be rethought since RegionBracketView shows one region at a time (not the full bracket at once).

## Resolution

root_cause: |
  TWO RELATED ROOT CAUSES:

  1. **BracketAccuracyView uses bare BracketDiagram instead of RegionBracketView for 32+ entrants.**
     In `prediction-reveal.tsx` (line 338), `BracketAccuracyView` renders `<BracketDiagram>` directly.
     For 32+ entrants, BracketDiagram renders ALL matchups in a single linear left-to-right SVG
     (16 R1 matchups stacked vertically for 32 entrants, 32 for 64 entrants). It wraps this in
     BracketZoomWrapper for scrolling, but the layout is still a single long column.

     In contrast, AdvancedVotingView (SE student bracket) checks `(bracket.maxEntrants ?? bracket.size) >= 32`
     and uses `RegionBracketView` which splits matchups into navigable regions (Top Half / Bottom Half
     for 32 entrants, Region 1-4 for 64 entrants), showing only one region at a time.

  2. **Accuracy overlay SVG misaligns because it assumes raw SVG coordinates but BracketZoomWrapper
     transforms the actual rendered layout.**
     BracketAccuracyView renders a position:absolute SVG overlay (line 345) on top of BracketDiagram.
     It computes its own viewBox dimensions and uses `getMatchPosition()` to place accuracy badges.
     However, when BracketDiagram wraps content in BracketZoomWrapper (for 32+ entrants), the
     wrapper adds: (a) a scroll container with overflow:auto, (b) a CSS scale transform, and
     (c) additional DOM nesting. The overlay SVG sits outside this wrapper, so its coordinates
     no longer align with the transformed bracket content.

  AFFECTED COMPONENTS (same issue, different contexts):
  - `BracketAccuracyView` in prediction-reveal.tsx (auto-mode student reveal)
  - `AdvancedPredictionMode` in predictive-bracket.tsx (student prediction submission, advanced mode)
  - `TeacherPredictiveView` in predictive-bracket.tsx (teacher bracket rendering in all statuses)

fix:
verification:
files_changed: []
