# Project Research Summary

**Project:** Student Join Flow Overhaul (v3.0)
**Domain:** K-12 classroom voting app -- student identity, join wizard, session persistence
**Researched:** 2026-03-08
**Confidence:** HIGH

## Executive Summary

The student join flow overhaul is a UI/UX and data model change, not a technology change. The existing stack (Next.js 16, Prisma 7, Supabase, motion v12, profanity filter, fun name generator) already contains every library needed. Zero new npm dependencies are required. The work centers on three things: a schema migration adding `lastInitial` and `emoji` columns to `StudentParticipant`, a 3-step join wizard replacing the current single-input name form, and migrating identity persistence from per-tab sessionStorage to a localStorage multi-session map that survives tab close and browser restart.

The recommended approach is to build in strict dependency order: schema and DAL first (everything depends on the data model), then server actions, then the join wizard UI, then localStorage persistence, and finally teacher-facing display changes. This order ensures each layer has a stable foundation before the next layer builds on it. The emoji system should use a curated grid of 20-30 classroom-safe emoji stored as shortcode strings (not raw Unicode) to avoid cross-platform rendering issues on school Chromebooks. FingerprintJS should be removed entirely -- it adds 150KB+ to the client bundle and is unreliable on managed school devices where all Chromebooks produce identical fingerprints.

The primary risks are: (1) school Chromebooks running ephemeral mode silently destroy localStorage on every browser close, making client-side persistence unreliable as a sole identity mechanism -- name-based server-side reclaim must be the authoritative fallback; (2) schema migrations on a live Supabase database during school hours can cause brief join failures -- migrations must run off-hours and use nullable columns exclusively; (3) storing emoji as raw Unicode creates cross-platform rendering bugs and database encoding issues -- shortcode strings with a client-side mapping table eliminate this class of problems entirely.

## Key Findings

### Recommended Stack

No new packages are needed. The existing stack handles every requirement. See [STACK.md](./STACK.md) for full version compatibility matrix.

**Core technologies (no changes):**
- **motion v12.29.2:** AnimatePresence for wizard step transitions -- already used in 20+ components
- **@2toad/profanity:** Name validation -- already wired in `firstNameSchema`
- **Prisma 7 + Supabase:** Schema migration for 2 new columns -- standard additive migration
- **Zod 4:** Validate emoji shortcode against curated allowlist, lastInitial format
- **canvas-confetti:** Celebration effect on join confirmation -- already installed
- **nanoid:** Recovery code generation -- already installed

**What NOT to install:** emoji-mart (200KB+, age-inappropriate), react-hook-form (3 simple inputs), react-step-wizard (15 lines of state), xstate (linear flow, no branching), idb/IndexedDB (20 JSON objects fit in localStorage).

### Expected Features

See [FEATURES.md](./FEATURES.md) for complete feature landscape, dependency graph, and competitor analysis.

**Must have (table stakes):**
- Schema migration: `lastInitial` (varchar 2, nullable) + `emoji` (varchar 20, nullable as shortcode) on StudentParticipant
- 3-step join wizard replacing NameEntryForm (first name -> last initial -> emoji reveal)
- localStorage multi-session map keyed by sessionId (replaces sessionStorage for persistence)
- Same-device auto-rejoin: check localStorage on code entry, skip wizard if identity exists
- Cross-device reclaim via firstName + lastInitial matching with fun name disambiguation
- Emoji + fun name display in SessionHeader and WelcomeScreen
- FingerprintJS removal (code, dependency, and eventually schema column)

**Should have (differentiators):**
- Teacher sidebar name view toggle (fun name vs real name)
- Teacher-initiated display name edit from sidebar
- Existing participant emoji migration (prompt on rejoin if no emoji)
- Emoji display across all voting UI components

**Defer (v3.x+):**
- Custom emoji set per teacher
- Student avatar drawing canvas
- QR code auto-fill for mobile join

### Architecture Approach

The architecture extends the existing 3-layer pattern (Server Actions -> DAL -> Prisma/DB) with two additions: a client-side wizard state machine for the multi-step join flow, and a layered storage strategy (sessionStorage for active-tab identity, localStorage for cross-session persistence, server-side name matching as the durable fallback). The wizard is a single client component with internal step state -- not route-based -- because the flow is ephemeral (3 seconds), has no deep-linkable steps, and shares state between steps. See [ARCHITECTURE.md](./ARCHITECTURE.md) for component boundaries, data flow diagrams, and build order.

