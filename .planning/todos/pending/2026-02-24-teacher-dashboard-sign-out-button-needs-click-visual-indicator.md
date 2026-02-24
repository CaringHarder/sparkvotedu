---
created: 2026-02-24T03:41:58.728Z
title: Teacher dashboard sign-out button needs click visual indicator
area: ui
files:
  - src/components/dashboard/dashboard-shell.tsx
---

## Problem

The sign-out button on the teacher dashboard has no visual feedback when clicked. Since sign-out involves a server action that may take a moment, the teacher has no indication that their click registered, leading to repeated clicks or confusion.

## Solution

Add a loading/pending state to the sign-out button (spinner or disabled state with visual change) while the sign-out action is processing. Use useTransition or similar pattern to track the pending state.
