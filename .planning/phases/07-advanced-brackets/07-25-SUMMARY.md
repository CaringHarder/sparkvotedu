---
phase: 07-advanced-brackets
plan: 25
subsystem: ui
tags: [double-elimination, celebration, tiebreak, winner-reveal]
requires:
  - phase: 07-advanced-brackets
    provides: "DE bracket engine, live dashboard, student bracket page"
provides:
  - "Auto-tiebreak modal on partial advance"
  - "GF tab persistence on DE bracket completion"
  - "Chained WinnerReveal to CelebrationScreen timing"
affects: [07-advanced-brackets]
tech-stack:
  added: []
  patterns: ["handleRevealComplete callback chain", "useEffect auto-navigation"]
key-files:
  created: [".planning/phases/07-advanced-brackets/07-25-SUMMARY.md"]
  modified: ["src/components/teacher/live-dashboard.tsx", "src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx"]
key-decisions:
  - "Chain celebration to WinnerReveal onComplete instead of independent timer"
  - "useEffect auto-navigates to grand_finals tab when deBracketDone"
  - "Auto-select first unresolved matchup for tiebreak on partial advance"
duration: ~1.7m
completed: 2026-02-02
---

# Phase 7 Plan 25: DE Tiebreak, GF Tab, Reveal Timing Summary

**One-liner:** Auto-tiebreak modal for partial advance, GF tab persistence via useEffect, and chained WinnerReveal-to-CelebrationScreen timing on both teacher and student DE pages.

## What Was Done

### Task 1: Partial advance auto-tiebreak + GF tab persistence
**Commit:** `c96a948`
**Files:** `src/components/teacher/live-dashboard.tsx`

Two targeted fixes in the live dashboard:

1. **Auto-open pick-winner modal for unresolved matchups** -- In `handleCloseAndAdvance`, when `unresolvedCount > 0`, the first tied/zero-vote matchup is auto-selected via `setSelectedMatchupId(firstUnresolved.id)`. Applied in both branches: all-unresolved (early return path) and partial-unresolved (after advancing clear winners). Teachers immediately see the tiebreak UI instead of a confusing error toast alone.

2. **Auto-navigate to grand_finals tab on DE bracket completion** -- Added a `useEffect` keyed on `deBracketDone` that calls `setDeRegion('grand_finals')`. This survives component remounts and revalidation (where useState resets to 'winners') because the effect fires on mount when all GF matchups are decided.

### Task 2: Chain WinnerReveal to CelebrationScreen (teacher + student)
**Commit:** `34b0b79`
**Files:** `src/components/teacher/live-dashboard.tsx`, `src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx`

Fixed celebration stomping the winner reveal animation on both pages:

1. **Removed** the independent 4-second celebration timer (`setTimeout(() => setShowCelebration(true), 4000)`) from both teacher and student DE pages.

2. **Added** `handleRevealComplete` callback that chains celebration 1 second after the WinnerReveal animation completes via `onComplete` prop.

3. **Added** fallback effect for race conditions: when `bracketCompleted` fires but `revealState` never triggers (status-transition detection missed), celebration shows after 2-second delay with `hasShownRevealRef` guard to prevent re-triggering.

4. **Updated** WinnerReveal rendering in both files to use `onComplete={handleRevealComplete}` instead of `onComplete={() => setRevealState(null)}`.

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Pass -- no errors |
| Auto-select on partial advance | 2 locations with `setSelectedMatchupId(firstUnresolved.id)` |
| GF tab auto-navigation | `setDeRegion('grand_finals')` in deBracketDone effect |
| Old 4s timer removed | 0 occurrences of `setTimeout.*4000` in both files |
| handleRevealComplete in teacher | Present in live-dashboard.tsx (callback + render) |
| handleRevealComplete in student | Present in page.tsx DEVotingView (callback + render) |
| Fallback celebration effect | Both files have `!revealState && !hasShownRevealRef.current` guard |

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Chain celebration to WinnerReveal onComplete | Eliminates 4s/7.8s overlap; celebration waits for full reveal animation |
| useEffect for GF tab persistence | Survives useState reset on remount; simplest reactive approach |
| Auto-select first unresolved matchup | Teacher immediately sees tiebreak UI; uses existing setSelectedMatchupId state |
| 1s delay after reveal -> celebration | Brief visual pause between dismiss and confetti for clean transition |
| 2s fallback for race condition | Gives reveal detection time to fire first; prevents celebration without reveal in edge case |

## Next Phase Readiness

No blockers. Plans 26 and 27 can proceed independently.
