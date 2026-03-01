# Phase 32: Settings Editing - Research

**Researched:** 2026-03-01
**Domain:** Inline display settings toggles, locked structural indicators, real-time broadcast, bracket viewing modes
**Confidence:** HIGH

## Summary

Phase 32 extends the QuickSettingsToggle pattern established in Phase 31.1 to cover all remaining display settings across all bracket types and polls, adds a grouped "Display Settings" section, and introduces locked structural setting indicators with lock icons. The core infrastructure for inline toggles, server actions, database fields, and real-time broadcast already exists from Phase 31.1. The main work falls into four categories: (1) creating a DisplaySettingsSection wrapper component, (2) adding new bracket settings toggles (show seeds, show vote counts) with server actions and broadcast, (3) extending the viewing mode toggle to all bracket types (DE, RR, Predictive), and (4) adding locked structural setting indicators.

The database schema already has `showVoteCounts`, `showSeedNumbers`, and `viewingMode` fields on the Bracket model, and `allowVoteChange` and `showLiveResults` on the Poll model. No schema migration is needed. The broadcast infrastructure already supports `settings_changed` for brackets and `poll_settings_changed` for polls. The `useRealtimeBracket` hook already returns `viewingMode` after refetch and the student bracket state API already returns `showVoteCounts` and `showSeedNumbers`.

The biggest implementation question is what "simple mode" means for bracket types that currently lack one. Predictive brackets already have simple/advanced modes (form vs bracket-click). Round robin already has simple mode (card-by-card MatchupVoteCard) established through `roundRobinVotingStyle`. For DE and the viewing mode toggle extension, the SimpleVotingView (card-by-card matchup) pattern can be reused, but requires filtering votable matchups from the DE bracket structure. The student bracket page currently only routes to SimpleVotingView for `single_elimination` -- this routing needs extension.

**Primary recommendation:** Build incrementally on the 31.1 toggle pattern: add a DisplaySettingsSection container, wire new toggles with server actions following the existing `updateBracketViewingMode` pattern, extend the student bracket page's viewingMode routing to all bracket types, and add a LockedSettingIndicator component for structural settings.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- More inline toggles (same QuickSettingsToggle pattern from 31.1) -- no drawer/modal
- Toggles appear on both detail page AND live dashboard (consistent with 31.1)
- Settings editable in draft, active, and paused states -- NOT on completed activities
- Instant save (toggle = save + broadcast) -- no batch Save button, matches 31.1 behavior
- All settings grouped in a subtle "Display Settings" section (light border/card with label)
- Display Settings section always visible (not collapsed)
- Existing 31.1 toggles should be reorganized into the group -- Claude's discretion on approach
- Add toggles for: show seeds, show vote counts (no timer toggle)
- Show seeds and show vote counts only appear where relevant per bracket type -- Claude determines which types
- Extend viewing mode toggle (simple/advanced) to ALL bracket types: SE, DE, RR, and Predictive
  - Predictive already has simple/advanced views -- toggle should definitely be there
  - RR should offer simple mode matching the card-by-card matchup layout used by other types
  - DE gets simple/advanced toggle as well
- If simple mode student views don't exist for a bracket type, Claude determines what's needed
- Structural settings (bracket type, bracket size, poll type) shown as read-only text with lock icon (e.g., "Type: Single Elimination" with lock)
- NOT grayed-out toggles -- just text with lock icon, clearly non-interactive
- Both brackets AND polls show locked structural indicators
- Polls show poll type as locked (e.g., "Type: Multiple Choice" with lock)
- Show seeds and show vote counts changes broadcast to students in real time (same as viewing mode)
- Reuse existing 31.1 broadcast infrastructure for new settings
- All settings changes affect student views, not just teacher-side

### Claude's Discretion
- Save feedback visual treatment (brief checkmark, toast, or toggle-state-only)
- Section label styling (gear icon + text vs text only)
- Locked settings ordering within the Display Settings group (above or below editable toggles)
- Lock icon tooltip (whether to show "can't be changed after creation" on hover)
- Live dashboard settings placement adaptation to fit live layout
- Whether to reorganize existing 31.1 toggles into the new group or extend around them
- Which bracket types get which specific settings (show seeds, show vote counts relevance)
- Whether DE/RR/Predictive need new simple mode student views or existing views suffice

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @radix-ui/react-switch | ^1.2.6 | Toggle switch primitive | Already installed, used by QuickSettingsToggle from 31.1 |
| Tailwind CSS v4 | ^4 | Styling for display settings section | Project design system |
| Prisma | ^7.3.0 | Database updates for bracket/poll settings | Existing ORM, all fields already in schema |
| Zod | ^4.3.6 | Input validation for new server actions | Consistent with all other actions |
| lucide-react | ^0.563.0 | Lock icon, Eye icon, settings icons | Already installed, used across the app |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase Broadcast | via @supabase/supabase-js | Real-time settings sync to students | On every settings toggle change |
| motion/react | installed | Animations for simple mode transitions | DE simple mode card navigation |

