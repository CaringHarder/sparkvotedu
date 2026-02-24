---
created: 2026-02-24T03:26:19.446Z
title: SE bracket final round realtime updates stop working
area: ui
files:
  - src/components/teacher/live-dashboard.tsx
  - src/hooks/use-realtime-bracket.ts
---

## Problem

In a 4-team single elimination bracket, the teacher's live dashboard auto-updates correctly during the first round (round 1) -- student votes appear in real-time without refreshing. However, in the final round (round 2), realtime updates stop working. The teacher must manually refresh the page to see updated vote counts from students.

This suggests the realtime subscription or the vote count fetching mechanism breaks when advancing to the final round. Possible causes:
- The `currentRound` or matchup filtering changes after round advance, causing the realtime handler to miss updates for the new round's matchups
- The `fetchBracketState` refetch may not be triggered properly for final-round vote events
- The bracket channel subscription may be filtering by round and missing final-round events

## Solution

TBD -- needs investigation of the realtime bracket hook and how vote updates are processed across round transitions. Compare how round 1 matchups receive updates vs round 2 matchups after advancing.
