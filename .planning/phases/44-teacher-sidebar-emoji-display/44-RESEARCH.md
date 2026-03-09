# Phase 44: Teacher Sidebar + Emoji Display - Research

**Researched:** 2026-03-09
**Domain:** UI state management, teacher preferences, emoji display consistency
**Confidence:** HIGH

## Summary

Phase 44 integrates emoji display throughout all student identity touchpoints, adds a name-view toggle to the teacher participation sidebar, enables teacher-side student name editing, and implements a one-time emoji migration prompt for existing students. The work is almost entirely frontend with one small schema addition (teacher `nameViewDefault` column) and one new server action for teacher-side name edits.

The codebase is well-structured for this work. The `EmojiAvatar` component exists and handles shortcode-to-emoji resolution with sparkles fallback. The `ParticipationSidebar` already renders a 2-column grid with status dots, fun names, and first-name subtitles. The `EditNameDialog` provides a reusable pattern for the teacher edit popover. The main challenge is identifying and updating all student identity touchpoints (sidebar, session header, poll live client, bracket live page, prediction leaderboard) to include emoji display.

**Primary recommendation:** Work in three waves: (1) schema + teacher toggle infrastructure, (2) emoji display consistency across all touchpoints, (3) teacher edit + student migration prompt.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Default view: fun name view (emoji + fun name) -- matches v3.0 student-first identity design
- Toggle style: segmented control ("Fun" | "Real") in the sidebar header area
- Global default saved to teacher profile (requires new column on Teacher model)
- Per-session override: silent -- toggling in a session changes that session only, no prompt to save globally
- Fun name view tile: emoji + fun name inline (e.g., "Rocket Cosmic Tiger") with status dot
- Real name view tile: first name + last initial only (e.g., "Sarah T.") -- no emoji in real name view
- Teacher edit: click on any student tile opens a small dialog/popover, edit scope is display name (first name) only
- Edit UI: compact popover with name pre-filled, save/cancel buttons (reuses EditNameDialog pattern)
- Real-time sync: student sees their updated name immediately via Supabase realtime
- NO "Change Emoji" option -- emoji is permanent once picked (memory anchor for younger students)
- Gear menu stays as-is: Edit Name, Reroll Fun Name, Recovery Code (3 items)
- Unlimited name edits via existing Edit Name dialog
- Student session header: emoji before fun name inline
- Null emoji fallback: sparkles from existing EmojiAvatar component

### Claude's Discretion
- MIGR-02 prompt approach (interstitial screen vs in-session banner for existing students without emoji)
- Exact segmented control styling and placement within sidebar header
- How to handle status dots alongside emoji in fun name view tiles
- Teacher edit popover positioning and animation
- Which specific voting/results UI locations need emoji addition (audit all student-identity touchpoints)
- Schema approach for teacher name view preference column

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| JOIN-04 | Student's emoji + fun name display throughout the session (header, sidebar, voting UI, results) | Audit of all identity touchpoints completed -- see Architecture Patterns section |
| TCHR-01 | Teacher can toggle participation sidebar between fun name view and real name view | Segmented control pattern with local state + per-session override architecture |
| TCHR-02 | Toggle has a global default (saved to teacher profile) with per-session override | Schema addition + server action for global default, React state for session override |
| TCHR-03 | Teacher can edit any student's display name from the participation sidebar | Teacher-side server action with auth check + Dialog/Popover UI pattern |
| TCHR-04 | Student can edit their own display name and emoji via gear icon in session header | Existing EditNameDialog already handles this; emoji display addition to header |
| MIGR-02 | Existing participants get emoji prompt on next rejoin (one-time migration experience) | Migration prompt on rejoin when `emoji` is null -- interstitial approach recommended |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x | App router, server actions | Already in use |
| Prisma | latest | Schema migration for teacher preference column | Already in use, `db push` pattern established |
| Supabase Realtime | latest | Real-time name update sync | Already used for presence + broadcast |
| shadcn/ui | latest | Dialog, DropdownMenu, Input, Button, Switch | Already in use |
| class-variance-authority | latest | Component variants (EmojiAvatar) | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Popover (shadcn/ui) | latest | Teacher edit student popover | Must be added via `npx shadcn@latest add popover` -- not currently installed |
| Tabs (shadcn/ui) | latest | Segmented control for name view toggle | Optional -- could use custom segmented control with existing Button/cva instead |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn Popover for teacher edit | Dialog (already installed) | Dialog works fine for mobile; Popover better for desktop click-on-tile UX |
| shadcn Tabs for segmented control | Custom button group with cva | Fewer dependencies; segmented control is simple enough to build with existing primitives |

