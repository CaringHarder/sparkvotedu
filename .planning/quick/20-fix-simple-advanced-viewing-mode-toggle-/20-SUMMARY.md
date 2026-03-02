---
phase: 20-quick
plan: 20
subsystem: ui
tags: [tailwind, segmented-control, react, display-settings]

# Dependency graph
requires:
  - phase: 31.1-activity-card-layout-fix-quick-settings-toggle
    provides: QuickSettingsToggle and DisplaySettingsSection components
provides:
  - ViewingModeToggle segmented control component for Simple/Advanced mode
affects: [bracket-detail, live-dashboard, display-settings]

# Tech tracking
tech-stack:
  added: []
  patterns: [segmented-control-for-named-modes]

key-files:
  created:
    - src/components/shared/viewing-mode-toggle.tsx
  modified:
    - src/components/bracket/bracket-detail.tsx
    - src/components/teacher/live-dashboard.tsx

key-decisions:
  - "Segmented control uses bg-primary/text-primary-foreground for active state to match shadcn theme"
  - "onValueChange accepts mode string directly instead of boolean conversion"

patterns-established:
  - "Segmented control pattern: use ViewingModeToggle for named-mode choices vs QuickSettingsToggle for on/off booleans"

requirements-completed: [QUICK-20]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Quick Task 20: Fix Simple/Advanced Viewing Mode Toggle

**Segmented control component replacing confusing on/off switch for Simple/Advanced viewing mode selection**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T05:47:51Z
- **Completed:** 2026-03-02T05:50:22Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created ViewingModeToggle segmented control with explicit "Simple" and "Advanced" labeled buttons
- Replaced confusing on/off Switch toggle in both bracket-detail and live-dashboard
- Show Seeds and Show Vote Counts toggles remain unchanged as on/off switches

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ViewingModeToggle segmented control component** - `6f16d93` (feat)
2. **Task 2: Replace QuickSettingsToggle with ViewingModeToggle in bracket-detail.tsx and live-dashboard.tsx** - `9e9d283` (feat)

## Files Created/Modified
- `src/components/shared/viewing-mode-toggle.tsx` - New segmented control component with Simple/Advanced buttons
- `src/components/bracket/bracket-detail.tsx` - Added ViewingModeToggle import, updated handleViewingModeChange signature, replaced viewing mode QuickSettingsToggle
- `src/components/teacher/live-dashboard.tsx` - Same changes as bracket-detail, preserving useCallback wrapper

## Decisions Made
- Used bg-primary/text-primary-foreground for active button to match shadcn theme tokens used elsewhere
- Changed handleViewingModeChange to accept mode string directly ('simple' | 'advanced') instead of boolean-to-mode conversion -- cleaner API, no conversion logic needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ViewingModeToggle component available for any future named-mode settings
- Both teacher views (bracket detail and live dashboard) updated consistently

## Self-Check: PASSED

- [x] `src/components/shared/viewing-mode-toggle.tsx` exists
- [x] `20-SUMMARY.md` exists
- [x] Commit `6f16d93` found
- [x] Commit `9e9d283` found

---
*Quick Task: 20-fix-simple-advanced-viewing-mode-toggle*
*Completed: 2026-03-02*
