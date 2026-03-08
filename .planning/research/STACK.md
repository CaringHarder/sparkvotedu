# Stack Research: Student Join Flow Overhaul

**Domain:** Classroom voting -- instant student join with fun name + emoji identity
**Researched:** 2026-03-08
**Confidence:** HIGH

## Key Finding: Zero New Dependencies Required

The existing stack already contains every library needed for the student join flow overhaul. This is a UI/UX and data model change, not a technology change.

| Capability Needed | Already Have | Package | Version |
|-------------------|-------------|---------|---------|
| Multi-step wizard animations | YES | `motion` (Framer Motion) | 12.29.2 |
| Emoji rendering | YES | Native Unicode | N/A |
| Profanity filtering | YES | `@2toad/profanity` | ^3.2.0 |
| Fun name generation | YES | Custom `src/lib/student/fun-names.ts` | N/A |
| localStorage persistence | YES | Browser API | N/A |
| sessionStorage per-tab | YES | Browser API | N/A |
| Device fingerprinting | YES | `@fingerprintjs/fingerprintjs` | 5.0.1 |
| Form validation | YES | `zod` | ^4.3.6 |
| UI components | YES | `shadcn/ui` + Radix primitives | current |
| Confetti/celebrations | YES | `canvas-confetti` | ^1.9.4 |
| Unique ID generation | YES | `nanoid` + `crypto.randomUUID()` | ^5.1.6 |

---

## Recommended Stack (Changes Only)

### No New Packages

The milestone requires zero `npm install` commands. Everything builds on existing infrastructure.

### Existing Infrastructure to Extend

| Component | Current Location | What to Change |
|-----------|-----------------|----------------|
| Fun name generator | `src/lib/student/fun-names.ts` | No changes -- already generates "Adjective Animal" pairs from 268-line word list |
| Session store | `src/lib/student/session-store.ts` | Add `emoji` field to `SessionParticipantStore` interface |
| Device identity | `src/hooks/use-device-identity.ts` | No changes -- already provides `deviceId` + `fingerprint` |
| Session identity | `src/lib/student/session-identity.ts` | No changes -- localStorage UUID generation works as-is |
| Profanity filter | `src/lib/validations/first-name.ts` | Already wired with `@2toad/profanity`; extend to validate custom name input if needed |
| Prisma schema | `prisma/schema.prisma` | Add `emoji` column to `StudentParticipant` model |
| Student types | `src/types/student.ts` | Add `emoji` to `StudentParticipantData` and `DuplicateCandidate` |
| Recovery code | `src/components/student/recovery-code-dialog.tsx` | Already exists; surface in join wizard step 3 |

---

## Database Schema Change

One migration needed -- add `emoji` to `StudentParticipant`:

```prisma
model StudentParticipant {
  // ... existing fields ...
  emoji        String?   @db.VarChar(8)   // Unicode emoji, nullable for backward compat
  // ... rest unchanged ...
}
```

**Why `String?` (nullable):** Existing participants created before this feature have no emoji. The UI should assign a random default emoji when displaying a null value, not require a data backfill migration.

**Why `VarChar(8)`:** A single Unicode emoji can be up to 7 bytes in UTF-8 (family/flag emoji with ZWJ sequences). 8 gives headroom. Most student picks will be 4 bytes.

---

## Emoji Picker: Build Custom, Do NOT Use a Library

**Recommendation:** Hand-rolled grid of ~48 curated school-safe emojis displayed via CSS Grid.

**Why NOT use `emoji-mart` or `emoji-picker-react`:**

| Factor | Library Picker | Custom Grid |
|--------|---------------|-------------|
| Bundle size | 200-400KB gzipped | ~2KB (flat string array) |
| Load time | Async chunk load, visible delay | Instant render |
| Age-appropriateness | Contains weapons, alcohol, innuendo | Fully curated for K-12 |
| Customization | Fight the library API to filter categories | Full control, trivial |
| Maintenance | Version bumps, breaking changes | Zero dependencies |
| Student UX | Overwhelming (3000+ emojis, search, categories) | Simple tap-and-done |