**Installation (if Popover chosen):**
```bash
npx shadcn@latest add popover
```

## Architecture Patterns

### Student Identity Touchpoint Audit (JOIN-04)

Every location where student identity is displayed needs emoji + fun name. Audit of current codebase:

| Location | File | Current Display | Needs Change |
|----------|------|-----------------|--------------|
| Session header | `src/components/student/session-header.tsx` | `{funName}` badge | Add emoji before funName |
| Session layout | `src/app/(student)/session/[sessionId]/layout.tsx` | Passes funName to SessionHeader | Pass emoji from sessionStorage |
| Participation sidebar (teacher) | `src/components/teacher/participation-sidebar.tsx` | funName + firstName subtitle | Add emoji, toggle between views |
| Bracket live page (teacher) | `src/app/(dashboard)/brackets/[bracketId]/live/page.tsx` | Fetches `{ id, funName, firstName, lastSeenAt }` | Add `emoji` to select |
| Poll live page (teacher) | `src/app/(dashboard)/polls/[pollId]/live/page.tsx` | Fetches `{ id, funName, firstName, lastSeenAt }` | Add `emoji` to select |
| Poll live client | `src/app/(dashboard)/polls/[pollId]/live/client.tsx` | Passes participants to sidebar | Thread emoji through props |
| Live dashboard (teacher) | `src/components/teacher/live-dashboard.tsx` | Passes participants to sidebar | Thread emoji through props |
| Prediction leaderboard | `src/lib/dal/prediction.ts` | Fetches `{ id, funName }` for scores | Add emoji to select for display |

### Pattern 1: Name View Toggle State

**What:** Two-level state: global default from DB, session-level override in React state.

**When to use:** Teacher toggles between "Fun" and "Real" name views.

**Architecture:**
```typescript
// Teacher model gets new column
// prisma/schema.prisma
model Teacher {
  // ... existing fields
  nameViewDefault  String  @default("fun") @map("name_view_default")
}

// Component state pattern
type NameView = 'fun' | 'real'

function ParticipationSidebar({ ..., teacherNameViewDefault }: Props) {
  // Session-level override -- starts as teacher's global default
  const [nameView, setNameView] = useState<NameView>(teacherNameViewDefault)

  // Toggle changes local state only (silent per-session override)
  // No server call on toggle -- just local React state
}
```

### Pattern 2: Teacher Edit Student Name

**What:** Teacher clicks student tile, sees compact edit UI, saves name via server action.

**Architecture:**
```typescript
// New server action in src/actions/student.ts (or separate teacher action file)
export async function teacherUpdateStudentName(input: {
  participantId: string
  firstName: string
  sessionId: string  // for auth: verify teacher owns this session
}): Promise<{ error?: string }>

// Uses getAuthenticatedTeacher() to verify teacher identity
// Verifies participant belongs to a session owned by this teacher
// Updates firstName via prisma
// Broadcasts change via Supabase realtime so student sees it live
```

### Pattern 3: Emoji Migration Prompt (MIGR-02)

**What:** When a returning student rejoins and has `emoji: null`, show a one-time picker.

