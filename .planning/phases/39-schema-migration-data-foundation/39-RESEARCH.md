# Phase 39: Schema Migration + Data Foundation - Research

**Researched:** 2026-03-08
**Domain:** Prisma schema migration, emoji data module, React component
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- ~24 emojis in the pool (medium size, fits a 4x6 or 6x4 grid)
- Mixed vibe: some playful (rocket, unicorn, pizza) and some calm (trees, stars, animals)
- No people or face emojis — avoids skin tone issues and human representation concerns
- Fixed app-wide pool — not configurable by teachers
- No specific emoji must-haves or exclusions beyond the no-people rule
- Fun name generator already exists in the codebase
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MIGR-01 | Schema adds emoji and lastInitial columns to StudentParticipant (nullable, zero-downtime) | Migration pattern section, Prisma migration examples, compound index guidance |
</phase_requirements>

## Summary

This phase has three concrete deliverables: (1) a Prisma migration adding two nullable columns and a compound index to StudentParticipant, (2) a curated emoji pool module with ~24 K-12-safe shortcodes and a `pickEmoji()` function, and (3) an `EmojiAvatar` React component that renders shortcodes as visual emoji.

The project already uses Prisma 7.x with PostgreSQL on Supabase. The migration pattern is well-established in this codebase -- previous phases (23, 37) show simple ALTER TABLE migrations with nullable columns and optional indexes. The emoji pool is a pure data module with no external dependencies. The EmojiAvatar component is a straightforward React component using native emoji rendering (no library needed -- all target browsers render emoji natively via system fonts).

**Primary recommendation:** Follow the established migration pattern (nullable column + index via `prisma migrate dev`), create the emoji pool as a sibling module to `fun-names.ts` in `src/lib/student/`, and build EmojiAvatar as a simple component in `src/components/student/`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 7.3.0 | Schema migration, ORM | Already in use, handles migration generation |
| Next.js | 16.1.6 | App framework | Already in use |
| React | 19.2.3 | UI components | Already in use |
| motion | 12.29.2 | Animation (optional for EmojiAvatar) | Already in use for student-facing UI |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | 4.x | Styling EmojiAvatar | Already in use for all components |
| class-variance-authority | 0.7.1 | Size variants for EmojiAvatar | Already in use for UI components |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native emoji rendering | twemoji/noto-emoji images | Adds 200KB+ bundle, unnecessary -- school Chromebooks render emoji natively via Chrome |
| Shortcode map in code | npm emoji library | Over-engineered for 24 emojis, adds dependency |

**Installation:**
```bash
# No new packages needed -- everything is already in the project
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/student/
│   ├── emoji-pool.ts        # Curated emoji list + pickEmoji()
│   ├── fun-names.ts          # Existing fun name generator
│   └── fun-names-words.ts    # Existing word lists
├── components/student/
│   └── emoji-avatar.tsx      # EmojiAvatar component
└── types/
    └── student.ts            # Updated types (add emoji, lastInitial)
```

### Pattern 1: Expand-and-Contract Migration (Nullable Columns)
**What:** Add nullable columns so existing rows are unaffected. No default value needed, no backfill required.
**When to use:** Always for zero-downtime deploys where existing data must remain intact.
**Example:**
```prisma
// In schema.prisma - StudentParticipant model
model StudentParticipant {
  // ... existing fields ...
  emoji        String?   @db.VarChar(20)
  lastInitial  String?   @map("last_initial") @db.VarChar(2)

  // New compound index for name-based lookup
  @@index([sessionId, firstName, lastInitial])
}
```

The generated SQL will be:
```sql
ALTER TABLE "student_participants" ADD COLUMN "emoji" VARCHAR(20);
ALTER TABLE "student_participants" ADD COLUMN "last_initial" VARCHAR(2);
CREATE INDEX "student_participants_session_id_first_name_last_initial_idx"
  ON "student_participants"("session_id", "first_name", "last_initial");
```

