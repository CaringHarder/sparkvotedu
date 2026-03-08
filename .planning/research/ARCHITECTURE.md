# Architecture Research: Student Join Flow Overhaul

**Domain:** Student identity model & join wizard for classroom voting app
**Researched:** 2026-03-08
**Confidence:** HIGH (analysis of existing 55K LOC codebase, all integration points verified)

## Current Architecture Snapshot

### Existing Join Flow (What We Have Today)

```
Student visits /join
    |
    v
JoinForm (code entry) --> /join/[code]
    |
    v
NameEntryForm (first name input)
    |
    v
joinSessionByName() server action
    |
    +--> No duplicate name --> createParticipant() --> /session/{id}/welcome
    |
    +--> Duplicate name --> NameDisambiguation
            |
            +--> "That's me!" --> claimIdentity() --> /session/{id}/welcome
            |
            +--> New name --> joinSessionByName() again
```

### Existing Data Model

```
StudentParticipant
  id:           UUID (primary key)
  firstName:    VARCHAR(50)     -- "David"
  funName:      string          -- "Daring Dragon" (alliterative)
  deviceId:     string | null   -- localStorage UUID
  fingerprint:  string | null   -- FingerprintJS hash
  recoveryCode: string | null   -- 8-char uppercase (nanoid)
  rerollUsed:   boolean         -- one-time reroll flag
  banned:       boolean
  lastSeenAt:   DateTime
  sessionId:    FK -> ClassSession

  @@unique([sessionId, deviceId])
  @@unique([sessionId, funName])
  @@index([sessionId, fingerprint])
  @@index([recoveryCode])
  @@index([sessionId, firstName])
```

### Existing Client-Side Identity

```
sessionStorage (per-tab):
  sparkvotedu_session_{sessionId} = {
    participantId, firstName, funName, sessionId, rerollUsed
  }

localStorage (persistent):
  sparkvotedu_last_session_code = "123456"  (convenience only)
```

### Key Existing Files

| File | Role |
|------|------|
| `src/actions/student.ts` | Server actions: joinSessionByName, claimIdentity, rerollName, recoverIdentity, updateParticipantName, getRecoveryCode |
| `src/lib/dal/student-session.ts` | DAL: findParticipantByDevice/Fingerprint/RecoveryCode/FirstName, createParticipant, rerollParticipantName, updateParticipantDevice, updateFirstName, updateLastSeen, banParticipant, removeParticipant, generateRecoveryCode |
| `src/lib/student/session-store.ts` | Client sessionStorage read/write/update |
| `src/lib/student/fun-names.ts` | Alliterative name generator ("Adjective Animal") |
| `src/lib/student/fun-names-words.ts` | Word lists (ADJECTIVES, ANIMALS by letter) |
| `src/components/student/name-entry-form.tsx` | First name input + disambiguation handoff |
| `src/components/student/name-disambiguation.tsx` | Duplicate name resolution UI |
| `src/components/student/welcome-screen.tsx` | Post-join welcome with countdown |
| `src/components/student/session-header.tsx` | In-session header showing funName badge |
| `src/components/student/reroll-button.tsx` | One-time fun name reroll |
| `src/components/student/recovery-code-dialog.tsx` | Recovery code display |
| `src/components/student/edit-name-dialog.tsx` | Edit first name |
| `src/components/teacher/participation-sidebar.tsx` | Teacher view: student tiles with status dots |
| `src/components/teacher/student-roster.tsx` | Teacher view: student list with presence |
| `src/hooks/use-student-session.ts` | Supabase Realtime Presence hook |
| `src/types/student.ts` | Shared types: JoinResult, StudentParticipantData, etc. |
| `src/app/(student)/join/page.tsx` | Code entry page |
| `src/app/(student)/join/[code]/page.tsx` | Name entry page (validates session server-side) |
| `src/app/(student)/session/[sessionId]/layout.tsx` | Session layout, reads sessionStorage, renders header |
| `src/app/(student)/session/[sessionId]/welcome/page.tsx` | Welcome page |
| `src/lib/realtime/broadcast.ts` | Server-side broadcast via Supabase REST API |

