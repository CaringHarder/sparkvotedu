# Phase 43: FingerprintJS Removal - Research

**Researched:** 2026-03-08
**Domain:** Code removal / tech debt cleanup (FingerprintJS, Prisma schema, dead code)
**Confidence:** HIGH

## Summary

This is a straightforward dead-code removal phase. FingerprintJS (`@fingerprintjs/fingerprintjs` v5.0.1) was the original browser identity mechanism, now fully replaced by localStorage persistence (Phase 42) and name-based identity (Phases 40-41). The codebase has exactly 4 files to delete, 4 files to edit, 1 npm package to remove, and 1 Prisma schema change (column + index drop). There are no remaining consumers of the fingerprint code path -- the only caller of `joinSession` with a fingerprint parameter is `src/actions/student.ts` itself, and `useDeviceIdentity` (the hook that actually called `getBrowserFingerprint()`) has zero component consumers.

An additional dead-code finding: `src/lib/student/session-identity.ts` exports `getOrCreateDeviceId()` and `clearDeviceId()`, both consumed ONLY by `use-device-identity.ts` (being deleted). After hook deletion, `session-identity.ts` becomes orphaned. The CONTEXT.md already flags this for checking.

**Primary recommendation:** Delete files first, then edit remaining references, then drop the schema column, then uninstall the npm package. Verify with grep and bundle size comparison at the end.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Replace all 4 fingerprint mentions in privacy page with current identity system description
- Use "browser storage" (not "localStorage") for parent-friendly language
- Keep identity description abstract ("anonymous session identity") rather than explaining fun name + emoji mechanism
- Replace the duplicate voting prevention bullet with session-based explanation (one participation per student per session)
- Remove joinSession fingerprint fallback path entirely (Step 3 in student.ts) -- dead code, no consumers
- Delete findByFingerprint() DAL function entirely -- no callers after joinSession cleanup
- Remove fingerprint parameter from createParticipant() function signature and all callers
- Remove fingerprint field from Zod validation schema in student.ts
- No stubs, no comments, no historical references -- clean removal
- Delete DeviceIdentity type from src/types/student.ts entirely
- Delete useDeviceIdentity hook from src/hooks/use-device-identity.ts entirely
- Delete fingerprint.ts from src/lib/student/fingerprint.ts entirely
- Check session-identity.ts (getOrCreateDeviceId) for orphaned exports after hook deletion -- remove if no other consumers exist
- Full dead-code sweep: trace all imports and remove anything left without consumers
- Use `prisma db push` (consistent with Phase 39 -- Supabase shadow DB RLS conflicts block migrate dev)
- Drop fingerprint column and @@index([sessionId, fingerprint]) from StudentParticipant
- No data backup needed -- fingerprint data was unreliable from the start
- Create manual migration SQL file in prisma/migrations/ for audit trail

### Claude's Discretion
- Order of operations (code removal vs schema change vs package uninstall)
- Bundle size measurement approach for ~150KB verification
- Any additional dead code discovered during import tracing

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLEN-01 | FingerprintJS package and all fingerprint-related application code removed | Complete file inventory below; 4 files to delete, 4 files to edit, 1 package to remove |
| CLEN-02 | Device fingerprint database columns removed via separate migration | Prisma schema line 60 (`fingerprint String?`) and line 75 (`@@index([sessionId, fingerprint])`) identified; `prisma db push` approach confirmed |
| CLEN-03 | Bundle size reduced by removing unused fingerprinting dependencies (~150KB) | `@fingerprintjs/fingerprintjs` v5.0.1 is sole dependency; `next build` before/after comparison is the measurement approach |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 7.3.x | Schema migration (column drop) | Already in use; `prisma db push` is the established migration approach |
| Next.js | (existing) | Bundle analysis via `next build` output | Built-in; no additional tooling needed |

### Supporting
No additional libraries needed. This phase only removes code.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `prisma db push` | `prisma migrate dev` | Shadow DB RLS conflict on Supabase -- already ruled out in Phase 39 |
| `next build` size comparison | `@next/bundle-analyzer` | Overkill for a single before/after comparison; `next build` output shows page sizes |

## Architecture Patterns

### Recommended Order of Operations

```
1. Measure baseline bundle size (next build)
2. Delete files (fingerprint.ts, use-device-identity.ts, + session-identity.ts if orphaned)
3. Edit files (student.ts actions, student-session.ts DAL, student.ts types, privacy page)
4. Update test mocks (student-lookup.test.ts)
5. Update Prisma schema (drop column + index)
6. Run prisma db push
7. Create manual migration SQL file for audit trail
8. Uninstall npm package (@fingerprintjs/fingerprintjs)
9. Run prisma generate (regenerate client after schema change)
10. Verify: grep for "fingerprint", build succeeds, tests pass
11. Measure final bundle size and compare
```

