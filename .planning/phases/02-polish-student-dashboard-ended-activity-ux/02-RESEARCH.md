# Phase 2: Polish Student Dashboard Ended Activity UX - Research

**Researched:** 2026-03-17
**Domain:** React UI (student activity grid), Motion animations, Tailwind styling
**Confidence:** HIGH

## Summary

This phase modifies four existing frontend components to visually separate active vs. closed activities on the student dashboard. The API already returns all statuses (active, paused, completed, closed) and the realtime hook already propagates status changes. No backend work is needed.

The work is purely UI: split the grid into two sections, add a "Closed" badge, dim closed cards, guard auto-navigation against closed-only states, and animate transitions between sections when activities are closed/reopened in real-time.

**Primary recommendation:** Modify `activity-grid.tsx` to partition activities into active/closed arrays, render them in two sections with a divider, and update auto-navigation to only trigger for active activities. Modify `activity-card.tsx` to accept an `isClosed` prop controlling opacity and badge rendering.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Closed cards dim to ~50-60% opacity compared to active cards
- "Voted" badge does NOT persist on closed cards -- shows "Closed" regardless of vote status
- Paused activities keep same look as active (no distinct paused visual on grid)
- Grid splits into two sections: active at top, closed below
- "Closed" section has minimal text divider: small muted text "Closed" with horizontal lines on each side
- Section is NOT collapsible -- always visible
- When all activities closed, show friendly message at top + Closed section with ended cards
- Tapping closed card navigates to existing read-only view (no inner view changes)
- No result hints/snippets on grid card -- just activity name + "Closed" badge
- Auto-navigation skips closed activities -- if only activity is closed, show grid with friendly message
- Reopened activities animate back from Closed to Active section
- "Closed" badge: plain grey text on light grey background pill, no icon
- "Active" indicator: keep current pulsing green dot unchanged
- Section header: minimal text divider style (centered between horizontal lines)
- When activity ends in real-time, card dims and slides down from Active to Closed section
- Reopened activity reverses animation (slides up to Active, opacity restores)
- Consistent with Phase 26 animation patterns (soft, not jarring)

### Claude's Discretion
- Exact opacity percentage (somewhere in 50-60% range)
- Animation timing and easing curves
- Friendly message wording/styling for "no active activities" state
- How to handle AnimatePresence layout shifts during section transitions
- Exact Tailwind classes for the section divider and badge pill

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| motion (Framer Motion) | ^12.29.2 | Card animations, layout transitions | Already used in activity-grid.tsx |
| Tailwind CSS | v4 | Styling (opacity, badges, dividers) | Project standard |
| React | 19 (via Next.js 16) | Component rendering | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @/components/ui/card | local | Card wrapper component | Already used in activity-card.tsx |

No new dependencies needed.

## Architecture Patterns

### Current File Structure (files to modify)
```
src/
├── components/student/
│   ├── activity-grid.tsx      # Main grid -- needs section splitting, auto-nav guard
│   ├── activity-card.tsx      # Card component -- needs closed visual treatment
│   └── empty-state.tsx        # Empty state -- may need "no active" variant
├── hooks/
│   └── use-realtime-activities.ts  # Hook -- no changes needed, already returns status
└── app/api/sessions/[sessionId]/activities/
    └── route.ts               # API -- no changes needed, already returns all statuses
```

### Pattern 1: Activity Partitioning in Grid
**What:** Split the `activities` array from `useRealtimeActivities` into `activeActivities` and `closedActivities` using a derived computation.
**When to use:** In `activity-grid.tsx` before rendering.
**Key detail:** Status values differ by type:
- Brackets: `active`, `paused`, `completed`
- Polls: `active`, `paused`, `closed`

"Closed" means: bracket `status === 'completed'` OR poll `status === 'closed'`. Everything else (including `paused`) renders as active.

```typescript
const closedStatuses = new Set(['completed', 'closed'])
const activeActivities = activities.filter(a => !closedStatuses.has(a.status))
const closedActivities = activities.filter(a => closedStatuses.has(a.status))
```

