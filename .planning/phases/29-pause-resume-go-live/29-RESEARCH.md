# Phase 29: Pause/Resume & Go Live - Research

**Researched:** 2026-02-28
**Domain:** Activity lifecycle management, real-time state broadcasting, student overlay UI
**Confidence:** HIGH

## Summary

Phase 29 adds pause/resume capability for brackets and polls, a playful student-facing pause overlay, and renames all "View Live" buttons to "Go Live" with visual state indicators. The implementation is architecturally straightforward because the existing codebase already has all the infrastructure needed: the `status` field on both Bracket and Poll is a plain `String` type (not a database enum), so adding `paused` requires zero schema migration. The `VALID_TRANSITIONS` maps in the bracket and poll DAL files control forward-only status transitions and only need two new entries each. The Supabase Broadcast system already handles real-time event propagation to students, and the existing realtime hooks (`useRealtimeBracket`, `useRealtimePoll`) already refetch full state on lifecycle events -- meaning the pause overlay can be driven entirely by the existing `status` field in the fetched state.

The primary complexity is in the student-facing pause overlay animation (cooking theme with "Let it cook!" messaging) and the resume animation (energetic burst). The project already uses `motion/react` (v12.29.2) extensively for AnimatePresence, layout animations, and full-screen overlays (WinnerReveal, CelebrationScreen, CountdownOverlay), so the overlay component follows established patterns. The teacher-side toggle switch requires installing `@radix-ui/react-switch` (a prior v2.0 decision), following the same shadcn/ui-style component pattern used for existing Radix primitives (dialog, dropdown-menu, label, separator, slot).

**Primary recommendation:** Add `paused` as a status value to both `VALID_TRANSITIONS` and `VALID_POLL_TRANSITIONS`, broadcast `bracket_paused`/`bracket_resumed`/`poll_paused`/`poll_resumed` events, create a single `PausedOverlay` component shared by bracket and poll student views, add a `Switch` UI primitive from Radix, and do a surgical label rename of 4 "View Live" instances across 3 files.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Student pause overlay:** Playful & fun cooking theme -- animated bubbling pot, steam, personality-driven. Dimmed overlay approach: voting UI stays visible but dimmed/blurred underneath, overlay sits on top. Looping subtle animation while paused -- steam rising, pot bubbling, keeps the screen alive. Dual messaging: big "Let it cook!" headline with smaller "Voting will resume soon" subtext underneath. Visual feedback only -- no audio or haptic feedback.
- **Teacher pause/resume controls:** Toggle switch (not a button) -- flips between Active/Paused states. Placed in top toolbar/header area of live dashboard -- always visible, next to existing controls. Amber/yellow banner across dashboard when paused saying "Activity Paused" -- impossible to miss. Instant toggle -- no confirmation dialog.
- **Pause behavior & transitions:** Overlay appears immediately when teacher pauses -- no grace period, even if student is mid-selection. Energetic reveal on resume -- quick animation (slide/burst) that signals "go go go!" to students. Activities start live when activated (current behavior preserved) -- pause is a mid-activity tool, not a gate.
- **"Go Live" rename:** Label-only rename: "View Live" -> "Go Live" everywhere, same navigation behavior. Visual state indicator on the button when activity is already live (e.g., green dot, pulsing, different color) vs not yet active. Only this specific rename -- no audit of other labels. "Go Live" button always visible regardless of activity state (draft, active, paused, completed).

