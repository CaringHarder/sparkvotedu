# Phase 42: localStorage Persistence + Auto-Rejoin - Research

**Researched:** 2026-03-09
**Domain:** Client-side identity persistence, localStorage API, React state management
**Confidence:** HIGH

## Summary

Phase 42 adds a localStorage persistence layer that remembers student identities across browser sessions, enabling auto-rejoin when a student returns to the same class code on the same device. The existing codebase already has two storage layers: `sessionStorage` (per-tab identity in `session-store.ts`) and `localStorage` (device UUID in `session-identity.ts`). This phase creates a new localStorage store that maps sessionIds to full participant identities, checks this store before showing the wizard, and adds an "Is this you?" confirmation screen.

The architecture is straightforward: a new `identity-store.ts` module manages a single localStorage key containing a JSON map of sessionId-to-identity records, each with a `joinedAt` timestamp for TTL pruning. The JoinWizard gains a new initial step (`localStorage-confirm`) that fires before `path-select` when a stored identity exists for the current session. All localStorage operations use try/catch for graceful degradation.

**Primary recommendation:** Create a single `sparkvotedu_identities` localStorage key containing a `Record<sessionId, StoredIdentity>` with schema version, then add a `localStorage-confirm` wizard step that short-circuits the wizard when a match is found.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Show an "Is this you?" confirmation screen -- not instant, not a loading flash
- Confirmation shows both fun name + emoji AND real first name + last initial (e.g., "Is this you? :unicorn: CosmicTiger (David R.)")
- If student says "Not me" -> clear that stored identity from localStorage and start the full wizard fresh (new fun name, name entry, emoji pick)
- After completing the fresh wizard, the new identity is written to localStorage
- Any successful join (new student, reclaimed identity, or fresh after "not me") writes to localStorage
- When localStorage is unavailable, the join wizard runs normally with no errors or warnings
- If localStorage data was previously wiped (cache cleared, Chromebook reset), student goes through normal wizard flow -- server-side name reclaim catches them by name+initial
- No special treatment for the "had data but lost it" case
- "Not me" on confirmation screen clears that session's stored identity from localStorage
- New identity written after fresh wizard completion replaces the cleared one

### Claude's Discretion
- Storage key structure (single key with object map vs per-session keys)
- What identity data to store per session (minimum for rejoin vs display-ready cache for instant "Is this you?" rendering)
- localStorage namespace/prefix strategy
- localStorage availability detection approach (upfront check vs lazy try/catch)
- Whether to show any indication when localStorage is unavailable
- Schema versioning in stored data
- TTL duration (roadmap says 30 days, but semester-length like 90 days may be more appropriate for schools)
- When pruning runs (on page load, on join, etc.)
- Whether to cap max stored identities in addition to TTL
- Multi-session matching logic (keyed by sessionId from class code)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERS-01 | Same-device returning student auto-rejoins silently via localStorage (zero clicks beyond entering class code or visiting direct link) | "Is this you?" confirmation screen with stored identity; auto-rejoin server action; new wizard step `localStorage-confirm` |
| PERS-02 | localStorage remembers all sessions the student has joined (not just the most recent) | Single localStorage key with `Record<sessionId, StoredIdentity>` map; TTL-based pruning |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| localStorage Web API | N/A | Persist identity across browser sessions | Built-in, no dependencies, already used in project |
| React useReducer | N/A | Wizard state machine extensions | Already used in JoinWizard, discriminated union pattern established |
| motion/react | Already installed | Slide transitions for confirmation screen | Already used for all wizard step animations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | Already installed | Validate stored data shape on read | Parse localStorage JSON safely |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single JSON key | Per-session keys (`sparkvotedu_identity_{sessionId}`) | Per-session keys are simpler per entry but harder to prune (must enumerate all localStorage keys); single key is cleaner and matches the "all sessions" requirement |
| IndexedDB | localStorage | IndexedDB is async and more complex; localStorage's 5MB limit is more than sufficient for identity records |

