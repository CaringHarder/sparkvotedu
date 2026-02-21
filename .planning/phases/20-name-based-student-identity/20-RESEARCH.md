# Phase 20: Name-Based Student Identity - Research

**Researched:** 2026-02-21
**Domain:** Student identity management, join/rejoin flows, name disambiguation, fun-name anonymity
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Two-step flow: enter session code first, then name on second screen
- Minimum name length: 2 characters
- Brief welcome screen after joining showing fun name assignment (e.g., "Welcome, Speedy Penguin!") before entering the session
- Name validation already built in Phase 19 (profanity filter, emoji rejection, Unicode support)
- When a name is already taken, ask "Is this you?" before assuming it's a new person
- If student says "yes, that's me" -- treat as rejoin (Claude decides confirmation approach)
- If student says "no, different person" -- prompt to differentiate (Claude decides method: last initial, free-form edit, etc.)
- Same flow applies for 3+ duplicates: third "Jake" sees all existing Jakes listed, can claim one or differentiate as new
- All previous votes, bracket picks, and poll responses are fully preserved on rejoin
- Same-device rejoin: auto-fill session code from localStorage; different device: full two-step flow
- If session has ended: show final results/standings rather than just "session ended" message
- Fun names used everywhere students see names (brackets, polls, leaderboards) -- real name is never shown to other students
- Teacher dashboard shows mapping: "Speedy Penguin (Jake M)" in participant list so teacher knows who's who
- Students see only their fun name once assigned -- no display of their real name in the student UI

### Claude's Discretion
- Name entry screen design (whether to show session info/teacher name)
- Differentiation method for duplicate names (last initial prompt vs free-form edit)
- Rejoin confirmation approach (instant vs show context)
- Rejoin landing destination (current activity vs session lobby)
- Edit name UI placement (header vs settings)
- Fun name generation algorithm/word lists
- Welcome screen duration/animation

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Summary

Phase 20 replaces the device-fingerprint-based student identity system with a first-name-based identity system. The schema changes already landed in Phase 19 (`first_name VARCHAR(50)` column, nullable `device_id`, index on `(session_id, first_name)`), and first-name validation (profanity filter, emoji rejection, 2-50 char length) is already implemented in `src/lib/validations/first-name.ts`. The core work is rewiring the join flow, building the duplicate-name disambiguation UI, updating the teacher dashboard to show real-name mappings, and adding name-edit capability.

The current flow is: student enters 6-digit code -> `joinSession` server action looks up by `deviceId` (primary) then `fingerprint` (secondary) -> creates new participant if neither matches -> routes to welcome screen. Phase 20 transforms this to: student enters code -> validates session exists -> name entry screen -> server checks for name match (case-insensitive) -> disambiguation if duplicate -> creates/rejoins participant -> welcome screen showing fun name.

The existing codebase has all the right building blocks in place. The fun name system (`src/lib/student/fun-names.ts` with alliterative "Adjective Animal" generation) is fully functional. The welcome screen component (`src/components/student/welcome-screen.tsx`) already handles both new and returning student UX with Motion (Framer Motion) animations. The key transformation is removing `deviceId`/`fingerprint` as primary identity and making `firstName` the lookup key, with localStorage still used for session code auto-fill and local session state caching.

**Primary recommendation:** Build the name-based join flow as a multi-step client-side form that calls new server actions, reusing the existing validation module and fun-name generator. Keep `deviceId` in localStorage for session code auto-fill but remove it as the identity mechanism.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router, Server Actions, route groups | Framework |
| React | 19.2.3 | UI components, hooks | UI layer |
| Zod | 4.3.6 | Input validation (firstNameSchema already built) | Validation |
| Prisma | 7.3.0 | ORM, migrations, type-safe queries | Data layer |
| Motion | 12.29.2 | Welcome screen animations (already used) | Animations |
| @2toad/profanity | 3.2.0 | Profanity filter (already configured) | Content safety |
| @supabase/supabase-js | 2.93.3 | Realtime Presence for connected status | Realtime |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | 5.1.6 | Recovery code generation | Recovery codes still work |
| @fingerprintjs/fingerprintjs | 5.0.1 | Browser fingerprint (being deprecated as identity) | May keep for analytics but not identity |