**Recommendation:** Interstitial screen approach (not in-session banner). Reasons:
- Consistent with the join wizard flow students already know
- Forces completion before entering session (no forgotten banners)
- Can reuse the existing `WizardStepEmoji` component
- Simple guard: if `participant.emoji === null && returning === true`, redirect to migration screen

```typescript
// In session layout or join flow:
if (participant && !participant.emoji) {
  // Show emoji picker interstitial
  // On selection, call server action to set emoji
  // Then continue to session
}
```

### Pattern 4: Segmented Control

**What:** Custom "Fun | Real" toggle in sidebar header area.

```typescript
// Simple segmented control using existing primitives
function NameViewToggle({ value, onChange }: { value: NameView; onChange: (v: NameView) => void }) {
  return (
    <div className="flex rounded-md border bg-muted p-0.5">
      <button
        className={cn(
          "rounded-sm px-2 py-0.5 text-xs font-medium transition-colors",
          value === 'fun' ? "bg-background shadow-sm" : "text-muted-foreground"
        )}
        onClick={() => onChange('fun')}
      >
        Fun
      </button>
      <button
        className={cn(
          "rounded-sm px-2 py-0.5 text-xs font-medium transition-colors",
          value === 'real' ? "bg-background shadow-sm" : "text-muted-foreground"
        )}
        onClick={() => onChange('real')}
      >
        Real
      </button>
    </div>
  )
}
```

### Recommended Project Structure
```
src/
├── actions/
│   └── student.ts                    # Add teacherUpdateStudentName action
├── components/
│   ├── student/
│   │   ├── session-header.tsx         # Add emoji display before funName
│   │   └── emoji-migration.tsx        # NEW: one-time emoji picker for MIGR-02
│   └── teacher/
│       ├── participation-sidebar.tsx   # Major changes: toggle, emoji, click-to-edit
│       ├── name-view-toggle.tsx        # NEW: segmented control component
│       └── teacher-edit-name.tsx       # NEW: dialog/popover for editing student name
├── app/
│   ├── (dashboard)/
│   │   ├── brackets/[bracketId]/live/page.tsx  # Add emoji to participant select
│   │   └── polls/[pollId]/live/page.tsx        # Add emoji to participant select
│   └── (student)/
│       └── session/[sessionId]/
│           └── layout.tsx              # Pass emoji to SessionHeader
└── prisma/
    └── schema.prisma                   # Add nameViewDefault to Teacher
```

### Anti-Patterns to Avoid
- **Saving toggle state to server on every click:** Per-session toggle is local React state only. Only save to DB when user explicitly requests "save as default" (and even that is not in scope -- silent override means no DB write during session).
- **Fetching teacher preference client-side:** Pass `nameViewDefault` from the server page component as a prop. Do not make a separate API call.
- **Breaking the participant type contract:** The `ParticipationSidebar` props interface needs `emoji` and `lastInitial` added. Update all callers (live-dashboard.tsx, poll live client) simultaneously.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Emoji rendering | Custom emoji-to-unicode mapping | `EmojiAvatar` + `shortcodeToEmoji` | Already handles fallback, sizing, accessibility |
| Popover/dialog positioning | Manual absolute positioning | shadcn `Dialog` or `Popover` | Handles focus trapping, escape key, mobile |
| Name validation | Custom regex | `validateFirstName` from `@/lib/validations/first-name` | Already handles trim, length, character validation |
| Real-time sync | Custom WebSocket | Supabase Realtime broadcast | Already used for participant join broadcasts |

## Common Pitfalls

### Pitfall 1: Missing emoji in participant data pipeline
**What goes wrong:** Sidebar shows emoji but data was never fetched from DB.
**Why it happens:** Multiple Prisma `select` statements across different pages exclude `emoji`.
**How to avoid:** Update ALL `findMany` selects for participants to include `emoji` and `lastInitial`. Specifically: `brackets/[bracketId]/live/page.tsx` line 58, `polls/[pollId]/live/page.tsx` line 53, `prediction.ts` line 181.
**Warning signs:** Emoji shows as sparkles fallback everywhere on teacher dashboard.