The custom grid is a single React component (~40 lines). The emoji set is a flat array in a constants file:

```typescript
// src/lib/student/emoji-palette.ts
export const STUDENT_EMOJIS = [
  // Animals (matches fun name theme)
  '\u{1F981}', '\u{1F43B}', '\u{1F98A}', '\u{1F427}', '\u{1F422}', '\u{1F98B}', '\u{1F40C}', '\u{1F99C}',
  // Space/Nature
  '\u{1F680}', '\u{2B50}', '\u{1F308}', '\u{1F525}', '\u{1F30A}', '\u{26A1}', '\u{2744}\u{FE0F}', '\u{1F33B}',
  // Food (kid favorites)
  '\u{1F355}', '\u{1F370}', '\u{1F36D}', '\u{1F34E}', '\u{1F381}', '\u{1F3C6}', '\u{1F3B5}', '\u{1F3A8}',
  // Sports/Activities
  '\u{26BD}', '\u{1F3C0}', '\u{1F3AE}', '\u{1F6F9}', '\u{1F3AF}', '\u{1F3B2}', '\u{1F9E9}', '\u{1F4DA}',
  // Faces (positive only)
  '\u{1F60E}', '\u{1F913}', '\u{1F929}', '\u{1F60A}', '\u{1F970}', '\u{1F917}', '\u{1F604}', '\u{1F31F}',
  // Objects
  '\u{1F48E}', '\u{1F451}', '\u{1F397}\u{FE0F}', '\u{1F3A9}', '\u{1F6E1}\u{FE0F}', '\u{1F52D}', '\u{1F4A1}', '\u{1F3B8}',
] as const

export function getRandomEmoji(): string {
  return STUDENT_EMOJIS[Math.floor(Math.random() * STUDENT_EMOJIS.length)]
}
```

---

## localStorage Multi-Session Memory Architecture

### Current State

- `sessionStorage` stores per-tab active session identity (`sparkvotedu_session_{sessionId}`)
- `localStorage` stores `sparkvotedu_device_id` (UUID) and `sparkvotedu_last_session_code`
- These two storage layers solve different problems and both remain correct

### What to Add

A localStorage-based session history store for cross-tab and return-visit auto-rejoin:

```typescript
// New file: src/lib/student/session-history.ts
interface SessionHistoryEntry {
  sessionId: string
  participantId: string
  funName: string
  emoji: string
  sessionCode: string
  joinedAt: string  // ISO timestamp
}

const HISTORY_KEY = 'sparkvotedu_session_history'
const MAX_ENTRIES = 20  // Prevent unbounded growth on shared devices
```

**Why localStorage for history (not sessionStorage):** The purpose of multi-session memory is persistence across tabs and browser restarts. sessionStorage is per-tab by design -- that is correct for active session identity (prevents identity bleeding between tabs). The history store serves a different purpose: "remember me when I come back tomorrow."

**Why not IndexedDB:** 20 small JSON objects (~2KB total) is trivially handled by localStorage. IndexedDB adds async complexity (`idb` library, async reads, error handling) for zero benefit at this data volume.

**Conflict resolution:** When a student returns to a session, the server already matches by `deviceId` via the `@@unique([sessionId, deviceId])` constraint. The localStorage history provides the UI hint ("Welcome back, Daring Dragon!") while the server remains authoritative.

---

## Cross-Device Identity Reclaim

### Current State

The infrastructure already exists:

- `recoveryCode` field on `StudentParticipant` model (nullable String)
- `@@index([recoveryCode])` for fast lookups
- `RecoveryCodeDialog` component at `src/components/student/recovery-code-dialog.tsx`
- Recovery code generation in `src/actions/student.ts`

### What to Extend

