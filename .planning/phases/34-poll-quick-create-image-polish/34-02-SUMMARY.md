---
phase: 34-poll-quick-create-image-polish
plan: 02
subsystem: ui
tags: [react, image-upload, poll, tailwind, draft-pattern]

# Dependency graph
requires:
  - phase: 34-poll-quick-create-image-polish
    provides: "Poll quick create UI with option list"
provides:
  - "OptionImageUpload with draft fallback, dashed-border camera icon, square aspect ratio"
  - "OptionList with reordered layout: drag handle, badge, camera icon, text input, remove"
affects: [poll-creation, poll-editing, image-upload]

# Tech tracking
tech-stack:
  added: []
  patterns: [draft-upload-pattern-for-polls, consistent-image-upload-visual-language]

key-files:
  created: []
  modified:
    - src/components/poll/option-image-upload.tsx
    - src/components/poll/option-list.tsx

key-decisions:
  - "Draft fallback pattern mirrors EntrantImageUpload: pollId ?? 'draft' for creation mode"
  - "Square aspect ratio enforced via aspectRatio={1} on ImageUploadModal"
  - "Camera icon always visible when not disabled (no pollId gate)"

patterns-established:
  - "Draft upload pattern: use 'draft' as entity ID fallback when creating new polls/brackets"
  - "Consistent image upload visuals: dashed-border 8x8 camera icon, 8x8 preview, small remove button"

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 34 Plan 02: Option Image Upload Polish Summary

**Poll option image upload matching bracket entrant visual pattern: dashed-border 8x8 camera icon, square crop, draft upload fallback, and reordered option row layout**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T03:29:35Z
- **Completed:** 2026-03-02T03:31:55Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- OptionImageUpload now uses draft fallback pattern (pollId ?? 'draft') enabling image upload during poll creation
- Dashed-border 8x8 camera icon replaces "Add Image" text button, matching EntrantImageUpload style
- Square aspect ratio (1:1) enforced on ImageUploadModal for consistent cropping
- Option row layout reordered: drag handle, badge, camera icon, text input, remove button
- Camera icon visible on every option row without requiring pollId (works in both creation and edit modes)

## Task Commits

Each task was committed atomically:

1. **Task 1: Update OptionImageUpload with draft pattern, dashed-border icon, and square crop** - `792b5e8` (feat)
2. **Task 2: Reorder option row layout and enable always-visible image upload** - `b80b5b7` (feat)

## Files Created/Modified
- `src/components/poll/option-image-upload.tsx` - Updated pollId to optional with draft fallback, dashed-border 8x8 camera icon, 8x8 preview, square aspect ratio
- `src/components/poll/option-list.tsx` - Removed pollId gate, moved OptionImageUpload before text input in render order

## Decisions Made
- Draft fallback pattern mirrors EntrantImageUpload exactly: `pollId ?? 'draft'` for creation mode
- Square aspect ratio enforced via `aspectRatio={1}` on ImageUploadModal (matching bracket entrant behavior)
- Camera icon always visible when not disabled -- no pollId gate needed since OptionImageUpload handles null pollId

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript error in `src/app/(dashboard)/polls/new/page.tsx` (mode prop on PollForm) -- out of scope, likely from phase 34-01 implementation

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Both modified components ready for use in Quick Create and Step-by-Step modes
- Image upload works during poll creation via draft pattern
- Ready for Plan 03 (poll quick create integration/polish)

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 34-poll-quick-create-image-polish*
*Completed: 2026-03-02*
