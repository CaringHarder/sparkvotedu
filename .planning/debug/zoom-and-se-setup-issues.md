---
status: diagnosed
trigger: "Three issues from UAT Test 16 R3: pinch zoom affects whole page, brackets >16 need quadrant views, SE brackets missing simple/advanced setup option"
created: 2026-02-02T00:00:00Z
updated: 2026-02-02T00:00:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: Three distinct root causes confirmed across zoom scoping, quadrant navigation, and bracket-form feature gaps
test: Full code trace through use-pan-zoom.ts, bracket-zoom-wrapper.tsx, bracket-diagram.tsx, bracket-form.tsx, and student page routing
expecting: N/A -- all three root causes confirmed
next_action: Return diagnosis

## Symptoms

### Issue 1: Pinch zoom affects entire page
expected: Two-finger pinch gesture on trackpad should zoom only the bracket container, not the entire browser page
actual: Pinch-to-zoom zooms the entire browser page (native browser zoom behavior)
errors: None (silent -- browser handles the gesture natively)
reproduction: Open a 32+ entrant bracket, use two-finger pinch gesture on trackpad
started: Present since BracketZoomWrapper was rewritten (GAP-R3-04 fix replaced usePanZoom with native scroll + button-only zoom)

### Issue 2: Brackets >16 need quadrant views
expected: For 32+ entrant brackets, a way to view the bracket in sections/quadrants (top/bottom or left/right halves) for easier interaction
actual: The full bracket diagram renders as one massive SVG with only zoom in/out controls; no quadrant/section navigation exists
errors: N/A (feature gap)
reproduction: Create a 32 or 64 entrant SE bracket, observe the diagram is one continuous view
started: Never implemented

### Issue 3: SE brackets missing simple/advanced mode in setup
expected: Bracket creation wizard should offer simple vs advanced viewing mode selection for single-elimination brackets
actual: The bracket-form.tsx shows type-specific options for round_robin (voting style), predictive (prediction mode), and double_elimination (play-in), but shows NO options for single_elimination
errors: N/A (feature gap in form UI)
reproduction: Open bracket creation form, select Single Elimination, observe no simple/advanced option appears
started: Never implemented in the creation form; viewingMode defaults to "advanced" in the database schema

---

## ISSUE 1: Pinch Zoom Affects Entire Page (Not Scoped to Bracket Container)

### Root Cause

**File:** `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/components/bracket/bracket-zoom-wrapper.tsx`
**Lines:** 42-124 (entire component)

The `BracketZoomWrapper` component was rewritten to fix GAP-R3-04 (zoom buttons not working due to pointer capture). The rewrite intentionally removed all wheel/touch event interception and replaced the interaction model with native `overflow: auto` scrolling plus button-only zoom controls.

The critical consequence: **the component no longer intercepts pinch/wheel gestures at all**. There is:

1. **No `wheel` event listener** on the container -- the old `usePanZoom` hook had one (line 128 of `use-pan-zoom.ts`: `el.addEventListener('wheel', handleWheel, { passive: false })`), but the new wrapper does not use the hook.
2. **No `touchmove` event listener** -- the old hook had one (line 132: `el.addEventListener('touchmove', handleTouchMove, { passive: false })`), but the new wrapper does not.
3. **No `touch-action: none` CSS property** on the container -- without this, the browser's default touch/trackpad behavior (page zoom, page scroll) takes over.
4. **No `gesturestart`/`gesturechange` event listeners** -- on macOS/Safari, trackpad pinch gestures fire `gesturechange` events (not `wheel` with ctrlKey), which are not handled at all.

When the user does a two-finger pinch on the trackpad:
- **On Chrome/macOS:** The browser synthesizes `wheel` events with `ctrlKey: true` and `deltaY` values. Since no wheel listener intercepts and calls `preventDefault()`, the browser performs its default action: native page zoom.
- **On Safari/macOS:** The browser fires `gesturestart`/`gesturechange` events. Since no listener exists, the browser performs native page zoom.