### Claude's Discretion
- Exact cooking animation design and assets (pot style, steam particles, colors)
- Overlay z-index, backdrop blur amount, and dimming opacity
- Toggle switch component choice and styling details
- Banner positioning and dismiss behavior
- Resume animation specifics (slide direction, burst effect, duration)
- "Go Live" button state indicator design (dot vs pulse vs color change)
- Server-side vote rejection error message format

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@radix-ui/react-switch` | ^1.1.x | Toggle switch primitive for pause/resume control | Prior v2.0 decision; follows existing Radix pattern (dialog, dropdown, label already in project) |
| `motion/react` | 12.29.2 (already installed) | Cooking overlay animation, resume burst animation | Already used in 15+ components for AnimatePresence, layout, full-screen overlays |
| `lucide-react` | 0.563.0 (already installed) | Icons for toggle states, Go Live indicator | Already project standard for all icons |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | 4.x (already installed) | Overlay styling, backdrop blur, amber banner | All component styling |
| Supabase Realtime | via @supabase/supabase-js 2.93.3 | Broadcasting pause/resume events to students | Already wired for vote_update and bracket_update events |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@radix-ui/react-switch` | Plain `<button>` with toggle state | Switch is the correct semantic element for a binary on/off state; Radix provides accessibility (role, aria attributes) for free |
| CSS animation for cooking overlay | motion/react keyframes | CSS would be lighter but project already uses motion/react everywhere; consistency matters more |

**Installation:**
```bash
npm install @radix-ui/react-switch
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── ui/
│   │   └── switch.tsx            # NEW: Radix Switch primitive (shadcn/ui pattern)
│   ├── student/
│   │   └── paused-overlay.tsx    # NEW: Cooking theme overlay (shared by bracket + poll)
│   ├── teacher/
│   │   └── live-dashboard.tsx    # MODIFY: Add toggle switch + amber banner
│   ├── bracket/
│   │   ├── bracket-card.tsx      # MODIFY: "View Live" → "Go Live" + state indicator
│   │   ├── bracket-detail.tsx    # MODIFY: "View Live" → "Go Live" + state indicator + always visible
│   │   └── bracket-status.tsx    # MODIFY: Add 'paused' style to BracketStatusBadge
│   └── poll/
│       ├── poll-detail-view.tsx  # MODIFY: "View Live" → "Go Live" + state indicator + always visible
│       └── poll-status.tsx       # MODIFY: Add 'paused' style to PollStatusBadge
├── lib/
│   ├── dal/
│   │   ├── bracket.ts            # MODIFY: VALID_TRANSITIONS add paused
│   │   └── poll.ts               # MODIFY: VALID_POLL_TRANSITIONS add paused
│   ├── bracket/
│   │   └── types.ts              # MODIFY: BracketStatus union add 'paused'
│   ├── poll/
│   │   └── types.ts              # MODIFY: PollStatus union add 'paused'
│   ├── realtime/
│   │   └── broadcast.ts          # MODIFY: Add paused/resumed event types
│   └── utils/
│       └── validation.ts         # MODIFY: Add 'paused' to status schema enums
├── actions/
│   ├── bracket.ts                # MODIFY: Broadcast paused/resumed events
│   └── poll.ts                   # MODIFY: Broadcast paused/resumed events, add bracket-level guard to castPollVote
├── hooks/
│   ├── use-realtime-bracket.ts   # MODIFY: Handle bracket_paused/bracket_resumed events
│   └── use-realtime-poll.ts      # MODIFY: Handle poll_paused/poll_resumed events
├── app/
│   ├── api/sessions/[sessionId]/activities/route.ts  # MODIFY: Add 'paused' to status filters
│   ├── (student)/session/[sessionId]/
│   │   ├── bracket/[bracketId]/page.tsx  # MODIFY: Show PausedOverlay when bracket is paused
│   │   └── poll/[pollId]/page.tsx        # MODIFY: Show PausedOverlay when poll is paused
│   └── (dashboard)/
│       ├── polls/[pollId]/live/client.tsx  # MODIFY: Add toggle switch + amber banner
│       └── brackets/[bracketId]/live/page.tsx  # No change (passes to LiveDashboard)
```

### Pattern 1: Status Transition Expansion (Zero Migration)
**What:** Add `paused` as a valid status value to existing `VALID_TRANSITIONS` maps in DAL files.
**When to use:** When the status field is a plain String (not a DB enum) and the project uses a Record-based transition map.
**Example:**
```typescript
// src/lib/dal/bracket.ts -- BEFORE
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['active', 'completed', 'archived'],
  active: ['completed', 'archived'],
  completed: ['archived'],
  archived: [],
}

// AFTER
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['active', 'completed', 'archived'],
  active: ['paused', 'completed', 'archived'],
  paused: ['active', 'completed', 'archived'],
  completed: ['archived'],
  archived: [],
}
```

