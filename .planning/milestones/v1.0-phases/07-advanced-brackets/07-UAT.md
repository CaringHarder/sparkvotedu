---
status: complete
phase: 07-advanced-brackets
source: 07-01 through 07-35 (region navigation rewrite)
round: R7 (region navigation verification after 07-35 rewrite)
started: 2026-02-01T20:00:00Z
updated: 2026-02-13
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

### R7 Tests (Region Navigation Rewrite)

### R7-1. 32-Entrant SE Region Navigation (Student Advanced View)
expected: Region navigator with 2 cards (Top Half / Bottom Half) + Championship. Clicking shows 16-entrant sub-bracket.
result: pass

### R7-2. 64-Entrant SE Region Navigation (Student Advanced View)
expected: Region navigator with 4 cards (Region 1-4) + Final Four. Clicking shows 16-entrant sub-bracket.
result: pass
note: "Performance concern: voting on large brackets takes exceptionally long to show up on teacher dashboard. Needs investigation for real-time latency optimization on 32+ entrant brackets."

### R7-3. 32-Entrant Region Navigation (Teacher Live Dashboard)
expected: Region navigator with 2 cards (Top Half / Bottom Half) + Championship. Vote labels, matchup click/selection work within region.
result: pass

### R7-4. 64-Entrant Region Navigation (Teacher Live Dashboard)
expected: Region navigator with 4 cards (Region 1-4) + Final Four. Vote labels, matchup click, selected matchup highlight, and Open Voting / Close & Advance all work.
result: pass

### R7-5. 16-Entrant Bracket (No Regions — Single View)
expected: No region navigator. Full 16-entrant bracket renders as single BracketDiagram. All voting and interaction works (no regression).
result: pass

### R7-6. Auto-Consolidation (64-team Sweet 16)
expected: After R1+R2 decided, region cards disappear. Unified 2x2 mirrored grid with all 4 regions visible. Right-side mirrored. Final Four centered below.
result: pass

### R7-7. Region Navigation on Bracket Detail Page
expected: 32+ entrant bracket detail page shows region navigator. Clicking cards switches sub-bracket. Static view renders correctly within regions.
result: pass

## Tests

### 1. Bracket Type Selection in Creation Wizard
expected: On the bracket creation page, you see a 2x2 grid of bracket type cards: Single Elimination (Trophy icon), Double Elimination (Swords icon, Pro+ badge), Round Robin (Grid icon, Pro+ badge), and Predictive (Brain icon, Pro Plus badge). Clicking a type selects it and shows type-specific options below.
result: pass
note: "User feedback: 'Pro+' and 'Pro Plus' badge labels are inconsistent and confusing. All advanced bracket types require Pro Plus tier, so badges should all read 'Pro Plus' not 'Pro+'."

### 2. Custom Bracket Size (Non-Power-of-Two)
expected: When creating a bracket, you can toggle "Custom" for size and enter a non-power-of-two number (e.g., 5, 6, 7, 10). The form accepts it and shows a note about how many byes will be added. Preset buttons [4, 8, 16, 32, 64] are also available.
result: pass

### 3. Bye Placement in Bracket Diagram
expected: After creating a bracket with a non-power-of-two entrant count (e.g., 5 entrants), the bracket diagram shows "BYE" in grayed/muted text for the empty first-round slots. Top seeds receive the byes. Bye connector lines appear dashed. The bye matchups are auto-decided (winners already advanced).
result: pass

### 4. Double-Elimination Bracket Creation
expected: Selecting "Double Elimination" type and creating a bracket with entrants produces a bracket with a tabbed view showing Winners, Losers, Grand Finals, and Overview tabs. The Winners tab shows the standard single-elimination bracket. The Losers tab shows the losers bracket structure.
result: pass

### 5. Double-Elimination Grand Finals Tab
expected: In a double-elimination bracket, the student page now shows the full tabbed view with Winners, Losers, Grand Finals, and Overview tabs (matching the teacher bracket detail page). The Grand Finals tab is hidden until both champions are determined. When visible, it shows a centered card layout with WB/LB champion labels.
previous_result: issue — "the student only sees the winners bracket and doesn't have the losers bracket"
fix_applied: 07-14, 07-17, 07-21
result: pass (after hotfixes)
reported: Initial issues with LB slot collisions and GF entrant population. All resolved across 4 hotfix commits.
hotfixes_applied:
  - 709a3e9: Prevent opening voting on matchups with missing entrants
  - 893647a: Fix LB minor→major slot collision (entrant1 for LB survivors, entrant2 for WB dropdowns)
  - e85169b: WB Final loser always goes to LB Final entrant2Id
  - 4f03c37: Skip standard propagation for LB Final→GF, explicit entrant2Id placement
note: Full DE 8-entrant bracket tested through GF including reset match scenario. All advancement correct. Missing winner animation (logged below).

