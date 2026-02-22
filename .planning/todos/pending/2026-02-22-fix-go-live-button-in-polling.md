---
created: 2026-02-22T02:20:37.094Z
title: Fix go live button in polling
area: ui
files:
  - src/components/poll/poll-results.tsx
  - src/actions/poll.ts
---

## Problem

When a teacher activates a poll, students can already see the poll and vote without the teacher clicking "Go Live." The Go Live button flow is not gating student access correctly -- students should not see or be able to vote on a poll until the teacher explicitly activates it via the Go Live button.

## Solution

TBD -- investigate the poll activation flow to determine where the gate is missing. The poll status should be checked on the student side before allowing vote submission, and the student UI should not render the poll form until the poll status is "active."
