---
created: 2026-02-22T04:18:46.480Z
title: Make sessions archiveable with delete and recover
area: ui
files: []
---

## Problem

Teachers accumulate sessions over time and have no way to clean up old or unused sessions. The sessions list grows indefinitely, making it harder to find active/relevant sessions. Teachers need the ability to archive sessions they're done with, permanently delete archived sessions, and recover accidentally archived sessions.

## Solution

- Add an `archivedAt` nullable timestamp column to `classSession` (or a status enum with active/archived states)
- Sessions list defaults to showing only non-archived sessions
- Add archive action on session cards/detail pages (soft delete)
- Add an "Archived" tab or filter on the sessions list page to view archived sessions
- Archived sessions can be recovered (unarchived) or permanently deleted
- Permanent delete cascades to related data (participants, activities, votes)