### No New Dependencies Required
This phase requires zero new npm packages. Everything needed is already installed.

## Architecture Patterns

### Current File Structure (Relevant to Phase 20)
```
src/
  actions/
    student.ts           # joinSession, rerollName, getRecoveryCode, recoverIdentity
    class-session.ts     # Teacher-facing session actions
  lib/
    dal/
      student-session.ts # findParticipantByDevice, createParticipant, etc.
      class-session.ts   # findActiveSessionByCode, getSessionWithParticipants
    student/
      session-identity.ts # localStorage deviceId management
      fingerprint.ts      # FingerprintJS wrapper
      fun-names.ts        # generateFunName
      fun-names-words.ts  # ADJECTIVES/ANIMALS word lists
    validations/
      first-name.ts       # firstNameSchema, validateFirstName (ALREADY BUILT)
  hooks/
    use-device-identity.ts # useDeviceIdentity hook (being replaced)
    use-student-session.ts # useSessionPresence (Realtime Presence)
  types/
    student.ts            # DeviceIdentity, JoinResult, StudentParticipantData
  components/student/
    join-form.tsx          # Current single-step code entry
    home-join-input.tsx    # Homepage quick-join input
    welcome-screen.tsx     # Post-join fun name reveal
    session-header.tsx     # Shows fun name + settings dropdown
    reroll-button.tsx      # Single-use name change
    recovery-code-dialog.tsx # Recovery code display
  app/(student)/
    join/page.tsx          # Join page with JoinForm
    join/[code]/page.tsx   # Direct join with pre-filled code
    session/[sessionId]/
      layout.tsx           # Session layout, localStorage identity check
      page.tsx             # Session main page (ActivityGrid)
      welcome/page.tsx     # Welcome page wrapper
```

### Pattern 1: Two-Step Join Flow (New)
**What:** Replace the single JoinForm component with a multi-step flow: Step 1 (code entry) -> Step 2 (name entry + disambiguation)
**When to use:** This is the core user flow change
**Implementation approach:**
```
Step 1: Session Code Entry
  - Student enters 6-digit code
  - Server validates session exists and is active
  - On success, route to /join/[code]/name (new route)
  - localStorage auto-fill: check sparkvotedu_last_session_code

Step 2: Name Entry + Disambiguation
  - Input field with firstNameSchema validation
  - On submit: server action checks for case-insensitive name match
  - If no match: create participant, assign fun name, go to welcome
  - If match(es) found: show "Is this you?" disambiguation UI
  - Student picks "That's me" (rejoin) or "I'm someone new" (differentiate)
```

### Pattern 2: Case-Insensitive Name Lookup (DAL)
**What:** Query `student_participants` with case-insensitive match on `first_name` within a session
**When to use:** Every join attempt after name entry
**Implementation approach:**
```typescript
// Use Prisma's mode: 'insensitive' for case-insensitive matching
// The @@index([sessionId, firstName]) already exists from Phase 19
export async function findParticipantsByFirstName(
  sessionId: string,
  firstName: string
) {
  return prisma.studentParticipant.findMany({
    where: {
      sessionId,
      firstName: { equals: firstName, mode: 'insensitive' },
      banned: false,
    },
  })
}
```
**Key detail:** Prisma's `mode: 'insensitive'` works with PostgreSQL's `ILIKE`. The existing `@@index([sessionId, firstName])` index supports this query pattern. PostgreSQL's default `btree` index doesn't support case-insensitive lookups natively, but the query volume (classroom scale, <50 students) makes this a non-issue for performance.

### Pattern 3: Teacher Dashboard Name Mapping
**What:** Show "Speedy Penguin (Jake M)" in the teacher participant list
**When to use:** Every teacher-facing participant display
**Implementation approach:**
- Add `firstName` to the `getSessionWithParticipants` select/serialize
- Modify `StudentRoster` to display `{p.funName} ({p.firstName})` format
- Modify `ParticipationSidebar` to show both names
- The `getSessionWithParticipants` server action already serializes participants; just add `firstName` to the returned data

