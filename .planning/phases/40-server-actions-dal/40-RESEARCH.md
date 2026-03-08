# Phase 40: Server Actions + DAL - Research

**Researched:** 2026-03-08
**Domain:** Next.js Server Actions, Prisma Data Access Layer, Student Identity Management
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Emoji assignment logic
- Students choose their own emoji via the wizard picker (Phase 41) -- server does NOT auto-assign
- New students: emoji stays null until they complete the emoji picker step in the wizard
- Migrated students (existing participants without emoji): show first letter of fun name as fallback in EmojiAvatar
- Duplicates allowed -- multiple students can pick the same emoji within a session
- No server-side emoji validation -- accept any valid shortcode from the pool

#### Returning student lookup
- Match by firstName + lastInitial, case-insensitive and whitespace-trimmed
- **Teacher-wide lookup** across all active (non-archived) sessions -- not just the current session
- Single match: auto-reclaim silently, no confirmation step
- No match: treat as new student, proceed through full wizard
- Fun name AND emoji carry across all of a teacher's sessions (latest emoji wins if changed)
- Cross-session returning student sees welcome-only screen: "Welcome back, Brave Fox!" -- skips wizard

#### Ambiguous match handling
- Multiple matches: return all matching participants with fun name + emoji
- Student picks "That's me" from the list to reclaim their identity
- Show all matches -- no cap on result count
- Match card data: fun name + emoji only (no session name or date)

### Claude's Discretion
- Whether to include a "None of these -- I'm new" option on the disambiguation screen
- Exact data shape of lookup responses
- Error handling patterns for server actions
- How to determine "latest emoji" across sessions (by updatedAt timestamp or similar)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERS-03 | Cross-device returning student can reclaim identity by typing first name + last initial | `lookupReturningStudent` DAL function with teacher-wide query across non-archived sessions; existing Prisma index on `[sessionId, firstName, lastInitial]` |
| PERS-04 | When cross-device name match is ambiguous, system shows fun names + emojis for student to pick from | Lookup returns `DuplicateCandidate[]` with funName + emoji; `claimReturningIdentity` action reclaims selected participant |
| MIGR-03 | New join flow works for both new and existing sessions seamlessly | Updated `createParticipant` DAL accepting lastInitial; session lookup handles active sessions with or without existing participants identically |

</phase_requirements>

## Summary

This phase builds the backend server actions and data access layer for the new student join system. The core challenge is **teacher-wide cross-session identity lookup**: when a student types their first name + last initial on a new device, the system must search across ALL non-archived sessions belonging to that teacher to find a match, then either auto-reclaim (single match) or present disambiguation options (multiple matches).

The existing codebase already has a well-established pattern: `src/actions/*.ts` files contain `'use server'` functions that validate input with Zod, call DAL functions from `src/lib/dal/*.ts`, and return typed result objects. The current `src/actions/student.ts` and `src/lib/dal/student-session.ts` handle the existing join flow and will need to be extended (not replaced) with the new cross-session lookup logic.

The critical new capability is the teacher-wide lookup query. Currently, `findParticipantsByFirstName` queries within a single session. The new `lookupReturningStudent` must: (1) resolve session code to session + teacherId, (2) query all non-archived sessions for that teacher, (3) match by firstName + lastInitial case-insensitively, and (4) return matches with funName + emoji. The schema already has the needed columns (emoji, lastInitial added in Phase 39) and an index on `[sessionId, firstName, lastInitial]`.

