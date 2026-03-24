---
phase: 03-add-csv-upload-for-poll-options-and-audit-bracket-csv-import-for-name-description-and-photo-support
verified: 2026-03-24T17:00:00Z
status: human_needed
score: 11/12 must-haves verified
re_verification: false
human_verification:
  - test: "Upload a poll CSV with text and image columns, confirm import, verify images appear on options"
    expected: "Parsed options replace all current options; options with image URLs have images uploaded to Supabase Storage and displayed; failed image URLs show an amber warning but the option text is still preserved"
    why_human: "Requires a live browser session against the dev server; image upload result depends on Supabase Storage connectivity and real network fetch from an external URL"
  - test: "Upload a bracket CSV with a logo column, confirm import, verify logos appear on entrants"
    expected: "Parsed entrants populate the bracket form; entrants with logo URLs have images uploaded to Supabase Storage and appear on the entrant list; failed logo URLs show a warning but the entrant name is preserved"
    why_human: "Same as above — requires live dev server and real Supabase Storage to verify end-to-end image upload path for bracket entrants"
  - test: "Upload a poll CSV with more than 32 options"
    expected: "Preview shows exactly 32 options with an amber truncation warning; confirming imports only those 32 options"
    why_human: "Requires a browser interaction to verify the UI truncation warning renders and the final option count is correct"
---

# Phase 03: CSV Upload for Poll Options + Bracket Image Support Verification Report

**Phase Goal:** Add CSV upload for poll options and audit bracket CSV import for name, description, and photo support
**Verified:** 2026-03-24T17:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Plan 01)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Poll CSV file with text column parses into structured option objects | VERIFIED | `parsePollOptionCSV` in `src/lib/poll/csv-parser.ts` — uses papaparse, aliases `text`/`option`/`name`/first-column, filters empty rows, returns `ParsedPollOption[]` |
| 2 | Poll CSV file with text + image columns parses both fields | VERIFIED | `parsePollOptionCSV` extracts image from `image`/`imageurl`/`photo`/`url` column aliases; returns `imageUrl?: string` on each option |
| 3 | Bracket CSV file with image/logo column parses logoUrl alongside name and seed | VERIFIED | `src/lib/bracket/csv-parser.ts` line 25 — `logoUrl: (row['image'] \|\| row['logo'] \|\| row['logourl'] \|\| row['photo'] \|\| '').trim() \|\| undefined` |
| 4 | External image URL can be downloaded and re-uploaded to Supabase Storage via signed URL | VERIFIED | `downloadAndReuploadImage` in `src/lib/utils/csv-image-upload.ts` — fetches external URL, POSTs to `uploadEndpoint` for `{signedUrl, publicUrl}`, PUTs blob to signedUrl; both `/api/polls/[pollId]/upload-url` and `/api/brackets/[bracketId]/upload-url` return the expected shape |
| 5 | Failed image download returns null publicUrl with error message instead of throwing | VERIFIED | All failure paths in `downloadAndReuploadImage` return `{ publicUrl: null, error: ... }`; top-level `try/catch` ensures no throws escape |