### Pattern 4: localStorage Session-Code Auto-Fill
**What:** Store last-used session code in localStorage for same-device return
**When to use:** When student returns to /join on the same device
**Implementation approach:**
```typescript
// On successful join:
localStorage.setItem('sparkvotedu_last_session_code', code)

// On join page load:
const lastCode = localStorage.getItem('sparkvotedu_last_session_code')
// Auto-fill but don't auto-submit (student may want different session)
```
**Note:** Fail-silent if localStorage unavailable (consistent with Phase 19 banner approach).

### Pattern 5: Name Edit After Join
**What:** Allow student to edit their first name after joining
**When to use:** Typo correction or preference change
**Placement recommendation (discretion area):** Add to session header settings dropdown (alongside existing Reroll and Recovery Code options). This is consistent with the existing UX pattern -- the settings gear icon in the header already has a dropdown.
**Implementation:** New server action `updateParticipantName` that validates the new name, checks for duplicates (same as join flow), and updates the `firstName` column. If the new name collides with an existing participant, show disambiguation.

### Anti-Patterns to Avoid
- **Don't use `LOWER()` in SQL directly:** Use Prisma's `mode: 'insensitive'` instead. Direct SQL would bypass Prisma's type safety.
- **Don't store lowercased names:** The prior decision says "Preserve name casing as entered -- no auto-capitalize; case-insensitive matching at lookup time." Store "Jake" not "jake".
- **Don't remove deviceId from localStorage entirely:** It's still useful for session code auto-fill and the `sparkvotedu_session_{id}` local cache that the session layout reads. Just stop using it as the identity mechanism.
- **Don't break the existing `@@unique([sessionId, deviceId])` constraint:** Since `deviceId` is now nullable, PostgreSQL treats each NULL as distinct in unique constraints. Multiple participants with NULL deviceId won't violate the constraint. But the `findParticipantByDevice` function will need to handle null deviceId gracefully.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Name validation | Custom regex validation | `firstNameSchema` from `src/lib/validations/first-name.ts` | Already handles trim, whitespace collapse, length, emoji rejection, profanity |
| Fun name generation | New name generator | `generateFunName` from `src/lib/student/fun-names.ts` | Already handles uniqueness within session, alliterative pattern, collision fallback |
| Case-insensitive search | `LOWER()` SQL functions | Prisma `mode: 'insensitive'` | Type-safe, portable, already supported |
| Profanity detection | Word list matching | `@2toad/profanity` (already configured in first-name.ts) | Handles word boundaries, whitelist for legitimate names |
| Animation | CSS-only transitions | Motion (Framer Motion) already used in welcome-screen.tsx | Consistent with existing UX, spring physics, reduced motion support |
| Session presence tracking | Polling for online status | `useSessionPresence` hook (already built) | Uses Supabase Realtime Presence channel |

**Key insight:** Phase 19 already laid the groundwork -- schema changes, first-name validation, profanity filter, nullable deviceId. Phase 20 is primarily a UI flow rewrite and server action refactor, not a from-scratch build.

## Common Pitfalls

### Pitfall 1: Unique Constraint on (sessionId, deviceId) with Null DeviceId
**What goes wrong:** The `@@unique([sessionId, deviceId])` constraint exists in the schema. When Phase 20 stops requiring deviceId, multiple participants may have NULL deviceId in the same session. In PostgreSQL, NULL != NULL in unique constraints, so this won't cause constraint violations -- but code that calls `findParticipantByDevice` with a NULL deviceId would get unexpected results.
**Why it happens:** The Prisma `findUnique` on `sessionId_deviceId` compound key doesn't work with null values in the composite.
**How to avoid:** Stop using `findParticipantByDevice` as the primary lookup. The new primary lookup is `findParticipantsByFirstName`. Keep deviceId in the schema (prior decision: additive migration, no destructive changes) but make it a secondary convenience signal, not a required identity key.
**Warning signs:** Prisma runtime errors when passing null to a unique compound key lookup.