### Pitfall 2: sessionStorage missing emoji field
**What goes wrong:** Student session header cannot display emoji because sessionStorage entry lacks it.
**Why it happens:** `SessionParticipantStore` in `session-store.ts` already has `emoji` field, but the session layout (`layout.tsx`) does not pass it to `SessionHeader`.
**How to avoid:** Verify `SessionHeader` receives and renders emoji. The `SessionParticipantStore` interface already includes `emoji: string | null` -- good. Layout just needs to thread it through.

### Pitfall 3: Teacher edit without auth check
**What goes wrong:** Any client can call the teacher edit action to rename any student.
**Why it happens:** Student actions are unauthenticated by design, but teacher actions must be authenticated.
**How to avoid:** Use `getAuthenticatedTeacher()` in the server action. Verify the participant's session belongs to this teacher before allowing the edit.

### Pitfall 4: Per-session toggle accidentally persisting
**What goes wrong:** Teacher changes toggle in one session, finds it changed globally.
**Why it happens:** Using shared state or accidentally writing to DB on toggle.
**How to avoid:** Toggle is pure React `useState` initialized from the server-provided default. No DB writes on toggle.

### Pitfall 5: Migration prompt shown repeatedly
**What goes wrong:** Student sees emoji picker every time they rejoin.
**Why it happens:** Emoji not saved properly, or check condition wrong.
**How to avoid:** After picking emoji, immediately update both DB (server action) and sessionStorage. Guard condition: `emoji === null` (not `emoji === undefined` or empty string).

## Code Examples

### Adding emoji to SessionHeader

```typescript
// src/components/student/session-header.tsx
// Source: existing codebase pattern

interface SessionHeaderProps {
  funName: string
  participantId: string
  rerollUsed: boolean
  firstName?: string
  emoji?: string | null  // ADD THIS
}

// In the render, replace the funName badge:
<span className="rounded-md bg-brand-amber/10 px-2.5 py-1 text-sm font-semibold text-brand-amber-dark dark:text-brand-amber">
  {emoji ? shortcodeToEmoji(emoji) : '\u{2728}'} {funName}
</span>
```

### Updated sidebar tile for fun name view

```typescript
// Fun name view tile with emoji + status dot
<div className="flex items-center gap-1">
  <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${statusColor}`} />
  <span className="text-sm">{shortcodeToEmoji(participant.emoji) ?? '\u{2728}'}</span>
  <span className="truncate text-xs">{participant.funName}</span>
