---
created: 2026-02-24T03:04:09.389Z
title: RR all-at-once bracket completes after first round blocks remaining rounds
area: ui
files:
  - src/components/teacher/live-dashboard.tsx
  - src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx
---

## Problem

In round robin brackets with "all at once" voting setting, the bracket marks itself as complete after the first round finishes. Neither the teacher nor students can vote in additional rounds. The bracket should allow voting through all rounds before marking as complete, but the completion logic triggers prematurely after the first round's matchups are all decided.

This was discovered during UAT verification of Phase 24 (RR bracket completion celebration). The bracketDone logic (likely in live-dashboard.tsx) may be checking if all *current* matchups are decided rather than all matchups across all rounds, causing early completion in all-at-once mode where multiple rounds of matchups exist simultaneously.

## Solution

Investigate the bracketDone condition in live-dashboard.tsx -- the RR-specific check added in 24-04 uses `currentMatchups.every(status=decided)` which may only look at the current round's matchups in all-at-once mode rather than all matchups across the entire bracket. The fix likely needs to check total matchups vs total decided matchups across all rounds, or ensure "all at once" properly presents all rounds before triggering completion.