### Pattern 2: Broadcast-Driven Overlay with Realtime Hooks
**What:** Student overlay appears/disappears based on bracket/poll `status` field fetched via the existing realtime hooks. When a `bracket_paused` or `bracket_resumed` event arrives, the hook refetches state, and the component renders/hides the overlay based on `status === 'paused'`.
**When to use:** When the existing realtime hooks already refetch on lifecycle events and return the full entity state including status.
**Example:**
```typescript
// In student bracket voting page
const { matchups, bracketCompleted } = useRealtimeBracket(bracketId)
// The hook already refetches on bracket_update events.
// After refetch, bracket.status will be 'paused' or 'active'.
// The student page reads status from the /api/brackets/[bracketId]/state response.
```

### Pattern 3: Full-Screen Overlay with Dimmed Background
**What:** A z-50 fixed overlay with backdrop-blur and reduced opacity on the underlying content. The project already uses this pattern in WinnerReveal, CelebrationScreen, and CountdownOverlay.
**When to use:** When the user decision specifies "dimmed overlay approach: voting UI stays visible but dimmed/blurred underneath."
**Example:**
```typescript
// Follows the CelebrationScreen pattern (src/components/bracket/celebration-screen.tsx)
// and the delete confirmation dialog pattern (src/components/bracket/bracket-status.tsx)
<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
  {/* Cooking animation content */}
</div>
```

### Pattern 4: Radix Switch as shadcn/ui Component
**What:** Create a reusable `Switch` primitive in `src/components/ui/switch.tsx` following the same file structure as existing Radix components (dialog.tsx, dropdown-menu.tsx, label.tsx).
**When to use:** When the project already has a `components/ui/` directory with Radix-based primitives.
**Example:**
```typescript
// src/components/ui/switch.tsx
'use client'
import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={cn(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-amber-500',
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0'
      )}
    />
  </SwitchPrimitive.Root>
))
Switch.displayName = SwitchPrimitive.Root.displayName

export { Switch }
```

### Anti-Patterns to Avoid
- **Separate `pausedAt` timestamp column:** A prior v2.0 research document (STACK.md) suggested using a `pausedAt` column. This was overridden by the final decision to use `paused` as a status value. Do NOT create a timestamp column. The status field approach is simpler, requires no migration, and reuses VALID_TRANSITIONS.
- **Client-only pause state:** Pause MUST be persisted to the database (server-side). Client-only state would be lost on page refresh and would not propagate to other students.
- **Blocking matchup status for pause:** Pause operates at the BRACKET/POLL level, not the MATCHUP level. Do not change individual matchup statuses to "paused." The bracket's top-level `status` field controls the pause state. The `castVote` action should add a bracket-level check alongside the existing matchup-level check.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toggle switch UI | Custom div with click handler | `@radix-ui/react-switch` | Accessibility (role="switch", aria-checked), keyboard navigation, focus management are all built-in |
| Cooking animation | Canvas-based particle system | CSS keyframes + motion/react SVG transforms | Simple looping SVG animation is sufficient; no need for a particle engine |
| Realtime pause propagation | Custom polling mechanism | Existing Supabase Broadcast + realtime hooks | The entire broadcast infrastructure already exists and handles transport fallback |
| Vote rejection for paused state | New middleware | Existing `castVote` status check | `matchup.status !== 'voting'` already rejects non-voting matchups; add a bracket-level `status === 'paused'` check alongside it |

**Key insight:** Nearly everything needed for pause/resume already exists in the codebase. The broadcast system, realtime hooks, status transition maps, and overlay patterns are all established. This phase is primarily about wiring existing infrastructure together, not building new systems.

## Common Pitfalls