R4 re-test (16-entrant DE full flow):
result: issue
reported: "randomly, during one of the rounds, the close and advance winners will not finish the round leaving 1 matchup. Button appears again showing 'close winners and advance 1' and correctly finishes when pressed, but confusing. Teacher page goes back to winners bracket instead of staying on grand finals tab and no animation was shown. Student page showed correct animation successfully. Resizing of bracket worked well and zoom overlay functioned correctly."
severity: major
r4_pass:
  - LB compact layout (16-entrant losers bracket no longer spread out)
  - Zoom controls (in/out/reset all working)
  - Student page winner reveal + celebration animation
r4_issues:
  - Partial round advancement: Close & Advance leaves 1 matchup, requires second press
  - Teacher deRegion resets to 'winners' after GF completion instead of staying on grand_finals
  - Teacher page winner reveal animation not showing (student page works)
r4_feature_request: Auto-center bracket on current round, sized to fit vertically

R5 re-test (16-entrant DE full flow):
result: issue
reported: "all steps passed. celebration still shows old celebration. then it shows the new one. we need to find that old celebration in the code and remove it."
severity: minor
r5_pass:
  - Tiebreak auto-open on partial advance (no more double-press)
  - GF tab stays on Grand Finals after completion
  - WinnerReveal + CelebrationScreen both fire
r5_issues:
  - Duplicate celebration: old celebration fires first, then new chained one fires after — old code path not fully removed
r5_feature_request: Bracket view should auto-snap to current round taking up full vertical space

R6 re-test (16-entrant DE full flow):
result: issue
reported: "it played both celebrations. first the old one....then that cleared and then it played the new one on both student and teacher page"
severity: minor
r6_issues:
  - Duplicate celebration persists — 07-28 inner ref check fix not preventing the race condition
root_cause_hypothesis: The fallback celebration effect fires BEFORE the chained celebration path, not during. Need to trace exact timing of both code paths.

### 6. Double-Elimination Overview Tab
expected: In a double-elimination bracket, the teacher live dashboard now shows the full DE visualization with Winners/Losers/Grand Finals tabs (not just a single BracketDiagram). The Overview tab groups entrants into "Still in Winners" (green), "In Losers Bracket" (amber), and "Eliminated" (dimmed, strikethrough). Open Voting / Close & Advance buttons work across both winner and loser bracket matchups.
previous_result: issue — "The losers bracket does not appear as an option when going live, open voting, or close and advance winners"
fix_applied: 07-15, 07-17, 07-21 + UAT hotfixes (709a3e9, 893647a, e85169b, 4f03c37)
result: pass
note: Full DE live dashboard tested through all regions. Winners/Losers/Grand Finals tabs work. Buttons labeled by region ("Open Winners Voting", "Close Losers & Advance"). Amber indicator shows when region is blocked. Student voting works across all rounds. Missing winner celebration animation (cosmetic, logged separately).

### 7. Double-Elimination Max Size Limit
expected: When creating a double-elimination bracket, the maximum entrant count is capped at 64 in the form. You cannot enter a number higher than 64 for double-elim.
result: pass

### 8. Round-Robin Bracket Creation
expected: Selecting "Round Robin" type shows additional options for pacing (round-by-round or all-at-once), voting style, and standings mode. Max entrant count is limited to 8. After creation, the bracket detail page shows a standings table and matchup grid instead of a traditional bracket diagram.
result: pass

### 9. Round-Robin Standings Table
expected: The round-robin bracket detail page displays a league-style standings table with columns: Rank, Entrant Name, W (wins), L (losses), T (ties), Pts (points). Top 3 ranks have gold/silver/bronze badge styling.
result: pass
note: "Student page and teacher live/voting page render round-robin as single-elimination bracket (quarterfinals/semifinals/finals) instead of standings+matchup grid. Logged as separate gap."

### 10. Round-Robin Matchup Grid
expected: The round-robin bracket live view now shows the full matchup grid with round grouping and result buttons (not a single-elimination bracket). For each matchup in voting status, the teacher sees three result buttons: Entrant 1 Wins, Tie, and Entrant 2 Wins. Status badges show Upcoming, Decided, or Tie.
previous_result: issue — "go live shows the view, but the voting says 'upcoming' and student can't vote"
fix_applied: 07-18 (RR voting lifecycle, student vote UI, round controls)
result: partial pass (R3 re-test)
reported: "confirmed [voting works], but the first round ran the winner animation (the old one). Also, no results showing on student page. we should implement the same tab setup as the prediction brackets so students could toggle between voting and results. Also, there is no difference in appearance between the simple and advanced matchup layout. future rounds are not hidden, but they show up as 'upcoming' meaning you can't vote on them."
severity: minor (core voting functional, UI polish needed)
r3_pass:
  - Student can vote on RR matchups (core interaction works)
  - Matchup grid visible (not SE layout)
  - Future rounds correctly block voting (show "upcoming")
