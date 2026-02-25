---
status: diagnosed
trigger: "Archived brackets and polls do not appear in the archive view"
created: 2026-02-25T00:00:00Z
updated: 2026-02-25T00:00:00Z
---

## Current Focus

hypothesis: No archive view/page exists for brackets or polls; items are archived in the DB but have no UI to display them
test: Search for archive routes under brackets/ and polls/
expecting: No archive pages found
next_action: Report diagnosis

## Symptoms

expected: Archived brackets and polls should appear in an archive view for recovery/deletion
actual: Archive action works (items disappear from main list) but there is no page to view them
errors: None -- silent data disappearance from user perspective
reproduction: Archive any bracket or poll via context menu; item vanishes with no way to access it
started: Since archiving was implemented for brackets/polls

## Eliminated

(none needed -- root cause found on first hypothesis)

## Evidence

- timestamp: 2026-02-25
  checked: src/app/(dashboard)/brackets/page.tsx line 30
  found: `.filter((b) => b.status !== 'archived')` -- explicitly filters out archived brackets from the main list
  implication: Archived brackets are intentionally hidden from the brackets page

- timestamp: 2026-02-25
  checked: src/app/(dashboard)/polls/page.tsx line 26
  found: `.filter((p) => p.status !== 'archived')` -- explicitly filters out archived polls from the main list
  implication: Archived polls are intentionally hidden from the polls page

- timestamp: 2026-02-25
  checked: Glob for src/app/**/brackets/archived/** and src/app/**/polls/archived/**
  found: No files found -- zero archive pages for brackets or polls
  implication: No archive view was ever created for brackets or polls

- timestamp: 2026-02-25
  checked: src/app/(dashboard)/sessions/archived/page.tsx
  found: A fully working archived sessions page exists at /sessions/archived with search, recover, and delete functionality
  implication: The archive pattern exists for sessions but was never replicated for brackets or polls

- timestamp: 2026-02-25
  checked: src/lib/dal/bracket.ts getTeacherBrackets() line 530-539
  found: No status filter in the DAL query -- it returns ALL brackets including archived ones
  implication: The DAL is fine; filtering happens at the page level (line 30 of brackets/page.tsx)

- timestamp: 2026-02-25
  checked: src/lib/dal/poll.ts getPollsByTeacherDAL() lines 83-100
  found: Optional statusFilter parameter, but the polls page calls it with no filter (gets all including archived)
  implication: The DAL is fine; filtering happens at the page level (line 26 of polls/page.tsx)

- timestamp: 2026-02-25
  checked: src/app/(dashboard)/activities/activities-list.tsx line 28
  found: STATUS_TABS = ['All', 'Active', 'Draft', 'Closed'] -- no 'Archived' tab
  implication: Even the unified activities view has no way to see archived items

- timestamp: 2026-02-25
  checked: src/actions/bracket.ts archiveBracket() and src/actions/poll.ts archivePoll()
  found: Both archive actions work correctly -- they set status to 'archived' in the database
  implication: The write side works; the read side (archive view) was never built

## Resolution

root_cause: No archive page/route exists for brackets or polls. The archive action correctly sets status='archived' in the database, and the main list pages correctly filter them out (brackets/page.tsx:30, polls/page.tsx:26), but no archive view was ever created to display them. Sessions have a working archive view at /sessions/archived that can serve as the reference implementation.
fix: (not applied -- research only)
verification: (not applicable)
files_changed: []
