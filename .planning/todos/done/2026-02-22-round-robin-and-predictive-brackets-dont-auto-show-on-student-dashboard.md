---
created: 2026-02-22T04:38:00.000Z
title: Round robin and predictive brackets dont auto-show on student dashboard
area: ui
files: []
---

## Problem

When a teacher activates a round robin or predictive bracket, it does not automatically appear on the student dashboard. Students must manually refresh the page to see the newly activated bracket. This breaks the real-time classroom flow where students should immediately see new activities as they become available.

## Solution

- Investigate the realtime broadcast pattern used when activating round robin and predictive brackets
- Compare with single/double elimination brackets (which may already work) and polls
- Ensure bracket activation broadcasts on the correct channel(s) so student dashboard subscriptions pick up the new activity
- Student dashboard should reactively display newly activated brackets without requiring a page refresh