### Alternatives Considered
None -- all infrastructure exists from Phase 31.1. No new libraries needed.

**Installation:**
No new packages needed. All dependencies are already installed.

## Architecture Patterns

### Recommended Changes

```
src/
├── components/
│   ├── shared/
│   │   ├── quick-settings-toggle.tsx        # EXISTING: reuse as-is
│   │   ├── display-settings-section.tsx     # NEW: grouped section wrapper
│   │   └── locked-setting-indicator.tsx     # NEW: read-only text with lock icon
│   ├── bracket/
│   │   └── bracket-detail.tsx               # MODIFY: add display settings section
│   ├── poll/
│   │   └── poll-detail-view.tsx             # MODIFY: add display settings section
│   └── teacher/
│       └── live-dashboard.tsx               # MODIFY: add display settings section
├── actions/
│   ├── bracket.ts                           # MODIFY: add updateBracketSettings action
│   └── poll.ts                              # EXISTING: updatePoll already handles settings
├── hooks/
│   └── use-realtime-bracket.ts              # MODIFY: expose showVoteCounts, showSeedNumbers
├── app/
│   ├── (student)/
│   │   └── session/[sessionId]/bracket/[bracketId]/
│   │       └── page.tsx                     # MODIFY: extend viewingMode routing to all types
│   └── (dashboard)/
│       └── polls/[pollId]/live/
│           └── client.tsx                   # MODIFY: add display settings section
└── lib/
    └── utils/
        └── validation.ts                   # MODIFY: add updateBracketSettingsSchema
```

### Pattern 1: Display Settings Section Container
**What:** A wrapper component that groups toggles and locked indicators in a subtle bordered card with a label
**When to use:** On bracket detail, poll detail, bracket live dashboard, and poll live dashboard pages
**Example:**
```tsx
// src/components/shared/display-settings-section.tsx
interface DisplaySettingsSectionProps {
  children: React.ReactNode
  disabled?: boolean  // True for completed activities
}

export function DisplaySettingsSection({ children, disabled }: DisplaySettingsSectionProps) {
  return (
    <div className={cn(
      "rounded-lg border p-3 space-y-2",
      disabled && "opacity-60 pointer-events-none"
    )}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        <Settings className="h-3.5 w-3.5" />
        Display Settings
      </h3>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  )
}
```

### Pattern 2: Locked Setting Indicator
**What:** Read-only text with a lock icon for non-editable structural settings
**When to use:** For bracket type, bracket size, poll type -- settings that cannot change after creation
**Example:**
```tsx
// src/components/shared/locked-setting-indicator.tsx
interface LockedSettingIndicatorProps {
  label: string    // e.g. "Type"
  value: string    // e.g. "Single Elimination"
  tooltip?: string // e.g. "Cannot be changed after creation"
}

export function LockedSettingIndicator({ label, value, tooltip }: LockedSettingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-sm" title={tooltip}>
      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
```

### Pattern 3: Bracket Settings Server Action (extending 31.1 pattern)
**What:** A generalized server action for updating bracket display settings
**When to use:** For show seeds, show vote counts, and viewing mode changes
**Example:**
```tsx
// Extends pattern from updateBracketViewingMode in src/actions/bracket.ts
const updateBracketSettingsSchema = z.object({
  bracketId: z.string().uuid(),
  viewingMode: z.enum(['simple', 'advanced']).optional(),
  showSeedNumbers: z.boolean().optional(),
  showVoteCounts: z.boolean().optional(),
})

export async function updateBracketSettings(input: unknown) {
  // auth -> validate -> ownership -> prisma.bracket.update -> broadcast -> revalidate
  // Uses broadcastBracketUpdate(bracketId, 'settings_changed', { ...changedFields })
}
```