### Pattern 2: Emoji Pool as Pure Data Module
**What:** A TypeScript module exporting the curated emoji list and utility functions, mirroring the pattern of `fun-names.ts` + `fun-names-words.ts`.
**When to use:** For static, app-wide data that multiple components and server actions will consume.
**Example:**
```typescript
// src/lib/student/emoji-pool.ts

export interface EmojiEntry {
  shortcode: string   // e.g., "rocket"
  emoji: string       // e.g., "🚀"
  label: string       // e.g., "Rocket" (for accessibility)
}

export const EMOJI_POOL: EmojiEntry[] = [
  { shortcode: 'rocket', emoji: '🚀', label: 'Rocket' },
  { shortcode: 'unicorn', emoji: '🦄', label: 'Unicorn' },
  { shortcode: 'star', emoji: '⭐', label: 'Star' },
  // ... ~24 total
]

/**
 * Simple string hash for deterministic emoji suggestion.
 */
function nameHash(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i)
    hash |= 0 // Convert to 32-bit int
  }
  return Math.abs(hash)
}

/**
 * Pick an emoji suggestion seeded by student name.
 * Same name will tend toward the same emoji across sessions.
 * Student can override in the picker (Phase 41).
 */
export function pickEmoji(firstName: string): EmojiEntry {
  const index = nameHash(firstName) % EMOJI_POOL.length
  return EMOJI_POOL[index]
}

/**
 * Resolve a shortcode to its emoji character.
 * Returns null for unknown shortcodes.
 */
export function shortcodeToEmoji(shortcode: string): string | null {
  const entry = EMOJI_POOL.find(e => e.shortcode === shortcode)
  return entry?.emoji ?? null
}
```

### Pattern 3: EmojiAvatar Component with Size Variants
**What:** A reusable component that renders an emoji shortcode as a visual avatar with consistent styling.
**When to use:** Anywhere a student's emoji identity needs to be displayed.
**Example:**
```typescript
// src/components/student/emoji-avatar.tsx
'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { shortcodeToEmoji } from '@/lib/student/emoji-pool'

const avatarVariants = cva(
  'inline-flex items-center justify-center rounded-full bg-muted select-none',
  {
    variants: {
      size: {
        sm: 'h-8 w-8 text-lg',
        md: 'h-10 w-10 text-xl',
        lg: 'h-14 w-14 text-3xl',
      },
    },
    defaultVariants: { size: 'md' },
  }
)

interface EmojiAvatarProps extends VariantProps<typeof avatarVariants> {
  shortcode: string | null
  className?: string
}

export function EmojiAvatar({ shortcode, size, className }: EmojiAvatarProps) {
  const emoji = shortcode ? shortcodeToEmoji(shortcode) : null

  return (
    <span
      className={cn(avatarVariants({ size }), className)}
      role="img"
      aria-label={shortcode ?? 'no emoji'}
    >
      {emoji ?? '✨'}
    </span>
  )
}
```

### Anti-Patterns to Avoid
- **Storing raw Unicode emoji in the database:** Use shortcodes (varchar) instead. Raw emoji can cause encoding issues with some database drivers, collation mismatches, and are harder to search/index.
- **Making emoji required (NOT NULL):** Existing rows have no emoji. Use nullable column to avoid breaking existing data.
- **Using an emoji rendering library (twemoji, etc.):** School Chromebooks use Chrome which renders emoji natively. Adding a library inflates the bundle for zero benefit in this use case.
- **Complex hash functions for name seeding:** A simple djb2-style hash is sufficient. No need for crypto or external hash libraries for a cosmetic feature.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Emoji rendering consistency | Custom SVG emoji sprites | Native browser emoji via system fonts | All target browsers (Chrome on Chromebooks) render emoji natively; library adds 200KB+ |
| Migration SQL | Hand-written ALTER TABLE | `prisma migrate dev --name phase39_emoji_identity` | Prisma tracks migration state, generates correct SQL, handles rollback |
| Component size variants | Manual className switching | `class-variance-authority` (already installed) | Consistent with existing UI components in the codebase |

**Key insight:** This phase is intentionally minimal -- a migration, a data module, and a component. The complexity lives in later phases (picker UI in 41, persistence in 42). Resist the urge to build ahead.

## Common Pitfalls

### Pitfall 1: Forgetting to Regenerate Prisma Client
**What goes wrong:** Schema is updated but `prisma generate` is not run, causing TypeScript errors when accessing new fields.
**Why it happens:** `prisma migrate dev` runs generate automatically, but if you edit the schema without migrating (e.g., during development), the client is stale.
**How to avoid:** Always run `npx prisma generate` after schema changes, or use `npx prisma migrate dev` which does both.
**Warning signs:** TypeScript errors like "Property 'emoji' does not exist on type 'StudentParticipant'".

### Pitfall 2: Breaking Existing Unique Constraints
**What goes wrong:** Adding a new index that conflicts with existing unique constraints or queries.
**Why it happens:** The StudentParticipant model already has `@@unique([sessionId, deviceId])` and `@@unique([sessionId, funName])` plus `@@index([sessionId, firstName])`.
**How to avoid:** The new compound index `@@index([sessionId, firstName, lastInitial])` does NOT conflict -- it supplements the existing `@@index([sessionId, firstName])`. Both can coexist.
**Warning signs:** Migration fails with duplicate index errors.