1. **Surface recovery code in join wizard step 3** -- show it prominently on the confirmation screen
2. **Add "Reclaim identity" button on join page** -- accepts recovery code input
3. **New server action:** `reclaimIdentity(recoveryCode, newDeviceId)` -- looks up participant by recovery code, updates `deviceId` and `fingerprint` to new device values

No new libraries needed. The DB index is already in place.

---

## 3-Step Name Wizard Animation

### Current State

`motion` v12.29.2 is used extensively across 20+ files in the codebase for:
- Chart animations (donut-chart, bar-chart)
- Page transitions (welcome-screen, paused-overlay)
- List animations (poll-card-list, bracket-card-list, activity-grid)
- Celebration effects (celebration-screen, podium-celebration, winner-reveal)

The team's established animation pattern uses `AnimatePresence` with `motion.div` for enter/exit transitions.

### Pattern for Wizard Steps

Use `AnimatePresence mode="wait"` for sequential step transitions, matching existing patterns:

```typescript
<AnimatePresence mode="wait">
  <motion.div
    key={`step-${currentStep}`}
    initial={{ opacity: 0, x: 30 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -30 }}
    transition={{ duration: 0.2 }}
  >
    {currentStep === 1 && <EmojiPickerStep />}
    {currentStep === 2 && <NameRevealStep />}
    {currentStep === 3 && <ConfirmationStep />}
  </motion.div>
</AnimatePresence>
```

No new animation library needed. `motion` v12 has `AnimatePresence`, layout animations, gesture support, and spring physics -- all available and already battle-tested in this codebase.

---

## FingerprintJS Cleanup

### Current State

FingerprintJS v5 (open source) is used as "Layer 2" identity signal in `src/lib/student/fingerprint.ts`. It is:
- Async (lazy-loaded)
- Failure-tolerant (returns empty string if blocked)
- Secondary to localStorage UUID (Layer 1)
- Well-documented in the codebase

### Cleanup Scope

"Cleanup" means reducing its footprint, not removing it:

1. **Keep as optional secondary signal** -- the join flow must work 100% without it
2. **Defer loading** -- do not block the join wizard on fingerprint computation
3. **Send fingerprint after join** -- compute in background, update participant record via separate action
4. **Consider removing from join critical path entirely** -- `deviceId` (localStorage UUID) + `@@unique([sessionId, deviceId])` is sufficient for identity

**No version change needed.** FingerprintJS v5.0.1 is current for the open-source tier. The existing module-level caching (`fpPromise`) is correct.

---

## Installation

```bash
# No new packages to install. Zero npm install commands.
```

One Prisma migration:
```bash
npx prisma migrate dev --name add_emoji_to_student_participant
```

---

## Alternatives Considered

| Need | Recommended | Alternative | Why Not |
|------|-------------|-------------|---------|
| Emoji picker | Custom 48-emoji grid | `emoji-mart` v5 | 200KB+ bundle, unsafe emojis for K-12, overkill UX |
| Emoji picker | Custom 48-emoji grid | `emoji-picker-react` | Same bundle/safety concerns as emoji-mart |
| Multi-step form | Manual step state + motion | `react-hook-form` + `react-step-wizard` | 3 simple steps with minimal validation; libraries add weight for no benefit |
| Wizard state | `useState` step counter | `@xstate/react` | State machine is overkill for a 3-step linear flow with no branching |
| Session history | localStorage JSON | IndexedDB via `idb` | 20 JSON entries (~2KB); IndexedDB adds async complexity for zero gain |
| Animation | `motion` (already installed) | CSS `@keyframes` | motion is already bundled; CSS keyframes cannot do AnimatePresence exit animations |
| Identity reclaim | Recovery code (already built) | Magic link via email/SMS | Students are K-12; many have no email/phone. Recovery code is simpler and works offline |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `emoji-mart` / `emoji-picker-react` | 200KB+ bundle, age-inappropriate content, overwhelming UX for kids | Custom curated array + CSS Grid |
| `react-hook-form` | 3 simple inputs across 3 steps; form library adds complexity for no benefit | `useState` per step |
| `react-step-wizard` | Adds wrapper component and opinionated API for something that is 15 lines of state | Manual step counter + motion transitions |
| `@xstate/react` | Linear 3-step flow with no branching or parallel states | Simple `step` useState |
| `idb` / IndexedDB | Session history is ~20 small JSON objects; localStorage is synchronous and simpler | `localStorage` with JSON.parse/stringify |
| `uuid` package | Already have `crypto.randomUUID()` (native) and `nanoid` in the project | `nanoid` or `crypto.randomUUID()` |
| New animation library | `motion` v12 is already installed and used in 20+ components | `motion` (already in bundle) |
| `zustand` / `jotai` for wizard state | 3-step linear form with no shared state across components | React useState is sufficient |