### Pattern 4: Optimistic Toggle with Revert
**What:** Toggle immediately updates local state, fires server action, reverts on error
**When to use:** Every QuickSettingsToggle handler (matches existing 31.1 pattern)
**Example:**
```tsx
// From poll-detail-view.tsx -- identical pattern for all toggles
async function handleShowSeedsChange(checked: boolean) {
  setIsUpdatingSettings(true)
  setShowSeeds(checked) // optimistic
  try {
    await updateBracketSettings({ bracketId: bracket.id, showSeedNumbers: checked })
  } catch {
    setShowSeeds(!checked) // revert
  } finally {
    setIsUpdatingSettings(false)
  }
}
```

### Anti-Patterns to Avoid
- **Drawer or modal for settings:** Decisions explicitly require inline toggles, no drawer/modal
- **Batch save button:** Decisions require instant save (toggle = save), no save button
- **Collapsed/collapsible section:** Section must always be visible
- **Grayed-out toggles for locked settings:** Must use text with lock icon, not disabled toggles
- **Separate server actions per setting:** Consider a single `updateBracketSettings` action that accepts optional fields, rather than one action per setting

## Existing Code Inventory

### Database Schema (No Migration Needed)

**Bracket model** already has all required fields:
- `viewingMode String @default("advanced")` -- simple/advanced toggle
- `showVoteCounts Boolean @default(true)` -- show/hide vote counts toggle
- `showSeedNumbers Boolean @default(true)` -- show/hide seed numbers toggle
- `votingTimerSeconds Int?` -- NOT being toggled per decisions (no timer toggle)
- `bracketType String @default("single_elimination")` -- locked structural setting
- `size Int` -- locked structural setting

**Poll model** already has all required fields:
- `allowVoteChange Boolean @default(true)` -- toggle from 31.1
- `showLiveResults Boolean @default(false)` -- toggle from 31.1
- `pollType String @default("simple")` -- locked structural setting

### Server Actions (Existing)

**Bracket actions** (`src/actions/bracket.ts`):
- `updateBracketViewingMode`: Updates viewingMode, broadcasts `settings_changed`, revalidates paths
- Pattern: auth -> Zod validate -> ownership check -> prisma.bracket.update -> broadcastBracketUpdate -> revalidatePath

**Poll actions** (`src/actions/poll.ts`):
- `updatePoll`: Already handles `allowVoteChange` and `showLiveResults` updates
- Already broadcasts `poll_settings_changed` when these fields change (lines 131-133)
- Pattern: auth -> Zod validate -> updatePollDAL -> broadcast -> revalidatePath

### Broadcast Infrastructure (Existing)

**Bracket broadcast** (`src/lib/realtime/broadcast.ts`):
- `broadcastBracketUpdate(bracketId, 'settings_changed', payload)` -- type already exists
- Student `useRealtimeBracket` hook already listens for `settings_changed` and triggers full refetch

**Poll broadcast** (`src/lib/realtime/broadcast.ts`):
- `broadcastPollUpdate(pollId, 'poll_settings_changed', payload)` -- type already exists
- Student `useRealtimePoll` hook already listens for `poll_settings_changed` and triggers full refetch

### Real-time Hooks

**`useRealtimeBracket`** (`src/hooks/use-realtime-bracket.ts`):
- Returns: `{ voteCounts, matchups, bracketCompleted, bracketStatus, predictionStatus, viewingMode, transport, refetch }`
- On `settings_changed` event: calls `fetchBracketState()` which fetches from `/api/brackets/[bracketId]/state`
- The state API returns `viewingMode`, `showVoteCounts`, `showSeedNumbers`
- Currently only exposes `viewingMode` to consumers -- **needs extension to expose `showVoteCounts` and `showSeedNumbers`**

**`useRealtimePoll`** (`src/hooks/use-realtime-poll.ts`):
- Returns: `{ voteCounts, totalVotes, pollStatus, bordaScores, allowVoteChange, showLiveResults, transport, participantCount, refetch }`
- On `poll_settings_changed` event: calls `fetchPollState()` which refetches all fields
- Already exposes `allowVoteChange` and `showLiveResults` to consumers

### State API Endpoints

**`/api/brackets/[bracketId]/state`** -- returns all settings including:
- `viewingMode`, `showVoteCounts`, `showSeedNumbers`, `votingTimerSeconds`
- `bracketType`, `predictiveMode`, `predictiveResolutionMode`
- `roundRobinPacing`, `roundRobinVotingStyle`, `roundRobinStandingsMode`