## Architecture Patterns

### Recommended Additions to Project Structure
```
src/
├── lib/student/
│   ├── session-store.ts           # EXISTING: sessionStorage per-tab (unchanged)
│   ├── session-identity.ts        # EXISTING: localStorage device UUID (unchanged)
│   └── identity-store.ts          # NEW: localStorage identity persistence
├── components/student/join-wizard/
│   ├── join-wizard.tsx            # MODIFIED: add localStorage check + new step
│   ├── types.ts                   # MODIFIED: add localStorage-confirm step type
│   └── localStorage-confirm.tsx   # NEW: "Is this you?" confirmation screen
└── actions/
    └── student.ts                 # MODIFIED: add auto-rejoin server action
```

### Pattern 1: Single-Key Identity Store
**What:** Store all session identities in one localStorage key as a versioned JSON object
**When to use:** When you need to enumerate, prune, and manage multiple entries atomically
**Recommendation:** Use this approach

```typescript
// src/lib/student/identity-store.ts

const STORAGE_KEY = 'sparkvotedu_identities'
const SCHEMA_VERSION = 1
const TTL_DAYS = 90  // Semester-length for school use

interface StoredIdentity {
  participantId: string
  funName: string
  emoji: string | null
  firstName: string
  lastInitial: string | null
  sessionId: string
  joinedAt: number  // Date.now() timestamp
}

interface IdentityStore {
  v: number  // schema version
  identities: Record<string, StoredIdentity>  // keyed by sessionId
}
```

**Rationale for discretion choices:**

1. **Single key vs per-session keys:** Single key. Pruning requires iterating all entries -- with per-session keys you'd need to enumerate all localStorage keys and filter by prefix, which is fragile. A single key with a JSON map is atomic and self-contained.

2. **TTL: 90 days instead of 30.** School semesters run 4-5 months. A 30-day TTL means students returning after winter break would lose their identity. 90 days covers a full semester with margin.

3. **Data stored per session: display-ready cache.** Store `funName`, `emoji`, `firstName`, `lastInitial`, `participantId`, `sessionId`, and `joinedAt`. This avoids a server round-trip before showing the "Is this you?" confirmation. The server action still verifies the participantId is valid before completing the rejoin.

4. **localStorage detection: lazy try/catch.** Don't probe upfront. Every read/write is already wrapped in try/catch (established pattern in `session-store.ts` and `session-identity.ts`). If localStorage throws, the operation returns null/void and the wizard proceeds normally.

5. **No indication when localStorage is unavailable.** Per the locked decision, the wizard "runs normally with no errors or warnings."

6. **Schema versioning:** Include a `v: 1` field in the stored object. If the schema changes in the future, the read function can detect version mismatches and either migrate or discard.

7. **Pruning: on read.** When `getStoredIdentity(sessionId)` is called, prune all expired entries from the map before returning. This is lazy, efficient, and means pruning happens naturally during the join flow.

8. **Max cap: 50 identities.** In addition to TTL, cap at 50 most-recent entries. A student joining 50+ sessions in 90 days is unlikely, but this prevents unbounded growth from shared devices.

### Pattern 2: Wizard State Machine Extension
**What:** Add a `localStorage-confirm` step to the discriminated union wizard state
**When to use:** Before showing path-select, when a stored identity exists for the current session

```typescript
// Addition to types.ts WizardStep union:
| {
    type: 'localStorage-confirm'
    stored: StoredIdentity
  }

// Addition to WizardAction union:
| { type: 'CONFIRM_IDENTITY' }    // User says "Yes, that's me"
| { type: 'DENY_IDENTITY' }       // User says "Not me"
```

