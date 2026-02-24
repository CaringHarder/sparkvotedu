---
created: 2026-02-24T03:41:58.728Z
title: Polls should have triple dot context menu like brackets
area: ui
files:
  - src/components/dashboard/poll-card.tsx
  - src/components/dashboard/bracket-card.tsx
---

## Problem

Brackets in the teacher dashboard have a triple-dot context menu (for actions like delete, archive, etc.), but polls do not have an equivalent menu. This inconsistency means poll management requires navigating into the poll to perform actions, while brackets can be managed directly from the dashboard view.

## Solution

Add the same triple-dot context menu pattern used by bracket cards to poll cards. Reuse or adapt the existing context menu component from bracket-card.tsx to provide consistent dashboard-level management for both activity types.