**`/api/polls/[pollId]/state`** -- returns all settings including:
- `allowVoteChange`, `showLiveResults`, `pollType`, `rankingDepth`

### QuickSettingsToggle Component (From 31.1)

Located at `src/components/shared/quick-settings-toggle.tsx`:
- Props: `{ label, checked, onCheckedChange, disabled?, icon?, description? }`
- Uses `<label>` wrapping for accessibility
- Uses Radix Switch internally
- Compact layout: icon + label + switch in a row

### Current Toggle Placement (31.1 State)

**Bracket detail page** (`src/components/bracket/bracket-detail.tsx` line 212-220):
- Viewing mode toggle: only shown for `single_elimination`
- Positioned after BracketMetadataBar, before description

**Bracket live dashboard** (`src/components/teacher/live-dashboard.tsx` line 1246-1255):
- Viewing mode toggle: only shown for `single_elimination`
- Positioned in the header row after pause/resume toggle

**Poll detail page** (`src/components/poll/poll-detail-view.tsx` lines 376-398):
- Show live results + allow vote change toggles
- Positioned inside the read-only card content, in a flex-wrap row

**Poll live dashboard** (`src/app/(dashboard)/polls/[pollId]/live/client.tsx` lines 174-187):
- Show live results + allow vote change toggles
- Positioned in the header row after pause/resume toggle

## Bracket Type Analysis: Settings Relevance & Student Views

### Single Elimination (SE)
- **viewingMode toggle**: EXISTING (31.1) -- simple/advanced routing works
- **showSeedNumbers**: RELEVANT -- already passed to BracketDiagram and AdvancedVotingView
- **showVoteCounts**: RELEVANT -- used to conditionally show vote counts on matchup boxes
- **Student simple mode**: EXISTING -- `SimpleVotingView` component (card-by-card)
- **Student advanced mode**: EXISTING -- `AdvancedVotingView` component (full bracket diagram)

### Double Elimination (DE)
- **viewingMode toggle**: NEW -- extend to DE
- **showSeedNumbers**: RELEVANT -- already passed to BracketDiagram in DoubleElimDiagram
- **showVoteCounts**: RELEVANT -- DE uses BracketDiagram internally which supports vote labels
- **Student simple mode**: NEEDS BUILDING -- currently only shows DoubleElimDiagram (advanced). A simple mode would use MatchupVoteCard card-by-card for votable matchups, similar to how RR simple mode works. Filter to `status === 'voting'` matchups and present them sequentially.
- **Student advanced mode**: EXISTING -- `DEVotingView` in student bracket page with DoubleElimDiagram

### Round Robin (RR)
- **viewingMode toggle**: EXTEND -- RR already has `roundRobinVotingStyle` field ('simple'|'advanced') set at creation time, but Phase 32 wants a runtime toggle. The viewing mode toggle should control this dynamically.
- **showSeedNumbers**: NOT RELEVANT -- RR doesn't use seed positions in its display (matchups show entrant names, not seeds)
- **showVoteCounts**: NOT RELEVANT -- RR matchups use winner/loser status, not vote count displays
- **Student simple mode**: EXISTING -- `RRSimpleVoting` component (card-by-card MatchupVoteCard) already built in student bracket page (lines 844-852). Currently controlled by `roundRobinVotingStyle` from bracket creation, not a runtime toggle.
- **Student advanced mode**: EXISTING -- `RoundRobinMatchups` grid component

### Predictive
- **viewingMode toggle**: EXTEND -- Predictive already has `predictiveMode` field ('simple'|'advanced') set at creation. The toggle should control this dynamically.
- **showSeedNumbers**: RELEVANT -- Predictive uses BracketDiagram in advanced mode which passes `showSeedNumbers`
- **showVoteCounts**: NOT RELEVANT -- Predictive brackets don't have student vote counts (they have predictions, not votes)
- **Student simple mode**: EXISTING -- `SimplePredictionMode` component (form-based sequential prediction)
- **Student advanced mode**: EXISTING -- `AdvancedPredictionMode` component (bracket-click prediction)

### Sports
- **Not in scope** -- CONTEXT.md specifies SE, DE, RR, and Predictive only

### Summary: Settings Per Bracket Type

| Setting | SE | DE | RR | Predictive |
|---------|----|----|-------|------------|
| Viewing Mode (simple/advanced) | Yes (existing) | Yes (new) | Yes (extend) | Yes (extend) |
| Show Seed Numbers | Yes | Yes | No | Yes (advanced mode only) |
| Show Vote Counts | Yes | Yes | No | No |