r3_issues:
  - Old winner animation plays instead of new celebration
  - No results/standings visible on student page
  - Need tabbed UI (Voting / Results) like predictive brackets
  - No visual distinction between simple and advanced matchup layout
  - Future rounds visible (as "upcoming") instead of hidden for round-by-round pacing

R5 re-test (4-entrant RR, round-by-round):
result: issue
reported: "close all and decide by votes button should indicate it's been clicked — works but button state doesn't change during action. Nested button hydration error: <button> inside <button> in round-robin-matchups.tsx line 130 (batch decide button inside collapsible round header button). No celebration shown at end of bracket completion. No difference between simple and advanced matchup cards. Simple should show one matchup card at a time. Advanced should show the entire round."
severity: major
r5_pass:
  - Voting/Results tabbed UI present on student page
  - Results tab shows RR standings with W/L/T/Pts
  - Future rounds hidden for round-by-round pacing
  - Batch decide by votes functional (results correct)
r5_issues:
  - Batch decide button has no loading/disabled state during action
  - Nested <button> hydration error: batch decide button is child of collapsible round header button (round-robin-matchups.tsx:130)
  - No CelebrationScreen on bracket completion (student page)
  - No visual distinction between simple and advanced matchup cards — simple should show one matchup at a time, advanced shows entire round

R6 re-test (4-entrant RR, round-by-round):
result: partial pass (3/4)
reported: "1, 2, 4 work - 3 still doesn't show simple voting style"
r6_pass:
  - No nested button hydration error (07-28 sibling flex layout fix works)
  - Batch decide button shows "Deciding..." and disabled state (07-28 isBatchDeciding prop works)
  - CelebrationScreen shows on RR completion (07-29 completion detection + broadcast works)
r6_issues:
  - Simple voting style still shows all matchups instead of one at a time — 07-30 fix not applying
root_cause_hypothesis: votingStyle prop may not be reaching RoundRobinMatchups component, or the conditional rendering logic has a bug.

### 11. Round-Robin Round Advancement
expected: In the live view for a round-robin bracket with round-by-round pacing, the teacher sees the round-robin matchup grid (not SE layout). Round advancement controls are available to open the next round's matchups for voting.
previous_result: issue — "just go live and activate. no round advancement controls are visible"
fix_applied: 07-18 (RR voting lifecycle, student vote UI, round controls)
result: pass (R3 re-test)
note: Round advancement controls working. Teacher can close voting and advance through all rounds. Standings table updates with W/L/T after each round.

### 12. Predictive Bracket Creation
expected: Selecting "Predictive" type shows options for prediction mode (simple/advanced) and resolution mode (manual/vote-based). After creation, the bracket enters a prediction lifecycle: draft -> predictions_open -> active -> completed. The generic "Activate" button is hidden for predictive brackets (they use Open Predictions / Close Predictions / Start Bracket instead). Complete and Delete remain available.
previous_result: blocker — "predictions open/close does not allow bracket to activate or go live"
fix_applied: 07-16, 07-14, + session hotfixes (c141de5, 8a8aedf, e1f54f3, 2be8a11)
result: pass (after hotfixes)
note: Full predictive lifecycle tested across all three resolution modes. Simple vote-based: "all working as predicted with simple style". Advanced vote-based: prediction clicks enabled via allowPendingClick prop. Manual mode: teacher picks winners directly, no voting workflow. Auto-transition when predictions close. Go Live button correctly hidden during predictions_open.
hotfixes_applied:
  - c141de5: auto-open R1 voting when predictions close, hide premature Go Live
  - 8a8aedf: enable advanced prediction clicks, add leaderboard to live views
  - e1f54f3: auto-transition student view when predictions close, add tabbed UI
  - 2be8a11: implement manual resolution mode behavior (hide vote controls, click-to-pick-winner on pending matchups)

### 13. Predictive Bracket Student Submission
expected: When a predictive bracket is in "predictions_open" status, the student page now routes to the PredictiveBracket component (not the standard voting view). Students see prediction submission UI — in simple mode, vertical matchup cards with clickable winners; in advanced mode, interactive bracket diagram clicks.
previous_result: blocker — "no. they don't see any prediction options."
fix_applied: 07-14, 07-19 (cascade engine), + session hotfixes (8a8aedf, e1f54f3)
result: pass (after hotfixes)
note: Simple mode tested and confirmed working ("all working as predicted with simple style"). Advanced mode fixed via allowPendingClick prop — students can click entrants on pending matchups during prediction phase. Auto-transition from prediction to voting view when teacher closes predictions. Tabbed UI (Bracket/Predictions) for students during live play.
hotfixes_applied:
  - 8a8aedf: enable advanced prediction clicks via allowPendingClick prop on BracketDiagram
  - e1f54f3: unified PredictiveStudentView with auto-transition and tabbed interface