---

## Proposed Architecture: Student Identity Overhaul

### New Identity Model

The core change: **fun name + emoji IS the primary identity**, first name + last initial is teacher-only metadata.

```
StudentParticipant (MODIFIED)
  id:           UUID
  firstName:    VARCHAR(50)     -- EXISTING, repurposed as "first name" only
  lastInitial:  VARCHAR(1)      -- NEW: last initial for teacher reference
  funName:      string          -- EXISTING, becomes primary display identity
  emoji:        string          -- NEW: paired emoji for visual identity
  deviceId:     string | null   -- EXISTING, keep for legacy/migration
  fingerprint:  string | null   -- EXISTING, keep for legacy/migration
  recoveryCode: string | null   -- EXISTING
  rerollUsed:   boolean         -- EXISTING
  banned:       boolean         -- EXISTING
  lastSeenAt:   DateTime        -- EXISTING
  sessionId:    FK              -- EXISTING

  @@unique([sessionId, funName])        -- EXISTING
  @@unique([sessionId, deviceId])       -- EXISTING
  @@index([sessionId, fingerprint])     -- EXISTING
  @@index([recoveryCode])               -- EXISTING
  @@index([sessionId, firstName, lastInitial])  -- NEW: replaces firstName-only index
```

### Schema Migration

```sql
-- Migration: add_emoji_and_last_initial
ALTER TABLE student_participants ADD COLUMN emoji VARCHAR(4);
ALTER TABLE student_participants ADD COLUMN last_initial VARCHAR(1) DEFAULT '';

-- Backfill emoji for existing participants (can be random assignment)
-- Drop old index, create new compound index
DROP INDEX IF EXISTS student_participants_session_id_first_name_idx;
CREATE INDEX student_participants_session_id_first_name_last_initial_idx
  ON student_participants (session_id, first_name, last_initial);
```

**Migration safety:** Both new columns are nullable/defaulted, so zero downtime. Existing participants get emoji backfilled on next interaction or via migration script.

### New Join Flow: 3-Step Wizard

```
/join (code entry - EXISTING, unchanged)
    |
    v
/join/[code] (MODIFIED: becomes wizard host)
    |
    v
Step 1: Name Entry
  "What's your first name?"  +  "Last initial?"
  [David] [R]
  [Next -->]
    |
    v
Step 2: Identity Assignment (NEW)
  "You are..."
  [emoji] [Daring Dragon]
  [Reroll] (one-time)
  [Join Session -->]
    |
    v
  Server: createParticipant() with firstName, lastInitial, funName, emoji
    |
    v
Step 3: Welcome (EXISTING welcome-screen.tsx, modified)
  [emoji] Welcome, Daring Dragon!
  Auto-redirect after 3s
```

### Returning Student Flow (Modified)

```
/join/[code]
    |
    v
Step 1: Name Entry
  "What's your first name?"  +  "Last initial?"
  [David] [R]
  [Next -->]
    |
    v
  Server: findParticipantsByNameAndInitial(sessionId, firstName, lastInitial)
    |
    +--> Exact match (1 result) --> "Welcome back, Daring Dragon!"
    |                                [Rejoin -->]
    |
    +--> No match --> createParticipant() flow (Step 2)
    |
    +--> Multiple matches --> disambiguation (EXISTING pattern, show fun names)
```

---

## Component Architecture

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `JoinWizard` | `src/components/student/join-wizard.tsx` | Multi-step wizard container managing steps 1-2 |
| `NameStep` | `src/components/student/join-wizard/name-step.tsx` | First name + last initial inputs |
| `IdentityStep` | `src/components/student/join-wizard/identity-step.tsx` | Fun name + emoji reveal with reroll |
| `EmojiAvatar` | `src/components/ui/emoji-avatar.tsx` | Reusable emoji display component (consistent sizing/styling) |

### Modified Components