### Pitfall 2: Race Condition in Name Claim
**What goes wrong:** Two students named "Jake" submit at the exact same time, and both pass the "no existing Jake" check, creating duplicate participants with the same name.
**Why it happens:** The check-then-create pattern has a TOCTOU window.
**How to avoid:** This is a classroom-scale application (24-30 students). The probability of two students with the same name submitting within the same millisecond is effectively zero. A simple application-level check is sufficient. If paranoia is needed, wrap the check + create in a Prisma transaction with serializable isolation, but this is likely over-engineering for the use case.
**Warning signs:** Two identical-name participants in the same session without the disambiguation flow having been triggered.

### Pitfall 3: Name Edit Breaks Teacher Dashboard Mapping
**What goes wrong:** Student edits their name from "Jake" to "Jacob", but the teacher dashboard still shows the old mapping.
**Why it happens:** The teacher dashboard loads participant data on page load and may cache it.
**How to avoid:** Use `router.refresh()` pattern already used in session management. The teacher's `getSessionWithParticipants` server function re-queries on every load. For real-time updates, the Supabase Presence channel broadcasts funName (not firstName), so the teacher roster will reflect connected status correctly. The firstName mapping updates on next refresh.
**Warning signs:** Stale name shown in teacher dashboard after student edits.

### Pitfall 4: "Is This You?" Flow Allows Identity Hijacking
**What goes wrong:** A student claims to be "Jake" (returning) and gains access to Jake's votes and bracket picks.
**Why it happens:** In a classroom, names are semi-public. Anyone could type "Jake" and claim the returning identity.
**How to avoid:** This is an acceptable tradeoff for the classroom context (prior decision: first-name identity over device fingerprint). The teacher is present and can see who claims which identity. For additional friction, consider showing the fun name of the existing participant in the "Is this you?" prompt -- if the real Jake sees their fun name, they know to claim it. An impersonator wouldn't know the fun name to expect.
**Warning signs:** A student ends up with another student's votes. Mitigation: teacher can remove/ban the impersonator.

### Pitfall 5: localStorage Auto-Fill on Shared Devices
**What goes wrong:** Student A uses a shared Chromebook, joins as "Alice". Student B uses the same Chromebook later, and the join form auto-fills with Alice's session code.
**Why it happens:** localStorage persists across users on the same Chrome profile.
**How to avoid:** Auto-fill the session code only, never auto-submit. The name entry step (Step 2) is a natural barrier -- Student B will type their own name. If the same session code is valid, they enter as themselves. The `sparkvotedu_session_{id}` localStorage entry from Alice won't affect Bob because the name-based identity lookup will create a new participant.
**Warning signs:** None expected -- the two-step flow naturally handles this.

### Pitfall 6: Ended Session Rejoin Shows Blank Screen
**What goes wrong:** Student tries to rejoin a session that has ended and sees nothing useful.
**Why it happens:** The `findActiveSessionByCode` function only returns sessions with `status: 'active'`.
**How to avoid:** Per the locked decision, ended sessions should show final results/standings. Create a new lookup function `findSessionByCode` (without status filter) or extend the existing one. When session status is 'ended', route to a results view instead of the normal session flow.
**Warning signs:** "Invalid or expired class code" error when entering a valid but ended session code.

## Code Examples

### Example 1: Name-Based Join Server Action (New)
```typescript
// src/actions/student.ts -- new or modified

const joinByNameSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Class code must be exactly 6 digits'),
  firstName: firstNameSchema, // from src/lib/validations/first-name.ts
})

export async function joinSessionByName(input: {
  code: string
  firstName: string
}): Promise<JoinResult> {
  const parsed = joinByNameSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { code, firstName } = parsed.data

  // Find session (active or ended for results view)
  const session = await findActiveSessionByCode(code)
  if (!session) {
    return { error: 'Invalid or expired class code' }
  }

  // Case-insensitive name lookup
  const existing = await findParticipantsByFirstName(session.id, firstName)

  if (existing.length === 0) {
    // New student -- create participant
    const participant = await createParticipant(session.id, null, undefined, firstName)
    return {
      participant: toParticipantData(participant),
      session: toSessionInfo(session),
      returning: false,
    }
  }

  // Duplicate name -- return candidates for disambiguation
  return {
    duplicates: existing.map(p => ({
      id: p.id,
      funName: p.funName,
      // Don't expose full details, just enough for "Is this you?"
    })),
    session: toSessionInfo(session),
  }
}
```

