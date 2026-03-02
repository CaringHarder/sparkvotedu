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
- Quick Create defaults: `allowVoteChange: true`, `showLiveResults: false` (matching current defaults)

### Template browsing
- Keep existing category-based layout (category chips at top, template cards expand below)
- Template browser stays ABOVE the Quick Create / Step-by-Step toggle (current position)
- Selected template stays visually highlighted after selection (current behavior)
- Template auto-fills into Quick Create mode when selected (current behavior)
- Step-by-Step wizard keeps its own "From Template" button inside Options step (both access points remain)

### Image preview styling
- Poll option images enforce square (1:1) aspect ratio crop, matching bracket entrant images
- Exact thumbnail sizing and container style is Claude's discretion (standardize visual treatment between brackets and polls)

### Image upload during creation
- Enable image upload during poll creation (before pollId exists), matching bracket's "draft" pattern
- Image upload buttons visible in BOTH Quick Create and Step-by-Step modes
- Upload buttons visible on all options regardless of template pre-fill or manual entry
- Upload endpoint implementation details are Claude's discretion

### Claude's Discretion
- Image thumbnail sizing (standardize between bracket 32px and poll 48px as appropriate)
- Image preview container style (thumbnail-only vs card-style)
- Draft upload endpoint approach (matching bracket pattern or alternative)
- Loading skeleton design
- Error state handling

</decisions>

<specifics>
## Specific Ideas

- Bracket entrants use `'draft'` as bracketId fallback for upload URL endpoint during creation — poll should follow same pattern
- Bracket image cropping uses `aspectRatio={1}` in ImageUploadModal — poll should match
- Current PollForm component also handles edit mode (existingPoll prop) — changes should preserve edit functionality

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 34-poll-quick-create-image-polish*
*Context gathered: 2026-03-01*
