# Phase 39: Schema Migration + Data Foundation - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Add emoji and lastInitial columns to StudentParticipant, create a curated emoji pool module with ~24 K-12-safe shortcodes, and build an EmojiAvatar component that renders shortcodes as visual emoji. This is the data foundation for the entire v3.0 student join overhaul.

</domain>

<decisions>
## Implementation Decisions

### Emoji pool curation
- ~24 emojis in the pool (medium size, fits a 4x6 or 6x4 grid)
- Mixed vibe: some playful (rocket, unicorn, pizza) and some calm (trees, stars, animals)
- No people or face emojis — avoids skin tone issues and human representation concerns
- Fixed app-wide pool — not configurable by teachers
- No specific emoji must-haves or exclusions beyond the no-people rule
- Fun name generator already exists in the codebase

### EmojiAvatar appearance
- Claude's full discretion on container shape, background, sizes, animation, and rendering
- Should fit the existing app design language
- Component scoped to where it makes sense for Phase 39 (reusable for later phases)

### Emoji assignment logic
- Students pick their own emoji from the grid (Phase 41 handles the picker UI; this phase provides the data function)
- Emoji persists across sessions — once a student picks an emoji, it carries forward to future sessions with the same teacher
- Initial emoji suggestion is seeded by student name for consistency (same name tends toward same emoji)
- No uniqueness restriction — duplicates within a session are fine since fun names are the real identifier
- pickEmoji() provides a name-seeded suggestion; student can override in the picker

### Claude's Discretion
- EmojiAvatar visual design (shape, background color, sizes, animation, rendering approach)
- Shortcode format (standard :name: or custom)
- Whether picker shows all 24 or a random subset
- Pool rotation strategy (fixed vs seasonal extras)
- Fallback display for null emoji
- Session-uniqueness attempt strategy in pickEmoji()

</decisions>

<specifics>
## Specific Ideas

- "Fun names are the identifier, not emojis" — emojis are decorative identity, not disambiguation keys
- Emoji persistence across sessions means the data model needs to support looking up a student's previous emoji choice
- The existing fun name generator is already in the codebase and should be leveraged

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 39-schema-migration-data-foundation*
*Context gathered: 2026-03-08*