The old `usePanZoom` hook (still in the codebase at `use-pan-zoom.ts`) DID handle this correctly by listening for `wheel` events with `{ passive: false }` and calling `e.preventDefault()`. However, the `BracketZoomWrapper` no longer uses this hook.

### Why It Happens

The GAP-R3-04 fix made a trade-off: it removed pointer capture and wheel event hijacking to fix click events on buttons and entrants, but this also removed the pinch-zoom gesture interception. The fix comment at line 37-40 explicitly states: "No wheel event hijacking" as a design goal. The pinch gesture scoping was collateral damage.

### What The Fix Should Be

The `BracketZoomWrapper` needs to intercept wheel events (specifically those with `ctrlKey: true`, which are trackpad pinch gestures) and translate them into scale changes, while still allowing normal scroll-wheel events to pass through for native scrolling.

**Specific changes to `bracket-zoom-wrapper.tsx`:**

1. Add a `useEffect` that attaches a `wheel` event listener with `{ passive: false }` to the container ref:
   ```typescript
   useEffect(() => {
     const el = containerRef.current
     if (!el) return
     const handleWheel = (e: WheelEvent) => {
       // Only intercept pinch-to-zoom (ctrlKey is set by browser for trackpad pinch)
       if (!e.ctrlKey) return  // Let normal scroll pass through
       e.preventDefault()
       const factor = e.deltaY > 0 ? 0.9 : 1.1
       setScale(s => Math.max(minScale, Math.min(maxScale, s * factor)))
     }
     el.addEventListener('wheel', handleWheel, { passive: false })
     return () => el.removeEventListener('wheel', handleWheel)
   }, [minScale, maxScale])
   ```

2. Add `touch-action: pan-x pan-y` CSS to the scrollable container div (allows scroll but prevents browser zoom on touch pinch):
   ```tsx
   <div ref={containerRef} style={{ touchAction: 'pan-x pan-y', maxHeight: '70vh' }} ...>
   ```

3. Optionally, add `gesturestart`/`gesturechange` listeners for Safari trackpad pinch:
   ```typescript
   const handleGestureChange = (e: Event) => {
     e.preventDefault()
     const ge = e as GestureEvent
     setScale(s => Math.max(minScale, Math.min(maxScale, s * ge.scale)))
   }
   el.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false })
   el.addEventListener('gesturechange', handleGestureChange, { passive: false })
   ```

