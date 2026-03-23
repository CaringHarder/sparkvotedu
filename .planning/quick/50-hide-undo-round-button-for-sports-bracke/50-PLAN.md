---
phase: "50"
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/teacher/live-dashboard.tsx
  - src/components/teacher/participation-sidebar.tsx
autonomous: true
requirements: [HIDE-UNDO-SPORTS, VOTE-INDICATOR]
---

<objective>
Hide undo round button for sports brackets and fix per-student vote indicator visibility.

1. Add `!isSports` guard to undo round button render condition
2. Fix voted tile styling: voted status now takes priority over disconnected state, with proper dark mode classes
</objective>

## Tasks

### Task 1: Hide undo round button for sports brackets and fix vote indicators

**Files:** `src/components/teacher/live-dashboard.tsx`, `src/components/teacher/participation-sidebar.tsx`

**Changes:**
- Add `!isSports` to undo round button condition (live-dashboard.tsx line 1637)
- Reorder CSS class priority: voted > disconnected (participation-sidebar.tsx)
- Add dark mode variants for voted tiles (dark:bg-green-950, dark:text-green-300, etc.)
- Voted+disconnected students show faded green instead of gray