| Component | Changes |
|-----------|---------|
| `name-entry-form.tsx` | **REPLACE** with JoinWizard or gut internals. The current component handles name entry + disambiguation inline. The wizard subsumes this. |
| `name-disambiguation.tsx` | **MODIFY** to work with firstName + lastInitial matching instead of firstName alone. Show emoji + funName for candidates. |
| `welcome-screen.tsx` | **MODIFY** to show emoji alongside fun name. Minor prop addition. |
| `session-header.tsx` | **MODIFY** to show emoji before fun name badge. |
| `participation-sidebar.tsx` | **MODIFY** to add name display toggle (fun name vs real name) and show emoji. |
| `student-roster.tsx` | **MODIFY** to show emoji. |
| `session-store.ts` | **MODIFY** to add emoji and lastInitial to stored data. |

### Unchanged Components

| Component | Why Unchanged |
|-----------|---------------|
| `join-form.tsx` (code entry) | Code entry is step 0, fully decoupled from identity |
| `reroll-button.tsx` | API unchanged, just triggers rerollName server action |
| `recovery-code-dialog.tsx` | Recovery code mechanism unchanged |
| `broadcast.ts` | Broadcast payloads don't include identity details |

---

## Data Flow Changes

### Current Join Data Flow

```
Client                          Server Action                    DAL                          DB
------                          -------------                    ---                          --
NameEntryForm
  |-- joinSessionByName({code, firstName})
                                  |-- findSessionByCode()
                                  |-- findParticipantsByFirstName()
                                  |   (duplicates? return candidates)
                                  |-- createParticipant()
                                  |   |-- generateFunName()         --> INSERT
                                  |-- broadcastParticipantJoined()
  <-- JoinResult {participant, session}
  |
  setSessionParticipant() --> sessionStorage
  |
  router.push(/session/{id}/welcome)
```

### New Join Data Flow

```
Client                          Server Action                    DAL                          DB
------                          -------------                    ---                          --
JoinWizard (Step 1: NameStep)
  |-- lookupStudent({code, firstName, lastInitial})     <-- NEW server action
                                  |-- findSessionByCode()
                                  |-- findByNameAndInitial()        <-- NEW DAL function
                                  |   @@index([sessionId, firstName, lastInitial])
  <-- LookupResult
      | {match: participant}     --> skip to welcome (returning)
      | {noMatch: true}         --> proceed to Step 2
      | {ambiguous: candidates} --> disambiguation

JoinWizard (Step 2: IdentityStep)
  |-- createStudent({code, firstName, lastInitial})     <-- NEW server action
                                  |-- createParticipant()
                                  |   |-- generateFunName()
                                  |   |-- pickEmoji()               <-- NEW
                                  |                                 --> INSERT
                                  |-- broadcastParticipantJoined()
  <-- JoinResult {participant with emoji}
  |
  setSessionParticipant() --> sessionStorage + localStorage (multi-session)
  |
  router.push(/session/{id}/welcome)
```

### localStorage Multi-Session Persistence (NEW)

```
Current:
  sessionStorage: sparkvotedu_session_{sessionId} = {...}  (per-tab, dies on close)
  localStorage:   sparkvotedu_last_session_code = "123456" (just convenience)

New:
  sessionStorage: sparkvotedu_session_{sessionId} = {...}  (KEEP for active tab)
  localStorage:   sparkvotedu_sessions = {                 (NEW: persistent multi-session)
    "{sessionId}": {
      participantId: "uuid",
      firstName: "David",
      lastInitial: "R",
      funName: "Daring Dragon",
      emoji: "[emoji]",
      sessionId: "uuid",
      joinedAt: "ISO timestamp",
      lastActiveAt: "ISO timestamp"
    },
    "{sessionId2}": { ... }
  }
```

**Auto-rejoin flow:**
1. Student visits `/join/[code]`
2. Before showing name form, check `localStorage.sparkvotedu_sessions[sessionIdForCode]`
3. If found, verify participant still exists server-side (not banned, session not archived)
4. If valid, skip wizard entirely and redirect to session

