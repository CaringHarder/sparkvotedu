# Phase 34: Poll Quick Create & Image Polish - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Simplify the poll Quick Create form by hiding settings (they belong in Step-by-Step only), and polish poll option image previews to match the bracket entrant image style — including enabling image upload during poll creation (not just edit mode).

</domain>

<decisions>
## Implementation Decisions

### Quick Create form fields
- Quick Create shows ONLY: question, description (optional), and options
- Poll type toggle (Simple/Ranked) is HIDDEN in Quick Create — Quick Create always creates Simple polls
- Ranked polls require Step-by-Step wizard
- Settings section (Allow vote change, Show live results) is HIDDEN in Quick Create
- Quick Create defaults: `allowVoteChange: false`, `showLiveResults: false`

### Template browsing
- Flat chip grid layout (like bracket topic chips) — all templates shown as chips, NOT category-based tabs
- Template browser lives INSIDE Quick Create tab only (not above the mode toggle)
- Selected template stays visually highlighted after selection
- Template auto-fills question + options into the Quick Create form
- Remove the "From Template" button from the Step-by-Step wizard — templates are a Quick Create feature only

### Image preview styling
- Poll option images enforce square (1:1) aspect ratio crop, matching bracket entrant images
- Image upload camera icon positioned on the LEFT — after position badge, before text input (matching bracket entrant row layout exactly)
- Camera icon appears as a dashed-border square (same style as bracket entrants) visible immediately when an option is added — not hidden behind an "Add Image" text button
- Layout order per option row: drag handle → position badge → camera icon → text input → remove button

### Image upload during creation
- Enable image upload during poll creation (before pollId exists), matching bracket's "draft" pattern
- Image upload buttons visible in BOTH Quick Create and Step-by-Step modes
- Upload buttons visible on all options regardless of template pre-fill or manual entry
- Upload endpoint implementation details are Claude's discretion

### Claude's Discretion
- Draft upload endpoint approach (matching bracket pattern or alternative)
- Loading skeleton design
- Error state handling

</decisions>

<specifics>
## Specific Ideas

- Bracket entrants use `'draft'` as bracketId fallback for upload URL endpoint during creation — poll should follow same pattern
- Bracket image cropping uses `aspectRatio={1}` in ImageUploadModal — poll should match
- Current PollForm component also handles edit mode (existingPoll prop) — changes should preserve edit functionality
- Reference screenshot: bracket entrant row shows [grip dots] [1] [camera icon] [name] — poll option rows should mirror this layout

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 34-poll-quick-create-image-polish*
*Context gathered: 2026-03-01*
