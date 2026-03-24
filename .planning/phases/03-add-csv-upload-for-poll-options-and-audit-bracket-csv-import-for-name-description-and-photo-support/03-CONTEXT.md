# Phase 3: Add CSV Upload for Poll Options & Audit Bracket CSV Import - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Two deliverables: (1) Add CSV upload for poll options — new feature matching the existing bracket CSV upload pattern, supporting text and optional image URLs. (2) Audit and extend the existing bracket CSV parser to support logoUrl from CSV. Neither model (PollOption nor BracketEntrant) has a description field despite the phase title — description support is not applicable.

</domain>

<decisions>
## Implementation Decisions

### Poll CSV format & columns
- Support `text` column (required) and optional `image`/`imageUrl` column
- Flexible header aliases: accept 'option', 'text', 'name', or first column for text; accept 'image', 'imageUrl', 'photo', 'url' for image — forgiving, teachers won't get stuck on exact column names
- Image URLs in CSV are downloaded and re-uploaded to Supabase Storage (matching current per-option image upload pattern via signed URL endpoint)
- If an image URL fails to download: import the option text successfully, show a warning that the image couldn't be loaded — teacher can manually upload after

### Bracket CSV enhancements
- Extend bracket CSV parser to support optional `logoUrl` column (accept 'image', 'logo', 'logoUrl', 'photo' aliases)
- Same download & re-upload to Supabase Storage pattern as poll CSV images
- Same failure handling: import entrant with name, skip failed image with warning
- Abbreviation column NOT added — rarely needed for non-sports brackets
- No description column — BracketEntrant has no description field

### Upload UX placement
- Poll CSV upload button placed in the OptionList section, alongside the existing 'Add Option' button — same visual pattern as bracket CSVUpload component
- CSV import replaces all current options (not append) — matches bracket CSV behavior
- Preview step before confirming: shows option text with a small camera/image icon indicator for entries that have an image URL (no actual image download during preview)

### Error handling & validation
- Duplicate option text: keep all duplicates as-is — teacher's responsibility
- Max 32 poll options from CSV (same as manual OptionList limit), truncate with warning — consistent with bracket CSV truncation pattern
- Empty rows silently skipped (papaparse skipEmptyLines)
- Options with empty text after trimming are filtered out

### Claude's Discretion
- Exact button placement relative to 'Add Option' in OptionList
- Warning message wording for failed image downloads and truncation
- Whether to show image download progress during import confirmation
- Shared utility for image download & re-upload (reusable between poll and bracket CSV)
- Preview list styling details (scrollable area height, icon choice)

</decisions>

<specifics>
## Specific Ideas

- Match existing bracket CSVUpload component pattern closely — file input, preview list, confirm/cancel buttons
- Image indicator in preview should be lightweight (icon only, no thumbnail loading)
- "Import option, skip image" philosophy — never block a valid text option due to a bad image URL
- Consistent behavior across poll and bracket CSV imports

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CSVUpload` component (`src/components/bracket/csv-upload.tsx`): Full file upload UI with preview, truncation warnings, confirm/cancel — can be adapted or generalized for polls
- `parseEntrantCSV()` in `src/lib/bracket/csv-parser.ts`: papaparse-based parser with header aliasing — pattern to follow for poll parser
- `ImageUploadModal` (`src/components/shared/image-upload-modal.tsx`): Shared modal for drag-and-drop, URL paste, cropping — used by both poll and bracket image uploads
- `OptionImageUpload` / `EntrantImageUpload`: Per-item image upload components using signed URL endpoints
- Upload URL API routes: `/api/polls/[pollId]/upload-url` and `/api/brackets/[bracketId]/upload-url` — Supabase Storage signed URL generation

### Established Patterns
- papaparse with `header: true`, `skipEmptyLines: true`, `transformHeader: h => h.trim().toLowerCase()`
- Header aliasing: check multiple column names, fall back to first column value
- Preview-then-confirm UX: parse file → show preview with warnings → user confirms → apply to form state
- Image upload: client-side compress → get signed URL from API → upload to Supabase Storage → store resulting URL

### Integration Points
- `OptionList` component (`src/components/poll/option-list.tsx`): Add CSV upload button alongside 'Add Option' — `onChange` callback replaces all options
- `PollForm` (`src/components/poll/poll-form.tsx`): Manages options state, passes to OptionList
- `EntrantList` (`src/components/bracket/entrant-list.tsx`): Bracket equivalent — for consistency
- `csv-parser.ts`: Extend `ParsedEntrant` interface to include optional `logoUrl`, update parser

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-add-csv-upload-for-poll-options-and-audit-bracket-csv-import-for-name-description-and-photo-support*
*Context gathered: 2026-03-24*