### Pitfall 1: Bracket-Level vs Matchup-Level Pause Enforcement
**What goes wrong:** The `castVote` action (src/actions/vote.ts line 42) checks `matchup.status !== 'voting'` but does NOT check bracket-level status. If a bracket is paused but its matchups are still in `voting` status, votes will be accepted.
**Why it happens:** Pause changes the bracket's `status` to `paused` but does NOT change individual matchup statuses (and should not -- matchups need to stay `voting` for seamless resume).
**How to avoid:** Add a bracket-level status check in `castVote`: after fetching the matchup, also check `matchup.bracket.status`. If bracket status is `paused`, reject the vote. The matchup query already includes `bracket: { select: { sessionId: true } }` -- extend it to include `status`.
**Warning signs:** Students can still submit votes on a paused bracket via API manipulation or if the overlay hasn't rendered yet.

### Pitfall 2: Poll Vote Guard Already Works (But For Wrong Reason)
**What goes wrong:** The `castPollVote` action checks `poll.status !== 'active'` (line 408 of src/actions/poll.ts). Since `paused` is not `active`, this guard already blocks votes on paused polls. However, it returns "Poll is not active" which is confusing to students.
**Why it happens:** The check is correct by coincidence, not design.
**How to avoid:** Add a specific check BEFORE the existing one: `if (poll.status === 'paused') return { error: 'Voting is paused' }`. This provides a clear error message. The generic "not active" check remains as a catch-all.
**Warning signs:** Students see "Poll is not active" instead of "Voting is paused" when they try to vote on a paused poll.

### Pitfall 3: Realtime Hook Must Handle New Event Types
**What goes wrong:** `useRealtimeBracket` (src/hooks/use-realtime-bracket.ts) only triggers refetch for specific `bracket_update` event types: `winner_selected`, `round_advanced`, `voting_opened`, `bracket_completed`, etc. If `bracket_paused` and `bracket_resumed` are not added to this list, the student's bracket state won't update when the teacher pauses/resumes.
**Why it happens:** The event type whitelist is explicit -- new types are ignored by default.
**How to avoid:** Add `bracket_paused` and `bracket_resumed` to the refetch trigger list in the `bracket_update` handler (line 151-158 of use-realtime-bracket.ts). Similarly for `useRealtimePoll`: add `poll_paused` and `poll_resumed` to the `poll_update` handler (line 108-118 of use-realtime-poll.ts).
**Warning signs:** Teacher pauses a bracket but students keep voting; overlay never appears.

### Pitfall 4: Session Activities API Must Include Paused Status
**What goes wrong:** The `/api/sessions/[sessionId]/activities` route (line 39-41) filters brackets with `status: { in: ['active', 'completed'] }` and polls with `status: { in: ['active', 'closed'] }`. Paused activities would disappear from the student activity grid.
**Why it happens:** The filter was written before `paused` existed as a status.
**How to avoid:** Add `'paused'` to both status filter arrays: brackets become `['active', 'paused', 'completed']`, polls become `['active', 'paused', 'closed']`.
**Warning signs:** When a teacher pauses an activity, it vanishes from the student's activity grid.

### Pitfall 5: "Go Live" Button Visibility Change
**What goes wrong:** Currently, "View Live" buttons are only shown when `bracket.status === 'active'` (bracket-card.tsx line 252, bracket-detail.tsx line 143). The user decision says "Go Live button always visible regardless of activity state (draft, active, paused, completed)." Removing the status conditional without adjusting the styling could show a green "Go Live" button on draft brackets that leads nowhere useful.
**Why it happens:** The original design only showed the button for active brackets.
**How to avoid:** Show the button for ALL states, but vary the visual appearance: active/paused states get the live indicator (green dot/pulse), while draft/completed states get a muted/neutral appearance. The href always points to `/brackets/{id}/live` or `/polls/{id}/live`. The live page itself already handles redirects for draft status (bracket-detail line 46: `if (status === 'draft') redirect('/brackets/{bracketId}')`).
**Warning signs:** Draft brackets show a confusing "Go Live" button that immediately redirects away.