**Rationale:** Delete files first so TypeScript catches any missed references at compile time. Edit dependent files next. Schema change after code is clean (avoids Prisma client errors during intermediate steps). Package uninstall last since npm packages don't cause compile errors when unreferenced.

### Anti-Patterns to Avoid
- **Leaving dead imports:** After deleting files, any remaining import will cause build failure. Use this as a verification mechanism -- don't suppress errors.
- **Forgetting test mocks:** The test file `src/actions/__tests__/student-lookup.test.ts` mocks `findParticipantByFingerprint` -- this mock must be removed.
- **Editing schema before code:** If schema is changed before code references are removed, `prisma generate` will produce a client that doesn't have `fingerprint`, causing compile errors in code that still references it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bundle size measurement | Custom webpack analysis | `next build` terminal output | Shows per-page sizes; simple diff is sufficient |
| Migration SQL | Hand-write complex migration | `ALTER TABLE student_participants DROP COLUMN fingerprint; DROP INDEX idx_...` | Simple single-column drop |
| Dead code detection | Manual file-by-file search | `grep -r "fingerprint" src/` + TypeScript compiler errors | Compiler + grep catches everything |

## Common Pitfalls

### Pitfall 1: Prisma Client Regeneration
**What goes wrong:** After removing the `fingerprint` column from schema.prisma, code that references `fingerprint` on the Prisma model will fail type-checking.
**Why it happens:** `prisma generate` creates TypeScript types from the schema; removing a field removes the type.
**How to avoid:** Remove ALL code references to `fingerprint` before running `prisma generate` / `prisma db push`.
**Warning signs:** TypeScript errors mentioning `fingerprint` property not existing on type.

### Pitfall 2: createParticipant Callers
**What goes wrong:** `createParticipant()` currently accepts `fingerprint` as the 3rd positional parameter. After removing it, all callers must update their argument positions.
**Why it happens:** Positional parameters shift when one is removed from the middle.
**How to avoid:** Identify ALL callers: `joinSessionByName` (line 312, passes `undefined`), `createWizardParticipant` (line 795, passes `undefined`), `joinSession` (line 167, passes `fingerprint`), `createReturningParticipant` (line 296, hardcodes `null`).
**Warning signs:** Wrong arguments passed to `createParticipant` after signature change.

### Pitfall 3: Privacy Page Content Accuracy
**What goes wrong:** Updated privacy text doesn't accurately reflect the current system.
**Why it happens:** Rushing content replacement without understanding the current identity mechanism.
**How to avoid:** Use "browser storage" language per user decision. Describe one-participation-per-session instead of "preventing duplicate voting via fingerprinting."

### Pitfall 4: Index Name for Manual Migration SQL
**What goes wrong:** Using wrong index name in DROP INDEX statement.
**Why it happens:** Prisma auto-generates index names; the actual PostgreSQL index name may differ from the Prisma schema `@@index` definition.
**How to avoid:** The index `@@index([sessionId, fingerprint])` on `student_participants` table will have an auto-generated name. Use `DROP INDEX IF EXISTS` with the correct name, or query `pg_indexes` to find it. Prisma typically generates names like `student_participants_session_id_fingerprint_idx`.

## Code Examples

### Files to DELETE (complete removal)

```
src/lib/student/fingerprint.ts      -- FingerprintJS wrapper (38 lines)
src/hooks/use-device-identity.ts    -- Composite identity hook (37 lines)
src/lib/student/session-identity.ts -- localStorage UUID helper (33 lines, orphaned after hook deletion)
```

Note: `src/types/student.ts` is NOT deleted -- only the `DeviceIdentity` interface is removed. The file contains other types (`ClassSessionData`, `StudentParticipantData`, etc.) that remain in use.

### student-session.ts DAL Edits

Remove `findParticipantByFingerprint()` function entirely (lines 27-38).

Remove `fingerprint` parameter from `createParticipant()`:
```typescript
// BEFORE:
export async function createParticipant(
  sessionId: string,
  deviceId: string | null,
  fingerprint?: string,          // REMOVE THIS
  firstName: string = '',
  lastInitial: string | null = null,
  emoji: string | null = null
)

// AFTER:
export async function createParticipant(
  sessionId: string,
  deviceId: string | null,
  firstName: string = '',
  lastInitial: string | null = null,
  emoji: string | null = null
)
```

Remove `fingerprint` from the `prisma.studentParticipant.create` data object (line 81).

Remove `fingerprint: null` from `createReturningParticipant` data object (line 296).

### student.ts Action Edits