### Pattern 2: Auto-Navigation Guard
**What:** Only auto-navigate when a single ACTIVE activity exists. If only closed activities remain, show grid with friendly message.
**Current code (line 43-52 of activity-grid.tsx):**
```typescript
if (!loading && activities.length === 1) {
  // auto-navigate
}
```
**Change to:**
```typescript
if (!loading && activeActivities.length === 1 && closedActivities.length === 0) {
  // auto-navigate only for single active activity with no closed siblings
}
```
Note: When there's 1 active + N closed, still auto-navigate to the active one. Only suppress when there are 0 active.

### Pattern 3: Section Divider Component
**What:** Minimal horizontal rule with centered "Closed" text.
**Render approach:** Inline in activity-grid.tsx (too simple for a separate component).
```tsx
<div className="flex items-center gap-3 py-2">
  <div className="h-px flex-1 bg-muted-foreground/20" />
  <span className="text-xs font-medium text-muted-foreground/60">Closed</span>
  <div className="h-px flex-1 bg-muted-foreground/20" />
</div>
```

### Pattern 4: Closed Card Badge
**What:** Replace "Voted" / "Active" indicator with grey "Closed" pill when activity is closed.
**Existing badge pattern (activity-card.tsx lines 93-118):** Conditional rendering between "Voted" (green pill) and "Active" (pulsing dot). Add a third branch for closed.
```tsx
// Closed badge (grey pill, no icon)
<div className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
  Closed
</div>
```

### Pattern 5: Closed Card Opacity
**What:** Dim entire card to ~55% opacity when closed.
**Implementation:** Pass `isClosed` boolean to ActivityCard, apply to outer Card wrapper.
```tsx
<Card className={`... ${isClosed ? 'opacity-55' : ''}`}>
```
Also disable hover effects on closed cards (no cursor-pointer or shadow-hover since they still navigate but should feel muted).

### Pattern 6: Cross-Section Animation
**What:** When activity changes from active to closed (or vice versa), animate the card between sections.
**Motion approach:** Use `AnimatePresence` with `layoutId` for each activity. Motion's `layout` prop with `layoutId={activity.id}` enables automatic cross-container animation when the same key moves between two AnimatePresence groups.

```tsx
// Active section
<AnimatePresence mode="popLayout">
  {activeActivities.map(a => (
    <motion.div key={a.id} layoutId={a.id} layout
      animate={{ opacity: 1 }} exit={{ opacity: 0.55 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}>
      <ActivityCard activity={a} isClosed={false} ... />
    </motion.div>
  ))}
</AnimatePresence>

// Closed section
<AnimatePresence mode="popLayout">
  {closedActivities.map(a => (
    <motion.div key={a.id} layoutId={a.id} layout
      animate={{ opacity: 0.55 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}>
      <ActivityCard activity={a} isClosed={true} ... />
    </motion.div>
  ))}
</AnimatePresence>
```

**Important:** Both sections must share the same parent `LayoutGroup` from motion for `layoutId` to work across containers. Wrap both sections in `<LayoutGroup>`.

### Anti-Patterns to Avoid
- **Separate AnimatePresence without LayoutGroup:** layoutId animations won't work across containers without a shared LayoutGroup wrapper
- **Filtering closed activities from the API:** The API already returns them -- don't add a filter there, handle it client-side
- **Modifying the realtime hook:** It already returns status -- no changes needed

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-container animation | Manual position tracking + transforms | Motion `layoutId` + `LayoutGroup` | Automatic layout animation between containers |
| Activity status normalization | Complex switch statements per type | Simple Set lookup (`closedStatuses`) | Brackets use "completed", polls use "closed" -- just map both |

## Common Pitfalls

### Pitfall 1: layoutId Requires LayoutGroup for Cross-Container Animation
**What goes wrong:** Cards don't animate between active/closed sections -- they just disappear and reappear.
**Why it happens:** Motion's `layoutId` only works across different `AnimatePresence` groups when wrapped in a `LayoutGroup`.
**How to avoid:** Import `LayoutGroup` from `motion/react` and wrap both grid sections.
**Warning signs:** Card appears to "pop" into the other section without sliding.