### Pitfall 6: Validation Schema Must Include 'paused'
**What goes wrong:** The `updateBracketStatusSchema` in validation.ts (line 88) uses `z.enum(['draft', 'active', 'completed'])`. If `paused` is not added to this enum, the server action will reject pause requests with "Invalid status update data" before reaching the DAL.
**Why it happens:** Zod validation runs before the DAL transition check.
**How to avoid:** Add `'paused'` to the Zod enum: `z.enum(['draft', 'active', 'completed', 'paused'])`. Similarly for polls: `z.enum(['draft', 'active', 'closed', 'archived', 'paused'])`.
**Warning signs:** Teacher clicks pause toggle, sees validation error, nothing happens.

### Pitfall 7: Type Union Must Include 'paused'
**What goes wrong:** `BracketStatus` in types.ts is `'draft' | 'active' | 'completed'` and `PollStatus` is `'draft' | 'active' | 'closed' | 'archived'`. TypeScript will flag any code checking `status === 'paused'` as an error.
**Why it happens:** String literal union types don't auto-expand.
**How to avoid:** Add `'paused'` to both type definitions before writing any code that references it. This should be the first change in the implementation.
**Warning signs:** TypeScript compilation errors across multiple files.

## Code Examples

### Bracket Status Transition Map (Updated)
```typescript
// src/lib/dal/bracket.ts
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['active', 'completed', 'archived'],
  active: ['paused', 'completed', 'archived'],
  paused: ['active', 'completed', 'archived'],
  completed: ['archived'],
  archived: [],
}
```

### Poll Status Transition Map (Updated)
```typescript
// src/lib/dal/poll.ts
const VALID_POLL_TRANSITIONS: Record<string, string[]> = {
  draft: ['active', 'archived'],
  active: ['paused', 'closed', 'archived'],
  paused: ['active', 'closed', 'archived'],
  closed: ['archived', 'draft'],
  archived: [],
}
```

### Broadcast Event Types (Updated)
```typescript
// src/lib/realtime/broadcast.ts
type BracketUpdateType =
  | 'winner_selected'
  | 'round_advanced'
  | 'matchup_opened'
  | 'bracket_completed'
  | 'voting_opened'
  | 'prediction_status_changed'
  | 'reveal_round'
  | 'reveal_complete'
  | 'results_prepared'
  | 'bracket_paused'    // NEW
  | 'bracket_resumed'   // NEW

type PollUpdateType = 'poll_activated' | 'poll_closed' | 'poll_archived'
  | 'poll_paused'    // NEW
  | 'poll_resumed'   // NEW
```

### Server-Side Vote Guard for Paused Brackets
```typescript
// src/actions/vote.ts -- add bracket status check
const matchup = await prisma.matchup.findUnique({
  where: { id: matchupId },
  select: {
    status: true,
    bracketId: true,
    bracket: { select: { sessionId: true, status: true } },  // ADD: status
  },
})

// Check bracket is not paused
if (matchup.bracket.status === 'paused') {
  return { error: 'Voting is paused by your teacher' }
}

// Existing check: only allow voting on matchups in "voting" status
if (matchup.status !== 'voting') {
  return { error: 'Matchup is not open for voting' }
}
```

### Server-Side Vote Guard for Paused Polls
```typescript
// src/actions/poll.ts -- add paused check before existing active check
if (poll.status === 'paused') {
  return { error: 'Voting is paused by your teacher' }
}

// Existing check (still needed as catch-all)
if (poll.status !== 'active') {
  return { error: 'Poll is not active' }
}
```