1. Remove `findParticipantByFingerprint` from imports (line 10)
2. Remove `fingerprint` from `joinSessionSchema` (line 36)
3. Remove `fingerprint` from `joinSession` function signature (line 109) and destructuring (line 117)
4. Remove Step 3 fingerprint fallback block entirely (lines 146-164)
5. Remove `fingerprint` from `createParticipant` call in `joinSession` (line 170)
6. Update comment on `joinSession` to remove fingerprint mention (lines 99-103)
7. Fix `createParticipant` calls in `joinSessionByName` (line 312-315) and `createWizardParticipant` (line 795) -- remove the `undefined` argument that was the fingerprint position

### student.ts Types Edit

Remove `DeviceIdentity` interface entirely (lines 1-6).

### Privacy Page Edits (4 fingerprint mentions)

| Location | Current Text | Replacement |
|----------|-------------|-------------|
| Line 61-64 | "Device fingerprinting: We use anonymous device fingerprinting..." | "Session identity: We use anonymous browser storage to maintain your session identity..." |
| Line 83 | "To prevent duplicate voting within sessions (device fingerprinting)" | "To ensure one participation per student per session (browser storage)" |
| Line 101-103 | "Device fingerprinting is used only for session integrity..." | "Browser storage is used only for session continuity and is never used to track or identify students." |

### Prisma Schema Edit

```prisma
// REMOVE these two lines from StudentParticipant model:
  fingerprint  String?                          // line 60
  @@index([sessionId, fingerprint])             // line 75
```

### Manual Migration SQL

```sql
-- Migration: Remove fingerprint column from student_participants
-- Phase 43: FingerprintJS Removal

-- Drop the index first
DROP INDEX IF EXISTS "student_participants_session_id_fingerprint_idx";

-- Drop the column
ALTER TABLE "student_participants" DROP COLUMN IF EXISTS "fingerprint";
```

### Test File Edit

In `src/actions/__tests__/student-lookup.test.ts`, remove `findParticipantByFingerprint: vi.fn()` from the mock (line 13).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FingerprintJS + localStorage UUID | localStorage persistence + name-based reclaim | Phase 40-42 (v3.0) | FingerprintJS is now dead code with zero consumers |

**Deprecated/outdated:**
- `@fingerprintjs/fingerprintjs` v5.0.1: No longer used anywhere in the application after Phase 42

## Open Questions

1. **session-identity.ts deletion vs retention**
   - What we know: After deleting `use-device-identity.ts`, `session-identity.ts` has zero importers (confirmed by grep). The Phase 42 localStorage system uses a completely different approach (different key, schema-versioned storage).
   - Recommendation: Delete it. The CONTEXT.md already flags this for checking. Evidence confirms orphan status.

2. **Exact bundle size reduction**
   - What we know: FingerprintJS v5.0.1 is approximately 50-60KB minified+gzipped (150KB uncompressed). The `next build` output will show the difference.
   - Recommendation: Run `next build` before and after, compare the total First Load JS sizes. The ~150KB figure in the requirements refers to uncompressed/parsed JS size.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | vitest.config.ts (assumed, standard Next.js setup) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLEN-01 | No fingerprint imports exist in codebase | smoke | `grep -r "fingerprint" src/ --include="*.ts" --include="*.tsx"` (expect 0 results) | N/A (grep verification) |
| CLEN-01 | Existing tests still pass after removal | unit | `npx vitest run` | Yes (student-lookup.test.ts needs mock cleanup) |
| CLEN-01 | Build succeeds after all removals | smoke | `npx next build` | N/A (build verification) |
| CLEN-02 | Fingerprint column removed from schema | manual-only | Verify schema.prisma has no `fingerprint` field | N/A |
| CLEN-02 | Migration SQL file exists for audit trail | manual-only | Check `prisma/migrations/` directory | N/A |
| CLEN-03 | Bundle size reduced | smoke | Compare `next build` output before and after | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run && npx next build`
- **Phase gate:** Full suite green + build succeeds + grep verification before `/gsd:verify-work`

### Wave 0 Gaps
None -- existing test infrastructure covers all phase requirements. The only test file affected (`student-lookup.test.ts`) needs a minor mock removal, not new tests.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: Direct grep and file reading of all fingerprint references
- `package.json` line 20: `@fingerprintjs/fingerprintjs` v5.0.1
- `prisma/schema.prisma` lines 60, 75: fingerprint column and index
- `src/actions/student.ts`: Complete joinSession flow with fingerprint fallback (lines 146-164)
- `src/lib/dal/student-session.ts`: findParticipantByFingerprint and createParticipant signatures

### Secondary (MEDIUM confidence)
- FingerprintJS v5 bundle size (~150KB uncompressed): Based on npm package analysis; exact savings depend on tree-shaking

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries, pure removal
- Architecture: HIGH - All files and references fully mapped via grep
- Pitfalls: HIGH - Positional parameter shift and Prisma regeneration order are well-understood

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- removal work, no external dependencies changing)