### 14. Predictive Bracket Leaderboard
expected: When a predictive bracket is active or completed, a leaderboard appears alongside the bracket diagram. Students see rank, name, and score with gold/silver/bronze badges for top 3. Teachers see an expandable view with per-round scoring breakdown, correct picks count, and accuracy percentage.
previous_result: skipped — blocked by test 12/13
fix_applied: 07-12, 07-14, + session hotfixes (8a8aedf, e1f54f3)
result: pass (after hotfixes)
note: Leaderboard now visible on both teacher LiveDashboard and student PredictiveStudentView. Teacher sees prediction scores below bracket during live play. Students access leaderboard via "Predictions" tab in tabbed interface. Scoring works with the prediction cascade engine.
hotfixes_applied:
  - 8a8aedf: added PredictionLeaderboard to teacher LiveDashboard and student PredictiveLiveView
  - e1f54f3: added PredictionLeaderboard to student's tabbed Predictions view

### 15. Bracket Type Badge on List Page
expected: On the brackets list page, each bracket card shows a violet badge indicating the bracket type (Double Elim, Round Robin, Predictive). Single-elimination brackets show no type badge (they are the default).
result: pass

### 16. Pan/Zoom on Large Brackets
expected: You can now create brackets with 32 or 64 entrants (30s transaction timeout fix). When viewing the bracket, a zoom wrapper appears with zoom in/out buttons, a zoom percentage display, and a fit-to-screen button. Mouse wheel zooms in/out, and you can click-drag to pan. Brackets with 64+ entrants start at 75% zoom.
previous_result: issue — "zoom in/out and reset buttons don't function, clicking on entrant does nothing"
fix_applied: 07-20 (Zoom pointer capture fix for buttons and entrant clicks)
result: pass (R3 re-test)
reported: "worked correctly. two finger pinch impacts the entire page whether cursor is inside or outside of frame. beyond 16 should revert to a top/bottom bracket or left/right bracket views to zoom to those quadrants making it easier to interact. Also I noted simple and advanced for single elimination brackets were not an option in the setup."
r3_pass:
  - Zoom in/out/reset buttons all functional
  - Entrant clicks register votes correctly
  - Two-finger scroll zoom works
r3_issues:
  - Two-finger pinch zoom affects entire page (not scoped to bracket container)
  - Feature request: brackets >16 should offer quadrant views (top/bottom or left/right) for easier interaction
  - Simple/advanced viewing mode option missing from SE bracket creation setup

R5 re-test (32 and 64 entrant brackets):
result: issue
reported: "32 worked well with top/bottom. 64 was still just left to right — quadrants didn't work. Instead of putting first 16 on top-left, second 16 on top-right reading right to left, third 16 on bottom-left, fourth 16 on bottom-right reading right to left, it remained a single horizontal layout."
severity: minor
r5_pass:
  - 32-entrant section nav (Top/Bottom) works correctly
  - Pinch zoom scoped to bracket container (not full page)
  - Normal scroll passes through unaffected
  - SE Simple/Advanced viewing mode radio buttons in creation form
r5_issues:
  - 64-entrant bracket still renders as single horizontal layout — quadrant navigation buttons appear but bracket itself isn't laid out in 2x2 quadrant grid (TL/TR/BL/BR). Expected: first 16 top-left, second 16 top-right (mirrored), third 16 bottom-left, fourth 16 bottom-right (mirrored)

R6 re-test (64-entrant SE bracket):
result: partial pass
reported: "the bracket renders as the full grid with mirrored regions and the final four at the bottom on the student page. On the teacher page, there are still buttons for tl, bl, tr, br, but the bracket renders all on one side causing lots of scrolling. The student page isn't zoomed in to any quadrant, so it displays the full bracket making it hard to read unless manually zooming in on the page."
r6_pass:
  - Student page: QuadrantBracketLayout renders correctly (2x2 grid with mirrored regions and Final Four)
r6_issues:
  - Teacher page: Still renders horizontally (QuadrantBracketLayout not applied to live-dashboard or bracket-detail)
  - Student page: Full bracket too small to read, needs auto-zoom to quadrant
r6_feature_request: Mini-map visual navigator — small clickable bracket thumbnail showing quadrants (like NCAA bracket overview) for zooming to specific regions. Should be visible at all times at the top for brackets with 16+ entrants.

### 17. Bye-Aware Entrant Reordering
expected: In the bracket creation wizard Step 2 (entrant list), when the bracket has a non-power-of-two count, entrant positions that receive first-round byes show an amber "BYE" badge. Reordering entrants via drag-and-drop recalculates which positions get byes.
result: pass
note: "User feedback: after creating bracket, going back to edit mode, user can't drag entrants. Have to use up and down arrows. DnD not working in edit mode."