**Cleanup:** Entries older than 30 days are pruned on read. Sessions that are archived/ended can be pruned eagerly.

### Cross-Device Reclaim (Modified)

The existing recovery code mechanism stays. The new addition is name+initial matching as a simpler reclaim path:

```
New device, same session:
  1. Enter first name + last initial
  2. Server finds match by (sessionId, firstName, lastInitial)
  3. If unique match: "Welcome back, Daring Dragon!" + update deviceId
  4. If multiple: disambiguation by fun name (existing pattern)
  5. If no match: new participant
```

Recovery codes remain as the explicit cross-device mechanism for when name matching fails or is ambiguous.

---

## Emoji System

### Design Decision: Curated Pool, Not User-Selected

Emojis should be **auto-assigned from a curated pool** that matches the fun name theme, not user-selected. This prevents inappropriate selections and maintains the playful-anonymous vibe.

### Implementation

```typescript
// src/lib/student/emoji-pool.ts

// ~50-80 kid-friendly animal/nature emojis
const EMOJI_POOL = [
  // Animals (matching fun-names theme)
  '\u{1F98A}', // fox
  '\u{1F43B}', // bear
  '\u{1F427}', // penguin
  '\u{1F98E}', // lizard
  '\u{1F40A}', // crocodile
  '\u{1F985}', // eagle
  // Nature
  '\u{2B50}',  // star
  '\u{1F308}', // rainbow
  '\u{26A1}',  // lightning
  // etc.
]

export function pickEmoji(existingEmojis: Set<string>): string {
  // Try to pick unique within session, fall back to any
  const available = EMOJI_POOL.filter(e => !existingEmojis.has(e))
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)]
  }
  return EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)]
}
```

**Alternative considered:** Letter-matched emojis (dragon for "D" names). Rejected because the ANIMALS word list already provides thematic identity; the emoji is a visual anchor, not a semantic one.

### Emoji in Presence Channel

The Supabase Presence state should include the emoji for teacher-side display:

```typescript
// Modified useSessionPresence
channel.track({
  funName,
  emoji,        // NEW
  joinedAt: new Date().toISOString(),
})
```

---

## Teacher Sidebar Toggle

### Current Sidebar Behavior

The `ParticipationSidebar` shows:
- Fun name (primary text)
- First name (small text below, if available)
- Status dot (green=voted, blue=connected, gray=disconnected)

### New Toggle: "Show Real Names"

```
Teacher clicks toggle:
  OFF (default): Show emoji + fun name per tile
  ON:            Show emoji + first name + last initial per tile
```

**Implementation approach:** Add a `displayMode: 'fun' | 'real'` state to the sidebar. The participant data already includes both `funName` and `firstName`. The toggle just switches which field renders as primary text.

```typescript
// Modified ParticipationSidebar props
interface ParticipationSidebarProps {
  participants: Array<{
    id: string
    funName: string
    emoji: string        // NEW
    firstName?: string
    lastInitial?: string // NEW
  }>
  // ... existing props
  displayMode: 'fun' | 'real'           // NEW
  onDisplayModeToggle: () => void        // NEW
}
```

**Privacy consideration:** The toggle state should NOT persist to the database. It is a client-side teacher preference stored in component state (resets each page load) or teacher-side localStorage. Default is always "fun names" to protect student privacy by default.

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Impact |
|----------|---------------|--------|
| JoinWizard <-> Server Actions | New `lookupStudent` + modified `createStudent` actions | 2 new server actions, 1 modified |
| session-store.ts <-> localStorage | New multi-session persistence layer | Additive, backward-compatible |
| ParticipationSidebar <-> parent | New displayMode prop + toggle callback | Parent component needs state management |
| Presence channel | Emoji added to tracked state | Non-breaking, additive payload |
| StudentRoster <-> DAL | Emoji + lastInitial in query results | DAL select clauses need update |

### External Services

