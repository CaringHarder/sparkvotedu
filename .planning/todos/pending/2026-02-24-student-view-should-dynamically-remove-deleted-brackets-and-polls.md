---
created: 2026-02-24T03:41:58.728Z
title: Student view should dynamically remove deleted brackets and polls
area: ui
files:
  - src/app/(student)/session/[sessionId]/page.tsx
---

## Problem

When a teacher deletes a bracket or poll from the dashboard, students who have the student dashboard open still see the deleted activity. They must manually refresh to see it removed. This creates confusion in a live classroom where the teacher may delete a test bracket/poll while students are watching.

## Solution

Subscribe to realtime broadcast events for activity deletion (similar to how bracket/poll activation broadcasts work via activities:{sessionId} channel). When a deletion event is received, remove the activity from the student's displayed list without requiring a page refresh.