### Pitfall 3: Emoji Shortcode Format Inconsistency
**What goes wrong:** Some code uses `:rocket:` format, other code uses `rocket` without colons, leading to lookup failures.
**Why it happens:** Discord/Slack convention uses colons, but the database stores plain strings.
**How to avoid:** Standardize on plain shortcodes without colons (e.g., `"rocket"` not `":rocket:"`). The colon format adds no value when we control both storage and display. Document this in the module.
**Warning signs:** `shortcodeToEmoji()` returning null for valid emojis.

### Pitfall 4: Forgetting Type Updates
**What goes wrong:** The `StudentParticipantData` interface in `src/types/student.ts` lacks `emoji` and `lastInitial`, causing type mismatches in downstream code.
**Why it happens:** Prisma types update automatically, but custom TypeScript interfaces need manual updates.
**How to avoid:** Update `StudentParticipantData` and `DuplicateCandidate` interfaces to include the new optional fields.
**Warning signs:** TypeScript errors when passing Prisma data to components.

### Pitfall 5: VarChar Length Too Short for Multi-Codepoint Emoji Shortcodes
**What goes wrong:** A shortcode like `christmas_tree` exceeds expectations if we're not careful.
**Why it happens:** VARCHAR(20) is set in the requirements but some emoji shortcodes can be long.
**How to avoid:** With ~24 curated emojis, ensure all shortcodes fit within 20 characters. The longest common shortcodes (e.g., `evergreen_tree` = 14 chars) fit easily.
**Warning signs:** Prisma throwing string length validation errors on insert.

## Code Examples

### Migration Workflow
```bash
# 1. Update prisma/schema.prisma with new fields
# 2. Generate migration
npx prisma migrate dev --name phase39_emoji_identity

# 3. Verify migration SQL in prisma/migrations/YYYYMMDD_phase39_emoji_identity/
# 4. Regenerate client (done automatically by migrate dev)

# 5. Verify existing data is intact
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM student_participants WHERE emoji IS NULL;"
```

### Curated Emoji Pool (~24 K-12-Safe Emojis)
```typescript
// Recommended pool -- no people/faces, mixed playful + calm
const RECOMMENDED_EMOJIS = [
  // Playful
  { shortcode: 'rocket', emoji: '🚀', label: 'Rocket' },
  { shortcode: 'unicorn', emoji: '🦄', label: 'Unicorn' },
  { shortcode: 'pizza', emoji: '🍕', label: 'Pizza' },
  { shortcode: 'rainbow', emoji: '🌈', label: 'Rainbow' },
  { shortcode: 'fire', emoji: '🔥', label: 'Fire' },
  { shortcode: 'lightning', emoji: '⚡', label: 'Lightning' },
  { shortcode: 'sparkles', emoji: '✨', label: 'Sparkles' },
  { shortcode: 'balloon', emoji: '🎈', label: 'Balloon' },
  // Animals
  { shortcode: 'butterfly', emoji: '🦋', label: 'Butterfly' },
  { shortcode: 'dolphin', emoji: '🐬', label: 'Dolphin' },
  { shortcode: 'owl', emoji: '🦉', label: 'Owl' },
  { shortcode: 'penguin', emoji: '🐧', label: 'Penguin' },
  { shortcode: 'turtle', emoji: '🐢', label: 'Turtle' },
  { shortcode: 'octopus', emoji: '🐙', label: 'Octopus' },
  // Nature / Calm
  { shortcode: 'star', emoji: '⭐', label: 'Star' },
  { shortcode: 'moon', emoji: '🌙', label: 'Moon' },
  { shortcode: 'sun', emoji: '☀️', label: 'Sun' },
  { shortcode: 'evergreen', emoji: '🌲', label: 'Evergreen Tree' },
  { shortcode: 'sunflower', emoji: '🌻', label: 'Sunflower' },
  { shortcode: 'mushroom', emoji: '🍄', label: 'Mushroom' },
  // Objects
  { shortcode: 'gem', emoji: '💎', label: 'Gem' },
  { shortcode: 'globe', emoji: '🌍', label: 'Globe' },
  { shortcode: 'paintbrush', emoji: '🎨', label: 'Art Palette' },
  { shortcode: 'music', emoji: '🎵', label: 'Music Note' },
]
// 24 total -- fits a 4x6 or 6x4 grid
```