## Key Implementation Considerations

### 1. Viewing Mode Toggle Extension Strategy

**Problem:** SE uses `viewingMode` field. RR uses `roundRobinVotingStyle` field. Predictive uses `predictiveMode` field. Three different fields for essentially the same concept.

**Recommendation:** Use the `viewingMode` field universally for the runtime toggle across all bracket types. The existing type-specific fields (`roundRobinVotingStyle`, `predictiveMode`) were set at creation time. Rather than repurposing those fields (which might affect creation logic), the `viewingMode` field is already a general-purpose field that exists on all brackets. Update the student page to read `viewingMode` instead of the type-specific fields for display routing.

This approach requires:
1. The student bracket page to check `viewingMode` (from realtime hook) instead of `bracket.roundRobinVotingStyle` for RR and `bracket.predictiveMode` for Predictive
2. The server to update `viewingMode` for all bracket types (the `updateBracketViewingMode` action already works for any type)
3. No schema changes -- `viewingMode` already exists with `simple`/`advanced` enum

### 2. Student Page viewingMode Reactivity

**Current state:** The student bracket page (`src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx`) uses `bracket.viewingMode` from the initial state object (set once on page load). The `useRealtimeBracket` hook DOES return `viewingMode` from refetch, but the top-level routing code at line 419 reads from the statically stored `bracket` object, not from the hook.

**Fix needed:** The student bracket page needs to use `viewingMode` from the `useRealtimeBracket` hook return value instead of from the initial bracket state. This requires restructuring the routing logic so it lives inside a component that calls `useRealtimeBracket` and can react to viewingMode changes.

Current routing structure (problematic):
```
StudentBracketVotingPage
  ├── if predictive → PredictiveStudentView (has its own useRealtimeBracket)
  ├── if round_robin → RRLiveView (has its own useRealtimeBracket)
  ├── if double_elimination → DEVotingView (has its own useRealtimeBracket)
  ├── if bracket.viewingMode === 'simple' → SimpleVotingView  ← STALE
  └── else → AdvancedVotingView
```

The SE routing is the only one that checks viewingMode for routing, and it reads from stale state. DE/RR/Predictive sub-components each have their own `useRealtimeBracket` call, so they CAN access realtime viewingMode internally.

**Recommended approach:** Wrap the SE routing into its own component (like DEVotingView, RRLiveView, etc.) that calls `useRealtimeBracket` and reads `viewingMode` from the hook return. For RR and Predictive, modify their existing sub-components to read `viewingMode` from the hook and use it for mode routing instead of the creation-time field.

### 3. DE Simple Mode Student View

DE currently only shows the full `DoubleElimDiagram` on the student side. A "simple mode" for DE would show votable matchups one at a time using `MatchupVoteCard`, identical to the SE simple mode pattern.

**Implementation approach:**
1. Filter DE matchups to `status === 'voting'`
2. Present them card-by-card using `MatchupVoteCard` (same as SimpleVotingView)
3. Can reuse or extract the sequential card navigation logic from `SimpleVotingView`
4. When all votable matchups are voted, show "waiting for teacher" state

The card-by-card pattern is already proven in `SimpleVotingView` (SE), `RRSimpleVoting` (RR), and just needs adaptation for DE context (back button goes to full diagram view, etc.).

### 4. Realtime Hook Extension for New Settings

The `useRealtimeBracket` hook currently tracks and returns `viewingMode` from refetch. It also fetches `showVoteCounts` and `showSeedNumbers` in the state response (the BracketStateResponse interface has them), but does NOT expose them as state variables.

**Fix needed:** Add `showVoteCounts` and `showSeedNumbers` state tracking to `useRealtimeBracket`, similar to how `viewingMode` is already tracked. These need to be returned so student components can react to changes.

### 5. Completed Activity Guard

Per decisions, settings are NOT editable on completed activities. The `DisplaySettingsSection` should accept a `disabled` prop that grays out the entire section when `status === 'completed'` or `status === 'archived'`. The `QuickSettingsToggle` already supports a `disabled` prop that gets passed through to the Switch.

### 6. Consolidating vs Extending Server Actions

**Option A:** Consolidate `updateBracketViewingMode` into a new `updateBracketSettings` action that handles all display settings (viewingMode, showSeedNumbers, showVoteCounts) in one action with optional fields.

