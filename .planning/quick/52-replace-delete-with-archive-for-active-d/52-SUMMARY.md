---
phase: "52"
plan: 1
subsystem: ui
tags: [safety, archive, delete, polls, brackets]
key-files:
  modified:
    - src/components/shared/card-context-menu.tsx
    - src/components/poll/poll-detail-view.tsx
    - src/components/bracket/bracket-status.tsx
duration: 3min
completed: 2026-03-24
---

# Quick Task 52: Replace delete with archive for active/draft polls and brackets

## Motivation
A teacher accidentally deleted a poll with 30 minutes of inputted data. Hard delete is permanent and unrecoverable. This change ensures teachers must first archive, then explicitly delete from the archive view.

## Changes
- **Card context menu**: Non-archived items now show "Archive" instead of "Delete". Only archived items show "Delete Permanently"
- **Poll detail page**: Delete button → Archive button with amber styling and recoverable messaging ("You can recover it later from the archived view")
- **Bracket detail page**: Same treatment — Delete → Archive with recoverable messaging
- **Archived views**: Unchanged — permanent delete remains available there

## Commit
- `faafb4b`: fix: replace delete with archive for active/draft polls and brackets
