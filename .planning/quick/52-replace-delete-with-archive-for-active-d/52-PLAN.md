---
phase: "52"
plan: 1
type: execute
wave: 1
files_modified:
  - src/components/shared/card-context-menu.tsx
  - src/components/poll/poll-detail-view.tsx
  - src/components/bracket/bracket-status.tsx
autonomous: true
requirements: [PREVENT-ACCIDENTAL-DELETE]
---

<objective>
Replace all delete buttons with archive for active/draft polls and brackets. Only allow permanent delete from archived views.
</objective>

## Task 1: Replace delete with archive across all non-archived UIs

**card-context-menu.tsx**: Non-archived items show "Archive" (destructive style), archived items show "Delete Permanently"
**poll-detail-view.tsx**: Delete button/handler/dialog → Archive with recoverable messaging
**bracket-status.tsx**: Delete button/handler/dialog → Archive with recoverable messaging