## Summary

total: 17
passed: 14 (9 R1 + tests 12/13/14 hotfixed + test 11 R3)
issues: 3 (tests 5, 10, 16 — R6 residual issues remain)
pending: 0
skipped: 0

### R6 Results (after 07-28, 07-29, 07-30, 07-31, 07-32 fixes)

| Test | Core Fix | R6 Result | Residual |
|------|----------|-----------|----------|
| 5 (DE Celebration) | 07-28 inner ref check | FAIL | Duplicate celebration persists — old fires before new |
| 10 (RR Student UX) | 07-28 nested button, 07-29 completion, 07-30 simple mode | 3/4 PASS | Simple mode still shows all matchups |
| 16 (64-Entrant Layout) | 07-31 QuadrantBracketLayout, 07-32 view wiring | PARTIAL | Student works, teacher horizontal, needs mini-map nav |

### Remaining R6 Issues (Diagnosed)

- **Test 5**: Duplicate celebration — Path 4 fallback effect (lines 309-319) fires for DE brackets when it shouldn't. Fix: add `&& !isDoubleElim` to condition on line 310. Debug: `.planning/debug/de-duplicate-celebration-r6.md`

- **Test 10**: ~~Simple voting style~~ **NOT A BUG** — Code is correct. User tested with 3 entrants (1 matchup/round due to BYE rotation). Condition `roundMatchups.length > 1` correctly shows all matchups when there's only 1. Need 4+ entrants to see 2+ matchups/round where nav appears. Debug: `.planning/debug/rr-simple-mode-r6.md`

- **Test 16**: Teacher page quadrant layout — live-dashboard.tsx line 1026 uses `(bracket.maxEntrants ?? 0) >= 64` which fails when maxEntrants is null (fallback 0 never >= 64). Fix: change fallback from `0` to `bracket.size`. Debug: `.planning/debug/teacher-quadrant-layout-r6.md`

### Feature Request (logged, not blocking)
- Mini-map visual navigator for large brackets (16+ entrants) — clickable bracket thumbnail showing quadrants for zoom navigation

### R5 Results (after 07-25, 07-26, 07-27 fixes)

| Test | Core Fix | R5 Result | Residual |
|------|----------|-----------|----------|
| 5 (DE Teacher UX) | Tiebreak auto-open, GF tab persistence | Mostly pass | Duplicate celebration (old fires before new) |
| 10 (RR Student) | Tabs, standings, celebration, votingStyle | Partial pass | No celebration, nested button error, no simple/advanced distinction |
| 16 (Zoom/Nav) | Pinch scoping, section nav, SE mode | Mostly pass | 64-entrant quadrant layout not implemented |

### Remaining R5 Issues
- **Test 5**: Duplicate celebration — old celebration code path fires before new chained one. Need to find and remove old celebration trigger.
- **Test 10**: (a) Batch decide button no loading state, (b) nested `<button>` hydration error in round-robin-matchups.tsx:130, (c) no CelebrationScreen on RR completion, (d) no simple vs advanced matchup card distinction (simple = one at a time, advanced = full round)
- **Test 16**: 64-entrant bracket renders horizontally — needs 2x2 quadrant grid layout for TL/TR/BL/BR navigation to work

## Gaps (Round 2 — Post Gap Closure)

Previous gaps from Round 1 were addressed by plans 07-14, 07-15, 07-16. The rendering/routing fixes landed but exposed deeper interaction issues.

### Cluster A: Student Voting Broken Across All Bracket Types (tests 5, 6, 10)
Pattern: Students can SEE the correct bracket type rendering, but CANNOT interact (click to vote/pick winner).

- truth: "Student can click on DE bracket entrant to cast a vote"
  status: failed
  reason: "User reported: students could see it, but had to hard refresh to allow voting, and even then, no ability to click on entrant to pick winner."
  severity: major
  test: 5
  root_cause: "RC1: Student page renders DoubleElimDiagram as read-only visualization — no participantId, castVote, onEntrantClick, or votedEntrantIds props passed. DoubleElimDiagram itself lacks these props and doesn't forward them to child BracketDiagram. RC5: Student page has no real-time subscription for DE/RR — fetches state once via useEffect, never updates. Stale state requires hard refresh."
  artifacts:
    - path: "src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx"
      issue: "Lines 348-364: DE path renders DoubleElimDiagram directly (read-only) instead of wrapping in voting-capable component like AdvancedVotingView"
    - path: "src/components/bracket/double-elim-diagram.tsx"
      issue: "Lines 9-14: Interface lacks onEntrantClick/votedEntrantIds props; lines 129-134: doesn't forward to child BracketDiagram"
  missing:
    - "Add onEntrantClick/votedEntrantIds props to DoubleElimDiagram and thread to child BracketDiagram"
    - "Wrap DE rendering in voting-capable component on student page (or enhance AdvancedVotingView)"
    - "Add useRealtimeBracket subscription for non-SE bracket types on student page"
  debug_session: ".planning/debug/student-voting-broken-all-types.md"