---

## Version Compatibility

| Existing Package | Version | Compatible With New Features | Notes |
|-----------------|---------|------------------------------|-------|
| `motion` | 12.29.2 | YES | AnimatePresence, layout animations, gesture support all available |
| `@2toad/profanity` | ^3.2.0 | YES | Already filtering first names; works for any text validation |
| `@fingerprintjs/fingerprintjs` | 5.0.1 | YES | Open-source tier, no changes needed |
| `zod` | ^4.3.6 | YES | Validate emoji selection (must be in allowed set), recovery code format |
| `nanoid` | ^5.1.6 | YES | Generate short recovery codes if current format needs updating |
| `next` | 16.1.6 | YES | App Router, Server Actions, all patterns established |
| `prisma` | ^7.3.0 | YES | Simple ALTER TABLE migration for emoji column |
| `@supabase/supabase-js` | ^2.93.3 | YES | Realtime for broadcasting emoji/name updates to teacher sidebar |
| `canvas-confetti` | ^1.9.4 | YES | Celebration effect on join confirmation step |

---

## Integration Points Summary

| New Feature | Touches | Server Action | DB Change | Broadcast |
|-------------|---------|---------------|-----------|-----------|
| Emoji picker grid | New component + session-store | `joinSessionByName` (extend) | Add `emoji` column | Existing participant update |
| 3-step wizard | New component replacing `name-entry-form.tsx` | None (orchestrates existing actions) | None | None |
| localStorage history | New `session-history.ts` | None (client-only) | None | None |
| Cross-device reclaim | Extend join page + new button | New `reclaimIdentity` action | None (recoveryCode exists) | None |
| Teacher sidebar toggle | Extend `participation-sidebar.tsx` | None (display toggle) | None | None |
| FingerprintJS cleanup | Refactor `fingerprint.ts` usage | Modify `joinSessionByName` | None | None |

---

## Sources

- **package.json (HIGH confidence):** Direct read -- all installed versions verified
- **Prisma schema (HIGH confidence):** Direct read of `prisma/schema.prisma` -- `StudentParticipant` model analyzed, `recoveryCode` field and indexes confirmed
- **Session store (HIGH confidence):** Read `src/lib/student/session-store.ts` -- sessionStorage pattern, `SessionParticipantStore` interface with existing `funName` field
- **Device identity (HIGH confidence):** Read `src/hooks/use-device-identity.ts` and `src/lib/student/session-identity.ts` -- localStorage UUID + FingerprintJS dual-layer pattern confirmed
- **Fun names (HIGH confidence):** Read `src/lib/student/fun-names.ts` -- "Adjective Animal" generation with uniqueness checking, 268-line word list
- **Animation patterns (HIGH confidence):** Grep found 20 files using `motion` -- AnimatePresence, motion.div established throughout codebase
- **Recovery code (HIGH confidence):** Read `src/types/student.ts` -- `recoveryCode` in `StudentParticipantData`, `RecoveryCodeDialog` component exists
- **Name entry form (HIGH confidence):** Read `src/components/student/name-entry-form.tsx` -- current join flow analyzed for replacement points

---
*Stack research for: Student join flow overhaul -- fun name + emoji identity*
*Researched: 2026-03-08*