**Flow logic in JoinWizard:**
1. On mount, check `getStoredIdentity(sessionInfo.id)`
2. If found, initialize reducer with `{ type: 'localStorage-confirm', stored }` instead of `{ type: 'path-select' }`
3. `CONFIRM_IDENTITY` -> call server action to verify + rejoin -> navigate to session
4. `DENY_IDENTITY` -> clear stored identity for this session -> transition to `path-select` (full wizard)

### Pattern 3: Server-Side Rejoin Verification
**What:** A new server action that verifies a stored participantId is still valid and rejoins
**When to use:** When student confirms "Yes, that's me" on the localStorage confirmation screen

```typescript
// Addition to src/actions/student.ts
export async function rejoinWithStoredIdentity(input: {
  participantId: string
  sessionId: string
}): Promise<JoinResult> {
  // 1. Find participant by ID
  // 2. Verify participant belongs to session (security)
  // 3. Verify participant is not banned
  // 4. Update lastSeenAt
  // 5. Return participant data + session info
}
```

**Why a server action is needed:** The stored participantId might be stale (participant deleted, banned, session archived). The server must verify before granting access.

### Pattern 4: Write-After-Join Hook
**What:** Write identity to localStorage after every successful join
**When to use:** After any successful join path (new wizard, returning reclaim, localStorage confirm, disambiguation)

The JoinWizard already calls `setSessionParticipant()` (sessionStorage) at multiple points after successful joins. Each of these call sites also needs to call `setStoredIdentity()` (localStorage) with the participant data.

**Key write points in join-wizard.tsx:**
- `handleEmojiSelect` (new student completes wizard)
- `handleReturningResult` (single-match auto-reclaim)
- `handleReturningClaimed` (disambiguation claim)
- `onClaimed` in `new-match-found` step
- `CONFIRM_IDENTITY` handler (localStorage rejoin)

### Anti-Patterns to Avoid
- **Reading localStorage in a Server Component:** `[code]/page.tsx` is a Server Component. localStorage check must happen in the client-side JoinWizard, not in the page component.
- **Storing sensitive data:** Don't store recoveryCode, deviceId, or fingerprint in the identity store. Only store display data + participantId.
- **Treating localStorage as authoritative:** Always verify with the server. localStorage is a hint, not a source of truth. The participant may have been banned or deleted.
- **Blocking render on localStorage read:** Read synchronously (localStorage is sync) but don't block the initial render. Use `useState` with lazy initializer or `useEffect`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON parse safety | Manual try/catch + type assertion | zod `.safeParse()` on stored data | Stored data could be corrupted, wrong version, or tampered with |
| Storage availability check | Feature detection probe | try/catch on actual operations | Probes can pass but operations can still fail (quota exceeded, security policy) |

## Common Pitfalls

### Pitfall 1: Stale ParticipantId
**What goes wrong:** Student's stored participantId references a deleted or banned participant
**Why it happens:** Teacher clears session, student returns on same device
**How to avoid:** Server action always verifies participant exists, belongs to session, and is not banned before granting access. On failure, clear stored identity and fall through to wizard.
**Warning signs:** "Participant not found" errors in production

### Pitfall 2: Multi-Tab Race Condition
**What goes wrong:** Two tabs for different sessions overwrite each other's identity in the single localStorage key
**Why it happens:** localStorage is shared across all tabs for the same origin
**How to avoid:** The identity map is keyed by sessionId, so different sessions write to different keys within the map. Read-modify-write should be fine since both tabs write different keys. The existing sessionStorage (per-tab) handles the in-session identity.
**Warning signs:** Student sees wrong name in a session

### Pitfall 3: localStorage Quota Exceeded
**What goes wrong:** localStorage write fails silently
**Why it happens:** 5MB limit reached (unlikely for identity data, but possible with other app data)
**How to avoid:** All writes are in try/catch. Pruning on read keeps the store small. 50-entry cap provides hard limit.
**Warning signs:** Students not being auto-recognized on return visits