**Option B:** Keep `updateBracketViewingMode` and add separate `updateBracketShowSeeds` and `updateBracketShowVoteCounts` actions.

**Recommendation:** Option A (consolidate). A single `updateBracketSettings` action with optional Zod fields is cleaner and follows the `updatePoll` pattern which already handles multiple optional settings fields. The existing `updateBracketViewingMode` can be replaced by or wrapped around the new consolidated action.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toggle switch | Custom checkbox | `QuickSettingsToggle` + Radix Switch | Already built in 31.1, accessible |
| Real-time broadcast | Custom WebSocket | `broadcastBracketUpdate` / `broadcastPollUpdate` | Existing infrastructure handles reconnection |
| Settings validation | Manual if/else | Zod schemas | Consistent with all actions |
| Lock icon | Custom SVG | `lucide-react` Lock icon | Already installed |
| Card-by-card voting | New component from scratch | Reuse `SimpleVotingView` / `MatchupVoteCard` pattern | Proven pattern in SE and RR |

**Key insight:** This phase is primarily about wiring and extending existing patterns, not building new infrastructure. The 31.1 foundation provides the toggle pattern, broadcast pattern, and optimistic update pattern. The main new work is the container component, locked indicators, and extending viewingMode routing to all bracket types.

## Common Pitfalls

### Pitfall 1: Stale viewingMode on Student Bracket Page
**What goes wrong:** Teacher toggles viewing mode, student page doesn't switch between simple/advanced views.
**Why it happens:** The top-level student bracket page routes based on `bracket.viewingMode` from initial state (line 419), not from the realtime hook. The SE branch doesn't call `useRealtimeBracket` directly -- it delegates to child components.
**How to avoid:** Restructure SE routing into its own component (like `DEVotingView`, `RRLiveView`) that calls `useRealtimeBracket` and reads `viewingMode` from the hook return. Similarly for RR and Predictive, use the hook's viewingMode instead of the creation-time field.
**Warning signs:** viewingMode changes don't take effect on student side until page refresh.

### Pitfall 2: RR viewingMode vs roundRobinVotingStyle Confusion
**What goes wrong:** The toggle sets `viewingMode` but student page reads `bracket.roundRobinVotingStyle` for mode routing.
**Why it happens:** RR was built with a creation-time setting (`roundRobinVotingStyle`) that gets baked into the bracket. Phase 32 adds a runtime toggle that uses the `viewingMode` field.
**How to avoid:** Update the RR student view (`RRLiveView`) to read `viewingMode` from the realtime hook instead of `bracket.roundRobinVotingStyle`. The toggle updates `viewingMode`, so the student must read from the same field.
**Warning signs:** Toggling viewing mode on RR bracket does nothing on student side.