- truth: "Student can vote on DE matchups from live dashboard view"
  status: failed
  reason: "User reported: teacher can click on open voting. stuck here. student can't vote. The multiple brackets are there, but can't vote."
  severity: major
  test: 6
  root_cause: "Same as test 5 — RC1 (DE read-only on student page) + RC5 (no real-time updates)"
  artifacts:
    - path: "src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx"
      issue: "DE path has no voting mechanism"
  missing:
    - "Same fixes as test 5"
  debug_session: ".planning/debug/student-voting-broken-all-types.md"

- truth: "Student can vote on RR matchups and teacher sees result buttons work"
  status: failed
  reason: "User reported: go live shows the view, but the voting says 'upcoming' and student can't vote. Also, it showed all matchups even in simple mode"
  severity: major
  test: 10
  root_cause: "RC2: RoundRobinMatchups was designed as teacher-only — when isTeacher=false, MatchupCard renders only status badges with zero clickable elements. RC3: RR round 1 matchups never transition from 'pending' to 'voting' — no mechanism exists. RC4: round_by_round pacing renders all rounds (just collapsed), students can expand future rounds. RC5: No real-time on student page."
  artifacts:
    - path: "src/components/bracket/round-robin-matchups.tsx"
      issue: "Lines 144-255: MatchupCard has no student voting elements when isTeacher=false"
    - path: "src/components/teacher/live-dashboard.tsx"
      issue: "Line 393: SE 'Open Voting' excluded for RR; lines 262-270: RR 'Open Round' requires current round decided (chicken-and-egg)"
  missing:
    - "Add student vote interaction to RoundRobinMatchups when isTeacher=false and status=voting"
    - "Add mechanism to open RR round 1 for voting (auto on activation or manual button)"
    - "Hide future rounds for round_by_round pacing on student side"
    - "Add useRealtimeBracket for RR on student page"
  debug_session: ".planning/debug/student-voting-broken-all-types.md"

### Cluster B: Round-Robin Live Controls Missing (test 11)
- truth: "Round-robin round advancement controls visible in live dashboard"
  status: failed
  reason: "User reported: just go live and activate. no round advancement controls are visible"
  severity: major
  test: 11
  root_cause: "Chicken-and-egg problem: 'Open Round N' button (live-dashboard.tsx lines 424-432) requires canAdvanceRoundRobin=true, which requires ALL current-round matchups to be 'decided'. But round 1 matchups start as 'pending' (round-robin.ts line 83). The SE 'Open Voting' button is gated by !isRoundRobin (line 393). No mechanism exists to open round 1 for voting. Neither live-dashboard nor bracket-detail has an 'Open Round 1' button."
  artifacts:
    - path: "src/components/teacher/live-dashboard.tsx"
      issue: "Lines 393, 262-270, 424-432: SE controls hidden for RR, RR 'Open Round' button only for subsequent rounds"
    - path: "src/lib/dal/round-robin.ts"
      issue: "Line 83: All matchups created as 'pending'; advanceRoundRobinRound (line 209-240) exists but never called for round 1"
    - path: "src/lib/dal/bracket.ts"
      issue: "updateBracketStatusDAL has no bracket-type-specific activation logic"
  missing:
    - "Auto-open round 1 matchups to 'voting' when RR bracket activated, OR add explicit 'Open Round 1' button"
    - "Apply fix to both live-dashboard.tsx and bracket-detail.tsx"
  debug_session: ".planning/debug/rr-live-controls-missing.md"

### Cluster C: Predictive Bracket Prediction Cascade Broken (tests 12, 13, 14)
Pattern: Students see prediction UI but can only pick first round — winners don't cascade to populate later rounds.

- truth: "Student can predict all rounds of a predictive bracket (not just first round)"
  status: failed
  reason: "User reported: student was only able to pick first round (quarterfinals of 8 team bracket)."
  severity: major
  test: 12
  root_cause: "No client-side prediction cascade logic exists. handleSelect (line 244) stores selections[matchupId]=entrantId as flat key-value with no awareness of nextMatchupId topology. No propagation of predicted winners to downstream matchup slots. Additionally, nonByeMatchups filter (lines 201-204) requires BOTH entrant1Id AND entrant2Id non-null, which excludes all rounds beyond R1 (they have null entrants in DB by design)."
  artifacts:
    - path: "src/components/bracket/predictive-bracket.tsx"
      issue: "Lines 201-204, 376-379: nonByeMatchups filter excludes later rounds; lines 244-247: handleSelect has no cascade; lines 427-436: handleEntrantClick has no cascade"
  missing:
    - "Build usePredictionCascade hook: uses nextMatchupId + position parity to propagate predicted winners into speculative entrant slots"
    - "Replace nonByeMatchups filter to include matchups with speculative (prediction-derived) entrants"
    - "Handle cascading invalidation when earlier picks change"
  debug_session: ".planning/debug/predictive-cascade-broken.md"