</div>
```

### Teacher edit server action pattern

```typescript
// src/actions/student.ts -- new action
export async function teacherUpdateStudentName(input: {
  participantId: string
  firstName: string
}): Promise<{ error?: string; success?: boolean }> {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) return { error: 'Not authenticated' }

  const parsed = updateNameSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { prisma } = await import('@/lib/prisma')
  const participant = await prisma.studentParticipant.findUnique({
    where: { id: parsed.data.participantId },
    include: { session: { select: { teacherId: true } } },
  })

  if (!participant) return { error: 'Participant not found' }
  if (participant.session.teacherId !== teacher.id) {
    return { error: 'Not authorized' }
  }

  await prisma.studentParticipant.update({
    where: { id: parsed.data.participantId },
    data: { firstName: parsed.data.firstName },
  })

  // Broadcast name change so student sees it live
  await broadcastParticipantJoined(participant.sessionId).catch(() => {})

  return { success: true }
}
```

### Schema addition

```prisma
model Teacher {
  // ... existing fields
  nameViewDefault  String  @default("fun") @map("name_view_default")
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| funName-only display | emoji + funName everywhere | Phase 44 | All identity touchpoints updated |
| Single sidebar view | Togglable fun/real name views | Phase 44 | Teacher flexibility |
| Student-only name editing | Teacher + student can edit | Phase 44 | Teacher control |

## Open Questions

1. **Popover vs Dialog for teacher edit**
   - What we know: Dialog component is already installed. Popover is not.
   - What's unclear: Whether the click-on-tile UX feels better as a popover anchored to the tile or a centered dialog.
   - Recommendation: Use Dialog (already installed) to avoid adding a dependency. A compact Dialog with max-w-sm works well on both desktop and mobile. If UX feels wrong, Popover can be added later.

2. **Real-time broadcast mechanism for teacher name edits**
   - What we know: `broadcastParticipantJoined` already exists and triggers a participant list refresh.
   - What's unclear: Whether rebroadcasting "participant joined" is semantically correct for a name edit.
   - Recommendation: Reuse the existing broadcast -- the student's session already subscribes to it and refreshes participant data. Semantic purity is less important than shipping.

3. **Where exactly to intercept for MIGR-02 migration prompt**
   - What we know: The session layout checks `getSessionParticipant(sessionId)` from sessionStorage.
   - What's unclear: Whether to check in the layout or in the join flow.
   - Recommendation: Check in the session layout after loading participant data. If `returning === true` and `emoji === null`, render the migration interstitial instead of children. This keeps it simple and catches all rejoin paths.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.x |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| JOIN-04 | Emoji displays in session header, sidebar, all touchpoints | manual-only | Visual inspection in browser | N/A |
| TCHR-01 | Name view toggle switches sidebar between fun/real views | unit | `npx vitest run src/components/teacher/__tests__/name-view-toggle.test.ts -t "toggle"` | No - Wave 0 |
| TCHR-02 | Global default persisted, per-session override works | unit | `npx vitest run src/actions/__tests__/teacher-name-view.test.ts` | No - Wave 0 |
| TCHR-03 | Teacher edit student name with auth check | unit | `npx vitest run src/actions/__tests__/teacher-edit-student.test.ts` | No - Wave 0 |
| TCHR-04 | Student edit name via gear icon | manual-only | Existing EditNameDialog already tested by usage | N/A |
| MIGR-02 | Emoji migration prompt shown once for null-emoji participants | unit | `npx vitest run src/components/student/__tests__/emoji-migration.test.ts` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/actions/__tests__/teacher-edit-student.test.ts` -- covers TCHR-03 server action auth + update
- [ ] `src/components/teacher/__tests__/name-view-toggle.test.ts` -- covers TCHR-01 toggle state
- [ ] `src/actions/__tests__/teacher-name-view.test.ts` -- covers TCHR-02 global default persistence

*(MIGR-02 and JOIN-04 are primarily visual/integration -- manual verification is appropriate)*

## Sources

### Primary (HIGH confidence)
- Codebase audit: `src/components/teacher/participation-sidebar.tsx` -- current sidebar structure
- Codebase audit: `src/components/student/session-header.tsx` -- current header without emoji
- Codebase audit: `src/components/student/emoji-avatar.tsx` -- EmojiAvatar with shortcode resolution
- Codebase audit: `src/lib/student/session-store.ts` -- SessionParticipantStore already has emoji field
- Codebase audit: `prisma/schema.prisma` -- Teacher model, StudentParticipant model
- Codebase audit: `src/actions/student.ts` -- existing server action patterns
- Codebase audit: `src/actions/profile.ts` -- teacher auth pattern with `getAuthenticatedTeacher()`
- Codebase audit: All participant data fetch points (bracket live, poll live, prediction DAL)

### Secondary (MEDIUM confidence)
- shadcn/ui component inventory: Dialog, Button, Input, Switch, DropdownMenu installed; Popover and Tabs not installed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use, only potential addition is shadcn Popover
- Architecture: HIGH - patterns directly derived from existing codebase audit
- Pitfalls: HIGH - identified from concrete code analysis of data flow paths

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable domain, internal codebase)