| Service | Integration Pattern | Changes |
|---------|---------------------|---------|
| Supabase Realtime (Presence) | Track emoji in presence state | Additive field in track() payload |
| Supabase Realtime (Broadcast) | No changes | Broadcast events do not carry identity |
| Prisma | Schema migration for 2 new columns | Standard additive migration |

---

## Architectural Patterns

### Pattern 1: Wizard State Machine (New)

**What:** Multi-step join form managed as a local state machine with explicit transitions.
**When to use:** The 3-step join flow (name -> identity reveal -> welcome).
**Trade-offs:** More code than single-form, but clear step boundaries, back-navigation support, and each step can independently validate.

```typescript
type WizardStep = 'name' | 'identity' | 'complete'

interface WizardState {
  step: WizardStep
  firstName: string
  lastInitial: string
  participant: StudentParticipantData | null
  returning: boolean
}
```

**Why not a route-per-step?** The wizard is fast (2-3 seconds total), has no deep-linkable steps, and shares state between steps. Client-side state machine is simpler than route-based wizard with URL state.

### Pattern 2: Layered Storage (Existing, Extended)

**What:** sessionStorage for active-tab identity, localStorage for persistence across sessions.
**When to use:** Student identity persistence.
**Trade-offs:** Two storage layers adds complexity but solves the multi-tab bleeding bug (sessionStorage) while enabling auto-rejoin (localStorage).

```
Read priority:
  1. sessionStorage (authoritative for current tab)
  2. localStorage (fallback for returning students on new tab)
  3. Server lookup by name+initial (fallback for cleared storage)
```

### Pattern 3: Server-Side Validation Gate (Existing, Keep)

**What:** The `/join/[code]/page.tsx` server component validates the session exists before rendering the client form.
**When to use:** Always. Prevents rendering forms for invalid/expired/archived sessions.
**Trade-offs:** Extra server round-trip, but prevents wasted client-side work and invalid submissions.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Emoji in localStorage Display String

**What people do:** Store `"[emoji] Daring Dragon"` as a combined display string.
**Why it's wrong:** Makes parsing fragile (emoji are variable-width), breaks the toggle between fun name and real name views.
**Do this instead:** Store emoji and funName as separate fields. Compose display strings in the render layer.

### Anti-Pattern 2: Making the Wizard Route-Based

**What people do:** Create `/join/[code]/step-1`, `/join/[code]/step-2` routes.
**Why it's wrong:** The wizard is ephemeral (3 seconds), does not need deep links, and route-based adds server component overhead for each step. Browser back button would break the flow.
**Do this instead:** Single client component with internal step state.

### Anti-Pattern 3: Querying All Participants to Check Uniqueness

**What people do:** `SELECT * FROM participants WHERE sessionId = X` and filter client-side.
**Why it's wrong:** Unnecessary data transfer. A class of 30 students is fine; but the pattern scales poorly and wastes bandwidth.
**Do this instead:** Use targeted index queries: `@@index([sessionId, firstName, lastInitial])` with `findFirst` or `findMany` with the specific columns.

### Anti-Pattern 4: Persisting Display Mode Toggle to Database

**What people do:** Add a `displayMode` column to the Teacher model.
**Why it's wrong:** This is a transient UI preference, not a data model concern. It adds migration overhead for zero benefit.
**Do this instead:** Component state or teacher-side localStorage.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-200 students/session | Current architecture is fine. All queries hit indexed columns. |
| 200-1000 students/session | Emoji uniqueness pool (80 emojis) will repeat. This is fine -- emojis are visual anchors, not unique identifiers. Fun names remain unique per session via `@@unique([sessionId, funName])`. |
| 1000+ students/session | Fun name generation may need more attempts (word list combinatorics). Current MAX_ATTEMPTS=100 might need increase. Consider prefixed fun names ("Group A: Daring Dragon"). |

### First Bottleneck: localStorage Size

With multi-session persistence, localStorage accumulates entries. A student joining 10 sessions stores ~5KB. With 100 sessions over a year, ~50KB. This is well within the 5MB localStorage limit, but implement the 30-day pruning to keep it tidy.