### Pitfall 3: Predictive predictiveMode vs viewingMode Confusion
**What goes wrong:** Same issue as RR. Predictive uses `bracket.predictiveMode` for mode routing (simple form vs advanced bracket-click), but toggle updates `viewingMode`.
**Why it happens:** Predictive was built with `predictiveMode` as a creation-time setting.
**How to avoid:** Update `PredictiveBracket` component (or the student page's predictive routing) to use `viewingMode` from the realtime hook. Consider falling back to `predictiveMode` if `viewingMode` hasn't been set.
**Warning signs:** Toggling viewing mode on predictive bracket does nothing.

### Pitfall 4: showVoteCounts Not Reactive on Student Side
**What goes wrong:** Teacher toggles "show vote counts" off, but students still see vote counts.
**Why it happens:** The `useRealtimeBracket` hook fetches `showVoteCounts` in the state response but doesn't expose it as a state variable or in its return value.
**How to avoid:** Extend `useRealtimeBracket` to track `showVoteCounts` and `showSeedNumbers` state variables (similar to `viewingMode`), and return them. Student components then read these from the hook.
**Warning signs:** Vote count visibility changes require page refresh on student side.

### Pitfall 5: Settings Editable on Completed Activities
**What goes wrong:** Teacher sees active toggles on a completed bracket/poll and changes settings, causing confusion.
**Why it happens:** No guard on toggle disabled state based on activity status.
**How to avoid:** The `DisplaySettingsSection` component should check the activity status and disable all toggles when `status === 'completed'` or `status === 'archived'`. The section may still be visible (to show what the settings were) but toggles should be non-interactive.
**Warning signs:** Teacher can toggle settings on a completed bracket.

### Pitfall 6: Double Server Actions on Bracket Settings
**What goes wrong:** If keeping `updateBracketViewingMode` AND adding `updateBracketSettings`, there are two actions that can update `viewingMode`, leading to confusion about which to use.
**How to avoid:** Replace `updateBracketViewingMode` with a consolidated `updateBracketSettings` action, or have the old action delegate to the new one. All UI code should use a single entry point.
**Warning signs:** Different pages use different actions for the same setting.

## Discretion Recommendations

### Save Feedback Visual Treatment
**Recommendation:** Toggle-state-only feedback (no toast, no checkmark). The toggle flip itself provides instant visual feedback. This matches the 31.1 pattern where toggles have no additional feedback UI. The optimistic update pattern means the toggle appears to work instantly.

### Section Label Styling
**Recommendation:** Gear icon + "Display Settings" text. Use `Settings` icon from lucide-react. The subtle section container already provides visual grouping; the icon+text label reinforces what the section is for.

### Locked Settings Ordering
**Recommendation:** Locked settings ABOVE editable toggles. This matches the natural reading order: "Here's what this activity IS (locked), and here's what you can CHANGE (toggles)." The locked indicators provide context for the editable settings below them.

### Lock Icon Tooltip
**Recommendation:** Yes, include a tooltip "Cannot be changed after creation" on hover. This is a single `title` attribute on the locked setting container -- minimal code, valuable clarification for teachers encountering it for the first time.

### Live Dashboard Settings Placement
**Recommendation:** Place the Display Settings section below the header bar and above the main content area, consistent with where the 31.1 viewing mode toggle already appears. On the live dashboard, the section should be more compact (horizontal layout) to save vertical space, while on detail pages it can be standard vertical layout.

### Reorganize Existing 31.1 Toggles
**Recommendation:** Move existing 31.1 toggles INTO the new Display Settings section. This means:
- Bracket detail: Move viewing mode toggle into the Display Settings section
- Bracket live dashboard: Move viewing mode toggle into the Display Settings section
- Poll detail: Move show live results + allow vote change into the Display Settings section
- Poll live dashboard: Move show live results + allow vote change into the Display Settings section

This creates a unified section rather than toggles scattered across the page. The section placement stays where the existing toggles already are (after metadata, before content).

### Which Bracket Types Get Which Settings

| Setting | SE | DE | RR | Predictive | Rationale |
|---------|----|----|-------|------------|-----------|
| Viewing Mode | Yes | Yes | Yes | Yes | All types have or can have simple/advanced modes |
| Show Seeds | Yes | Yes | No | Yes | RR doesn't display seed positions; others do |
| Show Vote Counts | Yes | Yes | No | No | RR uses win/loss/standings not vote counts; Predictive uses predictions not votes |

### DE/RR/Predictive Simple Mode Views

**DE simple mode:** Build a new simple mode view for DE. Extract the card-by-card pattern from SimpleVotingView into a reusable helper or simply create a DESimpleVotingView that filters votable matchups and shows them sequentially with MatchupVoteCard. This is ~50-80 lines of new code following an established pattern.

**RR simple mode:** Already exists as `RRSimpleVoting` (lines 885+ of student bracket page). Currently gated by `roundRobinVotingStyle === 'simple'`. Just needs to be gated by `viewingMode === 'simple'` instead.

**Predictive simple mode:** Already exists as `SimplePredictionMode` inside `PredictiveBracket`. Currently gated by `predictiveMode === 'simple'`. Just needs to be gated by `viewingMode === 'simple'` instead (or fallback to `predictiveMode`).

## Code Examples

### Existing: QuickSettingsToggle Usage (from 31.1)
```tsx
// Source: src/components/bracket/bracket-detail.tsx lines 212-220
{bracket.bracketType === 'single_elimination' && (
  <QuickSettingsToggle
    label={viewingMode === 'advanced' ? 'Advanced Mode' : 'Simple Mode'}
    checked={viewingMode === 'advanced'}
    onCheckedChange={handleViewingModeChange}
    disabled={isUpdatingMode}
    icon={<Eye className="h-4 w-4" />}
  />
)}
```

### Existing: Optimistic Toggle Handler (from 31.1)
```tsx
// Source: src/components/poll/poll-detail-view.tsx lines 132-142
async function handleShowLiveResultsChange(checked: boolean) {
  setIsUpdatingSettings(true)
  setShowLiveResults(checked) // optimistic
  try {
    await updatePoll({ pollId: poll.id, showLiveResults: checked })
  } catch {
    setShowLiveResults(!checked) // revert
  } finally {
    setIsUpdatingSettings(false)
  }
}
```

### Existing: Broadcast Settings Change (from 31.1)
```tsx
// Source: src/actions/bracket.ts lines 566-567
// After prisma.bracket.update:
await broadcastBracketUpdate(bracketId, 'settings_changed', { viewingMode })
```

### Existing: Student Realtime viewingMode Tracking
```tsx
// Source: src/hooks/use-realtime-bracket.ts lines 107-110
// Track viewing mode changes (for student bracket view)
if (data.viewingMode) {
  setViewingMode(data.viewingMode)
}
```

## Open Questions

1. **viewingMode field semantics for RR and Predictive**
   - What we know: RR has `roundRobinVotingStyle` (creation-time), Predictive has `predictiveMode` (creation-time). Both are separate from `viewingMode`.
   - What's unclear: Should the toggle update `viewingMode` (universal field) or the type-specific field? If using `viewingMode`, should it be initialized from the type-specific field on first toggle?
   - Recommendation: Use `viewingMode` for the toggle, and on the student side, read `viewingMode` with a fallback to the type-specific field: `const mode = viewingMode ?? bracket.predictiveMode ?? 'simple'`. This preserves backward compatibility for brackets created before Phase 32.

2. **Should DE simple mode be a separate component or a mode within DEVotingView?**
   - What we know: SE has two completely separate components (SimpleVotingView, AdvancedVotingView). RR has inline mode switching within RRLiveView.
   - What's unclear: Is it better to follow SE pattern (separate component) or RR pattern (inline)?
   - Recommendation: Inline within DEVotingView, gated by viewingMode. This keeps the realtime subscription in one place and avoids duplicating the vote state management. The "simple mode" rendering is just a different child component (MatchupVoteCard sequence) within the same parent.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all referenced files:
  - `src/components/shared/quick-settings-toggle.tsx` (QuickSettingsToggle component)
  - `src/components/bracket/bracket-detail.tsx` (bracket detail page with viewing mode toggle)
  - `src/components/poll/poll-detail-view.tsx` (poll detail page with settings toggles)
  - `src/components/teacher/live-dashboard.tsx` (live dashboard with viewing mode toggle)
  - `src/app/(dashboard)/polls/[pollId]/live/client.tsx` (poll live with settings toggles)
  - `src/actions/bracket.ts` (updateBracketViewingMode action)
  - `src/actions/poll.ts` (updatePoll with settings broadcast)
  - `src/lib/realtime/broadcast.ts` (all broadcast types including settings_changed)
  - `src/hooks/use-realtime-bracket.ts` (viewingMode tracking, settings_changed handling)
  - `src/hooks/use-realtime-poll.ts` (settings tracking, poll_settings_changed handling)
  - `src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx` (student bracket routing for all types)
  - `src/components/student/simple-voting-view.tsx` (SE simple mode)
  - `src/components/student/advanced-voting-view.tsx` (SE advanced mode)
  - `src/components/bracket/predictive-bracket.tsx` (predictive simple/advanced modes)
  - `src/components/bracket/double-elim-diagram.tsx` (DE diagram component)
  - `src/app/api/brackets/[bracketId]/state/route.ts` (bracket state API)
  - `src/app/api/polls/[pollId]/state/route.ts` (poll state API)
  - `prisma/schema.prisma` (all model fields)
  - `src/lib/bracket/types.ts` (type definitions)
  - `src/lib/utils/validation.ts` (Zod schemas)

### Secondary (MEDIUM confidence)
- Phase 31.1 RESEARCH.md -- architecture patterns and decisions from the foundation phase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use, no new dependencies
- Architecture: HIGH -- extends proven 31.1 patterns with direct code evidence
- Pitfalls: HIGH -- identified through tracing actual code paths (viewingMode routing, hook return values)
- Bracket type analysis: HIGH -- verified by reading each bracket type's student component
- DE simple mode scope: MEDIUM -- straightforward pattern reuse but exact code structure needs implementation-time decisions
- RR/Predictive viewingMode field semantics: MEDIUM -- multiple valid approaches, needs planner decision

**Research date:** 2026-03-01
**Valid until:** 2026-03-31 (stable domain, internal codebase patterns)