### Observable Truths (Plan 02)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | Teacher can upload a CSV file in the poll creation form and see a preview of parsed options | VERIFIED (automated) / needs human for UI | `PollCSVUpload` renders file input + preview list; `OptionList` renders `<PollCSVUpload>` in both the empty-state branch (line 143) and the populated-state branch (line 242) |
| 7 | Preview shows a camera icon indicator next to options that have an image URL in the CSV | VERIFIED (code) / needs human for visual | `poll-csv-upload.tsx` line 201: `{option.imageUrl && (<Camera ... />)}` — Camera icon from lucide-react rendered conditionally |
| 8 | Confirming CSV import replaces all current poll options and downloads+reuploads images to Supabase Storage | VERIFIED (code) | `handleConfirm` calls `processCSVImages`, builds `finalOptions` from `imageMap`, then calls `onImportComplete`; `handleCSVImport` in `option-list.tsx` calls `onChange(newOptions)` replacing all prior options |
| 9 | Failed image downloads show a warning but the option text is still imported | VERIFIED (code) | `processCSVImages` `onWarning` callback appends to `warnings`; `finalOptions` still includes all text entries regardless of `imageMap` result |
| 10 | CSV with more than 32 options shows a truncation warning and only imports the first 32 | VERIFIED (code) / needs human for visual | `poll-csv-upload.tsx` lines 45-50 truncate preview at `maxOptions`; amber `truncated` banner displayed at line 181; `maxOptions` passed from `OptionList` defaults to 32 |
| 11 | Bracket CSV with image/logo column downloads+reuploads images to Supabase Storage for each entrant | VERIFIED (code) | `csv-upload.tsx` `handleConfirm` calls `processCSVImages` and maps results back into `enrichedEntrants`; `bracketId` prop wired from `bracket-form.tsx` line 782 |
| 12 | Bracket CSV without image column continues to work unchanged | VERIFIED | `parseEntrantCSV` sets `logoUrl` only when a matching column exists (empty string falls through to `undefined`); `handleConfirm` short-circuits to `onEntrantsParsed(preview)` when `hasImages` is false |

**Score:** 12/12 truths pass automated code verification. 3 require live human confirmation for UI/network behavior.

### Required Artifacts