### Example 2: Disambiguation Claim Action
```typescript
export async function claimIdentity(
  participantId: string,
  sessionCode: string
): Promise<JoinResult> {
  const participant = await prisma.studentParticipant.findUnique({
    where: { id: participantId },
    include: { session: { include: { teacher: { select: { name: true } } } } },
  })

  if (!participant || participant.banned) {
    return { error: 'Cannot rejoin as this student' }
  }

  // Update lastSeenAt for rejoin
  await prisma.studentParticipant.update({
    where: { id: participantId },
    data: { lastSeenAt: new Date() },
  })

  return {
    participant: toParticipantData(participant),
    session: toSessionInfo(participant.session),
    returning: true,
  }
}
```

### Example 3: Case-Insensitive Name Query (DAL)
```typescript
// src/lib/dal/student-session.ts -- new function

export async function findParticipantsByFirstName(
  sessionId: string,
  firstName: string
) {
  return prisma.studentParticipant.findMany({
    where: {
      sessionId,
      firstName: { equals: firstName, mode: 'insensitive' },
      banned: false,
    },
    select: {
      id: true,
      firstName: true,
      funName: true,
    },
  })
}
```

### Example 4: Teacher Display Format
```typescript
// In teacher-facing components:
// Format: "Speedy Penguin (Jake M)"
<span>{p.funName} ({p.firstName})</span>
```

### Example 5: Session Code Auto-Fill (localStorage)
```typescript
// On successful join, store last session code
try {
  localStorage.setItem('sparkvotedu_last_session_code', code)
} catch {
  // Fail-silent per Phase 19 pattern
}

// On join page load, read it
const lastCode = (() => {
  try {
    return localStorage.getItem('sparkvotedu_last_session_code') ?? ''
  } catch {
    return ''
  }
})()
```

## Discretion Area Recommendations

### 1. Name Entry Screen Design
**Recommendation:** Show session info (teacher name and session name if available). The session was already validated in Step 1, so we have this data. Display: "Joining [Teacher Name]'s class" or "Joining [Session Name]" above the name input. This matches the pattern already used on the welcome screen (line 149 of welcome-screen.tsx: `{teacherName}'s class`).

### 2. Differentiation Method for Duplicate Names
**Recommendation:** Free-form text edit. When student says "I'm someone different," show the name input pre-filled with their entry and prompt "Add something to make your name unique (like a last initial)." This is simpler than a structured "enter your last initial" approach and handles edge cases like "Jake from Period 3" or "Jake B" naturally. The existing `firstNameSchema` validates the result.

### 3. Rejoin Confirmation Approach
**Recommendation:** Show fun name context. When a returning "Jake" taps "That's me" on one of the listed Jakes, show the fun name: "You'll rejoin as Speedy Penguin. Is that right?" with Confirm/Back buttons. This gives the student a chance to verify they're claiming the right identity (especially with 3+ Jakes) and prevents accidental identity hijacking without adding complex verification.

### 4. Rejoin Landing Destination
**Recommendation:** Session lobby (activity grid). The existing welcome screen already handles returning students with a "Welcome back!" message and "Rejoin Session" button that goes to the session page. This is consistent and avoids the complexity of tracking which activity the student was last viewing.

### 5. Edit Name UI Placement
**Recommendation:** Add to the session header settings dropdown (the gear icon), alongside the existing "New Name" (reroll) and "Recovery Code" options. Add an "Edit Name" option that opens a dialog similar to the recovery code dialog. This keeps the UI clean and doesn't add visual clutter to the header bar. The edit dialog reuses `firstNameSchema` for validation and runs the same disambiguation check on the new name.

