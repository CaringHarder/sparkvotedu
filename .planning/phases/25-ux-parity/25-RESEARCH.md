# Phase 25: UX Parity - Research

**Researched:** 2026-02-24
**Domain:** UI component unification (Radix DropdownMenu, card menus, animations, sign-out feedback)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Context Menu Actions
- Unified menu for BOTH poll and bracket cards -- full parity between the two
- Menu actions (top to bottom): Rename, Edit, Share/Copy Link, Duplicate, Archive, Delete
- Go Live / End stays outside the menu as a separate card control
- Duplicate copies everything -- question, options, settings, visual config (full clone)
- Archive behaves the same as brackets -- moves to archived section, hidden from main dashboard
- Menu available in all card states (draft, live, completed, archived)
- Card body click still navigates into the poll/bracket; triple-dot is its own click target
- Rename = inline edit on the card; Edit = navigates to full edit page
- Each menu item has an icon next to the text (both brackets and polls)
- Claude audits what brackets currently have and unifies both to the same menu -- may require modifying bracket card menu to match

#### Delete Confirmation
- Always show a modal confirmation dialog for delete (regardless of state)
- Dialog includes impact warning ("Students will lose access") only if the poll/bracket is currently live
- Button text includes item type: "Delete Poll" / "Delete Bracket"
- No undo toast after confirmed delete -- confirmation dialog is sufficient
- Archive happens immediately with no confirmation (it's reversible)

#### Card Removal Animations
- Delete: card fades out
- Archive: card slides left
- Duplicate: new card appears with a brief highlight/pulse animation so teacher notices it
- No success toasts for any action -- the animation is the feedback

#### Sign-Out Feedback
- Button is in upper-right corner of header menu on all pages
- On click: button text changes to "Signing out..." and button becomes disabled + visually dimmed (opacity)
- Prevents double-click during processing
- After sign-out completes: immediate redirect to login/landing page, no intermediate confirmation screen

#### Menu Trigger
- Triple-dot position matches brackets exactly (Claude checks codebase and mirrors)
- Icon style matches brackets (Claude checks codebase and mirrors)
- Always visible on the card (not hover-only) -- discoverable on mobile and desktop
- Smart positioning for menu dropdown -- auto-flips based on available space (Radix default behavior)

### Claude's Discretion
- Specific icon choices for each menu action (pencil for rename, trash for delete, etc.)
- Animation durations and easing curves
- Exact opacity value for disabled sign-out button
- How to handle the share/copy-link action (clipboard toast vs inline confirmation)
- Whether bracket card menu needs restructuring vs just adding missing items

### Deferred Ideas (OUT OF SCOPE)
- **Pause/Hold state for brackets and polls** -- New capability to temporarily pause a live bracket or poll, freezing student participation. Applies to both brackets and polls. User wants this as its own phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UXP-01 | Poll cards have a triple-dot context menu with archive, duplicate, and delete actions matching the bracket card pattern | Unified `CardContextMenu` component using Radix DropdownMenu, shared between both card types. Requires new server actions for rename/archive on polls, rename/duplicate/archive on brackets. |
| UXP-02 | Teacher sign-out button shows a visual pending state (spinner/disabled) while sign-out is processing | Convert SignOutButton from form action to `useTransition` pattern for immediate disabled state feedback. |
</phase_requirements>

## Summary

This phase requires building a unified context menu component used by both poll and bracket cards, plus adding a pending state to the sign-out button. The codebase audit reveals significant asymmetry between the two card types that must be resolved.

**Current state of bracket cards:** Custom hand-rolled dropdown menu (not using Radix DropdownMenu). Has: MoreVertical trigger, Complete Bracket (active-only), Copy Join Code (active-only), Delete. Missing: Rename, Edit, Share/Copy Link, Duplicate, Archive. The bracket card lives at `src/components/bracket/bracket-card.tsx` and uses manual `useState(menuOpen)` with `useRef` + `useEffect` for outside-click detection.

**Current state of poll cards:** No dropdown menu at all. Has inline icon buttons for Edit (pencil), Duplicate (copy), Delete (trash). Missing: Rename, Share/Copy Link, Archive, and the triple-dot menu pattern itself. The poll card lives at `src/components/poll/poll-card.tsx` and uses `useTransition` for async operations. The poll card is used only from `src/components/poll/poll-card.tsx` but the polls page at `src/app/(dashboard)/polls/page.tsx` renders its own inline cards (not using PollCard component). The PollCard component is not imported by any page.

**Current sign-out:** A simple `<form action={signOut}>` with a Button -- no pending state, no disabled behavior. Used in both the desktop header and mobile drawer.

**Primary recommendation:** Create a shared `CardContextMenu` component using the project's existing Radix `DropdownMenu` UI primitives. Build missing server actions (rename poll, rename bracket, archive bracket, duplicate bracket). Replace the bracket card's hand-rolled menu and the poll card's inline buttons with the unified component.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @radix-ui/react-dropdown-menu | ^2.1.16 | Context menu dropdown | Already installed and wrapped in `src/components/ui/dropdown-menu.tsx`. Provides auto-flip positioning, keyboard navigation, focus management. |
| @radix-ui/react-dialog | ^1.1.15 | Delete confirmation modal | Already installed and wrapped in `src/components/ui/dialog.tsx`. Used by existing ArchiveConfirmDialog and DeleteConfirmDialog. |
| lucide-react | ^0.563.0 | Menu item icons | Already used throughout the project for all iconography. |
| motion | ^12.29.2 | Card removal/appearance animations | Already installed. Project imports as `motion/react`. Used extensively across the codebase (44+ component files). |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react (useTransition) | 19.2.3 | Pending state for async actions | For sign-out button and all menu actions that call server actions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Radix DropdownMenu | Hand-rolled dropdown (current bracket approach) | Bracket currently hand-rolls; must migrate to Radix for accessibility, auto-flip, keyboard nav |
| motion/react for animations | CSS-only animations | motion/react already in the project and provides AnimatePresence for exit animations, which CSS alone cannot handle for removed DOM nodes |

**Installation:** No new packages needed. All libraries already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    shared/
      card-context-menu.tsx    # NEW: Unified menu for both card types
      delete-confirm-dialog.tsx # NEW: Generic delete confirmation (polls + brackets)
    bracket/
      bracket-card.tsx          # MODIFY: Replace hand-rolled menu with CardContextMenu
    poll/
      poll-card.tsx             # MODIFY: Replace inline buttons with CardContextMenu
    auth/
      signout-button.tsx        # MODIFY: Add useTransition pending state
  actions/
    poll.ts                     # ADD: renamePoll action
    bracket.ts                  # ADD: renameBracket, duplicateBracket, archiveBracket actions
  lib/
    dal/
      poll.ts                   # Existing: duplicatePollDAL, deletePollDAL, updatePollStatusDAL (archive via status)
      bracket.ts                # ADD: duplicateBracketDAL, renameBracketDAL; MODIFY: VALID_TRANSITIONS to include archive
```

### Pattern 1: Unified CardContextMenu Component
**What:** A single reusable component that renders the Radix DropdownMenu with all six actions (Rename, Edit, Share, Duplicate, Archive, Delete), parameterized by item type.
**When to use:** On every poll card and bracket card across all dashboard pages.
**Example:**
```typescript
// Source: Codebase analysis of existing session-card-menu.tsx + dropdown-menu.tsx
interface CardContextMenuProps {
  itemId: string
  itemName: string
  itemType: 'poll' | 'bracket'
  status: string
  onRenamed?: (newName: string) => void
  onDuplicated?: (newId: string) => void
  onArchived?: () => void
  onDeleted?: () => void
}

export function CardContextMenu({ itemId, itemName, itemType, status, ...callbacks }: CardContextMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); e.preventDefault() }}
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">{itemType === 'poll' ? 'Poll' : 'Bracket'} options</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={handleRename}>
          <Pencil className="h-4 w-4" /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleEdit}>
          <SquarePen className="h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleShare}>
          <Share2 className="h-4 w-4" /> Share Link
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleDuplicate}>
          <Copy className="h-4 w-4" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleArchive}>
          <Archive className="h-4 w-4" /> Archive
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={handleDelete}>
          <Trash2 className="h-4 w-4" /> Delete {itemType === 'poll' ? 'Poll' : 'Bracket'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Pattern 2: Sign-Out with useTransition
**What:** Convert the sign-out form action to a client-side button with `useTransition` for immediate pending feedback.
**When to use:** For the single SignOutButton component used in header and mobile nav.
**Example:**
```typescript
// Source: Codebase pattern from bracket-card.tsx and archive-confirm-dialog.tsx
'use client'

import { useTransition } from 'react'
import { signOut } from '@/actions/auth'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const [isPending, startTransition] = useTransition()

  function handleSignOut() {
    startTransition(async () => {
      await signOut()
    })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      disabled={isPending}
      className={isPending ? 'opacity-50' : ''}
    >
      {isPending ? 'Signing out...' : 'Sign Out'}
    </Button>
  )
}
```

### Pattern 3: Inline Rename on Card
**What:** When "Rename" is selected from the menu, the card title switches to an inline editable input field.
**When to use:** For the Rename action on both poll and bracket cards.
**Existing reference:** `src/components/teacher/editable-session-name.tsx` implements this exact pattern for session names -- click to edit, Enter to save, Escape to cancel, blur to save.

### Pattern 4: Card Animations with AnimatePresence
**What:** Wrap the card list in `AnimatePresence` and use `motion.div` on each card for entry/exit animations.
**When to use:** For delete (fade out), archive (slide left), and duplicate (highlight pulse) animations.
**Example:**
```typescript
import { motion, AnimatePresence } from 'motion/react'

// In the card list:
<AnimatePresence mode="popLayout">
  {items.map(item => (
    <motion.div
      key={item.id}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -100 }} // or fade for delete
      transition={{ duration: 0.2 }}
    >
      <CardComponent item={item} />
    </motion.div>
  ))}
</AnimatePresence>
```

### Anti-Patterns to Avoid
- **Hand-rolled dropdown menus:** The bracket card currently builds its own dropdown with `useState(menuOpen)`, `useRef`, and manual outside-click detection. This lacks keyboard navigation, focus trapping, and auto-flip positioning. Use Radix DropdownMenu instead.
- **Mixing form actions and client-side transitions:** The current sign-out uses `<form action={signOut}>` which provides no way to show pending state. Convert to `useTransition` + direct function call.
- **Separate delete confirmation patterns:** Poll card and bracket card each have their own hand-rolled delete confirmation modals. Use the project's Radix Dialog-based pattern (like ArchiveConfirmDialog) for consistency.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dropdown menu with keyboard nav | Custom div-based dropdown (current bracket pattern) | Radix DropdownMenu (`src/components/ui/dropdown-menu.tsx`) | Accessibility, auto-flip positioning, focus management, escape key handling -- all built in |
| Delete confirmation modal | Custom fixed-position div overlay (current poll and bracket pattern) | Radix Dialog (`src/components/ui/dialog.tsx`) via project wrappers | Proper focus trapping, overlay click-to-close, escape key, screen reader announcements |
| Exit animations for removed DOM nodes | CSS transitions on removal | `motion/react` AnimatePresence | CSS cannot animate elements being removed from the DOM; AnimatePresence handles this |
| Outside-click detection | Manual `useEffect` + `useRef` + `document.addEventListener` | Radix DropdownMenu (handles this internally) | Already built into Radix, less code, fewer bugs |

**Key insight:** The project already has all the UI primitives (Radix DropdownMenu, Radix Dialog, motion/react). The bracket card just happens to predate their adoption. This phase is a unification, not a greenfield build.

## Common Pitfalls

### Pitfall 1: Event propagation on cards with click-through navigation
**What goes wrong:** Card body is wrapped in `<Link>` (bracket) or has `onClick` (poll). Triple-dot button click also triggers card navigation.
**Why it happens:** Click events bubble from the menu trigger through to the card's link/click handler.
**How to avoid:** Call `e.stopPropagation()` and `e.preventDefault()` on the menu trigger's `onClick`. The existing `session-card-menu.tsx` already demonstrates this pattern.
**Warning signs:** Clicking the triple-dot opens both the menu AND navigates into the item.

### Pitfall 2: Poll status transitions don't include "archive" from all states
**What goes wrong:** Current `VALID_POLL_TRANSITIONS` only allows `closed -> archived`. The user wants archive from all card states.
**Why it happens:** The transition map was designed for forward-only lifecycle, not for archival.
**How to avoid:** Modify `VALID_POLL_TRANSITIONS` in `src/lib/dal/poll.ts` to allow `archived` from `draft`, `active`, and `closed`. Similarly, brackets have no archive status at all in `VALID_TRANSITIONS` -- needs adding.
**Warning signs:** "Archive" menu action fails silently or shows an error when used on draft or active items.

### Pitfall 3: Bracket cards lack archive infrastructure entirely
**What goes wrong:** There is no `archiveBracket` action, no `archived` state in bracket transitions, and the bracket listing pages don't filter archived items.
**Why it happens:** Brackets were built before archiving was implemented. Session archiving (Phase 23) added it for sessions only.
**How to avoid:** Add `archived` as a valid target status from `draft`, `active`, and `completed` in the bracket VALID_TRANSITIONS. Add filtering on the brackets page to exclude archived items. Mirror the session archived page pattern.
**Warning signs:** Archived brackets still show on the main brackets page.

### Pitfall 4: Duplicate bracket is missing server action and DAL function
**What goes wrong:** Poll duplicate exists (`duplicatePollDAL`, `duplicatePoll` action) but bracket has no equivalent.
**Why it happens:** Bracket duplication is more complex -- needs to clone entrants, matchups, and related data.
**How to avoid:** Create `duplicateBracketDAL` that clones bracket + entrants (but NOT matchups/votes -- generate fresh matchups like creation does). Follow the poll duplicate pattern: append " (Copy)" to name, set status to draft.
**Warning signs:** "Duplicate" menu action on brackets has no server action to call.

### Pitfall 5: PollCard component is orphaned
**What goes wrong:** The `PollCard` component at `src/components/poll/poll-card.tsx` is not imported by any page. The polls page (`src/app/(dashboard)/polls/page.tsx`) renders its own inline card markup.
**Why it happens:** The polls page was built with inline cards, and `PollCard` may have been added later without refactoring the page.
**How to avoid:** Use `PollCard` from the polls page and activities page, ensuring the menu is attached. The activities page (`activities-list.tsx`) also renders inline cards without using either `BracketCard` or `PollCard`.
**Warning signs:** Menu changes appear on one page but not another because cards are rendered differently.

### Pitfall 6: AnimatePresence requires managing items in client state
**What goes wrong:** Card lists rendered from server data (`router.refresh()`) bypass AnimatePresence exit animations because React re-renders with the item already removed.
**Why it happens:** Server-side data fetch returns the updated list without the deleted/archived item. AnimatePresence never sees the exit transition.
**How to avoid:** Manage a client-side items array (via `useState`). On delete/archive, optimistically remove the item from local state (triggering AnimatePresence exit animation), then call `router.refresh()` after the animation completes to sync server state.
**Warning signs:** Items disappear instantly on delete/archive instead of animating out.

## Code Examples

Verified patterns from the existing codebase:

### Session Card Menu (existing Radix DropdownMenu usage)
```typescript
// Source: src/components/teacher/session-card-menu.tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button
      className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
      }}
    >
      <MoreVertical className="h-4 w-4" />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); /* action */ }}>
      <Archive className="h-4 w-4" />
      Archive Session
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Inline Editable Name (existing pattern for Rename)
```typescript
// Source: src/components/teacher/editable-session-name.tsx
// Key pattern: isEditing state toggles between display and input
// Enter = save, Escape = cancel, onBlur = save
// Uses useTransition for async save, useRef for auto-focus
```

### Delete Confirmation Dialog (existing Radix Dialog pattern)
```typescript
// Source: src/components/teacher/delete-confirm-dialog.tsx
// Uses Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
// Manages isPending via useTransition
// Button shows "Deleting..." text during pending state
```

### Bracket Card Triple-Dot Position (target to mirror)
```typescript
// Source: src/components/bracket/bracket-card.tsx, line 200-207
// Position: inside "Actions bar" at bottom of card, far right
// Styling: "rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
// Icon: <MoreVertical className="h-4 w-4" />
```

### motion/react AnimatePresence (existing codebase pattern)
```typescript
// Source: src/components/poll/bar-chart.tsx, src/components/student/simple-voting-view.tsx
import { motion, AnimatePresence } from 'motion/react'

// Usage pattern from codebase:
<AnimatePresence>
  {items.map(item => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  ))}
