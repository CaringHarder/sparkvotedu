# Phase 11: Visual Bracket Placement - Research

**Researched:** 2026-02-16
**Domain:** Drag-and-drop seeding interface for bracket creation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Drag Interaction Model
- Dual interaction: drag-and-drop on desktop, click-to-select then click-to-place as fallback (especially for mobile/touch)
- Dragging an entrant onto an occupied slot swaps their positions automatically
- Both drag-back-to-pool and click-X-button methods for removing a placed entrant
- Auto-seed button places entrants in their current list order (seed 1 in slot 1, etc.) -- no random shuffle option
- Empty slots highlight (glow) when an entrant is being dragged, showing valid drop targets
- Entrants in the pool show their seed number as numbered badges
- Seed numbers stay fixed from the original list -- placing seed 3 in slot 1 keeps them labeled as seed 3
- Large brackets (32+) use existing section navigation (Top/Bottom, quadrants) for navigating the bracket during placement

#### Placement Layout
- During placement, only Round 1 matchup slots and bye slots are shown -- later rounds are hidden
- Entrant pool position is Claude's discretion (left sidebar, top panel, etc.)
- Empty slot visual treatment is Claude's discretion

#### Mode Switching
- Toggle between list reorder (current behavior) and visual bracket placement -- integration point is Claude's discretion
- Switching between modes preserves placements -- list reorder reflects visual positions and vice versa
- Visual placement available for all bracket types (SE, DE, round-robin, predictive)
- Visual placement available in both creation wizard and when editing draft bracket entrants

#### Bye Slot Handling
- Byes auto-placed by the seeding algorithm but teachers can move them to different slots
- Bye slots show 'BYE' label in italic muted style (consistent with existing Phase 7 bye rendering)
- Moving a bye to an occupied slot swaps positions -- entrant moves to where the bye was
- No reset button for bye positions -- teacher must manually move byes back if desired

### Claude's Discretion
- Entrant pool position relative to bracket diagram (left sidebar, top panel, etc.)
- Empty slot visual treatment (dashed border, dimmed seed label, etc.)
- Where in the creation flow the visual placement toggle appears (Step 3 toggle vs separate step)
- Drag-and-drop library choice (dnd-kit, native HTML5 DnD, etc.)
- How round-robin visual placement works (no bracket diagram -- may need different visual approach)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

## Summary

Phase 11 adds a visual bracket placement mode where teachers drag entrants from a pool into specific Round 1 bracket slots. The existing codebase uses native HTML5 drag-and-drop for list reordering in `entrant-list.tsx`, but this phase requires a fundamentally different interaction pattern: dragging from a source pool to target slots in an SVG bracket diagram, plus click-to-place fallback for mobile.

The bracket diagram (`bracket-diagram.tsx`) is an SVG-based renderer with a well-defined position calculation system (`getMatchPosition`). The key architectural challenge is that the diagram currently renders within an SVG context (using `<rect>`, `<text>`, `<g>` elements), but drag-and-drop libraries operate on DOM elements. This means the placement UI needs either: (a) an HTML overlay on top of the SVG for drop targets, or (b) a parallel HTML-based Round 1 layout for placement mode that bypasses the SVG diagram entirely. Option (b) is strongly recommended because it aligns with the decision to show only Round 1 during placement (hiding later rounds), and HTML elements have native DnD support.

