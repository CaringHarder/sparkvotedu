---
status: resolved
phase: 25-ux-parity
source: 25-01-SUMMARY.md, 25-02-SUMMARY.md
started: 2026-02-25T04:00:00Z
updated: 2026-02-25T12:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Bracket Card Context Menu
expected: On the teacher brackets dashboard, each bracket card shows a triple-dot menu button. Clicking it opens a dropdown with 6 actions: Rename, Edit, Copy Link, Duplicate, Archive, Delete. The menu opens without navigating into the bracket.
result: pass

### 2. Poll Card Context Menu
expected: On the teacher polls dashboard, each poll card shows a triple-dot menu button. Clicking it opens a dropdown with the same 6 actions as bracket cards: Rename, Edit, Copy Link, Duplicate, Archive, Delete.
result: pass

### 3. Bracket Inline Rename
expected: Clicking "Rename" from a bracket card's context menu switches the card title to an editable text input. Pressing Enter (or clicking away) saves the new name. Pressing Escape cancels without saving.
result: issue
reported: "pass, but the old name stayed until manual refresh after hitting enter"
severity: minor

### 4. Poll Inline Rename
expected: Clicking "Rename" from a poll card's context menu switches the card title to an editable text input. Pressing Enter saves the new name. Pressing Escape cancels.
result: issue
reported: "pass but same problem. After pressing enter, the old name shows, but a manual refresh shows the new name"
severity: minor

### 5. Delete Confirmation Dialog
expected: Clicking "Delete" from a card's context menu opens a confirmation dialog. If the bracket/poll is currently live, the dialog shows an amber-colored warning about active participants. Confirming deletes the item.
result: pass

### 6. Archive Removes from List
expected: Clicking "Archive" on a bracket or poll removes it from the main dashboard list. The item no longer appears on the brackets or polls page (archived items are filtered out).
result: pass

### 7. Card Removal Animations
expected: When a card is deleted, it fades out. When a card is archived, it slides to the left before disappearing. Both animations are smooth without layout jumps.
result: pass

### 8. Sign-Out Pending State
expected: Clicking the sign-out button immediately shows "Signing out..." text with a disabled/dimmed appearance. The button cannot be clicked again while processing.
result: pass

### 9. Archived Items Appear in Archive View
expected: After archiving a bracket or poll, it appears in the archive view so teachers can find and recover archived items.
result: issue
reported: "The archived brackets and polls do not appear in the archive view"
severity: major

## Summary

total: 9
passed: 6
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "Bracket card title updates immediately in the UI after inline rename save"
  status: resolved
  reason: "User reported: pass, but the old name stayed until manual refresh after hitting enter"
  severity: minor
  test: 3
  root_cause: "BracketCardList and PollCardList use useState(props) on mount and never sync with incoming props -- when router.refresh() delivers fresh server data after rename, the CardList components ignore updated props and render stale items"
  artifacts:
    - path: "src/components/bracket/bracket-card-list.tsx"
      issue: "Line 29: useState(brackets) never syncs with new props"
    - path: "src/components/poll/poll-card-list.tsx"
      issue: "Line 23: useState(polls) never syncs with new props"
    - path: "src/components/bracket/bracket-card.tsx"
      issue: "Line 155: renders bracket.name from stale prop"
    - path: "src/components/poll/poll-card.tsx"
      issue: "Line 123: renders poll.question from stale prop"
  missing:
    - "Add useEffect to BracketCardList to sync items when brackets prop changes"
    - "Add useEffect to PollCardList to sync items when polls prop changes"
  debug_session: ".planning/debug/inline-rename-stale-ui.md"

- truth: "Poll card title updates immediately in the UI after inline rename save"
  status: resolved
  reason: "User reported: pass but same problem. After pressing enter, the old name shows, but a manual refresh shows the new name"
  severity: minor
  test: 4
  root_cause: "Same root cause as test 3 -- PollCardList useState(polls) never syncs with incoming props after revalidation"
  artifacts:
    - path: "src/components/poll/poll-card-list.tsx"
      issue: "Line 23: useState(polls) never syncs with new props"
    - path: "src/components/poll/poll-card.tsx"
      issue: "Line 123: renders poll.question from stale prop"
  missing:
    - "Add useEffect to PollCardList to sync items when polls prop changes"
  debug_session: ".planning/debug/inline-rename-stale-ui.md"

- truth: "Archived brackets and polls appear in the archive view for teacher recovery"
  status: resolved
  reason: "User reported: The archived brackets and polls do not appear in the archive view"
  severity: major
  test: 9
  root_cause: "No archive page or route exists for brackets or polls -- archive action sets status correctly and main list filters them out, but no view was ever built to display archived items"
  artifacts:
    - path: "src/app/(dashboard)/brackets/page.tsx"
      issue: "Line 30: filters out archived but no archive destination exists"
    - path: "src/app/(dashboard)/polls/page.tsx"
      issue: "Line 26: filters out archived but no archive destination exists"
    - path: "src/app/(dashboard)/activities/activities-list.tsx"
      issue: "Line 28: STATUS_TABS missing 'Archived' tab"
  missing:
    - "Create archive pages for brackets and polls (reference: src/app/(dashboard)/sessions/archived/)"
    - "Add 'Archived' tab to activities STATUS_TABS"
    - "Add unarchive server actions and DAL transition rules (archived currently has no valid transitions out)"
    - "Add navigation links from main list pages to archive views"
  debug_session: ".planning/debug/archived-brackets-polls-no-view.md"