### Pitfall 4: Confirmation Screen Shows Stale Data
**What goes wrong:** The "Is this you?" screen shows an old name/emoji that was changed server-side
**Why it happens:** localStorage cache is stale -- student edited their profile in a previous session
**How to avoid:** This is acceptable. The confirmation is a hint ("does this look right?"). The server action returns the current data after verification. After successful rejoin, update the localStorage cache with fresh server data.

### Pitfall 5: "Not Me" Creates Orphaned Participant
**What goes wrong:** Student says "Not me", starts fresh wizard, which creates a new participant. The old participant still exists in the DB.
**Why it happens:** "Not me" only clears localStorage, doesn't delete the DB participant
**How to avoid:** This is by design. The old participant is a legitimate record from a previous join. It should not be deleted. The new wizard creates a fresh participant as if the student were brand new.

## Code Examples

### Identity Store Module
```typescript
// src/lib/student/identity-store.ts

const STORAGE_KEY = 'sparkvotedu_identities'
const SCHEMA_VERSION = 1
const TTL_MS = 90 * 24 * 60 * 60 * 1000  // 90 days
const MAX_ENTRIES = 50

export interface StoredIdentity {
  participantId: string
  funName: string
  emoji: string | null
  firstName: string
  lastInitial: string | null
  sessionId: string
  joinedAt: number
}

interface IdentityStore {
  v: number
  identities: Record<string, StoredIdentity>
}

function readStore(): IdentityStore | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.v !== SCHEMA_VERSION) return null  // version mismatch, discard
    return parsed as IdentityStore
  } catch {
    return null
  }
}

function writeStore(store: IdentityStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // localStorage unavailable or quota exceeded -- fail-silent
  }
}

function pruneStore(store: IdentityStore): IdentityStore {
  const now = Date.now()
  const entries = Object.entries(store.identities)
    .filter(([, v]) => now - v.joinedAt < TTL_MS)
    .sort(([, a], [, b]) => b.joinedAt - a.joinedAt)
    .slice(0, MAX_ENTRIES)
  return {
    v: SCHEMA_VERSION,
    identities: Object.fromEntries(entries),
  }
}

export function getStoredIdentity(sessionId: string): StoredIdentity | null {
  const store = readStore()
  if (!store) return null
  const pruned = pruneStore(store)
  writeStore(pruned)  // persist pruned version
  return pruned.identities[sessionId] ?? null
}

export function setStoredIdentity(identity: StoredIdentity): void {
  const store = readStore() ?? { v: SCHEMA_VERSION, identities: {} }
  store.identities[identity.sessionId] = identity
  const pruned = pruneStore(store)
  writeStore(pruned)
}

export function clearStoredIdentity(sessionId: string): void {
  const store = readStore()
  if (!store) return
  delete store.identities[sessionId]
  writeStore(store)
}
```

### "Is This You?" Confirmation Component
```typescript
// src/components/student/join-wizard/localStorage-confirm.tsx
'use client'

import { motion } from 'motion/react'
import { shortcodeToEmoji } from '@/lib/student/emoji-pool'
import type { StoredIdentity } from '@/lib/student/identity-store'

interface LocalStorageConfirmProps {
  stored: StoredIdentity
  onConfirm: () => void
  onDeny: () => void
}

export function LocalStorageConfirm({ stored, onConfirm, onDeny }: LocalStorageConfirmProps) {
  const emojiChar = stored.emoji ? shortcodeToEmoji(stored.emoji) ?? '' : ''
  const displayName = stored.lastInitial
    ? `${stored.firstName} ${stored.lastInitial}.`
    : stored.firstName

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-lg font-medium text-muted-foreground">Is this you?</p>

      <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-brand-blue/20 bg-brand-blue/5 p-6">
        {emojiChar && <span className="text-5xl">{emojiChar}</span>}
        <p className="text-2xl font-bold">{stored.funName}</p>
        <p className="text-sm text-muted-foreground">({displayName})</p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <motion.button
          type="button"
          className="rounded-2xl bg-brand-blue p-4 text-lg font-bold text-white shadow-md"
          whileTap={{ scale: 0.97 }}
          onClick={onConfirm}
        >
          Yes, that&apos;s me!
        </motion.button>

        <motion.button
          type="button"
          className="rounded-2xl border-2 border-muted p-4 text-lg font-bold shadow-sm"
          whileTap={{ scale: 0.97 }}
          onClick={onDeny}
        >
          Not me
        </motion.button>
      </div>
    </div>
  )
}
```