### Second Bottleneck: Presence Channel Size

Supabase Presence tracks all connected users. Adding emoji (4 bytes) to each presence record is negligible. The bottleneck remains Supabase's presence limit of ~200-500 concurrent trackers per channel (documented Supabase limitation).

---

## Suggested Build Order

Based on dependency analysis, build in this order:

### Phase 1: Schema + DAL (Foundation)

1. Prisma migration: add `emoji` and `last_initial` columns
2. New DAL function: `findByNameAndInitial(sessionId, firstName, lastInitial)`
3. Emoji pool module: `src/lib/student/emoji-pool.ts`
4. Modify `createParticipant()` to accept lastInitial and auto-assign emoji
5. Update types: `StudentParticipantData`, `JoinResult`, `SessionParticipantStore`

**Why first:** Everything else depends on the data model and DAL being ready.

### Phase 2: Server Actions (Business Logic)

1. New action: `lookupStudent({code, firstName, lastInitial})` -- checks for returning student
2. Modify `joinSessionByName` or create `createStudent` action for wizard step 2
3. Update `claimIdentity` to return emoji
4. Update `toParticipantData` helper to include emoji and lastInitial

**Why second:** UI components need server actions to function.

### Phase 3: Join Wizard UI (Student-Facing)

1. Build `JoinWizard` container with step state machine
2. Build `NameStep` (first name + last initial inputs)
3. Build `IdentityStep` (fun name + emoji reveal, reroll)
4. Modify `NameDisambiguation` for name+initial matching
5. Wire into `/join/[code]/page.tsx` replacing NameEntryForm

**Why third:** Depends on schema + actions.

### Phase 4: localStorage Persistence (Auto-Rejoin)

1. Extend `session-store.ts` with localStorage multi-session layer
2. Add auto-rejoin check in JoinWizard (before showing step 1)
3. Add 30-day pruning logic
4. Add server-side validation of localStorage-cached participant

**Why fourth:** Join wizard must work without persistence first. Persistence is an enhancement.

### Phase 5: Teacher Sidebar Toggle + Emoji Display

1. Add `EmojiAvatar` component
2. Modify `ParticipationSidebar` to show emoji + toggle
3. Modify `StudentRoster` to show emoji
4. Modify `SessionHeader` to show emoji alongside fun name
5. Update Presence hook to track emoji

**Why last:** Teacher-facing changes are display-only, no data dependencies.

---

## Cross-Device Reclaim Detail

The existing recovery code mechanism (`recoveryCode` column, `findParticipantByRecoveryCode` DAL function, `recoverIdentity` server action) is already solid. The new name+initial matching is an **easier path** for the common case:

```
Scenario: Student used school iPad yesterday, using personal phone today.

With name+initial:
  1. Enter same first name + last initial
  2. Server finds match -> "Welcome back, Daring Dragon!"
  3. Student confirms -> identity reclaimed

With recovery code (existing, still available):
  1. Student taps "Recovery code" link
  2. Enters 8-char code from previous device
  3. Identity transferred to new device
```

**Security consideration:** Name+initial matching is weaker than recovery codes (anyone knowing your name+initial could claim your identity). This is acceptable because:
- K-12 classroom setting, not a banking app
- Teacher can see and manage all participants
- Fun names are the visible identity, not real names
- A student claiming the wrong identity gains nothing (no grades, no PII)

---

## Sources

- Codebase analysis: All file paths verified against actual `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/` directory
- Prisma schema: `prisma/schema.prisma` (current production schema)
- Supabase Realtime Presence limits: documented at ~200-500 concurrent trackers per channel (MEDIUM confidence, from Supabase documentation)
- localStorage limits: 5MB per origin (HIGH confidence, web platform standard)
- sessionStorage isolation: per-tab, per-origin (HIGH confidence, web platform standard)

---
*Architecture research for: Student Join Flow Overhaul*
*Researched: 2026-03-08*
