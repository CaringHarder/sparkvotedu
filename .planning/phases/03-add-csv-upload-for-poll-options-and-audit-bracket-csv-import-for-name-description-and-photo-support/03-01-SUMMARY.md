---
phase: 03-add-csv-upload-for-poll-options-and-audit-bracket-csv-import-for-name-description-and-photo-support
plan: 01
subsystem: api
tags: [csv, papaparse, supabase-storage, image-upload]

requires: []
provides:
  - parsePollOptionCSV function for poll CSV import
  - downloadAndReuploadImage and processCSVImages utilities for CSV image re-upload
  - ParsedEntrant.logoUrl field for bracket image support
affects: [03-02]

tech-stack:
  added: []
  patterns: [sequential image processing to avoid rate limits, flexible CSV header aliasing]

key-files:
  created:
    - src/lib/poll/csv-parser.ts
    - src/lib/utils/csv-image-upload.ts
  modified:
    - src/lib/bracket/csv-parser.ts

key-decisions:
  - "Sequential image processing in processCSVImages to avoid Supabase rate limits"
  - "Consistent header aliasing pattern across poll and bracket CSV parsers"

patterns-established:
  - "CSV header aliasing: transformHeader lowercase + multiple alias fallbacks"
  - "Never-throw image utilities: return { publicUrl: null, error } on failure"

requirements-completed: []

duration: 1min
completed: 2026-03-24
---

# Phase 03 Plan 01: CSV Parsers and Image Upload Utility Summary

**Poll CSV parser with text/image header aliasing, bracket logoUrl extension, and shared Supabase Storage image re-upload utility**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-24T16:23:27Z
- **Completed:** 2026-03-24T16:24:46Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Poll CSV parser with flexible header aliases for text and image columns
- Shared image download-and-reupload utility with sequential batch processing and progress callbacks
- Bracket CSV parser extended with optional logoUrl field (backward compatible)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create poll CSV parser and shared image upload utility** - `d3a4ec7` (feat)
2. **Task 2: Extend bracket CSV parser with logoUrl support** - `c9cdcf3` (feat)

## Files Created/Modified
- `src/lib/poll/csv-parser.ts` - Poll option CSV parser with text/image header aliasing
- `src/lib/utils/csv-image-upload.ts` - Shared image download and Supabase re-upload utility
- `src/lib/bracket/csv-parser.ts` - Added optional logoUrl to ParsedEntrant interface

## Decisions Made
- Sequential image processing in processCSVImages to avoid Supabase Storage rate limits (per research pitfall 5)
- Consistent header aliasing pattern across both poll and bracket parsers for predictable CSV acceptance

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all functions are fully implemented with proper error handling.

## Next Phase Readiness
- All three files type-check cleanly with project tsconfig
- Plan 02 can now import parsePollOptionCSV, downloadAndReuploadImage, and processCSVImages for UI integration
- ParsedEntrant.logoUrl ready for bracket import UI to consume

---
*Phase: 03-add-csv-upload-for-poll-options-and-audit-bracket-csv-import-for-name-description-and-photo-support*
*Completed: 2026-03-24*