### Server Action for Stored Identity Rejoin
```typescript
// Addition to src/actions/student.ts
export async function rejoinWithStoredIdentity(input: {
  participantId: string
  sessionId: string
}): Promise<JoinResult> {
  const { prisma } = await import('@/lib/prisma')

  const participant = await prisma.studentParticipant.findUnique({
    where: { id: input.participantId },
    include: {
      session: {
        select: { id: true, code: true, name: true, status: true, archivedAt: true, teacher: { select: { name: true } } },
      },
    },
  })

  if (!participant || participant.sessionId !== input.sessionId) {
    return { error: 'identity_not_found' }
  }

  if (participant.banned) {
    return { error: 'You have been removed from this session' }
  }

  if (participant.session.archivedAt) {
    return { error: 'This session is no longer available' }
  }

  // Update lastSeenAt
  await updateLastSeen(participant.id)

  const sessionInfo = {
    id: participant.session.id,
    code: participant.session.code,
    name: participant.session.name,
    status: participant.session.status,
    teacherName: participant.session.teacher.name,
  }

  return {
    participant: toParticipantData(participant),
    session: sessionInfo,
    returning: true,
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Device fingerprinting (FingerprintJS) | localStorage UUID + name-based reclaim | Phase 39-41 (2026-03) | More reliable, privacy-respecting, no third-party dependency |
| Single session memory | Multi-session persistence map | Phase 42 (this phase) | Students auto-recognized across all sessions on same device |
| sessionStorage only | sessionStorage (per-tab) + localStorage (cross-session) | Phase 42 (this phase) | sessionStorage for in-session, localStorage for cross-session persistence |

## Open Questions

1. **Should the "Is this you?" screen auto-focus the "Yes" button?**
   - What we know: Students on Chromebooks may use keyboard navigation
   - Recommendation: Auto-focus "Yes" button so Enter key confirms quickly. This is the happy path.

2. **What happens if the session was ended since the identity was stored?**
   - What we know: `[code]/page.tsx` already checks session status server-side and shows appropriate error messages for archived sessions. Ended sessions still allow viewing results.
   - Recommendation: Let the existing server-side checks handle this. If the server action returns an error, clear the stored identity and fall through to the normal join form error display.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/lib/student/session-store.ts` (sessionStorage pattern)
- Codebase inspection: `src/lib/student/session-identity.ts` (localStorage pattern)
- Codebase inspection: `src/components/student/join-wizard/join-wizard.tsx` (wizard reducer pattern)
- Codebase inspection: `src/actions/student.ts` (server action patterns)
- Codebase inspection: `src/components/student/join-wizard/types.ts` (discriminated union pattern)
- Codebase inspection: `prisma/schema.prisma` (StudentParticipant model)
- MDN Web Docs: localStorage API (synchronous, 5MB limit, same-origin policy, try/catch for security exceptions)

### Secondary (MEDIUM confidence)
- TTL duration reasoning based on US school semester calendar (4-5 months)
- Max entry cap of 50 based on practical usage patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries needed, all patterns established in codebase
- Architecture: HIGH - extends existing wizard reducer pattern with one new step, one new module, one new server action
- Pitfalls: HIGH - identified from codebase analysis of existing storage patterns and the shared-device school context

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable domain, no external dependencies)
