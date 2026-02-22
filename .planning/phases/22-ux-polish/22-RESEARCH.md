# Phase 22: UX Polish - Research

**Researched:** 2026-02-21
**Domain:** UI/UX polish -- presentation mode, session naming, terminology unification
**Confidence:** HIGH

## Summary

Phase 22 is a polish-only phase that modifies existing UI components across the SparkVotEDU codebase. No new libraries, schema changes, or architectural patterns are needed. The work spans four requirement areas: (1) a full-screen presentation mode for ranked poll results on projectors, (2) session name display in dropdowns and headers, (3) click-to-edit session naming from the dashboard, and (4) unifying "Activate" / "Go Live" terminology to "Start" / "Active" / "End" across brackets and polls.

The codebase already has a `PresentationMode` wrapper component (`src/components/poll/presentation-mode.tsx`) and a `RankedLeaderboard` component (`src/components/poll/ranked-leaderboard.tsx`) with medal styling. The session `name` field already exists in the Prisma schema (`ClassSession.name: String?`) and is already used in the session creator and session list pages. The terminology audit found 7 specific locations where "Activate" or "Go Live" appear as user-facing button/link text. All changes are Tailwind CSS class modifications, new small components, one new server action, and string replacements.

**Primary recommendation:** This phase requires zero new dependencies. Build a dedicated `PresentationResults` component for the full-screen ranked leaderboard, add an `updateSessionName` server action + `EditableSessionName` client component, and do a targeted find-and-replace for terminology strings.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Medal card presentation
- Full-screen results view -- teacher clicks a button to enter a dedicated presentation mode that fills the projector
- Larger font sizes in presentation mode for readability from 30+ feet away
- Presentation mode is a distinct view, not just the dashboard with bigger text

#### Session naming interaction
- Click-to-edit: teacher clicks session name directly and it becomes an inline text field, Enter or click-away to save
- Prompt on session creation with an optional name field -- gentle nudge upfront, can skip
- Fallback for unnamed sessions: "Unnamed Session -- Feb 21" format (date included)