### 6. Fun Name Generation Algorithm
**Recommendation:** Keep the existing `generateFunName` algorithm unchanged. It already produces unique alliterative "Adjective Animal" names (e.g., "Speedy Penguin", "Daring Dragon") with 100-attempt collision avoidance and a numeric fallback. The word lists have 15-25 adjectives and 10-20 animals per letter (26 letters), giving thousands of unique combinations per session. No changes needed.

### 7. Welcome Screen Duration/Animation
**Recommendation:** Keep the existing 3-second countdown for new students and the "Rejoin Session" button for returning students. The Motion (Framer Motion) spring animations already handle reduced-motion preferences. No changes to animation approach needed -- just update the text to show the real-name-to-fun-name mapping: "You're now Speedy Penguin!" instead of just showing the fun name.

## State of the Art

| Old Approach (Current) | New Approach (Phase 20) | Impact |
|------------------------|-------------------------|--------|
| deviceId (localStorage UUID) as primary identity | firstName as primary identity | Students can join from any device |
| fingerprint (FingerprintJS) as secondary identity | Removed as identity mechanism | Simplifies code, removes dependency on browser APIs |
| Auto-join on code entry (no name required) | Two-step: code then name | More intuitive, matches Kahoot/Quizziz pattern |
| Fun name shown everywhere, no real name mapping | Teacher sees "Fun Name (Real Name)" | Teacher knows who is who |
| No disambiguation needed (device is unique) | "Is this you?" duplicate name flow | Handles classroom reality of same names |
| deviceId required in createParticipant | deviceId null in createParticipant | Schema supports this (Phase 19 made nullable) |

**Deprecated/outdated:**
- `useDeviceIdentity` hook: Will be significantly reduced in role. Still useful for localStorage operations but no longer the primary identity source.
- `findParticipantByDevice` / `findParticipantByFingerprint`: No longer primary lookup paths. The primary path becomes `findParticipantsByFirstName`.
- `recoverIdentity` server action: The recovery code mechanism becomes less important when identity is name-based (students can rejoin by typing their name). Consider keeping for backward compatibility but it's no longer the primary rejoin path.

## Files to Modify (Change Map)

### Must Change
| File | Change |
|------|--------|
| `src/actions/student.ts` | Replace `joinSession` with `joinSessionByName`; add `claimIdentity` and `updateName` actions |
| `src/lib/dal/student-session.ts` | Add `findParticipantsByFirstName`; modify `createParticipant` signature (deviceId optional) |
| `src/components/student/join-form.tsx` | Rewrite as Step 1 (code only); or create new multi-step component |
| `src/types/student.ts` | Add `firstName` to `StudentParticipantData`; add `duplicates` to `JoinResult`; update `DeviceIdentity` |
| `src/app/(student)/join/[code]/page.tsx` | Add name entry step (new route or component) |
| `src/components/student/welcome-screen.tsx` | Update text to show real-name-to-fun-name mapping |
| `src/components/student/session-header.tsx` | Add "Edit Name" to settings dropdown |
| `src/components/teacher/student-roster.tsx` | Show "Fun Name (Real Name)" format |
| `src/components/teacher/participation-sidebar.tsx` | Show "Fun Name (Real Name)" format |
| `src/app/(dashboard)/sessions/[sessionId]/page.tsx` | Add firstName to participant serialization |
| `src/app/(dashboard)/sessions/[sessionId]/session-detail.tsx` | Add firstName to ParticipantData interface |
| `src/actions/class-session.ts` | Add firstName to getSessionWithParticipants response |
| `src/lib/dal/class-session.ts` | Add findSessionByCode (includes ended sessions) for ended session results |
| `src/app/(student)/session/[sessionId]/layout.tsx` | Update localStorage shape to include firstName |

### May Change
| File | Change |
|------|--------|
| `src/hooks/use-device-identity.ts` | Simplify or remove fingerprint dependency |
| `src/lib/student/session-identity.ts` | Add session code caching helpers |
| `src/components/student/recovery-code-dialog.tsx` | May become less prominent but keep functional |
| `src/app/(student)/join/page.tsx` | Update instructions text |
| `src/components/student/home-join-input.tsx` | May need to update redirect target |
| `src/app/(dashboard)/brackets/[bracketId]/live/page.tsx` | Add firstName to participant query select |

