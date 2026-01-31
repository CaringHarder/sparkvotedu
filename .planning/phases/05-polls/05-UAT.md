---
status: diagnosed
phase: 05-polls
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md, 05-05-SUMMARY.md, 05-06-SUMMARY.md]
started: 2026-01-31T23:30:00Z
updated: 2026-01-31T23:55:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Create a Simple Poll
expected: Navigate to /polls/new. You should see a template browser with categories (Icebreakers, Classroom Decisions, etc.) and a mode toggle between "Quick Create" and "Step-by-Step". Type a question, add at least 2 options, and submit. The poll should be created and you should be redirected to the poll detail page showing your new poll in draft status.
result: pass

### 2. Create a Poll from Template
expected: On /polls/new, select a template from the template browser (e.g., an Icebreaker template). The template should pre-fill the question and options into the form. Submit the poll. It should create successfully with the template's content.
result: pass

### 3. Create a Ranked Poll
expected: On /polls/new, toggle the poll type to "Ranked". Add several options. You should see a ranking depth selector appear. Create the poll. The poll detail page should show it as a ranked poll type.
result: skipped
reason: User on free tier; ranked polls correctly gated behind Pro plan (feature gate working as designed)

### 4. Edit a Draft Poll
expected: Open a draft poll's detail page (/polls/[pollId]). You should see an editable form with the question, options, and settings. Change the question text, add or remove an option using drag-and-drop reorder, and save. Changes should persist.
result: issue
reported: "making a change and clicking on 'Update Poll' leaves the button in a state of grayed out with a circular loading motion and the words 'Updating' and it appears to be hung in this state."
severity: major

### 5. Poll Lifecycle (Draft → Active → Closed)
expected: On a draft poll's detail page, click "Activate" (or equivalent status button). The poll status should change to Active with a green badge. Then click "Close Poll". The status should change to Closed with an amber badge.
result: pass

### 6. Delete a Poll
expected: On a poll's detail page, click "Delete". A confirmation modal should appear. Confirm deletion. You should be redirected away and the poll should no longer appear in your poll list.
result: pass
note: Delete not available on closed polls — minor UX gap, should allow deletion from any status

### 7. Sidebar Navigation Shows Activities Section
expected: The dashboard sidebar should show an "Activities" section with a Zap icon linking to /activities. Below it, indented sub-items for "Brackets" (Trophy icon) and "Polls" (BarChart3 icon) should be visible. Both sub-items should link to their respective pages.
result: issue
reported: "polls icon links to a 404 error"
severity: major

### 8. Unified Activities Page
expected: Navigate to /activities. You should see both your brackets and polls in a merged list, sorted by most recently updated. Status tabs (All, Active, Draft, Closed) should filter the list. A type filter (All, Brackets Only, Polls Only) should also work. Each card shows a type badge (amber for brackets, indigo for polls).
result: pass

### 9. Student Votes on Simple Poll
expected: As a student in a session, tap a poll from the activity grid. You should see the poll question with tappable option cards in a grid. Tap an option — it should highlight with a check icon. Tap "Submit Vote". You should see a "Vote submitted!" confirmation.
result: issue
reported: "I can't because there is no way to assign a poll to a session"
severity: major

### 10. Student Votes on Ranked Poll
expected: As a student, open a ranked poll. Tap options in preference order — each tap should show a numbered badge (1=gold, 2=silver, 3=bronze). A "Ranked X of Y" counter should update. "Undo Last" removes the last ranking. "Reset All" clears all. When all required rankings are made, "Submit Rankings" becomes active. Submit and see confirmation.
result: skipped
reason: Blocked by no UI to assign poll to session (Test 9)

### 11. Live Results Update in Real Time
expected: As teacher, open a poll's live dashboard (/polls/[pollId]/live). Have a student cast a vote. The bar chart should update with a bouncy spring animation within a couple seconds — no page refresh needed. The participation rate ("X of Y voted") should update as well.
result: skipped
reason: Blocked by no UI to assign poll to session (Test 9)

### 12. Chart Type Toggle (Bar ↔ Donut)
expected: On the live results page for a simple poll, you should see a toggle between bar chart and donut/pie chart icons. Click the donut icon — the chart should switch to a donut chart with colored segments and a legend. Click the bar icon to switch back.
result: skipped
reason: Blocked by no UI to assign poll to session (Test 9)

### 13. Close Poll Triggers Winner Reveal
expected: On the live results page with an active poll that has votes, click "Close Poll". A reveal animation should play: dark overlay, the winning option scales up with "Winner!" label, and confetti bursts. It should auto-dismiss after a few seconds or dismiss on click.
result: skipped
reason: Blocked by no UI to assign poll to session (Test 9)