**Major components:**
1. **JoinWizard** -- Multi-step container managing name entry, identity reveal, and welcome steps
2. **Emoji pool module** -- Curated shortcode array with `pickEmoji()` that tries for session-uniqueness
3. **localStorage session map** -- Multi-session persistence layer with 30-day TTL pruning
4. **lookupStudent server action** -- New action for returning student detection before wizard
5. **EmojiAvatar** -- Reusable display component for consistent emoji rendering from shortcodes

### Critical Pitfalls

See [PITFALLS.md](./PITFALLS.md) for the full list of 9 pitfalls with detailed prevention strategies.

1. **Ephemeral Chromebooks destroy localStorage** -- Treat localStorage as an unreliable cache. Server-side name+initial matching is the authoritative reclaim path. Never show "device not recognized" warnings.
2. **Raw Unicode emoji causes cross-platform issues** -- Store emoji as shortcode strings ("rocket", "star"), not Unicode. Map to rendered characters client-side. Restrict to Unicode 13.0 (2020) for Chromebook compatibility.
3. **NOT NULL migration on populated table** -- Use expand-and-contract: add columns as nullable, deploy code that handles nulls, run backfill script separately, then optionally add NOT NULL constraint later.
4. **Name collisions create false identity claims** -- Never auto-claim on single match. Always show confirmation with fun name as primary identifier. Allow lastInitial to be optional in matching.
5. **FingerprintJS removal leaves dead code across 3 layers** -- Remove in order: application code first (deploy), then schema column (separate migration), then npm uninstall. Verify with grep + npm ls.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Schema Migration + Data Foundation
**Rationale:** Every feature depends on the data model. Emoji storage format and lastInitial column must exist before any UI or server action work.
**Delivers:** Prisma migration adding `emoji` (varchar 20, nullable) and `lastInitial` (varchar 2, nullable) to StudentParticipant. New compound index on (sessionId, firstName, lastInitial). Emoji pool module with curated shortcode set and client-side mapping table. Updated TypeScript types.
**Addresses:** Schema migration (P1), emoji storage design
**Avoids:** NOT NULL migration failure (Pitfall 3), raw Unicode storage (Pitfall 2), fun name immutability (Pitfall 7)

### Phase 2: Server Actions + DAL
**Rationale:** UI components need server actions to function. Business logic must be in place before the wizard can call it.
**Delivers:** New `lookupStudent` action for returning student detection. Modified `createParticipant` to accept lastInitial and auto-assign emoji shortcode. New `findByNameAndInitial` DAL function. Updated `claimIdentity` to return emoji.
**Addresses:** Cross-device reclaim update (P1), name disambiguation improvement
**Avoids:** False identity claims (Pitfall 4) -- confirmation always required

### Phase 3: Join Wizard UI
**Rationale:** Depends on schema + actions being ready. This is the core student-facing deliverable.
**Delivers:** JoinWizard component replacing NameEntryForm. NameStep (first name + last initial). IdentityStep (fun name + emoji reveal with reroll). Updated NameDisambiguation for name+initial matching.
**Addresses:** 3-step join wizard (P1), emoji picker (P1), welcome screen update (P1)
**Avoids:** Full emoji picker chaos (Pitfall 8), analysis paralysis (auto-assign emoji, optional change)

### Phase 4: localStorage Persistence + Auto-Rejoin
**Rationale:** Join wizard must work without persistence first. Persistence is an enhancement layer on top of a functioning wizard.
**Delivers:** localStorage multi-session map keyed by sessionId. Auto-rejoin check before showing wizard. 30-day TTL pruning. Graceful fallback when localStorage is unavailable.
**Addresses:** localStorage multi-session map (P1), same-device auto-rejoin (P1)
**Avoids:** Ephemeral Chromebook data loss (Pitfall 1), sessionStorage tab-close duplicates (Pitfall 6)

### Phase 5: FingerprintJS Removal
**Rationale:** Independent of other phases. Can run in parallel with Phase 4 or after. Reduces bundle size by ~150KB.
**Delivers:** Removal of fingerprint.ts, use-device-identity.ts cleanup, server action cleanup, npm uninstall. Schema column drop in separate migration.
**Addresses:** FingerprintJS removal (P1)
**Avoids:** Dead code across 3 layers (Pitfall 5)

### Phase 6: Teacher Sidebar + Emoji Display Polish
**Rationale:** Display-only changes with no data dependencies. Can be built in parallel with Phases 4-5. Last because it is teacher-facing polish, not student-facing core flow.
**Delivers:** EmojiAvatar component. ParticipationSidebar name view toggle. Emoji in SessionHeader, WelcomeScreen, StudentRoster. Presence channel updated to track emoji.
**Addresses:** Teacher sidebar toggle (P2), emoji display across UI (P3), existing participant emoji migration (P2)
**Avoids:** Display mode persisted to DB (Architecture anti-pattern 4)