- truth: "Simple predictive mode shows matchup cards (not full bracket diagram) and predictions cascade through rounds"
  status: failed
  reason: "User reported: in predictive simple mode, the student saw the advanced bracket (full bracket) and was only able select the first round once prediction voting was opened. The remaining rounds said TBD and were not selectable."
  severity: major
  test: 13
  root_cause: "Same cascade gap as test 12. Mode routing logic IS correct (predictiveMode defaults to 'simple' which renders SimplePredictionMode with vertical cards). Tester may have seen bracket created with predictiveMode='advanced', or described incomplete R1-only view as 'the advanced bracket'. Both modes share same cascade gap."
  artifacts:
    - path: "src/components/bracket/predictive-bracket.tsx"
      issue: "Both SimplePredictionMode and AdvancedPredictionMode lack cascade logic"
  missing:
    - "Same cascade fix as test 12 — shared usePredictionCascade hook for both modes"
  debug_session: ".planning/debug/predictive-cascade-broken.md"

- truth: "Predictive leaderboard populated with student scores after prediction submission"
  status: failed
  reason: "User reported: leaderboard shows on teacher page but it is empty since student can't fully fill out the predictive bracket."
  severity: major
  test: 14
  root_cause: "Downstream consequence of tests 12/13 — leaderboard component renders correctly but has no data because students can only submit R1 predictions. Resolves automatically once cascade is implemented."
  artifacts: []
  missing:
    - "Resolves when cascade fix from test 12/13 is applied"
  debug_session: ".planning/debug/predictive-cascade-broken.md"

### Cluster D: Zoom Controls Non-Functional (test 16)
- truth: "Pan/zoom button controls (zoom in, zoom out, fit-to-screen) work on large brackets"
  status: failed
  reason: "User reported: the zoom in/out and reset buttons don't function. two finger scroll up and down does zoom in/out, but clicking on entrant does nothing."
  severity: major
  test: 16
  root_cause: "usePanZoom hook's handlePointerDown (use-pan-zoom.ts lines 68-74) calls setPointerCapture(e.pointerId) on the container for EVERY pointerdown event, including clicks on zoom buttons and SVG entrant rects. setPointerCapture redirects all subsequent pointer events to the container, preventing the browser from synthesizing 'click' events on child elements. Wheel zoom works because wheel events are independent of pointer capture."
  artifacts:
    - path: "src/hooks/use-pan-zoom.ts"
      issue: "Lines 68-74: handlePointerDown unconditionally captures pointer on any left-click within container — no target check"
    - path: "src/components/bracket/bracket-zoom-wrapper.tsx"
      issue: "Lines 56-91: Zoom buttons are children of capture container with no onPointerDown stopPropagation"
    - path: "src/components/bracket/bracket-diagram.tsx"
      issue: "Lines 271-282, 338-349: Entrant click rects are also children of capture container"
  missing:
    - "Add onPointerDown={(e) => e.stopPropagation()} to floating controls div in bracket-zoom-wrapper.tsx"
    - "Add similar stopPropagation to clickable SVG entrant rects in bracket-diagram.tsx"
  debug_session: ".planning/debug/zoom-controls-broken.md"

### Round 5 Gaps (after 07-25, 07-26, 07-27 fixes)

- truth: "Teacher DE celebration shows only the new chained WinnerReveal->CelebrationScreen sequence"
  status: failed
  reason: "User reported: celebration still shows old celebration, then it shows the new one. Need to find old celebration code and remove it."
  severity: minor
  test: 5
  root_cause: "Fallback celebration effect (live-dashboard.tsx lines 308-313) has race condition — fires 2s after bracketCompleted before the chained celebration (5s). hasShownRevealRef not in dependency array, so fallback doesn't re-evaluate when reveal path sets the ref."
  artifacts:
    - path: "src/components/teacher/live-dashboard.tsx"
      issue: "Lines 308-313: fallback celebration effect fires before chained celebration due to timing (2s vs 5s)"
  missing:
    - "Add double-check of hasShownRevealRef.current inside setTimeout callback before firing fallback celebration"
  debug_session: ".planning/debug/de-duplicate-celebration.md"