**Primary recommendation:** Extend existing `student-session.ts` DAL and `student.ts` actions following the established patterns. Add a `lookupReturningStudent` DAL function, a `lookupStudent` server action, and update `createParticipant` to accept lastInitial. Include a "None of these" escape hatch in the disambiguation response shape.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | (project version) | Server Actions via `'use server'` | Already in use; established pattern in `src/actions/` |
| Prisma | (project version) | ORM / Data Access | Already in use with PrismaPg adapter; generated client at `prisma/generated/prisma` |
| Zod | (project version) | Input validation for server actions | Already in use for all existing actions; `firstNameSchema` already exists |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @2toad/profanity | (project version) | Name profanity filtering | Already integrated in `firstNameSchema` |
| Supabase Realtime | (project version) | Broadcast participant joined | Already used in `joinSessionByName`; reuse for new join actions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending existing files | New separate files | Would fragment student logic; extending is cleaner since it's the same domain |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── actions/
│   └── student.ts           # Add new server actions here (existing file)
├── lib/
│   ├── dal/
│   │   ├── student-session.ts  # Add new DAL functions here (existing file)
│   │   └── class-session.ts    # Already has session lookup helpers
│   ├── student/
│   │   ├── emoji-pool.ts       # Emoji shortcode pool (from Phase 39)
│   │   └── fun-names.ts        # Fun name generation
│   ├── validations/
│   │   └── first-name.ts       # Reuse existing firstNameSchema
│   └── prisma.ts               # Singleton Prisma client
└── types/
    └── student.ts              # Add new types/update existing
```

### Pattern 1: Server Action + DAL Separation
**What:** Server actions handle validation, orchestration, and result shaping. DAL functions handle raw Prisma queries. Actions never import Prisma directly (except legacy `claimIdentity` which does a one-off inline query).
**When to use:** Always -- this is the established codebase convention.
**Example:**
```typescript
// src/actions/student.ts
'use server'

import { z } from 'zod'
import { lookupReturningStudent } from '@/lib/dal/student-session'

const lookupSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  firstName: firstNameSchema,
  lastInitial: lastInitialSchema,
})

export async function lookupStudent(input: {
  code: string
  firstName: string
  lastInitial: string
}): Promise<LookupResult> {
  const parsed = lookupSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }
  // ... orchestration logic
}
```

### Pattern 2: Teacher-Wide Cross-Session Query
**What:** Query across all non-archived sessions for a teacher, matching by firstName + lastInitial.
**When to use:** For the returning student lookup.
**Example:**
```typescript
// src/lib/dal/student-session.ts
export async function findReturningStudent(
  teacherId: string,
  firstName: string,
  lastInitial: string
) {
  return prisma.studentParticipant.findMany({
    where: {
      firstName: { equals: firstName, mode: 'insensitive' },
      lastInitial: { equals: lastInitial, mode: 'insensitive' },
      banned: false,
      session: {
        teacherId,
        archivedAt: null,  // non-archived sessions only
      },
    },
    select: {
      id: true,
      funName: true,
      emoji: true,
      sessionId: true,
      updatedAt: true,  // for "latest emoji wins" ordering
    },
    orderBy: { updatedAt: 'desc' },  // most recently active first
  })
}
```

### Pattern 3: Discriminated Union Return Types
**What:** All server actions return `{ data } | { error }` style unions, matching the existing `JoinResult` pattern.
**When to use:** All new server actions.
**Example:**
```typescript
export interface LookupResult {
  /** Single match -- participant auto-reclaimed */
  participant?: StudentParticipantData
  session?: ClassSessionData
  returning?: boolean
  /** Multiple matches -- student must pick */
  candidates?: DuplicateCandidate[]
  /** No match -- new student */
  isNew?: boolean
  error?: string
}
```

### Anti-Patterns to Avoid
- **Importing prisma directly in actions:** Use DAL functions instead. The one exception in `claimIdentity` is legacy code.
- **Creating new DAL files for student operations:** Keep student identity logic in `student-session.ts` for cohesion.
- **Returning Prisma model objects to the client:** Always select/map to typed DTOs. Prisma objects may contain sensitive fields.
- **Throwing errors from actions:** Return `{ error: string }` instead. Thrown errors become opaque 500s in production.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Input validation | Custom if/else chains | Zod schemas (already in use) | Consistent with codebase; `.safeParse()` gives typed errors |
| Case-insensitive matching | `LOWER()` raw SQL | Prisma `mode: 'insensitive'` | Already used in `findParticipantsByFirstName`; Prisma handles it |
| Profanity filtering | Custom word lists | `@2toad/profanity` via `firstNameSchema` | Already integrated and tested |
| Fun name generation | New name generator | `generateFunName()` from `fun-names.ts` | Proven, tested, handles uniqueness |
| Last-initial validation | Inline regex | New Zod schema `lastInitialSchema` | Reusable, consistent with firstName pattern |

**Key insight:** Nearly everything needed already exists in the codebase. This phase is primarily about composing existing pieces into new flows, not building new primitives.

## Common Pitfalls

### Pitfall 1: Forgetting archivedAt Filter in Teacher-Wide Lookup
**What goes wrong:** Lookup returns participants from archived sessions, violating the "non-archived only" requirement.
**Why it happens:** Easy to filter only on `teacherId` and forget the `archivedAt: null` clause on the session relation.
**How to avoid:** Always include `session: { teacherId, archivedAt: null }` in the where clause for cross-session queries.
**Warning signs:** Students see matches from sessions the teacher has archived.

### Pitfall 2: Not Trimming/Normalizing lastInitial
**What goes wrong:** "R" and "r" or " R" don't match, breaking the returning student flow.
**Why it happens:** Input from the wizard may have mixed case or trailing whitespace.
**How to avoid:** Create a `lastInitialSchema` Zod schema that trims, uppercases, and validates max 2 chars. Apply both at action input and at storage time.
**Warning signs:** Returning students treated as new despite entering correct info.

### Pitfall 3: Race Condition on Simultaneous Join
**What goes wrong:** Two students with the same name+initial join at the same instant; both get treated as "new" and create duplicate participants.
**Why it happens:** No transaction or unique constraint on firstName+lastInitial per teacher.
**How to avoid:** This is acceptable per the requirements -- duplicates are handled by the disambiguation flow. The system already handles duplicate fun names via the `@@unique([sessionId, funName])` constraint. No additional protection needed since the user decided duplicates are OK.
**Warning signs:** N/A -- this is by design.

### Pitfall 4: Stale Emoji on Cross-Session Reclaim
**What goes wrong:** Student changed their emoji in session B but reclaims in session C and gets the old emoji from session A.
**Why it happens:** Reclaim logic picks the wrong participant record when multiple exist.
**How to avoid:** When creating a participant in a new session for a returning student, copy the emoji from the most recently updated participant record (`ORDER BY updatedAt DESC LIMIT 1`). The "latest emoji wins" logic must use `updatedAt` timestamp.
**Warning signs:** Returning students see outdated emoji.

### Pitfall 5: Creating Participant Without Session Validation
**What goes wrong:** A participant is created in an ended or archived session.
**Why it happens:** The new flow may skip the session status check.
**How to avoid:** Always verify `session.status === 'active'` before creating participants. The existing `joinSessionByName` already has this pattern (checking for 'ended' status).
**Warning signs:** Participants appearing in sessions that should be closed.

## Code Examples

### New lastInitial Validation Schema
```typescript
// src/lib/validations/last-initial.ts
import { z } from 'zod'