### Phase Ordering Rationale

- **Phases 1-3 are strictly sequential:** schema -> actions -> UI. Each depends on the previous.
- **Phase 4 (persistence)** requires Phase 3 (wizard) to exist but adds behavior on top.
- **Phase 5 (FingerprintJS removal)** is fully independent and can run alongside Phase 4.
- **Phase 6 (teacher display)** is independent of student flow and can run alongside Phases 4-5.
- This ordering front-loads the riskiest work (schema migration, identity matching logic) and defers the safest work (display changes) to the end.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Schema):** Emoji shortcode set curation needs finalization -- which 20-30 emoji to include, Unicode version compatibility verification across ChromeOS/iOS/Android/Windows.
- **Phase 4 (localStorage):** Cookie-based fallback for server-readable identity (mentioned in PITFALLS.md) needs investigation if middleware-level auto-redirect is desired.

Phases with standard patterns (skip `/gsd:research-phase`):
- **Phase 2 (Server Actions):** Well-established patterns in existing codebase. Extend existing DAL functions.
- **Phase 3 (Join Wizard):** motion AnimatePresence is used in 20+ components. Wizard pattern is straightforward useState.
- **Phase 5 (FingerprintJS):** Removal steps are well-documented in PITFALLS.md. Grep + delete.
- **Phase 6 (Teacher Display):** Display toggle is component state. Emoji rendering is a lookup table.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages verified against package.json. Zero new dependencies. Version compatibility confirmed. |
| Features | HIGH | Feature landscape derived from existing codebase + competitor analysis. Clear P1/P2/P3 prioritization. |
| Architecture | HIGH | All 55K LOC analyzed. Every integration point verified against actual file paths. Data flow diagrams grounded in real code. |
| Pitfalls | HIGH | All 9 pitfalls grounded in direct codebase analysis. School Chromebook ephemeral mode confirmed via Google Admin docs. Migration patterns from Prisma official docs. |

**Overall confidence:** HIGH

### Gaps to Address

- **Emoji shortcode set:** The exact curated set of 20-30 emoji needs finalization. STACK.md suggests ~48 raw Unicode, PITFALLS.md recommends shortcodes. The shortcode approach is correct but the mapping table needs to be built and tested cross-platform. Resolve during Phase 1 planning.
- **Emoji auto-assign vs user-pick divergence:** STACK.md and FEATURES.md suggest a user-selectable emoji grid. ARCHITECTURE.md suggests auto-assignment from a pool. Recommendation: auto-assign with optional one-tap change (like fun name reroll). Resolve during Phase 3 planning.
- **Cookie-based identity fallback:** PITFALLS.md mentions a short-lived cookie for server-readable identity (middleware auto-redirect). This is not covered in ARCHITECTURE.md. Evaluate during Phase 4 planning -- may not be needed if localStorage + name-matching covers all cases.
- **lastInitial character limit:** FEATURES.md says max 2 chars (for "Mc", "De"). ARCHITECTURE.md says VARCHAR(1). PITFALLS.md says allow 2 chars for hyphenated names. Recommendation: VARCHAR(2), validate with `/^[a-zA-Z]{0,2}$/`. Resolve during Phase 1 schema design.
- **Migration timing:** Supabase nullable column additions are instant (no table rewrite on PG 11+), but the fingerprint column drop requires exclusive lock. Must be scheduled off-hours. No staging environment mentioned -- consider testing against production snapshot.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: package.json, prisma/schema.prisma, src/actions/student.ts, src/lib/student/*, src/components/student/*, src/hooks/*, src/types/student.ts
- Prisma migration docs: expand-and-contract pattern, customizing migrations

### Secondary (MEDIUM confidence)
- Google Chrome Enterprise: Ephemeral Mode, DeviceEphemeralUsersEnabled, BrowsingDataLifetime policies
- Supabase Realtime: Presence channel limits (~200-500 concurrent trackers)
- Unicode emoji rendering: cross-platform studies (ACM CSCW 2018), browser compatibility guides
- Zero-downtime PostgreSQL migrations (Xata blog): nullable column additions are instant on PG 11+

### Tertiary (LOW confidence)
- Name collision probability: estimated from US SSA baby name frequency data (approximations for 30-student classrooms)
- localStorage limits: 5MB per origin (web platform standard, but school IT policies may further restrict)

---
*Research completed: 2026-03-08*
*Ready for roadmap: yes*