- truth: "Batch decide by votes button shows loading/disabled state during action"
  status: failed
  reason: "User reported: button works but state doesn't change while actions are happening"
  severity: minor
  test: 10
  root_cause: "Parent live-dashboard.tsx has isPending from useTransition() but never passes it to RoundRobinMatchups. Component has no isBatchDeciding prop."
  artifacts:
    - path: "src/components/bracket/round-robin-matchups.tsx"
      issue: "No loading state prop accepted or rendered on batch decide button"
    - path: "src/components/teacher/live-dashboard.tsx"
      issue: "isPending exists but not passed to RoundRobinMatchups"
  missing:
    - "Add isBatchDeciding prop to RoundRobinMatchups, pass isPending from parent, disable button and show 'Deciding...' text"
  debug_session: ".planning/debug/rr-nested-button-and-loading.md"

- truth: "No nested button hydration error in round-robin matchup grid"
  status: failed
  reason: "Hydration error: <button> cannot be descendant of <button> in round-robin-matchups.tsx:130 — batch decide button inside collapsible round header button"
  severity: major
  test: 10
  root_cause: "Batch decide button (line 130-140) rendered inside collapsible round header button (line 107-141), creating invalid <button><button></button></button> HTML."
  artifacts:
    - path: "src/components/bracket/round-robin-matchups.tsx"
      issue: "Line 130: batch decide <button> nested inside round header <button> (line 107)"
  missing:
    - "Move batch decide button outside header button as sibling element, use flexbox for visual positioning"
  debug_session: ".planning/debug/rr-nested-button-and-loading.md"

- truth: "CelebrationScreen shows on RR bracket completion for students"
  status: failed
  reason: "User reported: no celebration shown at end of third round bracket completion"
  severity: major
  test: 10
  root_cause: "RR bracket completion is never detected or broadcast. recordRoundRobinResult and advanceRoundRobinRound never check if all matchups are decided. isBracketComplete has incorrect logic for RR (checks highest-round matchup winnerId, not all-matchups-decided). No code path updates bracket status to 'completed' or broadcasts 'bracket_completed' for RR."
  artifacts:
    - path: "src/lib/dal/round-robin.ts"
      issue: "recordRoundRobinResult (lines 112-150) never checks bracket completion"
    - path: "src/lib/bracket/advancement.ts"
      issue: "isBracketComplete (lines 227-240) has incorrect logic for RR"
    - path: "src/actions/round-robin.ts"
      issue: "No completion check/broadcast after recording results"
  missing:
    - "Add RR-specific completion check (all matchups decided)"
    - "Update bracket status to 'completed' when all RR matchups decided"
    - "Broadcast 'bracket_completed' event for RR"
  debug_session: ".planning/debug/rr-celebration-missing.md"

- truth: "Simple RR matchup layout shows one matchup at a time, advanced shows entire round"
  status: failed
  reason: "User reported: no difference between simple and advanced matchup cards. Simple should show one matchup card at a time. Advanced should show the entire round."
  severity: minor
  test: 10
  root_cause: "votingStyle prop only changes card CSS styling (border/padding/shadow), not layout behavior. roundMatchups.map() always renders ALL matchups regardless of votingStyle. No filtering or navigation logic for simple mode."
  artifacts:
    - path: "src/components/bracket/round-robin-matchups.tsx"
      issue: "Lines 145-161: roundMatchups.map renders all matchups; votingStyle only affects MatchupCard CSS"
  missing:
    - "Add currentMatchupIndex state for simple mode with prev/next navigation"
    - "Filter to single matchup when votingStyle=simple, show all when advanced"
  debug_session: ".planning/debug/rr-simple-vs-advanced-layout.md"

- truth: "64-entrant bracket renders in 2x2 quadrant grid layout for TL/TR/BL/BR navigation"
  status: failed
  reason: "User reported: 64-entrant bracket still renders left-to-right horizontally. Expected first 16 top-left, second 16 top-right mirrored, third 16 bottom-left, fourth 16 bottom-right mirrored."
  severity: minor
  test: 16
  root_cause: "bracket-diagram.tsx getMatchPosition() only implements horizontal round progression. No quadrant awareness. Section nav buttons scroll corners of horizontal SVG but SVG itself is never rearranged. Needs new QuadrantBracketLayout component splitting matchups into 4 groups rendered as separate BracketDiagram instances in CSS grid."
  artifacts:
    - path: "src/components/bracket/bracket-diagram.tsx"
      issue: "getMatchPosition (lines 67-89) only does horizontal layout, no quadrant support"
    - path: "src/components/bracket/bracket-zoom-wrapper.tsx"
      issue: "Section nav scrolls corners of horizontal SVG, not actual quadrants"
  missing:
    - "New QuadrantBracketLayout component with 4 BracketDiagram instances in CSS 2x2 grid"
    - "Split matchups by position range into quadrants"
    - "Conditional rendering at 64+ entrants in bracket-detail, live-dashboard, student page"
  debug_session: ".planning/debug/64-entrant-quadrant-layout.md"