### Type Interface Updates
```typescript
// src/types/student.ts - additions
export interface StudentParticipantData {
  id: string
  firstName: string
  funName: string
  emoji: string | null      // NEW - shortcode like "rocket"
  lastInitial: string | null // NEW - e.g., "R"
  rerollUsed: boolean
  recoveryCode: string | null
  sessionId: string
}

export interface DuplicateCandidate {
  id: string
  funName: string
  emoji: string | null       // NEW - for disambiguation display
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| twemoji for cross-browser emoji | Native emoji rendering | ~2022 (Chrome 90+) | No library needed, all modern browsers render emoji consistently |
| Prisma `db push` for dev | `prisma migrate dev` for tracked migrations | Established project pattern | Migrations are version-controlled and reproducible |

**Deprecated/outdated:**
- twemoji: Twitter stopped maintaining it; forked as "jdecked/twemoji" but unnecessary for Chrome-only target
- `:colon:` shortcode format: No standard library needed; plain string shortcodes are simpler for a curated 24-emoji pool

## Open Questions

1. **Should `lastInitial` be stored uppercase or as-entered?**
   - What we know: The schema allows VARCHAR(2), UI will collect 1-2 characters
   - What's unclear: Whether normalization happens at input or storage
   - Recommendation: Store uppercase (normalize on write). Consistent for lookups. Apply `.toUpperCase()` in the server action before insert.

2. **Should the existing `@@index([sessionId, firstName])` be removed now that `@@index([sessionId, firstName, lastInitial])` exists?**
   - What we know: The new compound index can serve queries on (sessionId, firstName) via leftmost prefix
   - What's unclear: Whether any existing queries rely specifically on the two-column index
   - Recommendation: Keep both for now. Remove the old one in a future cleanup phase if the compound index proves sufficient. Removing indexes is a separate migration concern.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MIGR-01 | emoji column is nullable VARCHAR(20) | integration (manual-only) | `npx prisma migrate dev --name phase39_emoji_identity` then verify SQL | N/A - migration verification |
| MIGR-01 | lastInitial column is nullable VARCHAR(2) | integration (manual-only) | Same as above | N/A - migration verification |
| MIGR-01 | Compound index on (sessionId, firstName, lastInitial) | integration (manual-only) | Inspect generated migration SQL | N/A |
| SC-3 | Emoji pool exports ~24 entries | unit | `npx vitest run src/lib/student/emoji-pool.test.ts -t "pool size"` | No - Wave 0 |
| SC-3 | pickEmoji() returns deterministic result for same name | unit | `npx vitest run src/lib/student/emoji-pool.test.ts -t "deterministic"` | No - Wave 0 |
| SC-3 | pickEmoji() returns valid pool entry | unit | `npx vitest run src/lib/student/emoji-pool.test.ts -t "valid entry"` | No - Wave 0 |
| SC-3 | shortcodeToEmoji() resolves known shortcodes | unit | `npx vitest run src/lib/student/emoji-pool.test.ts -t "resolve"` | No - Wave 0 |
| SC-3 | shortcodeToEmoji() returns null for unknown | unit | `npx vitest run src/lib/student/emoji-pool.test.ts -t "unknown"` | No - Wave 0 |
| SC-4 | EmojiAvatar renders emoji for valid shortcode | unit | `npx vitest run src/components/student/emoji-avatar.test.tsx -t "renders"` | No - Wave 0 |
| SC-4 | EmojiAvatar shows fallback for null shortcode | unit | `npx vitest run src/components/student/emoji-avatar.test.tsx -t "fallback"` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/student/emoji-pool.test.ts` -- covers SC-3 (emoji pool module)
- [ ] `src/components/student/emoji-avatar.test.tsx` -- covers SC-4 (EmojiAvatar component)
- [ ] Note: Vitest is already installed and configured. No additional test framework setup needed.
- [ ] For component tests, may need `@testing-library/react` -- check if already installed or test with Vitest's built-in rendering

## Sources

### Primary (HIGH confidence)
- Project codebase: `prisma/schema.prisma` -- current schema, existing migration patterns
- Project codebase: `prisma/migrations/` -- 5 existing migrations showing established patterns
- Project codebase: `src/lib/student/fun-names.ts` -- module pattern to follow
- Project codebase: `src/components/student/welcome-screen.tsx` -- component pattern to follow
- Project codebase: `package.json` -- Prisma 7.3.0, Vitest 4.0.18 confirmed

### Secondary (MEDIUM confidence)
- Prisma documentation (from training data) -- nullable column migrations, `@db.VarChar()` attribute

### Tertiary (LOW confidence)
- None -- all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use, no new dependencies
- Architecture: HIGH - follows established codebase patterns (fun-names module, migration style)
- Pitfalls: HIGH - based on direct codebase analysis and Prisma migration experience

**Research date:** 2026-03-08
**Valid until:** 2026-04-07 (stable -- no fast-moving dependencies)