### New Files
| File | Purpose |
|------|---------|
| `src/components/student/name-entry-form.tsx` | Step 2: name input with validation |
| `src/components/student/name-disambiguation.tsx` | "Is this you?" duplicate name UI |
| `src/components/student/edit-name-dialog.tsx` | Post-join name editing dialog |
| `src/app/(student)/join/[code]/name/page.tsx` | Route for Step 2 of join flow (optional -- could be same page with state) |

## Open Questions

1. **Ended session results view**
   - What we know: Locked decision says "show final results/standings rather than just 'session ended' message"
   - What's unclear: What exactly should the results view show? Bracket winners? Poll results? Leaderboard standings? All of the above?
   - Recommendation: Show the same ActivityGrid but with read-only views of completed brackets/polls. This is consistent with the existing student session page. If no activities exist, show "This session has ended" with a clean message. This may be a separate task or deferred to a follow-up if the results views for brackets/polls don't already support read-only mode.

2. **Should the existing `@@unique([sessionId, deviceId])` constraint be dropped?**
   - What we know: deviceId is now nullable (Phase 19). The unique constraint still exists but PostgreSQL allows multiple NULLs in a unique constraint. No schema migration is required for correctness.
   - What's unclear: Should we add a new unique constraint or functional index for case-insensitive firstName matching?
   - Recommendation: Don't add a unique constraint on firstName because multiple students CAN have the same first name (that's the whole disambiguation flow). The existing `@@index([sessionId, firstName])` non-unique index is correct. Leave the deviceId unique constraint as-is (it won't cause issues with nulls).

3. **What happens if a student edits their name to match another student's name?**
   - What we know: Name editing is a requirement (IDENT-06). Duplicate names trigger disambiguation.
   - What's unclear: Should name editing go through the same disambiguation flow as joining?
   - Recommendation: Yes, use the same disambiguation flow. If "Jake" tries to change their name to "Sarah" and there's already a Sarah, prevent it with an error like "That name is already taken in this session. Try a different name." This is simpler than full disambiguation for edits.

## Sources

### Primary (HIGH confidence)
- **Prisma schema** (`prisma/schema.prisma`) -- Verified all model definitions, constraints, indexes
- **Phase 19 migration** (`prisma/migrations/20260221213903_phase19_rls_schema_wipe/migration.sql`) -- Verified first_name column, nullable device_id, index creation
- **First-name validation** (`src/lib/validations/first-name.ts`) -- Verified profanity filter, emoji regex, Zod schema, min/max length
- **Current join flow** (`src/actions/student.ts`, `src/lib/dal/student-session.ts`) -- Verified entire device-based identity chain
- **Welcome screen** (`src/components/student/welcome-screen.tsx`) -- Verified Motion animations, returning vs new UX
- **Session layout** (`src/app/(student)/session/[sessionId]/layout.tsx`) -- Verified localStorage identity check
- **Teacher roster** (`src/components/teacher/student-roster.tsx`, `participation-sidebar.tsx`) -- Verified funName-only display

### Secondary (MEDIUM confidence)
- **Prisma case-insensitive queries** -- `mode: 'insensitive'` is a standard Prisma feature for PostgreSQL, verified in Prisma docs. Works via `ILIKE` under the hood.
- **PostgreSQL NULL behavior in unique constraints** -- Standard PostgreSQL behavior: NULLs are not considered equal in unique constraints, so multiple NULL deviceId values won't conflict.

### Tertiary (LOW confidence)
- None -- all findings verified against codebase and database behavior.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries already in project, no new dependencies
- Architecture: HIGH -- Clear patterns from existing codebase, well-documented existing code
- Pitfalls: HIGH -- Identified from direct code analysis, all mitigations are straightforward
- Discretion recommendations: MEDIUM -- Based on UX judgment, consistent with existing patterns

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable domain, no external dependency changes expected)