### 14. Presentation Mode
expected: On the live results page, click "Present" (or press F key). The view should go fullscreen with a dark background and large, high-contrast results. Press Escape or click "Exit" to leave presentation mode.
result: skipped
reason: Blocked by no UI to assign poll to session (Test 9)

### 15. Student Poll Routing from Activity Grid
expected: As a student in a session with both an active bracket and an active poll, the activity grid should show both. Tapping the poll card should navigate to the poll voting page at /session/[sessionId]/poll/[pollId]. Tapping a bracket should still go to the bracket voting page.
result: skipped
reason: Blocked by no UI to assign poll to session (Test 9)

### 16. Returning Student Sees Previous Vote
expected: As a student who already voted on a poll, close the browser tab and reopen the poll page. Your previous vote (simple: selected option, ranked: your rankings) should be restored and shown, with the "Vote submitted!" state displayed.
result: skipped
reason: Blocked by no UI to assign poll to session (Test 9)

## Summary

total: 16
passed: 5
issues: 3
pending: 0
skipped: 7
skipped: 0
skipped: 0

## Gaps

- truth: "Teacher can create a simple poll from /polls/new and be redirected to the new poll detail page"
  status: resolved
  reason: "User reported: when clicking on 'create poll' a 'failed to create poll' message appears"
  severity: major
  test: 1
  root_cause: "Stale PrismaClient cached in globalThis survived hot module reload after Poll models were added. prisma.poll was undefined on the old instance."
  artifacts:
    - path: "src/lib/prisma.ts"
      issue: "globalThis singleton pattern caches stale PrismaClient across HMR when new models are added"
  missing:
    - "Dev server restart after prisma generate with new models"
  debug_session: ".planning/debug/resolved/prisma-poll-undefined.md"

- truth: "Teacher can create a poll from a template and it creates successfully"
  status: resolved
  reason: "User reported: same issue (poll creation fails)"
  severity: major
  test: 2
  root_cause: "Same as Test 1 — stale PrismaClient"
  artifacts: []
  missing: []
  debug_session: ".planning/debug/resolved/prisma-poll-undefined.md"

- truth: "Teacher can assign a poll to a session so students can vote on it"
  status: failed
  reason: "User reported: there is no way to assign a poll to a session"
  severity: major
  test: 9
  root_cause: "Session assignment UI never implemented for polls. PollDetailView has no session dropdown. Poll detail page doesn't fetch sessions. assignPollToSession schema doesn't allow null for unlinking."
  artifacts:
    - path: "src/components/poll/poll-detail-view.tsx"
      issue: "Missing session assignment UI section (bracket equivalent has it at lines 108-151)"
    - path: "src/app/(dashboard)/polls/[pollId]/page.tsx"
      issue: "Missing session fetch query"
    - path: "src/actions/poll.ts"
      issue: "assignPollToSessionSchema sessionId not nullable (can't unlink)"
  missing:
    - "Add session fetch to poll detail page (copy bracket pattern)"
    - "Add session assignment dropdown to PollDetailView"
    - "Make assignPollToSessionSchema sessionId nullable"
  debug_session: ".planning/debug/poll-session-assign-missing.md"

- truth: "Polls sidebar sub-item links to a working polls list page"
  status: failed
  reason: "User reported: polls icon links to a 404 error"
  severity: major
  test: 7
  root_cause: "No /polls/page.tsx index page exists. Sidebar links to /polls but only /polls/new and /polls/[pollId] pages were created."
  artifacts:
    - path: "src/components/dashboard/sidebar-nav.tsx"
      issue: "Line 38 links to /polls which has no page"
  missing:
    - "Create /polls/page.tsx as redirect to /activities or as dedicated polls list"
  debug_session: ".planning/debug/polls-404.md"

- truth: "Teacher can edit a draft poll and save changes successfully"
  status: failed
  reason: "User reported: clicking 'Update Poll' leaves the button stuck in loading/disabled state with 'Updating' text, appears hung"
  severity: major
  test: 4
  root_cause: "handleSubmit in poll-form.tsx never calls setIsSubmitting(false) on the update success path. router.refresh() preserves client state, so isSubmitting stays true forever."
  artifacts:
    - path: "src/components/poll/poll-form.tsx"
      issue: "Line 113: missing setIsSubmitting(false) after router.refresh() on update success path"
  missing:
    - "Add setIsSubmitting(false) after router.refresh() or use try/finally pattern"
  debug_session: ".planning/debug/poll-update-hang.md"

- truth: "Activities page loads and shows both brackets and polls"
  status: resolved
  reason: "User reported: Cannot read properties of undefined (reading 'findMany') at prisma.poll.findMany in getPollsByTeacherDAL. prisma.poll is undefined."
  severity: blocker
  test: 7
  root_cause: "Same as Test 1 — stale PrismaClient"
  artifacts: []
  missing: []
  debug_session: ".planning/debug/resolved/prisma-poll-undefined.md"