### PausedOverlay Component (Cooking Theme)
```typescript
// src/components/student/paused-overlay.tsx
'use client'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'

interface PausedOverlayProps {
  visible: boolean
  onResume?: () => void  // Optional callback when resume animation completes
}

export function PausedOverlay({ visible, onResume }: PausedOverlayProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : {
            opacity: 0,
            scale: 1.1,  // Energetic burst on resume
            transition: { duration: 0.3, ease: 'easeOut' }
          }}
          onAnimationComplete={(definition) => {
            // Call onResume when the exit animation completes
            if (definition === 'exit' && onResume) onResume()
          }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          {/* Cooking pot SVG animation */}
          <div className="relative mb-6">
            {/* Animated pot with steam -- implementation details at Claude's discretion */}
          </div>

          {/* Dual messaging */}
          <h2 className="text-3xl font-bold tracking-tight">Let it cook!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Voting will resume soon
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

### Teacher Pause Toggle in Live Dashboard Header
```typescript
// In the top bar section of live-dashboard.tsx (around line 1030)
import { Switch } from '@/components/ui/switch'

// State:
const [isPaused, setIsPaused] = useState(bracket.status === 'paused')

// Handler:
function handlePauseToggle(checked: boolean) {
  const newStatus = checked ? 'active' : 'paused'
  // Note: checked=true means Active (switch ON), checked=false means Paused (switch OFF)
  // Invert logic: switch shows "Active" when on, toggling off pauses
  startTransition(async () => {
    const result = await updateBracketStatus({
      bracketId: bracket.id,
      status: checked ? 'active' : 'paused',
    })
    if (result && 'error' in result) {
      setError(result.error as string)
    } else {
      setIsPaused(!checked)
    }
  })
}

// In JSX (inside the top bar flex container):
<div className="flex items-center gap-2">
  <Switch
    checked={!isPaused}
    onCheckedChange={handlePauseToggle}
    disabled={isPending}
  />
  <span className="text-xs font-medium">
    {isPaused ? 'Paused' : 'Active'}
  </span>
</div>

// Amber banner (below the top bar, full-width):
{isPaused && (
  <div className="rounded-lg bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
    Activity Paused -- Students cannot vote
  </div>
)}
```

### "Go Live" Button with State Indicator
```typescript
// bracket-card.tsx, bracket-detail.tsx, poll-detail-view.tsx
// BEFORE: conditional render only for active status
{bracket.status === 'active' && (
  <Link href={`/brackets/${bracket.id}/live`} className="...bg-green-600...">
    <Radio className="h-3 w-3 animate-pulse" />
    View Live
  </Link>
)}

// AFTER: always visible, visual indicator varies by state
<Link
  href={`/brackets/${bracket.id}/live`}
  className={cn(
    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
    bracket.status === 'active' || bracket.status === 'paused'
      ? 'bg-green-600 text-white shadow-sm hover:bg-green-700'
      : 'border text-muted-foreground hover:bg-accent hover:text-foreground'
  )}
>
  {(bracket.status === 'active' || bracket.status === 'paused') && (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
    </span>
  )}
  Go Live