| Artifact | Plan | Status | Details |
|----------|------|--------|---------|
| `src/lib/poll/csv-parser.ts` | 01 | VERIFIED | 53 lines; exports `ParsedPollOption` and `parsePollOptionCSV`; uses papaparse with full header aliasing |
| `src/lib/utils/csv-image-upload.ts` | 01 | VERIFIED | 129 lines; exports `ImageUploadResult`, `downloadAndReuploadImage`, `processCSVImages`; sequential processing, never-throw guarantee |
| `src/lib/bracket/csv-parser.ts` | 01 | VERIFIED | 35 lines; `ParsedEntrant` includes `logoUrl?: string`; four logo column aliases |
| `src/components/poll/poll-csv-upload.tsx` | 02 | VERIFIED | 264 lines; full file input, preview, image indicators, upload progress, confirm/cancel, warning display |
| `src/components/poll/option-list.tsx` | 02 | VERIFIED | Imports and renders `<PollCSVUpload>` in both empty-state and populated-state branches; `handleCSVImport` replaces all options |
| `src/components/bracket/csv-upload.tsx` | 02 | VERIFIED | Extended with `bracketId?` prop, `processCSVImages` call in `handleConfirm`, Camera icon in preview, image warnings display |
| `src/components/bracket/bracket-form.tsx` | 02 | VERIFIED | `handleEntrantsFromCSV` typed to accept `logoUrl?`; maps `p.logoUrl` into `FormEntrant`; passes `bracketId={null}` to `<CSVUpload>` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/components/poll/poll-csv-upload.tsx` | `src/lib/poll/csv-parser.ts` | `import parsePollOptionCSV` | WIRED | Line 6 import; called in `handleFileSelect` |
| `src/components/poll/poll-csv-upload.tsx` | `src/lib/utils/csv-image-upload.ts` | `import processCSVImages` | WIRED | Line 7 import; called in `handleConfirm` |
| `src/components/poll/option-list.tsx` | `src/components/poll/poll-csv-upload.tsx` | renders `<PollCSVUpload>` | WIRED | Lines 143 and 242 render `<PollCSVUpload>` with all required props |
| `src/components/bracket/csv-upload.tsx` | `src/lib/utils/csv-image-upload.ts` | `import processCSVImages` | WIRED | Line 7 import; called in `handleConfirm` when `hasImages` is true |
| `src/components/bracket/bracket-form.tsx` | `src/components/bracket/csv-upload.tsx` | renders `<CSVUpload>` | WIRED | Line 779-782; passes `onEntrantsParsed={handleEntrantsFromCSV}` and `bracketId={null}` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `poll-csv-upload.tsx` | `preview` (ParsedPollOption[]) | `parsePollOptionCSV(file)` from real File object | Yes — parsed from user-provided CSV | FLOWING |
| `poll-csv-upload.tsx` | `imageMap` (Map<string, string>) | `processCSVImages` → `downloadAndReuploadImage` → `/api/polls/[pollId]/upload-url` → Supabase Storage | Yes — API routes return real signed URLs; upload endpoints verified to return `signedUrl` and `publicUrl` | FLOWING (network-dependent) |
| `option-list.tsx` | `options` (OptionItem[]) | `handleCSVImport` callback calls `onChange(newOptions)` replacing parent form state | Yes — derived from confirmed CSV import | FLOWING |
| `bracket/csv-upload.tsx` | `preview` (ParsedEntrant[]) | `parseEntrantCSV(file)` | Yes — parsed from user CSV | FLOWING |
| `bracket/csv-upload.tsx` | `enrichedEntrants` | `processCSVImages` → `/api/brackets/[bracketId]/upload-url` | Yes — API route returns real signed URLs | FLOWING (network-dependent) |
| `bracket-form.tsx` | `logoUrl` on FormEntrant | `handleEntrantsFromCSV` ← `onEntrantsParsed` from `CSVUpload` | Yes — flows from CSV parse result | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| poll csv-parser module exports expected functions | `node -e "const m = require('./src/lib/poll/csv-parser.ts')"` | Not directly runnable (TypeScript source) — TypeScript compilation passes with zero errors for all 7 phase files | PASS (tsc --noEmit) |
| All 4 commits from SUMMARY exist in git history | `git log --oneline d3a4ec7 c9cdcf3 0035f89 eaacf10` | All 4 hashes resolve to named commits on main branch | PASS |
| No TypeScript errors in phase files | `npx tsc --noEmit` filtered to phase files | Zero errors | PASS |

### Requirements Coverage

No requirement IDs were declared in either plan's `requirements` field (both set to `[]`). No phase-03 entries were found in REQUIREMENTS.md. Requirements coverage check: N/A.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No stubs, placeholders, TODO comments, empty returns, or hardcoded empty data arrays detected in any of the 7 phase files. All state variables that are initialized as `null` or `[]` are populated by real data flows (file parse, image upload callbacks).

### Human Verification Required

#### 1. Poll CSV Import End-to-End

**Test:** Navigate to `localhost:3001`, create a new poll. In the options section, click "Upload CSV". Upload a file with headers `text,image` and three rows: one with a valid image URL, one with an empty image cell, one with an invalid URL.
**Expected:** Preview renders 3 options. Option with a valid image URL shows a Camera icon. Clicking "Use These Options" shows upload progress ("Uploading images... 1/2", "2/2"), the valid-URL option receives an image, the invalid-URL option shows an amber warning, and all 3 option texts appear in the form.
**Why human:** End-to-end image upload path requires a live browser, active Supabase Storage credentials, and real network fetch from an external image URL.

#### 2. Bracket CSV Import with Logo Column

**Test:** Navigate to `localhost:3001`, create a new bracket. Go to the CSV upload tab. Upload a CSV with headers `name,logo` with 4 rows — 2 with valid image URLs, 2 with empty logo cells.
**Expected:** Preview shows 4 entrants; 2 have Camera icon indicators. Confirming shows upload progress for 2 images. Entrants with valid URLs receive logos; entrants without do not. Warnings display if any URL fails.
**Why human:** Same as above — requires live Supabase Storage and real image fetching.

#### 3. Poll CSV Truncation at 32 Options

**Test:** Upload a poll CSV containing 35 rows. Confirm the preview.
**Expected:** Preview shows exactly 32 options. An amber warning banner reads "CSV had more than 32 options. Only the first 32 will be used." Confirming replaces poll options with exactly 32 entries.
**Why human:** Requires browser interaction to verify the rendered truncation banner and final option count in the form state.

### Gaps Summary

No gaps found. All 7 artifacts exist with substantive implementations, all key links are wired, data flows are connected end-to-end (parsers → components → upload endpoints that return real Supabase signed URLs), and TypeScript compilation is clean. The three human verification items cover live network/UI behavior that cannot be confirmed statically, but the code paths that would drive those behaviors are fully implemented.

---

_Verified: 2026-03-24T17:00:00Z_
_Verifier: Claude (gsd-verifier)_