For the DnD library, **`@dnd-kit/react` v0.3.0** is the recommended choice. It supports React 19 (the project's version), provides both `useDraggable` and `useDroppable` hooks for the pool-to-slot paradigm, handles touch via configurable sensors, and is actively maintained. The project has no DnD library currently installed. Native HTML5 DnD (already used in `entrant-list.tsx`) is insufficient because it lacks touch support, custom drag previews, and the drop-target highlighting required by the locked decisions.

**Primary recommendation:** Use `@dnd-kit/react` for DnD, build a dedicated HTML-based Round 1 placement view (not SVG), integrate as a toggle within Step 2 of the bracket creation wizard, and use a matchup grid for round-robin visual placement.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/react | ^0.3.0 | Draggable/droppable hooks | React 19 compatible, supports touch sensors, active maintenance |
| @dnd-kit/dom | ^0.3.0 | DOM-specific plugins and sensors | Required peer for @dnd-kit/react DOM interactions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| motion (already installed) | ^12.29.2 | Animate slot highlights, swap transitions | Glow effects on valid drop targets, smooth swap animations |
| lucide-react (already installed) | ^0.563.0 | Icons for toggle, auto-seed button | GripVertical, Shuffle, LayoutGrid icons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/react | Native HTML5 DnD | Already used for list reorder; lacks touch support, no drop-target highlighting API, no drag preview customization -- insufficient for this feature |
| @dnd-kit/react | @hello-pangea/dnd v18 | Now supports React 19; excellent for list reordering but designed for lists, not grid/slot placement; no `useDroppable` for arbitrary targets |
| @dnd-kit/react | pragmatic-drag-and-drop | Framework-agnostic core is good; React 19 support incomplete in helper packages |

**Installation:**
```bash
npm install @dnd-kit/react @dnd-kit/dom
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/bracket/
│   ├── visual-placement/
│   │   ├── placement-provider.tsx      # DragDropProvider wrapper with event handlers
│   │   ├── entrant-pool.tsx            # Draggable entrant list (source)
│   │   ├── placement-slot.tsx          # Single droppable slot (Round 1 position)
│   │   ├── placement-bracket.tsx       # Round 1 slot grid for SE/DE/predictive
│   │   ├── placement-matchup-grid.tsx  # Round-robin matchup grid layout
│   │   └── placement-mode-toggle.tsx   # Toggle between list reorder and visual
│   ├── entrant-list.tsx                # Existing list reorder (unchanged)
│   ├── bracket-form.tsx                # Creation wizard (add toggle in Step 2)
│   └── bracket-edit-form.tsx           # Edit form (add toggle)
├── lib/bracket/
│   └── placement.ts                    # Pure functions: slot mapping, swap logic, auto-seed
```

### Pattern 1: Pool-to-Slot Drag with DnD Kit
**What:** Entrants live in a pool (left sidebar). Bracket slots are droppable targets. Dragging an entrant to a slot places it; dragging to an occupied slot swaps.
**When to use:** SE, DE, predictive bracket types (tree-based layouts).
**Example:**
```typescript
// Source: https://dndkit.com/react/hooks/use-draggable
import { useDraggable } from '@dnd-kit/react';
import { useDroppable } from '@dnd-kit/react';

function PoolEntrant({ entrant }: { entrant: FormEntrant }) {
  const { ref, isDragSource } = useDraggable({
    id: `pool-${entrant.id}`,
    data: { type: 'entrant', entrant },
  });
  return (
    <div ref={ref} className={isDragSource ? 'opacity-50' : ''}>
      <span className="seed-badge">{entrant.seedPosition}</span>
      {entrant.name}
    </div>
  );
}

function BracketSlot({ slotIndex, placedEntrant, byeSlot }: SlotProps) {
  const { ref, isDropTarget } = useDroppable({
    id: `slot-${slotIndex}`,
    data: { type: 'slot', slotIndex },
  });
  return (
    <div ref={ref} className={isDropTarget ? 'ring-2 ring-primary shadow-glow' : 'border-dashed'}>
      {placedEntrant ? (
        <PlacedEntrant entrant={placedEntrant} />
      ) : byeSlot ? (
        <span className="italic text-muted-foreground">BYE</span>
      ) : (
        <span className="text-muted-foreground">Empty</span>
      )}
    </div>
  );
}
```

### Pattern 2: Click-to-Place Fallback for Mobile
**What:** On mobile/touch, tapping an entrant in the pool "selects" it (highlighted state), then tapping a slot places it there. Tapping another entrant deselects the first.
**When to use:** Touch devices where drag-and-drop is less ergonomic.
**Example:**
```typescript
// State-based click-to-place (no DnD needed)
const [selectedEntrant, setSelectedEntrant] = useState<string | null>(null);

function handlePoolTap(entrantId: string) {
  setSelectedEntrant(prev => prev === entrantId ? null : entrantId);
}

function handleSlotTap(slotIndex: number) {
  if (!selectedEntrant) return;
  placeEntrant(selectedEntrant, slotIndex); // swap logic
  setSelectedEntrant(null);
}
```

### Pattern 3: Bidirectional State Sync Between Modes
**What:** The entrant ordering (seedPosition assignments) is the single source of truth. Visual placement reads/writes to the same `entrants` state array. Switching modes does not reset state.
**When to use:** Always -- this is the core data model.
**Example:**
```typescript
// entrants state: [{id, name, seedPosition}, ...]
// In list mode: seedPosition = index + 1 (reorder updates seedPosition)
// In visual mode: seedPosition maps to bracket slot via engine seeding
//
// The mapping is: getStandardSeed(position, bracketSize, slot) from engine.ts
// Slot 1 of position P = one seed, Slot 2 of position P = another seed
//
// To place entrant X in bracket slot S:
// 1. Find which seedPosition maps to slot S (via buildSeedOrder)
// 2. Swap entrant X's seedPosition with whatever was at that position
// 3. Both list and visual mode reflect the new ordering
```

### Pattern 4: Round-Robin Matchup Grid Placement
**What:** Since RR has no bracket tree, visual placement shows a matchup matrix/grid where rows are rounds and columns are matchup pairings. Teachers drag entrants into the grid positions.
**When to use:** Round-robin brackets only.
**Example:**
```
Round 1:  [Slot A vs Slot B]  [Slot C vs Slot D]  [Slot E vs Slot F]
Round 2:  [Slot A vs Slot C]  [Slot B vs Slot F]  [Slot D vs Slot E]
...
```
The grid is generated by `generateRoundRobinRounds()` from `round-robin.ts`, using the circle method. Each slot is a droppable target. The seed number determines which matchups an entrant appears in across all rounds.

### Anti-Patterns to Avoid
- **Rendering drop targets inside SVG:** SVG elements do not participate in HTML5 drag-and-drop events. Never try to make `<rect>` or `<g>` elements droppable. Use HTML overlays or a parallel HTML layout.
- **Mutating entrant IDs on placement:** The `id` field is a stable client-side key. Only `seedPosition` changes during placement. Never regenerate IDs when moving entrants.
- **Separate state for visual vs list mode:** There must be ONE entrants array. Visual placement mode is a different VIEW of the same data, not a separate data structure.
- **Rebuilding matchups on every drag:** The matchup structure is generated from the entrant seed order when the bracket is created (server-side). During visual placement, we are only reordering seeds -- matchup generation happens once at submit time.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Touch DnD support | Custom touch event handlers | @dnd-kit/react sensors | Edge cases: scroll vs drag, multi-touch, iOS quirks |
| Drag preview / ghost | Custom absolutely-positioned clone | @dnd-kit feedback prop | Library handles z-index, transforms, cleanup |
| Collision detection | Manual hit-testing | @dnd-kit collision detectors | Handles overlapping targets, thresholds, edge cases |
| Seed-to-slot mapping | Custom seed calculation | `buildSeedOrder()` from engine.ts | Already tested, handles all bracket sizes including non-power-of-2 with byes |
| RR schedule generation | Custom pairing algorithm | `generateRoundRobinRounds()` from round-robin.ts | Circle method already implemented and tested |

**Key insight:** The seeding algorithm (`buildSeedOrder` in `engine.ts`) is the critical bridge between "entrant list order" and "bracket slot position". This function already exists and is well-tested. Visual placement is essentially a UI for rearranging the input to this algorithm.

## Common Pitfalls

### Pitfall 1: SVG and HTML DnD Incompatibility
**What goes wrong:** Attempting to use `useDroppable` on SVG elements inside `<svg>` fails because HTML5 drag events don't fire on SVG child elements.
**Why it happens:** The bracket diagram (`bracket-diagram.tsx`) renders everything as SVG. Developers naturally try to add drop zones to the existing SVG matchup boxes.
**How to avoid:** Build the placement view as a separate HTML-based component that mirrors the Round 1 layout. Do NOT modify `bracket-diagram.tsx` for placement. The placement view is only shown during creation/editing and only shows Round 1.
**Warning signs:** Drop events not firing, `isDropTarget` always false on SVG elements.

### Pitfall 2: Seed Number vs Slot Position Confusion
**What goes wrong:** Conflating "seed number" (the entrant's rank, e.g. seed 3) with "bracket slot" (the physical position in the bracket, e.g. R1P2 top slot). These are NOT the same due to standard seeding order.
**Why it happens:** Standard tournament seeding interleaves seeds: in an 8-bracket, R1P1 = seed 1 vs seed 8, R1P2 = seed 4 vs seed 5, etc. The mapping is non-obvious.
**How to avoid:** Use `buildSeedOrder()` from `engine.ts` to translate between seed positions and bracket slots. Always store data as seed positions (consistent with existing model).
**Warning signs:** Entrant appearing in wrong bracket position, seeding order not matching standard tournament brackets.

### Pitfall 3: Mode Switch Losing State
**What goes wrong:** Switching from visual to list mode (or vice versa) resets placements.
**Why it happens:** If visual mode uses a separate state (e.g., `slotAssignments` map) instead of writing back to the `entrants` array, mode switches lose the visual state.
**How to avoid:** Both modes read/write to the SAME `entrants` state array via `seedPosition`. Visual mode is a lens over this data, not a separate store.
**Warning signs:** Placements disappear when toggling modes.

### Pitfall 4: Bye Placement Edge Cases
**What goes wrong:** Moving a bye to a non-bye slot (or moving an entrant to a bye slot) breaks the expected bye count or creates impossible bracket states.
**Why it happens:** Byes are computed from `calculateBracketSizeWithByes()` based on entrant count. Moving byes around changes which seeds get first-round byes but must preserve the total bye count.
**How to avoid:** Treat byes as virtual entrants in the placement grid. The bye count is fixed (determined by `bracketSize - entrantCount`). Moving a bye to an entrant's slot swaps them -- the entrant moves to where the bye was. The system enforces that the total number of byes is always `bracketSize - entrantCount`.
**Warning signs:** Bye count changing after placement, entrant count mismatching bracket size.

### Pitfall 5: Large Bracket Navigation During Placement
**What goes wrong:** For 32+ entrant brackets, trying to show all Round 1 slots at once is unusable.
**Why it happens:** 32 brackets have 16 R1 matchups (32 entrant slots). 64 brackets have 32 R1 matchups (64 entrant slots). These don't fit on screen.
**How to avoid:** Reuse `computeRegions()` from `region-bracket-view.tsx` to split Round 1 slots into navigable sections (Top/Bottom for 32, quadrants for 64). Show one section at a time with the existing `BracketMiniMap` navigator.
**Warning signs:** Tiny unreadable slots, horizontal scrolling needed, unusable on mobile.

## Code Examples

Verified patterns from the existing codebase:

### Existing Entrant List Interface (entrant-list.tsx)
```typescript
// The current list reorder uses native HTML5 DnD:
// - handleDragStart sets e.dataTransfer.effectAllowed = 'move'
// - handleDragOver calls e.preventDefault() + sets drop index
// - handleDrop splices and reinserts at new position
// - handleDragEnd cleans up state
// - Also has move up/down buttons as fallback
// - Shows seed badges and bye indicators

interface EntrantItem {
  id: string
  name: string
  seedPosition: number
}
```

### Seed Order Calculation (engine.ts)
```typescript
// buildSeedOrder(8) returns [1, 8, 4, 5, 2, 7, 3, 6]
// This means:
//   R1P1: seed 1 (index 0) vs seed 8 (index 1)
//   R1P2: seed 4 (index 2) vs seed 5 (index 3)
//   R1P3: seed 2 (index 4) vs seed 7 (index 5)
//   R1P4: seed 3 (index 6) vs seed 6 (index 7)
//
// For visual placement: bracket slot = index in seed order
// To find which seed goes in slot S: seedOrder[S]
// To find which slot a seed is in: seedOrder.indexOf(seed)
```

### Bye Calculation (byes.ts)
```typescript
// calculateBracketSizeWithByes(5)
// => { bracketSize: 8, numByes: 3, byeSeeds: [1, 2, 3] }
//
// generateMatchupsWithByes(5) marks R1 matchups where a seed > entrantCount as bye:
// R1P1: seed 1 vs null (BYE) -- seed 8 > 5
// R1P2: seed 4 vs seed 5
// R1P3: seed 2 vs null (BYE) -- seed 7 > 5
// R1P4: seed 3 vs null (BYE) -- seed 6 > 5
```

### Region Navigation for Large Brackets (region-bracket-view.tsx)
```typescript
// computeRegions(matchups, totalRounds) splits into navigable sections:
// - 32 entrants: 2 regions (Top Half / Bottom Half)
// - 64 entrants: 4 regions (Region 1-4)
// Each region has at most 16 entrants (4 rounds)
// The BracketMiniMap component provides tab-based navigation between regions
```

### Bracket Form Wizard Steps (bracket-form.tsx)
```typescript
// 3-step wizard: Info (1) -> Entrants (2) -> Review (3)
// Step 2 has tabs: Manual | CSV Upload | Topic Lists
// EntrantList shown below with DnD reorder
// The visual placement toggle fits naturally in Step 2 as an additional mode
// State: entrants array with {id, name, seedPosition}
// handleReorder reassigns seedPosition on every reorder
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd (Atlassian) | @hello-pangea/dnd (community fork) | 2022 | Original deprecated, fork maintained |
| @dnd-kit/core (hooks-only) | @dnd-kit/react (component model) | 2024-2025 | New API with DragDropProvider, cleaner than old hooks |
| Native HTML5 DnD only | Library DnD with touch support | Ongoing | Touch devices require library support; native DnD has no touch API |
| SVG-only bracket rendering | SVG for display, HTML for interaction | Current best practice | SVG is great for visual rendering but poor for interactive DOM events |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Deprecated by Atlassian. Do not use.
- `react-dnd`: Still maintained but older API style, more boilerplate. React 19 support unclear.
- `@dnd-kit/core` + `@dnd-kit/sortable` (old API): Superseded by `@dnd-kit/react` 0.3 with cleaner component model.

## Design Recommendations (Claude's Discretion Areas)

### Entrant Pool Position: Left Sidebar
**Recommendation:** Position the entrant pool as a sticky left sidebar (desktop) that collapses to a top panel (mobile). The bracket slot grid occupies the right/main area.
**Rationale:** Left sidebar is the standard pattern for source panels in visual editors (Figma, VS Code). Teachers naturally read left-to-right: pick from pool (left), place in bracket (right). On mobile, the pool becomes a horizontally-scrollable chip bar at the top.

### Empty Slot Visual Treatment: Dashed Border + Seed Label
**Recommendation:** Empty slots show a dashed border with the expected seed number dimmed inside (e.g., "Seed 3" in muted text). When a drag is active, valid empty slots pulse with a primary-color glow ring.
**Rationale:** The dashed border is a universal "drop here" affordance. Showing the expected seed number helps teachers understand the standard seeding placement they're overriding.

### Toggle Placement in Creation Flow: Step 2 Mode Switch
**Recommendation:** Add a segmented control (toggle) at the top of Step 2 (Entrants): `List Reorder | Visual Placement`. Default to List Reorder (current behavior). When toggled, the EntrantList is replaced by the visual placement UI. The entrant count badge and add-entrant controls remain visible in both modes.
**Rationale:** Step 2 is where entrant management already lives. Adding a separate step (Step 2.5) would complicate the wizard flow. A toggle within Step 2 keeps the information architecture flat and the step count unchanged.

### DnD Library: @dnd-kit/react
**Recommendation:** Use `@dnd-kit/react` v0.3.0 with `@dnd-kit/dom`.
**Rationale:** (1) Supports React 19.2.3 (project's version). (2) Provides both `useDraggable` and `useDroppable` hooks for pool-to-slot pattern. (3) `isDropTarget` state enables the required glow highlighting. (4) Touch sensor support built-in for mobile click-to-place fallback. (5) Active maintenance with recent releases (6 days ago as of research date). (6) Not list-only like @hello-pangea/dnd.

### Round-Robin Visual Placement: Matchup Pair Grid
**Recommendation:** For round-robin, show a grid of matchup pairs generated by `generateRoundRobinRounds()`. Each cell shows two drop slots (entrant A vs entrant B). The grid is organized by round rows. Since RR entrant count is capped at 8, the entire grid fits on screen without navigation.
**Rationale:** RR has no bracket tree structure. The schedule generated by the circle method is the natural visual representation. With max 8 entrants producing max 28 matchups across 7 rounds, the grid is manageable. Changing an entrant's seed position changes which matchups they appear in across all rounds, so the grid should live-update as entrants are placed.

## Open Questions

1. **Double-elimination placement scope**
   - What we know: DE brackets have winners bracket, losers bracket, and grand finals regions. R1 of winners bracket is the seeded round.
   - What's unclear: Should visual placement only show winners bracket R1 slots (since losers bracket is populated by losses, not seeding)? The answer is almost certainly yes -- only WB R1 is seeded.
   - Recommendation: Scope visual placement to winners bracket R1 only for DE. This aligns with how `generateMatchupsWithByes` works (it generates the initial seeding structure for the WB).

2. **Predictive bracket placement timing**
   - What we know: Predictive brackets use the same R1 seeding as SE. The matchup structure is identical.
   - What's unclear: Does visual placement happen at bracket creation time (before predictions open) or can it be edited after?
   - Recommendation: Same as SE -- placement during creation (Step 2) and when editing draft brackets. Once predictions are open, seeding is locked.

3. **Accessibility for click-to-place on desktop**
   - What we know: The locked decision says click-to-select then click-to-place is the mobile fallback.
   - What's unclear: Should click-to-place also be available on desktop as a keyboard-accessible alternative?
   - Recommendation: Yes. Make click-to-place work everywhere as the keyboard/assistive-technology accessible path. DnD is the enhanced desktop experience, click-to-place is the universal fallback.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** - Read and analyzed 15+ source files in `src/components/bracket/` and `src/lib/bracket/`
  - `entrant-list.tsx`: Current DnD implementation (native HTML5)
  - `bracket-form.tsx`: 3-step creation wizard with entrant management in Step 2
  - `bracket-edit-form.tsx`: Draft bracket editing interface
  - `bracket-diagram.tsx`: SVG-based bracket renderer with position calculation
  - `region-bracket-view.tsx`: Section navigation for 32+ brackets
  - `bracket-mini-map.tsx`: Region card navigator
  - `engine.ts`: Seed order calculation (`buildSeedOrder`, `generateMatchups`)
  - `byes.ts`: Bye calculation and matchup generation with byes
  - `round-robin.ts`: Circle method schedule generation
  - `types.ts`: All type definitions
  - `double-elim-diagram.tsx`: DE bracket rendering with WB/LB/GF tabs
  - `bracket-zoom-wrapper.tsx`: Zoom/pan for large brackets
- **npm registry** - Verified peer dependencies via `npm info`:
  - `@dnd-kit/react@0.3.0`: peerDeps `react ^18 || ^19`, `react-dom ^18 || ^19`
  - `@dnd-kit/dom@0.3.0`: required companion for DOM interactions
  - `@hello-pangea/dnd@18.0.1`: peerDeps now include `react ^18 || ^19`

### Secondary (MEDIUM confidence)
- **dnd-kit official docs** (https://dndkit.com/react/components/drag-drop-provider) - DragDropProvider API, event handlers, useDraggable/useDroppable hooks
- **Puck blog** (https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) - 2026 DnD library comparison, dnd-kit recommended for non-list layouts
- **GitHub issues** (https://github.com/clauderic/dnd-kit/issues/1194) - dnd-kit maintenance status, refactor to framework-agnostic architecture

### Tertiary (LOW confidence)
- **@dnd-kit/react 0.3.0 stability** - This is a 0.x release (pre-1.0). API may have breaking changes. The "use client" issue (GitHub #1654) suggests some rough edges with Next.js App Router. Mitigation: all components using dnd-kit must have 'use client' directive (which they will, since they're interactive).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified React 19 peer deps via npm, confirmed no existing DnD lib in project
- Architecture: HIGH - Deep codebase analysis of all relevant bracket components, clear separation between SVG display and HTML interaction
- Pitfalls: HIGH - Identified from direct analysis of SVG rendering code and DnD event model limitations
- RR approach: MEDIUM - Logical recommendation based on existing `generateRoundRobinRounds()` output, but no prior art for RR visual placement in this codebase

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (stable domain, well-understood patterns)
