---
status: resolved
trigger: "session-selector-in-creation: Bracket Quick Create and Poll detail page still show session assignment dropdowns that should be removed in session-first workflow"
created: 2026-04-09T00:00:00Z
updated: 2026-04-09T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Old session selector UI left over from pre-Phase-04 workflow
test: Removed all session dropdowns from creation and detail pages, wired sessionId through from URL query param
expecting: Session auto-assigned via query param, no manual selector UI shown
next_action: Awaiting human verification

## Symptoms

expected: When creating a bracket or poll from within a session workspace, the activity should automatically be assigned to that session. No session selector UI should appear.
actual: Bracket Quick Create shows "Assign to session (optional)" dropdown with "No session (assign later)". Poll detail page shows "SESSION" dropdown with "No session".
errors: No errors - UI/UX issue with leftover session-assignment UI
reproduction: 1. Go to Sessions, open a session. 2. Click Create Bracket - Quick Create tab shows session assignment dropdown. 3. Create a poll - poll detail page shows SESSION dropdown.
started: Leftover from pre-Phase-04 workflow

## Eliminated

## Evidence

## Resolution

root_cause: Session selector dropdowns were left in bracket/poll creation forms and detail pages from the pre-Phase-04 workflow. The session workspace already passes sessionId as a query param (?sessionId=xxx) when navigating to /brackets/new and /polls/new, but the creation pages never read it. Detail pages had full session reassignment UI that is no longer needed in the session-first workflow.
fix: |
  1. Removed session selector dropdown from BracketQuickCreate, PollForm (quick create mode), BracketDetail (desktop + mobile), and PollDetailView
  2. Updated creation page routes to read sessionId from searchParams and pass it through
  3. Wired sessionId through creation page components -> Quick Create and Wizard forms
  4. Removed unnecessary session list queries from detail page server components
  5. Cleaned up unused imports (Link2, Unlink, assignBracketToSession, assignPollToSession)
verification: Awaiting human verification
files_changed:
  - src/app/(dashboard)/brackets/new/page.tsx
  - src/app/(dashboard)/polls/new/page.tsx
  - src/app/(dashboard)/brackets/[bracketId]/page.tsx
  - src/app/(dashboard)/polls/[pollId]/page.tsx
  - src/components/bracket/bracket-creation-page.tsx
  - src/components/bracket/bracket-quick-create.tsx
  - src/components/bracket/bracket-form.tsx
  - src/components/bracket/bracket-detail.tsx
  - src/components/poll/poll-creation-page.tsx
  - src/components/poll/poll-form.tsx
  - src/components/poll/poll-wizard.tsx
  - src/components/poll/poll-detail-view.tsx
