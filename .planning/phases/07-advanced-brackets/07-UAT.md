---
status: complete
phase: 07-advanced-brackets
source: 07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md, 07-04-SUMMARY.md, 07-05-SUMMARY.md, 07-06-SUMMARY.md, 07-07-SUMMARY.md, 07-08-SUMMARY.md, 07-09-SUMMARY.md, 07-10-SUMMARY.md, 07-11-SUMMARY.md, 07-12-SUMMARY.md, 07-13-SUMMARY.md
started: 2026-02-01T20:00:00Z
updated: 2026-02-01T20:30:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

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
expected: In a double-elimination bracket, the Grand Finals tab is hidden until both a Winners bracket champion and Losers bracket champion are determined. When visible, it shows a centered card layout (not an SVG bracket) with WB/LB champion labels.
result: issue
reported: "the student only sees the winners bracket and doesn't have the losers bracket"
severity: major

### 6. Double-Elimination Overview Tab
expected: The Overview tab in a double-elimination bracket groups entrants into categories: "Still in Winners" (green), "In Losers Bracket" (amber), and "Eliminated" (dimmed, strikethrough). This updates as matchups are decided.
result: issue
reported: "same issue. The losers bracket does not appear as an option when going live, open voting, or close and advance winners in the teacher facing page and in the student facing page"
severity: major

### 7. Double-Elimination Max Size Limit
expected: When creating a double-elimination bracket, the maximum entrant count is capped at 64 in the form. You cannot enter a number higher than 64 for double-elim.
result: [pending]

### 8. Round-Robin Bracket Creation
expected: Selecting "Round Robin" type shows additional options for pacing (round-by-round or all-at-once), voting style, and standings mode. Max entrant count is limited to 8. After creation, the bracket detail page shows a standings table and matchup grid instead of a traditional bracket diagram.
result: [pending]

### 9. Round-Robin Standings Table
expected: The round-robin bracket detail page displays a league-style standings table with columns: Rank, Entrant Name, W (wins), L (losses), T (ties), Pts (points). Top 3 ranks have gold/silver/bronze badge styling.
result: pass
note: "Student page and teacher live/voting page render round-robin as single-elimination bracket (quarterfinals/semifinals/finals) instead of standings+matchup grid. Logged as separate gap."

### 10. Round-Robin Matchup Grid
expected: The round-robin bracket shows matchups grouped by round with collapsible round headers. For each matchup in voting status, the teacher sees three result buttons: Entrant 1 Wins, Tie, and Entrant 2 Wins. Status badges show Upcoming, Decided, or Tie.
result: issue
reported: "when loading the bracket, these things are seen, but when clicking go live, the view is only of the first round like it's a single elimination tournament"
severity: major

### 11. Round-Robin Round Advancement
expected: In round-by-round pacing mode, the teacher sees an "Open Round N" button to advance to the next round. Clicking it opens that round's matchups for voting.
result: issue
reported: "no, only the go live button. clicking on it results in single-elimination style bracket with Semifinals/Final headers, not round-robin matchup grid. Screenshot shows 4 entrants in SE layout."
severity: major

### 12. Predictive Bracket Creation
expected: Selecting "Predictive" type shows options for prediction mode (simple/advanced) and resolution mode (manual/vote-based). After creation, the bracket enters a prediction lifecycle: draft -> predictions_open -> active -> completed.
result: issue
reported: "predictions open and close predictions does not allow bracket to activate or go live, so student can not make voting predictions. Clicking go live button brings student to see bracket. Bracket is again treated like a single-elimination 1 round at a time voting, with teacher opening the voting and closing and advancing the voting"
severity: blocker

### 13. Predictive Bracket Student Submission
expected: When a predictive bracket is in "predictions_open" status, students can submit predictions for each matchup. In simple mode, they see vertical matchup cards and click to select winners. In advanced mode, they interact with the bracket diagram directly by clicking entrant names.
result: issue
reported: "no. they don't see any prediction options."
severity: blocker

### 14. Predictive Bracket Leaderboard
expected: When a predictive bracket is active or completed, a leaderboard appears alongside the bracket diagram. Students see rank, name, and score with gold/silver/bronze badges for top 3. Teachers see an expandable view with per-round scoring breakdown, correct picks count, and accuracy percentage.
result: skipped
reason: unable to test due to student not being able to make predictions (blocked by test 12/13)

### 15. Bracket Type Badge on List Page
expected: On the brackets list page, each bracket card shows a violet badge indicating the bracket type (Double Elim, Round Robin, Predictive). Single-elimination brackets show no type badge (they are the default).
result: pass

### 16. Pan/Zoom on Large Brackets
expected: When viewing a bracket with 32+ entrants, a zoom wrapper appears with zoom in/out buttons, a zoom percentage display, and a fit-to-screen button. Mouse wheel zooms in/out, and you can click-drag to pan. Brackets with 64+ entrants start at 75% zoom.
result: issue
reported: "couldn't create a bracket of 32 or 64 entrants. received a failed to create bracket message."
severity: blocker

### 17. Bye-Aware Entrant Reordering
expected: In the bracket creation wizard Step 2 (entrant list), when the bracket has a non-power-of-two count, entrant positions that receive first-round byes show an amber "BYE" badge. Reordering entrants via drag-and-drop recalculates which positions get byes.
result: pass
note: "User feedback: after creating bracket, going back to edit mode, user can't drag entrants. Have to use up and down arrows. DnD not working in edit mode."

## Summary

total: 17
passed: 8
issues: 8
pending: 0
skipped: 1

## Gaps

- truth: "Student sees full double-elimination bracket with Winners, Losers, Grand Finals, and Overview tabs"
  status: failed
  reason: "User reported: the student only sees the winners bracket and doesn't have the losers bracket"
  severity: major
  test: 5
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Double-elimination losers bracket tab visible in live/voting teacher view and student view"
  status: failed
  reason: "User reported: The losers bracket does not appear as an option when going live, open voting, or close and advance winners in the teacher facing page and in the student facing page"
  severity: major
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Round-robin student page and teacher live/voting page show standings table and matchup grid (not single-elimination bracket)"
  status: failed
  reason: "User reported: the student page still looks like a single elimination bracket with quarterfinals, semifinals and finals. The teacher page functions the same way after opening up voting."
  severity: major
  test: 9
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Round-robin live view shows matchup grid with round grouping and result buttons (not single-elimination first round)"
  status: failed
  reason: "User reported: when loading the bracket, these things are seen, but when clicking go live, the view is only of the first round like it's a single elimination tournament"
  severity: major
  test: 10
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Round-robin round advancement button visible in live view for round-by-round pacing"
  status: failed
  reason: "User reported: no Open Round button, only Go Live. Live view renders as single-elimination with Semifinals/Final headers instead of round-robin matchup grid."
  severity: major
  test: 11
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Predictive bracket follows prediction lifecycle (draft -> predictions_open -> active -> completed) with student prediction submission"
  status: failed
  reason: "User reported: predictions open and close predictions does not allow bracket to activate or go live, so student can not make voting predictions. Go live treats it as single-elimination with round-by-round voting instead of prediction submission."
  severity: blocker
  test: 12
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Students see prediction submission UI (matchup cards or bracket diagram clicks) when bracket is in predictions_open status"
  status: failed
  reason: "User reported: no. they don't see any prediction options."
  severity: blocker
  test: 13
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Teacher can create brackets with 32 or 64 entrants for pan/zoom testing"
  status: failed
  reason: "User reported: couldn't create a bracket of 32 or 64 entrants. received a failed to create bracket message."
  severity: blocker
  test: 16
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
