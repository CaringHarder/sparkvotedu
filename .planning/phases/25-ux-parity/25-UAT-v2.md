---
status: diagnosed
phase: 25-ux-parity
source: 25-03-SUMMARY.md, 25-04-SUMMARY.md
started: 2026-02-25T19:00:00Z
updated: 2026-02-25T19:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Bracket Inline Rename — Immediate UI Update
expected: On the teacher brackets dashboard, click the triple-dot menu on any bracket card and select "Rename". Type a new name and press Enter. The new name should appear immediately on the card without needing a manual page refresh.
result: issue
reported: "it showed the old name after hitting enter, and then a second later, it showed the newly typed name without a manual refresh. It should be instant."
severity: minor

### 2. Poll Inline Rename — Immediate UI Update
expected: On the teacher polls dashboard, click the triple-dot menu on any poll card and select "Rename". Type a new question and press Enter. The new question should appear immediately on the card without needing a manual page refresh.
result: issue
reported: "same thing on the polls side"
severity: minor

### 3. Navigate to Bracket Archive View
expected: On the teacher brackets dashboard, there is an "Archived" navigation link (near the page header). Clicking it navigates to /brackets/archived, which shows a page titled for archived brackets.
result: pass

### 4. Navigate to Poll Archive View
expected: On the teacher polls dashboard, there is an "Archived" navigation link (near the page header). Clicking it navigates to /polls/archived, which shows a page titled for archived polls.
result: pass

### 5. Archived Brackets Appear in Archive View
expected: After archiving a bracket from the main dashboard (via context menu > Archive), navigate to /brackets/archived. The archived bracket appears in the list.
result: pass

### 6. Archived Polls Appear in Archive View
expected: After archiving a poll from the main dashboard (via context menu > Archive), navigate to /polls/archived. The archived poll appears in the list.
result: pass

### 7. Recover Bracket from Archive
expected: On /brackets/archived, click the recover/unarchive action on an archived bracket. It disappears from the archive list. Navigate back to the main brackets page — the bracket reappears with "completed" status.
result: pass

### 8. Recover Poll from Archive
expected: On /polls/archived, click the recover/unarchive action on an archived poll. It disappears from the archive list. Navigate back to the main polls page — the poll reappears with "closed" status.
result: pass

### 9. Permanent Delete from Bracket Archive
expected: On /brackets/archived, click the permanent delete action on an archived bracket. A confirmation dialog appears. Confirming permanently removes the bracket — it no longer appears in the archive or main list.
result: pass

### 10. Permanent Delete from Poll Archive
expected: On /polls/archived, click the permanent delete action on an archived poll. A confirmation dialog appears. Confirming permanently removes the poll — it no longer appears in the archive or main list.
result: pass

## Summary

total: 10
passed: 8
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "Bracket card title updates instantly in the UI after inline rename save"
  status: failed
  reason: "User reported: it showed the old name after hitting enter, and then a second later, it showed the newly typed name without a manual refresh. It should be instant."
  severity: minor
  test: 1
  root_cause: "handleRenameSave sets isRenaming=false synchronously, revealing <h3> that renders bracket.name from stale props instead of renameValue from local state. New name only arrives after async router.refresh() + useEffect prop sync (~1s)."
  artifacts:
    - path: "src/components/bracket/bracket-card.tsx"
      issue: "Line 154: <h3> renders bracket.name (stale prop) instead of renameValue (optimistic local state)"
  missing:
    - "Change <h3> to render renameValue instead of bracket.name for optimistic display"
  debug_session: ".planning/debug/inline-rename-stale-ui.md"

- truth: "Poll card title updates instantly in the UI after inline rename save"
  status: failed
  reason: "User reported: same thing on the polls side"
  severity: minor
  test: 2
  root_cause: "Same pattern — handleRenameSave sets isRenaming=false, revealing <h3> that renders poll.question from stale props instead of renameValue from local state."
  artifacts:
    - path: "src/components/poll/poll-card.tsx"
      issue: "Line 123: <h3> renders poll.question (stale prop) instead of renameValue (optimistic local state)"
  missing:
    - "Change <h3> to render renameValue instead of poll.question for optimistic display"
  debug_session: ".planning/debug/inline-rename-stale-ui.md"