</AnimatePresence>
```

## Discretion Recommendations

### Icon Choices for Menu Actions
**Recommendation:** Use these lucide-react icons (all already available in the project):
| Action | Icon | Rationale |
|--------|------|-----------|
| Rename | `Pencil` | Already used for edit in poll-card.tsx; universally recognized |
| Edit | `SquarePen` | Distinguishes from Rename's pencil; suggests "full edit page" |
| Share/Copy Link | `Link` or `Share2` | `Link` already used in bracket-card.tsx for copy link |
| Duplicate | `Copy` | Already used in poll-card.tsx for duplicate |
| Archive | `Archive` | Already used in session-card-menu.tsx |
| Delete | `Trash2` | Already used in both poll-card.tsx and bracket-card.tsx |

### Animation Durations and Easing
**Recommendation:**
- Delete fade-out: `duration: 0.25, ease: "easeOut"` -- fast enough to feel snappy
- Archive slide-left: `duration: 0.3, ease: [0.4, 0, 0.2, 1]` -- standard Material easing
- Duplicate pulse: `duration: 0.6` highlight ring animation on the new card -- using `animate={{ boxShadow: ['0 0 0 0px rgba(59, 130, 246, 0.5)', '0 0 0 4px rgba(59, 130, 246, 0)', '0 0 0 0px rgba(59, 130, 246, 0)'] }}`

### Sign-Out Button Opacity
**Recommendation:** Use `opacity-50` (0.5) for disabled state. This matches the project's existing `disabled:opacity-50` pattern in the Button component's base styles (line 8 of button.tsx).

### Share/Copy Link Feedback
**Recommendation:** Brief inline text change on the menu item: "Copy Link" becomes "Copied!" for 2 seconds, then reverts. This matches the existing bracket card's copy link behavior (`copied === 'link' ? 'Copied!' : 'Copy Link'`). No toast needed -- consistent with "no success toasts for any action" decision.

### Bracket Card Menu: Restructure vs Add
**Recommendation:** Full restructure. The current bracket card menu is hand-rolled (manual useState, useRef, useEffect for outside-click). It must be replaced with Radix DropdownMenu for accessibility parity and to share the unified component. The current menu items (Complete Bracket, Copy Join Code, Delete) should be handled as follows:
- Complete Bracket: Keep as a separate card action outside the menu (like Go Live / End)
- Copy Join Code: This becomes "Share/Copy Link" in the unified menu
- Delete: Moves into the unified menu

## Codebase Gap Analysis

### What exists (reusable)
| Asset | Location | Reuse Strategy |
|-------|----------|----------------|
| Radix DropdownMenu wrapper | `src/components/ui/dropdown-menu.tsx` | Direct use for unified menu |
| Radix Dialog wrapper | `src/components/ui/dialog.tsx` | Direct use for delete confirmation |
| `duplicatePollDAL` | `src/lib/dal/poll.ts:276` | Already works for poll duplication |
| `duplicatePoll` action | `src/actions/poll.ts:326` | Already works for poll duplication |
| `deletePollDAL` + `deletePoll` action | `src/lib/dal/poll.ts:193`, `src/actions/poll.ts:182` | Already works |
| `deleteBracketDAL` + `deleteBracket` action | `src/lib/dal/bracket.ts:704`, `src/actions/bracket.ts:269` | Already works |
| `updatePollStatusDAL` (archive = status change) | `src/lib/dal/poll.ts:221` | Works for poll archive but needs transition map update |
| `updatePoll` action (rename via question field) | `src/actions/poll.ts:97` | Can rename poll question |
| Editable inline name pattern | `src/components/teacher/editable-session-name.tsx` | Reference pattern for card inline rename |
| Session archive pattern | `src/actions/class-session.ts:205` | Reference for bracket archive |
| motion/react AnimatePresence | Already imported in 44+ files | Standard animation pattern |

### What must be built
| Gap | Action Required |
|-----|----------------|
| Unified CardContextMenu component | Create new shared component |
| Rename bracket (server action + DAL) | Bracket has no rename function -- add `renameBracket` action and `renameBracketDAL` |
| Duplicate bracket (server action + DAL) | Bracket has no duplicate function -- add `duplicateBracket` action and `duplicateBracketDAL` |
| Archive bracket (status transition) | Bracket `VALID_TRANSITIONS` has no `archived` state -- add it and create an `archiveBracket` action |
| Archive poll from any state | `VALID_POLL_TRANSITIONS` only allows `closed -> archived` -- extend to all states |
| Delete confirmation dialog (generic) | Current poll/bracket delete dialogs are hand-rolled `<div>` overlays. Create a reusable Radix Dialog-based component |
| Card list animation wrapper | Wrap card grids in AnimatePresence with client-side state management |
| Sign-out pending state | Modify `SignOutButton` to use `useTransition` |
| Poll cards page refactor | `src/app/(dashboard)/polls/page.tsx` renders inline cards, not using PollCard -- needs to use PollCard with menu |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-rolled dropdowns with useRef/useEffect | Radix DropdownMenu with auto-positioning | Project already migrated for session-card-menu | Bracket card is the last holdout -- must migrate |
| Form actions for sign-out | useTransition for immediate UI feedback | React 19 pattern, already used throughout project | SignOutButton is the last form-action-only component |
| framer-motion | motion/react | framer-motion renamed to motion in v11+ | Project already uses `motion/react` import path |

**Deprecated/outdated:**
- Hand-rolled dropdown in bracket-card.tsx: Replace with Radix DropdownMenu
- Inline delete confirmation divs in poll-card.tsx and bracket-card.tsx: Replace with Radix Dialog component

## Open Questions

1. **Activities page card rendering**
   - What we know: `src/app/(dashboard)/activities/activities-list.tsx` renders its own inline `ActivityItemCard` that doesn't use `BracketCard` or `PollCard` components
   - What's unclear: Should the activities page also get the context menu, or is this phase scoped to the dedicated brackets/polls pages only?
   - Recommendation: Include activities page in the unified menu rollout. The user said "Teachers see consistent UI controls... across all interaction points." The activities page is a primary interaction point. But the inline ActivityItemCard is more compact -- it may need a lighter integration.

2. **Bracket archive page**
   - What we know: Sessions have a dedicated archived page (`src/app/(dashboard)/sessions/archived/page.tsx`). Brackets and polls do not.
   - What's unclear: Does "Archive" for brackets/polls need a dedicated recovery page, or just filtering on the existing list page?
   - Recommendation: Start with filtering on the existing pages (show/hide archived toggle). Dedicated archive page can be a follow-up if needed. The user's decision says "Archive behaves the same as brackets -- moves to archived section, hidden from main dashboard" which implies hiding from main list.

3. **Rename behavior for polls vs brackets**
   - What we know: Polls have `question` as their display name. Brackets have `name`. The existing `updatePoll` action allows updating `question`. Bracket has no rename action.
   - What's unclear: For polls, "Rename" edits the `question` field inline on the card. This is semantically different from renaming a bracket's `name`.
   - Recommendation: Use the same inline edit pattern for both. For polls, Rename updates `question`. For brackets, Rename updates `name`. The implementation is the same -- just different field names in the server action.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/components/bracket/bracket-card.tsx` -- current bracket card implementation (hand-rolled menu, 323 lines)