#### Activation terminology
- Unified to "Start" / "Active" (NOT "Go Live" / "Live" as originally spec'd)
- End action: "End" button
- Status badges can be feature-appropriate -- polls and brackets may have slightly different state labels if their lifecycles differ
- The key unification: no more mixed "Activate" / "Go Live" -- everything uses "Start"

### Claude's Discretion

#### Medal card visual design
- Color scheme for gold/silver/bronze cards -- Claude picks best approach for projector readability
- How non-medal items (4th+) display alongside medal cards -- Claude determines visual hierarchy
- Card layout, shadows, spacing -- Claude's call

#### Session name visibility
- Claude audits all places sessions appear (dropdowns, headers, breadcrumbs, lists) and applies names where it makes sense
- Dashboard and session selection dropdowns are the minimum

#### Button styling
- Claude audits current button styles across brackets and polls and unifies where it makes sense
- Goal is visual consistency without unnecessary disruption

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-01 | Presentation mode ranked poll cards have readable text contrast on all items (light and dark backgrounds) | Presentation mode component exists; research identifies specific medal color scheme with WCAG-compliant contrast ratios for dark background; code examples for PresentationResults component |
| UX-02 | Session selection dropdowns show session name (not session number/code) | Research identifies all 5 locations with session dropdowns showing `Session {code}`; provides naming pattern with fallback format |
| UX-03 | Session name is editable from the teacher dashboard | Research identifies missing `updateSessionName` DAL + server action; provides click-to-edit pattern; session detail page already renders name |
| UX-04 | "Activate" and "Go Live" terminology is unified to a single clear term across all bracket types and polls | Research provides complete audit of all 7 user-facing terminology instances with file/line locations and exact replacement strings |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router, Server Components, Server Actions | Project framework |
| Tailwind CSS | 4.x | All styling, responsive utilities | Project CSS framework |
| motion (Framer Motion) | 12.29.2 | Animation for ranked leaderboard transitions | Already used in RankedLeaderboard |
| lucide-react | 0.563.0 | Icons (Maximize, X, Pencil, Check) | Project icon library |
| React | 19.2.3 | Component framework | Project framework |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | 0.7.1 | Button variant styling | Badge/button consistency audit |
| @radix-ui/react-label | 2.1.8 | Accessible labels | Click-to-edit input labeling |

### No New Dependencies Needed
This phase requires ZERO new npm packages. The inline edit pattern is simple enough (20-30 lines) that a library is overkill. The presentation mode already exists and just needs enhanced child content.

## Architecture Patterns

### Files to Modify (Complete Audit)

```
src/
  components/
    poll/
      presentation-mode.tsx          # ENHANCE: larger text, better scaling
      ranked-leaderboard.tsx         # ENHANCE: medal colors for dark bg
      poll-detail-view.tsx           # MODIFY: "Activate" -> "Start", "Go Live" -> "View Live"
      poll-status.tsx                # NO CHANGE: status badge already shows "active" (lowercase)
    bracket/
      bracket-status.tsx             # MODIFY: "Activate" -> "Start"
      bracket-card.tsx               # MODIFY: "Go Live" -> "View Live"
      bracket-detail.tsx             # MODIFY: "Go Live" -> "View Live", session dropdown text
      predictive-bracket.tsx         # MODIFY: "Go Live" wording
      tournament-browser.tsx         # MODIFY: session dropdown text
    teacher/
      session-creator.tsx            # ENHANCE: name field prominence
    dashboard/
      shell.tsx                      # MODIFY: session card name display, badge "Live" -> "Active"
  app/
    (dashboard)/
      sessions/
        page.tsx                     # MODIFY: session card name fallback format
        [sessionId]/
          session-detail.tsx         # ADD: click-to-edit name, breadcrumb name
      polls/
        [pollId]/
          live/
            client.tsx              # MODIFY: "Close Poll" -> "End Poll"
      activities/
        activities-list.tsx         # NO CHANGE: uses status directly, already lowercase
  actions/
    class-session.ts                # ADD: updateSessionName action
  lib/
    dal/
      class-session.ts              # ADD: updateSessionName DAL function

NEW FILES:
  components/
    teacher/
      editable-session-name.tsx     # NEW: click-to-edit inline component
    poll/
      presentation-results.tsx      # NEW: dedicated presentation-optimized results view
```

### Pattern 1: Click-to-Edit Inline Text
**What:** A text element that becomes an input field when clicked, saves on Enter/blur, reverts on Escape
**When to use:** Session name editing on the session detail page
**Example:**
```typescript
// Pattern for click-to-edit component
// Source: Standard React pattern (verified via multiple sources)
'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { Pencil, Check, X } from 'lucide-react'

interface EditableTextProps {
  value: string
  fallback: string
  onSave: (newValue: string) => Promise<void>
  className?: string
}

export function EditableText({ value, fallback, onSave, className }: EditableTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  function handleSave() {
    const trimmed = draft.trim()
    if (trimmed === value) {
      setEditing(false)
      return
    }
    startTransition(async () => {
      await onSave(trimmed || '') // empty string = clear name
      setEditing(false)
    })
  }

  function handleCancel() {
    setDraft(value)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') handleCancel()
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isPending}
        className="rounded-md border bg-background px-2 py-1 text-xl font-bold ..."
        placeholder="Session name"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(value); setEditing(true) }}
      className="group inline-flex items-center gap-2 ..."
    >
      <span className={className}>{value || fallback}</span>
      <Pencil className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 ..." />
    </button>
  )
}
```

### Pattern 2: Presentation Mode Medal Cards (Dark Background)
**What:** High-contrast medal cards optimized for projector viewing on dark backgrounds
**When to use:** Inside PresentationMode for ranked poll results
**Example:**
```typescript
// Medal color scheme for dark (projector) background
// Verified against WCAG AA large-text contrast (3:1 minimum)
// All ratios exceed 4.5:1 for AAA compliance on #0a0a0f background

const PRESENTATION_MEDAL_STYLES = {
  gold: {
    bg: 'bg-amber-400',          // #fbbf24
    text: 'text-amber-950',      // #451a03
    border: 'border-amber-300',  // bright gold ring
    label: '1st',
    emoji: '', // no emoji per project convention
  },
  silver: {
    bg: 'bg-gray-300',           // #d1d5db
    text: 'text-gray-900',       // #111827
    border: 'border-gray-200',
    label: '2nd',
  },
  bronze: {
    bg: 'bg-orange-400',         // #fb923c
    text: 'text-orange-950',     // #431407
    border: 'border-orange-300',
    label: '3rd',
  },
  rest: {
    bg: 'bg-white/10',           // subtle on dark
    text: 'text-white/90',
    border: 'border-white/20',
  },
}
// Dark text on bright medal backgrounds ensures readability on projectors
// 4th+ items use light text on dark transparent cards for clear hierarchy
```

### Pattern 3: Session Name Fallback Format
**What:** Consistent fallback for unnamed sessions across the app
**When to use:** Everywhere a session name is displayed
**Example:**
```typescript
// Utility function for consistent session name display
function getSessionDisplayName(session: { name: string | null; createdAt: string }): string {
  if (session.name) return session.name
  const date = new Date(session.createdAt)
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `Unnamed Session -- ${formatted}`
}

// In session dropdowns:
// BEFORE: <option>Session {s.code}</option>
// AFTER:  <option>{s.name || `Unnamed Session -- ${formatDate(s.createdAt)}`} ({s.code})</option>
```

### Anti-Patterns to Avoid
- **Inline styles for presentation mode:** Use Tailwind classes exclusively; inline styles break dark mode and are harder to maintain
- **String literals scattered across components:** Use constants for status labels; the "Start"/"Active"/"End" terminology should be defined in one place and imported
- **onBlur + onClick race condition in click-to-edit:** The save-on-blur handler fires before button click events; use `onMouseDown` with `preventDefault` on cancel buttons, or rely solely on blur-to-save (simpler, recommended)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fullscreen API | Custom viewport detection | `document.requestFullscreen()` | Already used in `presentation-mode.tsx`; browser handles Escape key, security, and cross-browser |
| Color contrast checking | Manual hex math | WebAIM contrast checker for design verification | WCAG ratios are non-trivial to compute; pre-verify colors during development |
| Session name validation | Custom regex sanitizer | Simple `trim()` + max length check | Session names are teacher-facing only, no injection risk (server-rendered) |

**Key insight:** This phase is about editing existing Tailwind classes and adding small glue components. No new architectural patterns needed.

## Common Pitfalls

### Pitfall 1: Projector Color Washing
**What goes wrong:** Colors that look distinct on an LCD monitor appear washed out or indistinguishable on a classroom projector
**Why it happens:** Projectors have lower contrast ratios (typically 2000:1 vs 1000:1+ for monitors), brightness variance, and ambient light reduces perceived contrast
**How to avoid:** Use high-saturation medal colors with dark text ON bright backgrounds (not bright text on dark backgrounds for medals). Reserve light-on-dark for non-medal items. Test with brightness reduced to 50% on a monitor to simulate projector.
**Warning signs:** Medal colors using light/pastel backgrounds (e.g., `bg-amber-100`) will wash out on projectors

### Pitfall 2: Click-to-Edit Blur Race Condition
**What goes wrong:** Clicking a "Cancel" or "Save" button inside the edit mode fires `onBlur` before `onClick`, causing the edit to save before the cancel registers
**Why it happens:** Browser event order: blur fires before click
**How to avoid:** Use the simplest pattern: save on blur (Enter also saves, Escape reverts). No separate save/cancel buttons needed -- just the input field itself. The pencil icon on hover indicates editability; clicking away saves.
**Warning signs:** Adding explicit Save/Cancel buttons inside the inline edit

### Pitfall 3: Inconsistent Session Name Fallback
**What goes wrong:** Some places show "Unnamed Session", others show "Session {code}", others show just the code
**Why it happens:** Session name display logic is duplicated across 6+ files
**How to avoid:** Create a single `getSessionDisplayName()` utility function and use it everywhere. The fallback format is locked: "Unnamed Session -- Feb 21"
**Warning signs:** `session.name || 'Unnamed Session'` without the date

### Pitfall 4: Missing "Go Live" Instances in Non-Obvious Places
**What goes wrong:** After terminology update, one button still says "Go Live" because it was in a file not covered by grep
**Why it happens:** The term appears in bracket-card action bars, bracket-detail headers, poll-detail headers, and predictive bracket components
**How to avoid:** Use the complete audit below. The term also appears in `broadcast.ts` as `poll_activated` (internal event name -- do NOT change these, only user-facing strings)
**Warning signs:** Changing internal event names or database enum values instead of just UI labels

### Pitfall 5: Presentation Mode Text Size Too Small
**What goes wrong:** Text readable at 6 feet on a monitor is unreadable at 30 feet on a projector
**Why it happens:** Default component text sizes are designed for personal screens
**How to avoid:** In the presentation-optimized results component, use a minimum of `text-2xl` (24px) for option names and `text-4xl` (36px+) for the winner/top item. Points values should be `text-xl` minimum. The existing `PresentationMode` wrapper already provides padding but the child content (`PollResults` -> `RankedLeaderboard`) uses `text-sm` which is too small.
**Warning signs:** Reusing `RankedLeaderboard` inside `PresentationMode` without overriding sizes

## Code Examples

### Complete Terminology Audit (7 User-Facing Changes)

```
File: src/components/poll/poll-detail-view.tsx
  Line 69: label: 'Activate' -> label: 'Start'
  Line 194: >Go Live -> >View Live

File: src/components/bracket/bracket-status.tsx
  Line 81: 'Activate' -> 'Start'

File: src/components/bracket/bracket-card.tsx
  Line 162: {/* Go Live -- active brackets */} -> {/* View Live -- active brackets */}
  Line 169: Go Live -> View Live

File: src/components/bracket/bracket-detail.tsx
  Line 146: Go Live -> View Live

File: src/components/bracket/predictive-bracket.tsx
  Line 639: Close Predictions & Go Live -> Close Predictions & Start
```

**DO NOT change:**
- `broadcast.ts` line 167: `poll_activated` (internal event type, not user-facing)
- `bracket.ts` line 582: `activate` in error message "must have N entrants to activate" (internal validation, acceptable)
- Admin panel deactivate/reactivate (completely different feature context)
- `live-dashboard.tsx` line 788: `LIVE` badge (this is a status indicator for the live dashboard, acceptable as-is since it refers to the view state, not an action)

### Additional Label Changes (Button Consistency)

```
File: src/components/poll/poll-detail-view.tsx
  Line 79: label: 'Close' -> label: 'End' (for active -> closed transition)

File: src/app/(dashboard)/polls/[pollId]/live/client.tsx
  Line 133: 'Close Poll' -> 'End Poll'
```

Note: The "Reopen" label on closed polls and "Archive" label are acceptable as-is (they describe specific lifecycle transitions, not the primary start/end flow).

### Session Dropdown Update Pattern

```typescript
// BEFORE (5 locations):
{sessions.map((s) => (
  <option key={s.id} value={s.id}>
    Session {s.code}
  </option>
))}

// AFTER:
{sessions.map((s) => (
  <option key={s.id} value={s.id}>
    {s.name
      ? `${s.name} (${s.code})`
      : `Unnamed Session (${s.code})`}
  </option>
))}
```

Locations:
1. `src/components/bracket/bracket-detail.tsx` line 329 (desktop sidebar)
2. `src/components/bracket/bracket-detail.tsx` line 413 (mobile)
3. `src/components/poll/poll-detail-view.tsx` line 254
4. `src/components/bracket/tournament-browser.tsx` line 173 (already has name check!)
5. Check: any future session dropdowns

Note: `tournament-browser.tsx` line 173 already handles this with `s.name ? \`${s.name} (${s.code})\` : \`Session ${s.code}\`` -- just update the fallback format.

### updateSessionName Server Action

```typescript
// src/lib/dal/class-session.ts -- ADD:
export async function updateSessionName(
  sessionId: string,
  teacherId: string,
  name: string
) {
  const session = await prisma.classSession.findFirst({
    where: { id: sessionId, teacherId },
  })
  if (!session) {
    throw new Error('Session not found or unauthorized')
  }
  return prisma.classSession.update({
    where: { id: sessionId },
    data: { name: name || null }, // empty string clears name
  })
}

// src/actions/class-session.ts -- ADD:
export async function updateSessionName(sessionId: string, name: string) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) return { error: 'Not authenticated' }
  try {
    await updateSessionNameDAL(sessionId, teacher.id, name)
    return { success: true }
  } catch {
    return { error: 'Failed to update session name' }
  }
}
```

### Dashboard Shell Session Name Enhancement

```typescript
// src/components/dashboard/shell.tsx line 146-149
// BEFORE:
<p className="font-medium text-foreground">{session.name || 'Unnamed Session'}</p>
<span className="...">Live</span>

// AFTER:
<p className="font-medium text-foreground">
  {session.name || `Unnamed Session -- ${new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
</p>
<span className="...">Active</span>
```

### SessionInfo Interface Update

The `SessionInfo` interface used in bracket-detail.tsx and poll-detail-view.tsx currently only has `id`, `code`, and `createdAt`. It needs `name` added:

```typescript
// BEFORE:
interface SessionInfo {
  id: string
  code: string
  createdAt: string
}

// AFTER:
interface SessionInfo {
  id: string
  code: string
  name: string | null
  createdAt: string
}
```

This requires updating the data-fetching in the page server components that pass `sessions` to these components, to include `name` in the select/return.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Modal dialogs for name editing | Inline click-to-edit | 2020+ | Reduces friction, fewer clicks |
| Light backgrounds for projectors | Dark backgrounds with bright accents | Always best practice | Higher perceived contrast on projectors |
| `text-sm` for dashboard results | `text-2xl`+ for presentation mode | N/A (new feature) | Readability from 30+ feet |

**No deprecated features relevant to this phase.**

## Open Questions

1. **Session dropdown data flow**
   - What we know: `bracket-detail.tsx` and `poll-detail-view.tsx` receive sessions as props from their page server components. The `SessionInfo` interface lacks `name`.
   - What's unclear: Need to verify the server component pages actually fetch session name (the DAL `getTeacherSessions` already returns full session records including `name`).
   - Recommendation: Trace the prop chain from page.tsx -> component to ensure `name` is passed through. The fix is adding `name` to the `SessionInfo` type and the `sessions.map()` in the page file.

2. **Presentation mode scope**
   - What we know: The existing `PresentationMode` component is a generic wrapper used only in `poll-live-client.tsx`. It wraps `PollResults` which renders `RankedLeaderboard`.
   - What's unclear: Should presentation mode be available from the poll detail page (non-live), or only from the live results page?
   - Recommendation: Keep it on the live results page only (current location). The "Present" button and F shortcut already exist there. Just enhance the content rendered inside.

3. **"LIVE" badge in live-dashboard.tsx**
   - What we know: Line 788 shows `LIVE` as a status badge on the live dashboard header. The context decision says "Start" / "Active" terminology.
   - What's unclear: Does "LIVE" in the live dashboard context refer to the streaming/viewing state (acceptable) or the bracket status (should be "Active")?
   - Recommendation: This is a view indicator ("you are on the live dashboard"), not an activation button. Keep "LIVE" here as it describes the viewing mode, not the bracket status. The bracket status badge (`BracketStatusBadge`) already shows "active" (lowercase, via `capitalize` CSS).

## Sources

### Primary (HIGH confidence)
- **Codebase audit** -- Direct reading of all affected files via Read tool
- **Prisma schema** -- `prisma/schema.prisma` confirms `ClassSession.name: String?` already exists
- **WCAG contrast guidelines** -- [WebAIM Contrast Requirements](https://webaim.org/articles/contrast/) -- WCAG AA large text: 3:1 ratio minimum

### Secondary (MEDIUM confidence)
- **React inline edit patterns** -- [LogRocket: Build inline editable UI in React](https://blog.logrocket.com/build-inline-editable-ui-react/) -- standard blur-to-save pattern
- **MDN Color Contrast** -- [MDN Web Docs: Color contrast](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG/Perceivable/Color_contrast) -- contrast ratio guidance

### Tertiary (LOW confidence)
- None -- all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all libraries already in project
- Architecture: HIGH -- patterns derived from direct codebase reading, modifications to existing components
- Pitfalls: HIGH -- projector readability and click-to-edit are well-understood patterns; terminology audit is comprehensive grep-based
- Terminology audit: HIGH -- complete grep of "Go Live", "Activate", "Go live" across entire `src/` directory

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable -- no external dependencies or fast-moving APIs)
