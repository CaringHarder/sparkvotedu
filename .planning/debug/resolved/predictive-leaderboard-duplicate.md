---
status: diagnosed
trigger: "Prediction Leaderboard and Prediction Stats render TWICE on completed state of auto-mode predictive bracket teacher dashboard"
created: 2026-02-13T00:00:00Z
updated: 2026-02-13T00:05:00Z
---

## Current Focus

hypothesis: CONFIRMED -- bracket-detail.tsx renders PredictionLeaderboard alongside PredictiveBracket, but PredictiveBracket's completed state also renders its own PredictionLeaderboard, causing duplication
test: Traced full render trees for both live-dashboard and bracket-detail paths
expecting: Found duplication in bracket-detail.tsx only
next_action: Report root cause

## Symptoms

expected: Single PredictionLeaderboard and PredictionStats section below bracket diagram
actual: Leaderboard/stats sections appear TWICE (duplicated below bracket diagram)
errors: No errors -- visual duplication only
reproduction: View a completed auto-mode predictive bracket on the bracket detail page (/brackets/[id])
started: After auto-mode predictive lifecycle was implemented

## Eliminated

- hypothesis: LiveDashboard renders its own PredictionLeaderboard for auto-mode alongside PredictiveBracket's internal one
  evidence: live-dashboard.tsx line 1055 has correct guard `isPredictive && !isPredictiveAuto` which excludes auto-mode
  timestamp: 2026-02-13T00:03:00Z

## Evidence

- timestamp: 2026-02-13T00:01:00Z
  checked: LiveDashboard render path for isPredictiveAuto completed state
  found: |
    Line 983-989: Renders <PredictiveBracket> as sole main content when isPredictiveAuto
    Line 1055-1064: Guard `isPredictive && !isPredictiveAuto` correctly prevents outer PredictionLeaderboard for auto mode
  implication: Live dashboard has NO duplication for auto-mode predictive brackets

- timestamp: 2026-02-13T00:02:00Z
  checked: TeacherPredictiveView completed state in predictive-bracket.tsx
  found: |
    Lines 457-483: Renders BracketDiagram AND PredictionLeaderboard in completed state
    PredictionLeaderboard (lines 116-122) internally renders TeacherLeaderboard + MatchupPredictionStats when isTeacher=true
  implication: PredictiveBracket renders ONE PredictionLeaderboard in its completed state

- timestamp: 2026-02-13T00:03:00Z
  checked: BracketDetail render path for predictive brackets (bracket-detail.tsx)
  found: |
    Lines 153-168: For isPredictive, renders a 2-column grid containing:
      1. <PredictiveBracket bracket={bracket} participantId="" isTeacher={true} />
      2. <PredictionLeaderboard> when bracket.status is 'active' or 'completed'
    NO check for isPredictiveAuto -- applies to ALL predictive bracket modes
  implication: BracketDetail always renders an OUTER PredictionLeaderboard for active/completed predictive brackets

- timestamp: 2026-02-13T00:04:00Z
  checked: Full duplication path for bracket detail page with completed auto-mode predictive bracket
  found: |
    Instance 1: PredictiveBracket -> TeacherPredictiveView completed state -> PredictionLeaderboard (inside left grid column)
    Instance 2: BracketDetail -> PredictionLeaderboard (right grid column, guarded by status active|completed)
    Both instances render with isTeacher=true, which triggers TeacherLeaderboard + MatchupPredictionStats
    The PredictionLeaderboard component itself also fetches matchupStats independently, so both instances make duplicate API calls
  implication: This is the ROOT CAUSE of the duplication

- timestamp: 2026-02-13T00:05:00Z
  checked: Whether this also affects non-auto predictive modes on bracket-detail
  found: |
    The manual/vote_based TeacherPredictiveView fallback (lines 527-616) renders its own inline leaderboard table (lines 578-614) using raw leaderboard data
    BracketDetail also renders PredictionLeaderboard for these modes too (lines 160-167)
    So non-auto modes ALSO have a form of duplication on the bracket detail page: an inline table from TeacherPredictiveView AND the PredictionLeaderboard component from BracketDetail
  implication: The duplication bug affects ALL predictive bracket modes on the bracket-detail page, not just auto-mode

## Resolution

root_cause: |
  bracket-detail.tsx (lines 153-168) renders PredictionLeaderboard alongside PredictiveBracket in a 2-column grid
  for all predictive brackets when status is 'active' or 'completed'. However, PredictiveBracket's TeacherPredictiveView
  also renders its own PredictionLeaderboard in the 'completed' state (lines 476-481 for auto mode). This causes TWO
  PredictionLeaderboard instances to appear simultaneously. The live-dashboard.tsx is NOT affected because it has
  a correct guard (line 1055: `!isPredictiveAuto`), but bracket-detail.tsx lacks an equivalent guard.
fix:
verification:
files_changed: []