</Link>
```

### Realtime Hook Update (Bracket)
```typescript
// src/hooks/use-realtime-bracket.ts -- add to the bracket_update handler
.on('broadcast', { event: 'bracket_update' }, (message) => {
  const { type } = message.payload as { type: string }

  if (
    type === 'winner_selected' ||
    type === 'round_advanced' ||
    type === 'voting_opened' ||
    type === 'bracket_completed' ||
    type === 'prediction_status_changed' ||
    type === 'reveal_round' ||
    type === 'reveal_complete' ||
    type === 'bracket_paused' ||   // NEW
    type === 'bracket_resumed'     // NEW
  ) {
    fetchBracketState()
  }
  // ...
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pausedAt` timestamp column | `paused` status value | v2.0 planning decision | Simpler, no migration, reuses VALID_TRANSITIONS |
| View Live (conditional) | Go Live (always visible, state indicator) | Phase 29 | Better teacher UX, always-accessible live dashboard |

**Deprecated/outdated:**
- The v2.0 STACK.md document initially recommended `pausedAt` as a separate timestamp column. This was overridden by the ARCHITECTURE.md recommendation and the final STATE.md decision to use `paused` as a status value. The timestamp approach is NOT what should be implemented.

## Key Files and Their Changes

### Files to MODIFY (existing)
| File | Change |
|------|--------|
| `src/lib/bracket/types.ts` | Add `'paused'` to `BracketStatus` union |
| `src/lib/poll/types.ts` | Add `'paused'` to `PollStatus` union |
| `src/lib/utils/validation.ts` | Add `'paused'` to both Zod status enum schemas |
| `src/lib/dal/bracket.ts` | Update `VALID_TRANSITIONS` with paused entries |
| `src/lib/dal/poll.ts` | Update `VALID_POLL_TRANSITIONS` with paused entries |
| `src/lib/realtime/broadcast.ts` | Add `bracket_paused`, `bracket_resumed`, `poll_paused`, `poll_resumed` event types |
| `src/actions/bracket.ts` | Broadcast pause/resume events in `updateBracketStatus` |
| `src/actions/poll.ts` | Broadcast pause/resume events in `updatePollStatus`, add paused guard in `castPollVote` |
| `src/actions/vote.ts` | Add bracket-level `status === 'paused'` check |
| `src/hooks/use-realtime-bracket.ts` | Add `bracket_paused` + `bracket_resumed` to refetch triggers |
| `src/hooks/use-realtime-poll.ts` | Add `poll_paused` + `poll_resumed` to refetch triggers |
| `src/app/api/sessions/[sessionId]/activities/route.ts` | Add `'paused'` to bracket and poll status filters |
| `src/components/teacher/live-dashboard.tsx` | Add toggle switch + amber banner in header |
| `src/app/(dashboard)/polls/[pollId]/live/client.tsx` | Add toggle switch + amber banner in header |
| `src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx` | Show PausedOverlay when bracket status is paused |
| `src/app/(student)/session/[sessionId]/poll/[pollId]/page.tsx` | Show PausedOverlay when poll status is paused |
| `src/components/bracket/bracket-card.tsx` | "View Live" -> "Go Live", always visible, state indicator |
| `src/components/bracket/bracket-detail.tsx` | "View Live" -> "Go Live", always visible, state indicator |
| `src/components/poll/poll-detail-view.tsx` | "View Live" -> "Go Live", always visible, state indicator |
| `src/components/bracket/bracket-status.tsx` | Add `paused` style to `BracketStatusBadge` + `statusStyles` |
| `src/components/poll/poll-status.tsx` | Add `paused` style to `PollStatusBadge` + `statusStyles` |
| `src/app/(dashboard)/brackets/[bracketId]/live/page.tsx` | Allow `paused` status to access live page (currently only `active` + `completed`) |

### Files to CREATE (new)
| File | Purpose |
|------|---------|
| `src/components/ui/switch.tsx` | Radix Switch primitive (shadcn/ui pattern) |
| `src/components/student/paused-overlay.tsx` | Cooking theme overlay with "Let it cook!" messaging |

## Exact Locations of "View Live" Instances

All 4 instances to rename to "Go Live":

1. **`src/components/bracket/bracket-card.tsx` line 258** -- in the actions bar, conditionally shown for active brackets
2. **`src/components/bracket/bracket-detail.tsx` line 149** -- in the actions area, conditionally shown for active brackets
3. **`src/components/poll/poll-detail-view.tsx` line 187** -- in the actions area, conditionally shown for active polls

(bracket-card.tsx line 251 is a comment, not the actual label)

## Broadcast Data Flow (Full Sequence)

### Pause Flow
```
Teacher clicks toggle OFF (Active → Paused)
  └─ updateBracketStatus({ bracketId, status: 'paused' })
     ├─ Zod validates: 'paused' is in enum ✓
     ├─ DAL validates: active → paused in VALID_TRANSITIONS ✓
     ├─ Prisma: UPDATE brackets SET status='paused' WHERE id=X
     ├─ broadcastBracketUpdate(bracketId, 'bracket_paused', {})
     │   └─ Students: useRealtimeBracket receives bracket_update type=bracket_paused
     │      └─ fetchBracketState() → API returns status='paused'
     │         └─ Student page: if (bracket.status === 'paused') → show PausedOverlay
     ├─ broadcastActivityUpdate(sessionId)
     │   └─ Students: useRealtimeActivities refetches
     │      └─ Activity card shows "Paused" badge
     └─ revalidatePath (teacher page refresh)
```

### Resume Flow
```
Teacher clicks toggle ON (Paused → Active)
  └─ updateBracketStatus({ bracketId, status: 'active' })
     ├─ DAL validates: paused → active ✓
     ├─ Prisma: UPDATE brackets SET status='active' WHERE id=X
     ├─ broadcastBracketUpdate(bracketId, 'bracket_resumed', {})
     │   └─ Students: useRealtimeBracket refetches → status='active'
     │      └─ PausedOverlay exit animation (energetic burst)
     ├─ broadcastActivityUpdate(sessionId)
     └─ revalidatePath
```

## Open Questions

1. **Live dashboard page guard for paused status**
   - What we know: The bracket live page (line 44-47) redirects draft brackets back to detail. It allows `active` and `completed` statuses.
   - What's unclear: Should the live page also allow `paused` status? Yes -- the teacher needs to see and control the dashboard while paused.
   - Recommendation: Allow `paused` alongside `active` and `completed`. The status check should be `if (status === 'draft') redirect(...)` which already achieves this, but verify the exact condition.

2. **Poll live page guard for paused status**
   - What we know: The poll live page (line 28) checks `poll.status !== 'active' && poll.status !== 'closed'`.
   - What's unclear: Same as above.
   - Recommendation: Add `poll.status !== 'paused'` to the allowed statuses.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis:** Direct reading of all files listed in Architecture Patterns and Key Files sections
  - `prisma/schema.prisma` -- Bracket and Poll status fields are `String` type (no enum, no migration needed)
  - `src/lib/dal/bracket.ts` lines 604-609 -- `VALID_TRANSITIONS` Record
  - `src/lib/dal/poll.ts` lines 4-9 -- `VALID_POLL_TRANSITIONS` Record
  - `src/lib/realtime/broadcast.ts` -- BracketUpdateType and PollUpdateType unions
  - `src/actions/vote.ts` line 42 -- matchup status check (no bracket-level check)
  - `src/actions/poll.ts` line 408 -- `poll.status !== 'active'` check
  - `src/hooks/use-realtime-bracket.ts` lines 151-158 -- event type whitelist
  - `src/hooks/use-realtime-poll.ts` lines 108-118 -- event type whitelist
  - `src/app/api/sessions/[sessionId]/activities/route.ts` lines 39-41 and 92-94 -- status filters
  - `src/components/bracket/bracket-card.tsx` line 258 -- "View Live" text
  - `src/components/bracket/bracket-detail.tsx` line 149 -- "View Live" text
  - `src/components/poll/poll-detail-view.tsx` line 187 -- "View Live" text
  - `src/lib/bracket/types.ts` line 6 -- `BracketStatus` union
  - `src/lib/poll/types.ts` line 5 -- `PollStatus` union
  - `src/lib/utils/validation.ts` lines 88 and 223 -- Zod status schemas
  - `package.json` -- current dependency versions (motion 12.29.2, @radix-ui/* packages)

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` lines 80-141 -- v2.0 architecture research on pause/resume data flow
- `.planning/research/PITFALLS.md` lines 14-31 -- pause desynchronization pitfall
- `.planning/STATE.md` line 34 -- final v2.0 decision: "Use `paused` as status value"

### Tertiary (LOW confidence)
- None -- all findings verified through direct codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project except @radix-ui/react-switch (prior decision, follows existing Radix pattern)
- Architecture: HIGH -- all changes map directly to identified files with specific line numbers
- Pitfalls: HIGH -- each pitfall verified by reading the actual code paths
- "Go Live" rename: HIGH -- exact file locations and line numbers identified

**Research date:** 2026-02-28
**Valid until:** 2026-03-30 (stable -- no external dependency changes expected)