This preserves native scrolling for navigation (the GAP-R3-04 fix's benefit) while scoping pinch-zoom to the bracket container.

---

## ISSUE 2: Brackets >16 Need Quadrant Views

### Root Cause

**File:** `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/components/bracket/bracket-diagram.tsx`
**Lines:** 496-584 (zoom wrapper decision + rendering)

The `BracketDiagram` component renders the entire bracket as a single SVG with all rounds and matchups. For brackets >=32, it wraps the SVG in `BracketZoomWrapper` (line 573: `if (needsZoom)`), but this only provides zoom in/out/reset -- no quadrant or section navigation.

The SVG layout is computed as one continuous coordinate space:
- `svgWidth = PADDING * 2 + totalRounds * MATCH_WIDTH + (totalRounds - 1) * ROUND_GAP` (line 483)
- `svgHeight = PADDING * 2 + LABEL_HEIGHT + round1Matches * MATCH_HEIGHT + (round1Matches - 1) * MATCH_V_GAP` (lines 486-494)

For a 32-entrant bracket: 16 first-round matchups * (56px height + 12px gap) = 1,072px tall, 5 rounds * (160px + 36px) = 964px wide.
For a 64-entrant bracket: 32 first-round matchups = 2,144px tall, 6 rounds = 1,160px wide. With 0.75 initial scale, this is still 1,608px x 870px.

There is no concept of:
- Bracket regions/halves (top half vs bottom half)
- Left-side rounds vs right-side rounds
- Quadrant buttons or section tabs
- A "mini-map" for navigation reference

### Why It Happens

This is a feature gap. The bracket diagram was built for small brackets (4-16 entrants) and then zoom was added as a basic scaling mechanism for larger brackets. No quadrant navigation was ever designed or implemented.

### What The Fix Should Be

Add quadrant/section navigation to `BracketZoomWrapper` or `BracketDiagram` for brackets with 32+ entrants:

**Approach A (Recommended): Quadrant buttons in the zoom toolbar**

Add section buttons to the floating zoom controls in `bracket-zoom-wrapper.tsx`:

```typescript
// For 32+ brackets, add quadrant navigation buttons
const quadrants = bracketSize >= 32 ? [
  { label: 'Top', scrollTo: { top: 0 } },
  { label: 'Bottom', scrollTo: { top: containerRef.current?.scrollHeight ?? 0 } },
] : []

// For 64+ brackets, add four quadrants
const quadrants = bracketSize >= 64 ? [
  { label: 'TL', scrollTo: { top: 0, left: 0 } },
  { label: 'TR', scrollTo: { top: 0, left: containerRef.current?.scrollWidth ?? 0 } },
  { label: 'BL', scrollTo: { top: containerRef.current?.scrollHeight ?? 0, left: 0 } },
  { label: 'BR', scrollTo: { top: containerRef.current?.scrollHeight ?? 0, left: containerRef.current?.scrollWidth ?? 0 } },
] : []
```

Each button scrolls the container to that region using `containerRef.current.scrollTo({ top, left, behavior: 'smooth' })`.

**Approach B: Section tabs above the diagram**

Add a tab bar for "Upper Bracket" / "Lower Bracket" (or "Left Half" / "Right Half") that filters which matchups are rendered. This requires splitting the matchup array by position ranges.

**Approach C: Mini-map overlay**

Render a small thumbnail of the full bracket in the corner with a viewport indicator rectangle that users can drag to navigate. This is more complex but provides the best UX.

**Files to modify:**
- `src/components/bracket/bracket-zoom-wrapper.tsx` -- Add `bracketSize` prop and quadrant buttons
- `src/components/bracket/bracket-diagram.tsx` -- Pass `bracketSize` through to the wrapper (already done via `effectiveSize`)

---

## ISSUE 3: SE Brackets Missing Simple/Advanced Viewing Mode in Setup

### Root Cause

**File:** `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/components/bracket/bracket-form.tsx`
**Lines:** 480-607 (type-specific options section)

The bracket creation form renders type-specific option panels conditionally:
- Lines 481-496: `bracketType === 'double_elimination'` shows play-in toggle
- Lines 498-561: `bracketType === 'round_robin'` shows pacing, voting style, standings mode
- Lines 563-607: `bracketType === 'predictive'` shows prediction mode, resolution mode
- **NO conditional block exists for `bracketType === 'single_elimination'`**

There is no `viewingMode` state variable in the form, no UI to select simple vs advanced for SE brackets, and no `viewingMode` field sent in the `bracketData` payload to `createBracket()`.

The full chain of the gap:

1. **Form state:** No `viewingMode` state variable exists (lines 82-97 define all state -- no viewingMode)
2. **Form UI:** No radio buttons or toggle for simple/advanced when SE is selected
3. **Form submission:** The `handleSubmit` function (lines 250-313) never adds `viewingMode` to `bracketData`
4. **Validation schema:** `createBracketSchema` in `validation.ts` (line 43-63) does NOT include a `viewingMode` field
5. **DAL creation:** `createBracketDAL` (bracket.ts line 227-244) does not pass `viewingMode` to `tx.bracket.create()`
6. **Database default:** The Prisma schema (line 79) defaults `viewingMode` to `"advanced"`, so all SE brackets are forced to advanced mode

The `viewingMode` CAN be changed after creation via the `updateBracketVotingSettings` server action (bracket-advance.ts line 275), but there is no UI that calls this action with a viewingMode parameter. The `matchup-timer.tsx` component uses `updateBracketVotingSettings` but only for `votingTimerSeconds`, not `viewingMode`.

Meanwhile, the student page (page.tsx line 343) correctly routes based on `bracket.viewingMode === 'simple'` to show `SimpleVotingView`. The plumbing is there -- the mode just can never be set to `'simple'`.

### Why It Happens

The viewing mode system was designed (database column, validation schema for updates, student-side routing) but the creation-time selection was never added to the bracket form. The update-time toggle UI was also never built into the teacher's live dashboard or bracket detail page. The only way to change viewingMode is via direct API call, which no UI component triggers.

### What The Fix Should Be

**1. Add viewingMode selection to bracket-form.tsx for SE brackets:**

Add state:
```typescript
const [viewingMode, setViewingMode] = useState<'simple' | 'advanced'>('advanced')
```

Add a conditional UI block after the existing type-specific options (around line 607):
```tsx
{bracketType === 'single_elimination' && (
  <div className="space-y-3 rounded-lg border p-4">
    <h4 className="text-sm font-medium">Single Elimination Options</h4>
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Viewing Mode</Label>
      <div className="flex gap-3">
        {(['simple', 'advanced'] as const).map((value) => (
          <label key={value} className="flex items-center gap-1.5">
            <input
              type="radio"
              name="se-viewing-mode"
              checked={viewingMode === value}
              onChange={() => setViewingMode(value)}
              className="h-4 w-4"
            />
            <span className="text-sm capitalize">{value}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Simple: students see one matchup card at a time. Advanced: students see the full bracket diagram.
      </p>
    </div>
  </div>
)}
```

**2. Pass viewingMode in handleSubmit:**

In the `handleSubmit` function, add to the SE branch:
```typescript
if (bracketType === 'single_elimination') {
  bracketData.viewingMode = viewingMode
}
```

**3. Add viewingMode to createBracketSchema in validation.ts:**

```typescript
viewingMode: z.enum(['simple', 'advanced']).optional(),
```

**4. Pass viewingMode through createBracketDAL:**

In the DAL data parameter type, add `viewingMode?: string`. In the `tx.bracket.create()` call, add:
```typescript
viewingMode: data.viewingMode ?? 'advanced',
```

**5. Show viewingMode in step 3 review:**

Add a review item alongside the existing type-specific review sections (after line 826):
```tsx
{bracketType === 'single_elimination' && (
  <div>
    <span className="text-sm font-medium text-muted-foreground">Options</span>
    <p className="text-sm">Viewing: {viewingMode === 'simple' ? 'Simple (card view)' : 'Advanced (bracket diagram)'}</p>
  </div>
)}
```

**Files to modify:**
- `src/components/bracket/bracket-form.tsx` -- Add SE options UI + state + submission
- `src/lib/utils/validation.ts` -- Add viewingMode to createBracketSchema
- `src/lib/dal/bracket.ts` -- Accept and persist viewingMode in createBracketDAL

---

## Evidence

- timestamp: 2026-02-02T00:00:01Z
  checked: src/components/bracket/bracket-zoom-wrapper.tsx (full read, 124 lines)
  found: Component uses native overflow:auto scrolling with CSS scale transform. No wheel event listener, no touchmove listener, no touch-action CSS property. Comments explicitly state "no wheel event hijacking" as a design goal (line 37-40).
  implication: Trackpad pinch gestures are not intercepted; browser performs native page zoom.

- timestamp: 2026-02-02T00:00:02Z
  checked: src/hooks/use-pan-zoom.ts (full read, 189 lines)
  found: The OLD hook had wheel listener with { passive: false } (line 128) and touchmove listener with { passive: false } (line 132). Both called e.preventDefault() to stop browser default behavior. This hook is still in the codebase but NO LONGER USED by BracketZoomWrapper.
  implication: The pinch-zoom interception capability existed but was removed when the wrapper was rewritten.

- timestamp: 2026-02-02T00:00:03Z
  checked: CSS touch-action property across all src/ files
  found: Zero occurrences of "touch-action" or "touchAction" in the entire src/ directory.
  implication: No component in the app prevents browser default touch/gesture behavior.

- timestamp: 2026-02-02T00:00:04Z
  checked: src/components/bracket/bracket-diagram.tsx lines 496-584
  found: For effectiveSize >= 32, diagram wraps in BracketZoomWrapper. For >= 64, passes { initialScale: 0.75 }. No quadrant/section navigation, no bracket region splitting. SVG is one continuous coordinate space.
  implication: Large brackets are zoom-only with no section navigation, confirming Issue 2 as a feature gap.

- timestamp: 2026-02-02T00:00:05Z
  checked: src/components/bracket/bracket-form.tsx lines 480-607 (type-specific options)
  found: Conditional option panels exist for double_elimination (play-in), round_robin (pacing, voting style, standings mode), and predictive (prediction mode, resolution mode). NO conditional panel for single_elimination. No viewingMode state variable in the form.
  implication: SE brackets cannot be configured with simple/advanced mode at creation time.

- timestamp: 2026-02-02T00:00:06Z
  checked: src/lib/utils/validation.ts createBracketSchema (lines 43-63)
  found: Schema includes roundRobinPacing, roundRobinVotingStyle, roundRobinStandingsMode, predictiveMode, predictiveResolutionMode, playInEnabled. Does NOT include viewingMode.
  implication: Even if the form sent viewingMode, it would be stripped by Zod validation.

- timestamp: 2026-02-02T00:00:07Z
  checked: src/lib/dal/bracket.ts createBracketDAL (lines 177-281)
  found: The data parameter type does not include viewingMode. The tx.bracket.create() call does not set viewingMode. It falls back to the Prisma schema default of "advanced".
  implication: All brackets are created with viewingMode="advanced" regardless of type.

- timestamp: 2026-02-02T00:00:08Z
  checked: prisma/schema.prisma line 79
  found: `viewingMode String @default("advanced") @map("viewing_mode")`
  implication: Database always defaults to "advanced" when no value is provided at creation.

- timestamp: 2026-02-02T00:00:09Z
  checked: src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx lines 342-368
  found: Student page correctly routes SE brackets based on viewingMode: if "simple" -> SimpleVotingView, else -> AdvancedVotingView. The downstream rendering works; the mode just can never be set to "simple".
  implication: The plumbing is complete -- only the creation-time UI and data path are missing.

- timestamp: 2026-02-02T00:00:10Z
  checked: src/actions/bracket-advance.ts updateBracketVotingSettings (lines 275-330)
  found: Server action exists that CAN update viewingMode on an existing bracket. However, no UI component calls it with viewingMode. The matchup-timer component only uses it for votingTimerSeconds.
  implication: Post-creation viewingMode toggle is technically possible but has no UI trigger.

## Eliminated

(No hypotheses were eliminated -- all three root causes confirmed on first investigation pass.)

## Resolution

root_cause: |
  Three distinct issues, each with a clear root cause:

  ISSUE 1 (Pinch zoom scoping): BracketZoomWrapper was rewritten to fix GAP-R3-04 (click
  event stealing via pointer capture). The rewrite removed ALL wheel/touch event listeners
  and has no touch-action CSS. Trackpad pinch gestures (which browsers emit as wheel events
  with ctrlKey=true or gesturechange events) are not intercepted, so the browser performs
  native page zoom instead of bracket-scoped zoom.

  ISSUE 2 (Quadrant views for 32+ brackets): Feature gap. BracketDiagram renders the entire
  bracket as one continuous SVG. BracketZoomWrapper provides only zoom in/out/reset. No
  quadrant navigation, section tabs, or mini-map exists for navigating large brackets.

  ISSUE 3 (SE simple/advanced in setup): Feature gap across the full creation pipeline.
  bracket-form.tsx has no SE-specific options panel and no viewingMode state. createBracketSchema
  omits viewingMode. createBracketDAL does not accept or persist viewingMode. All brackets
  default to "advanced" via the Prisma schema default. The student-side routing for
  simple vs advanced mode IS implemented but can never be reached.

fix: (not applied -- diagnosis only)
verification: (not applicable)
files_changed: []