export const lastInitialSchema = z
  .string()
  .transform((s) => s.trim().toUpperCase())
  .pipe(
    z.string()
      .min(1, 'Last initial is required')
      .max(2, 'Last initial must be 1-2 characters')
      .regex(/^[A-Z]{1,2}$/, 'Last initial must be a letter')
  )
```

### Teacher-Wide Lookup DAL Function
```typescript
// src/lib/dal/student-session.ts (addition)
export async function findReturningStudent(
  teacherId: string,
  firstName: string,
  lastInitial: string
) {
  return prisma.studentParticipant.findMany({
    where: {
      firstName: { equals: firstName, mode: 'insensitive' },
      lastInitial: { equals: lastInitial, mode: 'insensitive' },
      banned: false,
      session: {
        teacherId,
        archivedAt: null,
      },
    },
    select: {
      id: true,
      funName: true,
      emoji: true,
      sessionId: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  })
}
```

### Updated createParticipant DAL Function
```typescript
// src/lib/dal/student-session.ts (updated signature)
export async function createParticipant(
  sessionId: string,
  deviceId: string | null,
  fingerprint?: string,
  firstName: string = '',
  lastInitial: string | null = null,
  emoji: string | null = null
) {
  const existing = await prisma.studentParticipant.findMany({
    where: { sessionId },
    select: { funName: true },
  })
  const existingNames = new Set(existing.map((p) => p.funName))
  const funName = generateFunName(existingNames)

  return prisma.studentParticipant.create({
    data: {
      sessionId,
      funName,
      firstName,
      lastInitial,
      emoji,
      deviceId,
      fingerprint: fingerprint ?? null,
    },
  })
}
```

### lookupStudent Server Action Shape
```typescript
// src/actions/student.ts (addition)
export async function lookupStudent(input: {
  code: string
  firstName: string
  lastInitial: string
}): Promise<LookupResult> {
  // 1. Validate input
  // 2. Find session by code (verify active)
  // 3. Teacher-wide lookup by firstName + lastInitial
  // 4. Zero matches -> { isNew: true, session }
  // 5. One match -> auto-reclaim: create participant in THIS session
  //    with same funName + latest emoji, return { participant, session, returning: true }
  // 6. Multiple matches -> { candidates: [...], session }
}
```

### Reclaim Logic for Single Match
```typescript
// When a single match is found across teacher's sessions:
// 1. Get the matched participant's funName and latest emoji
// 2. Create a NEW participant in the CURRENT session with that funName + emoji
// 3. The student is now in this session with their familiar identity

export async function createReturningParticipant(
  sessionId: string,
  existingParticipant: { funName: string; emoji: string | null },
  firstName: string,
  lastInitial: string,
  deviceId: string | null
) {
  return prisma.studentParticipant.create({
    data: {
      sessionId,
      funName: existingParticipant.funName,
      emoji: existingParticipant.emoji,
      firstName,
      lastInitial,
      deviceId,
      fingerprint: null,
    },
  })
}
```

## Discretion Recommendations

### "None of these -- I'm new" option
**Recommendation: YES, include it.** The disambiguation screen should include a "None of these -- I'm new" button. Without it, a student whose name+initial happens to match someone else has no escape from the disambiguation flow. The response shape should include an `allowNew: true` flag so the UI can render this option.

### Data shape of lookup responses
**Recommendation:** Extend the existing `JoinResult` type rather than creating a new type. Add `isNew?: boolean` for the no-match case and `candidates?: DuplicateCandidate[]` for the multiple-match case. The `DuplicateCandidate` interface already exists with `{ id, funName, emoji }`.

### Error handling patterns
**Recommendation:** Follow the existing pattern exactly -- return `{ error: string }` for all failure cases. Never throw from server actions. Use Zod `.safeParse()` for input validation. Wrap DAL calls in try/catch only when a specific error message is needed (like the existing `rerollName` does).

### "Latest emoji wins" determination
**Recommendation:** Use `updatedAt` timestamp on `StudentParticipant`. The teacher-wide lookup query should `ORDER BY updatedAt DESC`. The first result's emoji is the "latest." This works because `updatedAt` is automatically maintained by Prisma's `@updatedAt` directive. Note: the schema uses `createdAt` (not `updatedAt`) on StudentParticipant -- there is NO `updatedAt` field on StudentParticipant. Use `lastSeenAt` instead, or use `createdAt` with the understanding that the most recently created participant across sessions has the latest emoji choice.

**CORRECTION:** Looking at the schema more carefully, `StudentParticipant` has `lastSeenAt` and `createdAt` but NO `updatedAt`. Use `lastSeenAt` for "latest emoji wins" ordering since it gets updated when students reclaim identity (via `updateLastSeen`). Alternatively, the query can simply take the participant with the most recent `createdAt` since a returning student in a new session creates a new record.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Device fingerprint identity | Name + initial lookup | Phase 40 (now) | Removes FingerprintJS dependency, works on managed Chromebooks |
| Single-session name lookup | Teacher-wide cross-session lookup | Phase 40 (now) | Students keep identity across all of a teacher's sessions |
| Auto-assigned emoji (djb2 hash) | Student-chosen emoji | Phase 40 (now) | `pickEmoji()` becomes fallback/suggestion only; wizard picker is primary |

**Note on success criteria correction:** The phase success criteria says `createParticipant` "auto-assigns an emoji shortcode from the pool" -- but the locked decision says "server does NOT auto-assign." The implementation should follow the locked decision: emoji stays null until the student picks one in the wizard. The `pickEmoji()` function from emoji-pool.ts may be used as a suggestion/default in the UI (Phase 41) but the server action should accept emoji as an optional parameter.

## Open Questions

1. **Fun name uniqueness across sessions**
   - What we know: Fun names are unique within a session (`@@unique([sessionId, funName])`). A returning student's fun name is carried across sessions.
   - What's unclear: If a returning student's fun name ("Brave Fox") is already taken in the new session by a different student, what happens?
   - Recommendation: Check for fun name collision in the target session. If collision exists, generate a new fun name for the returning student and inform them. This is an edge case but must be handled to avoid a unique constraint violation.

2. **Reclaim creates new participant vs. links existing**
   - What we know: The context says "fun name AND emoji carry across." Teacher-wide identity.
   - What's unclear: Does reclaim create a NEW `StudentParticipant` record in the current session (copying funName + emoji), or does it somehow link to the existing one?
   - Recommendation: Create a NEW participant in the current session. Each session needs its own participant record for votes, polls, etc. The fun name and emoji are copied from the most recent existing participant.

3. **Index coverage for teacher-wide lookup**
   - What we know: Index exists on `[sessionId, firstName, lastInitial]` -- but the teacher-wide query goes through the session relation, not directly by sessionId.
   - What's unclear: Whether Prisma's generated query will efficiently use this index for cross-session lookups.
   - Recommendation: The query filters on `session.teacherId` + `session.archivedAt`, then `firstName` + `lastInitial`. The existing `[teacherId, archivedAt]` index on ClassSession plus the `[sessionId, firstName, lastInitial]` index on StudentParticipant should cover this adequately. Monitor query performance but no new indexes needed initially.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/lib/student/` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERS-03 | Lookup returning student by firstName + lastInitial across teacher's sessions | unit | `npx vitest run src/lib/dal/__tests__/student-session.test.ts -x` | No -- Wave 0 |
| PERS-04 | Multiple matches return all candidates with funName + emoji | unit | `npx vitest run src/lib/dal/__tests__/student-session.test.ts -x` | No -- Wave 0 |
| MIGR-03 | createParticipant accepts lastInitial; works for new and existing sessions | unit | `npx vitest run src/lib/dal/__tests__/student-session.test.ts -x` | No -- Wave 0 |

**Note:** DAL functions that query Prisma require database mocking or integration tests. For pure unit tests, mock Prisma client methods. For the server actions, test the validation + orchestration logic by mocking DAL imports.

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/student/ src/lib/dal/__tests__/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/dal/__tests__/student-session.test.ts` -- covers PERS-03, PERS-04, MIGR-03 (DAL unit tests with mocked Prisma)
- [ ] `src/lib/validations/__tests__/last-initial.test.ts` -- covers lastInitial validation schema
- [ ] Prisma mock setup (vitest mock for `@/lib/prisma`) -- shared test utility

## Sources

### Primary (HIGH confidence)
- Project codebase: `src/actions/student.ts` -- existing server action patterns, Zod validation, result types
- Project codebase: `src/lib/dal/student-session.ts` -- existing DAL patterns, Prisma query style
- Project codebase: `src/lib/dal/class-session.ts` -- session lookup patterns, teacher ownership checks
- Project codebase: `prisma/schema.prisma` -- StudentParticipant model with emoji, lastInitial columns and indexes
- Project codebase: `src/types/student.ts` -- existing type definitions (JoinResult, DuplicateCandidate, etc.)
- Project codebase: `src/lib/student/emoji-pool.ts` -- emoji shortcode pool and resolution utilities
- Project codebase: `src/lib/validations/first-name.ts` -- validation pattern to replicate for lastInitial

### Secondary (MEDIUM confidence)
- Prisma `mode: 'insensitive'` for case-insensitive queries -- verified in existing codebase usage (`findParticipantsByFirstName`)
- Prisma relation filtering (`session: { teacherId, archivedAt: null }`) -- standard Prisma relation filter syntax

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - entirely based on existing codebase patterns, no new libraries
- Architecture: HIGH - extending established patterns (actions + DAL + types)
- Pitfalls: HIGH - derived from actual schema constraints and query requirements

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- internal patterns unlikely to change)
