---
created: 2026-02-22T04:34:00.000Z
title: Unify celebration animations across all brackets and polls
area: ui
files: []
---

## Problem

The double elimination bracket has the ideal celebration flow: a 3, 2, 1 countdown visible on both teacher and student pages, followed by perfectly timed winner reveal with celebration stars and animation. However, poll results have two different celebration variations -- one on the student page and another on the teacher dashboard -- both slightly different from each other and from the double elimination bracket celebration. This inconsistency makes the product feel unpolished.

## Solution

- Use the double elimination bracket celebration animation as the canonical reference implementation
- Audit all winner/results reveal animations across: single elimination, double elimination, round robin brackets, and poll results (student page + teacher dashboard)
- Replace all variations with the exact countdown + reveal + stars animation pattern from double elimination
- Ensure both teacher and student views show the same celebration timing and effects