### Pitfall 2: Auto-Navigation Fires for Single Closed Activity
**What goes wrong:** Student gets auto-redirected to read-only view of a closed bracket when it's the only activity.
**Why it happens:** Current auto-nav checks `activities.length === 1` without considering status.
**How to avoid:** Check `activeActivities.length === 1` instead, and decide behavior based on whether closed activities also exist.

### Pitfall 3: Status String Mismatch Between Brackets and Polls
**What goes wrong:** Closed brackets don't appear in the closed section.
**Why it happens:** Brackets use `completed` while polls use `closed`. Code checking only `=== 'closed'` misses brackets.
**How to avoid:** Use a Set: `new Set(['completed', 'closed'])`.

### Pitfall 4: Empty Grid + Closed Section Layout
**What goes wrong:** When all activities are closed, the grid shows the old "removed" EmptyState instead of the friendly message + closed cards.
**Why it happens:** Current code checks `activities.length === 0` for empty state, but closed activities are still in the array.
**How to avoid:** Check `activeActivities.length === 0` instead. If zero active but some closed, render the friendly "no active" message above the closed section (not the EmptyState component).

### Pitfall 5: AnimatePresence mode="popLayout" Layout Shifts
**What goes wrong:** Cards jump or flash when one moves between sections.
**Why it happens:** `popLayout` removes exiting elements from DOM flow immediately, which can cause grid columns to collapse.
**How to avoid:** Use `mode="popLayout"` for both sections (consistent with existing code) and ensure grid layout handles the gap gracefully via Motion's `layout` prop on remaining cards.

## Code Examples

### Closed Status Detection Helper
```typescript
// Brackets use 'completed', polls use 'closed'
const CLOSED_STATUSES = new Set(['completed', 'closed'])
const isClosed = (status: string) => CLOSED_STATUSES.has(status)
```

### Section Divider (Tailwind)
```tsx
<div className="flex items-center gap-3 py-2">
  <div className="h-px flex-1 bg-muted-foreground/20" />
  <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
    Closed
  </span>
  <div className="h-px flex-1 bg-muted-foreground/20" />
</div>
```

### Friendly "No Active" Message
```tsx
<div className="flex flex-col items-center py-8 text-center">
  <h3 className="text-lg font-medium text-muted-foreground">
    No active activities right now
  </h3>
  <p className="mt-1 text-sm text-muted-foreground/70">
    Hang tight — your teacher will start something soon!
  </p>
</div>
```

### LayoutGroup Import (Motion v12)
```typescript
import { motion, AnimatePresence, LayoutGroup } from 'motion/react'
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` package | `motion` package (v12+) | 2024 | Import from `motion/react` not `framer-motion` |
| AnimatePresence `exitBeforeEnter` | AnimatePresence `mode="wait"` | framer-motion v7+ | Use `mode` prop |

**Already correct in codebase:** Imports from `motion/react`, uses `mode="popLayout"`.

## Open Questions

1. **Should closed cards still show participant count?**
   - What we know: CONTEXT.md says "just activity name + Closed badge" for grid card
   - What's unclear: Whether to hide the participant count line or keep it
   - Recommendation: Keep the participant count visible (it's useful context and removing it would cause layout shift). The "Closed" badge replaces the status indicator area, not the metadata line.

2. **Reopen detection timing**
   - What we know: Realtime hook will propagate status changes when a teacher reopens
   - What's unclear: Whether reopen changes status back to `active` or a different value
   - Recommendation: The existing reopen action likely sets status back to `active`. The partitioning logic based on closed statuses will naturally handle this -- card moves back to active section. Verify during implementation.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `activity-grid.tsx`, `activity-card.tsx`, `use-realtime-activities.ts`, `empty-state.tsx`, API route
- Motion v12 -- project already uses `motion/react` imports and `AnimatePresence` with `mode="popLayout"`

### Secondary (MEDIUM confidence)
- Motion `LayoutGroup` + `layoutId` for cross-container animation -- standard documented pattern in Motion v12

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all tools already in use
- Architecture: HIGH - small scope, clear existing patterns, pure frontend changes
- Pitfalls: HIGH - identified from direct code reading, well-understood Motion patterns

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable -- no external dependencies changing)