- Codebase analysis: `src/components/poll/poll-card.tsx` -- current poll card implementation (inline buttons, 150 lines)
- Codebase analysis: `src/components/teacher/session-card-menu.tsx` -- reference Radix DropdownMenu implementation
- Codebase analysis: `src/components/ui/dropdown-menu.tsx` -- Radix DropdownMenu wrapper (supports `variant="destructive"`, separators, icons)
- Codebase analysis: `src/components/ui/dialog.tsx` -- Radix Dialog wrapper with DialogContent, DialogHeader, etc.
- Codebase analysis: `src/components/auth/signout-button.tsx` -- current sign-out (form action, no pending state)
- Codebase analysis: `src/components/teacher/editable-session-name.tsx` -- inline rename pattern reference
- Codebase analysis: `src/lib/dal/poll.ts` -- poll status transitions (draft->active->closed->archived)
- Codebase analysis: `src/lib/dal/bracket.ts` -- bracket status transitions (draft->active->completed, NO archived)
- Codebase analysis: `src/actions/poll.ts` -- existing poll actions (create, update, delete, duplicate, updateStatus)
- Codebase analysis: `src/actions/bracket.ts` -- existing bracket actions (create, updateStatus, updateEntrants, delete -- NO duplicate, rename, archive)
- Codebase analysis: `package.json` -- motion ^12.29.2, @radix-ui/react-dropdown-menu ^2.1.16, @radix-ui/react-dialog ^1.1.15, lucide-react ^0.563.0

### Secondary (MEDIUM confidence)
- Codebase analysis: `src/app/(dashboard)/polls/page.tsx` -- polls page renders inline cards, NOT using PollCard component
- Codebase analysis: `src/app/(dashboard)/activities/activities-list.tsx` -- activities page renders inline ActivityItemCard, not BracketCard/PollCard

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and used in the project
- Architecture: HIGH -- patterns derived directly from existing codebase components
- Pitfalls: HIGH -- identified through direct codebase audit of current implementations

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (30 days -- stable UI component patterns)
