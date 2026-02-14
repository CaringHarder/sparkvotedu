---
status: diagnosed
trigger: "Zoom in/out and reset buttons don't function. Two-finger scroll zoom works but button controls don't. Clicking on entrant does nothing."
created: 2026-02-01T00:00:00Z
updated: 2026-02-01T00:01:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED -- setPointerCapture on container steals click events from all child elements (buttons and SVG entrant rects)
test: Traced full event flow from button click through pointerdown handler
expecting: N/A -- root cause confirmed
next_action: Return diagnosis

## Symptoms

expected: Zoom in/out and reset buttons should control zoom level on large bracket diagrams. Clicking on entrants in voting matchups should register votes.
actual: Buttons don't function. Two-finger scroll zoom works. Clicking entrant does nothing.
errors: None reported (silent failure)
reproduction: Open a 32 or 64 entrant bracket, attempt to use zoom control buttons or click entrants
started: Observed during UAT Round 2 (after 07-16 timeout fix enabled large bracket creation)

## Eliminated

- hypothesis: "Zoom buttons have onClick handlers but reference stale refs or state"
  evidence: zoomIn/zoomOut/resetZoom are stable useCallback functions using setState updater pattern -- no stale closure issue. The functions themselves are correct. The problem is they never get called.
  timestamp: 2026-02-01T00:00:30Z

- hypothesis: "CSS transforms via useRef bypass React state"
  evidence: Hook uses useState for all transform state (line 37-41 of use-pan-zoom.ts). Both wheel handler and programmatic controls use the same setState. Architecture is consistent -- not a ref-vs-state split.
  timestamp: 2026-02-01T00:00:30Z

- hypothesis: "z-index issue -- buttons behind an overlay"
  evidence: Buttons are in a div with class "absolute bottom-3 right-3" positioned inside the container. The zoomable content div has no z-index or pointer-events manipulation. No overlay element exists. The buttons are visually on top (confirmed by the fact the user can see them and try to click them).
  timestamp: 2026-02-01T00:00:30Z

## Evidence

- timestamp: 2026-02-01T00:00:10Z
  checked: src/components/bracket/bracket-zoom-wrapper.tsx (full read)
  found: Zoom buttons use plain onClick={zoomIn}, onClick={zoomOut}, onClick={resetZoom}. No onPointerDown handler on buttons. Buttons are children of containerRef div. The containerRef div receives all pan/zoom event listeners.
  implication: Button clicks will bubble pointerdown to the container before the click event fires.

- timestamp: 2026-02-01T00:00:15Z
  checked: src/hooks/use-pan-zoom.ts lines 68-74 (handlePointerDown)
  found: |
    handlePointerDown fires on ANY pointerdown event with button===0 (left click / primary touch).
    It does NOT check e.target to distinguish between content area clicks and button/control clicks.
    It sets isDragging.current = true AND calls setPointerCapture(e.pointerId) on the container.
  implication: When user clicks a zoom button, the pointerdown bubbles to container, which captures the pointer. This is the critical finding.

- timestamp: 2026-02-01T00:00:20Z
  checked: setPointerCapture browser API behavior
  found: |
    setPointerCapture(pointerId) redirects ALL subsequent pointer events for that pointer
    to the capturing element. This means the pointerup event that would normally fire on
    the button is instead dispatched to the container element. Without a complete
    pointerdown->pointerup sequence on the button, the browser never synthesizes the
    'click' event on the button.
  implication: This is the root cause. setPointerCapture breaks click event synthesis for ALL child elements.

- timestamp: 2026-02-01T00:00:25Z
  checked: src/hooks/use-pan-zoom.ts lines 55-65 (handleWheel)
  found: Wheel events are completely separate from the pointer event / pointer capture mechanism. Wheel zoom modifies state.scale via setState directly.
  implication: Explains why scroll-wheel zoom works but button clicks do not. Wheel events are unaffected by pointer capture.

- timestamp: 2026-02-01T00:00:30Z
  checked: src/components/bracket/bracket-diagram.tsx lines 270-280, 337-349 (entrant click rects)
  found: |
    Entrant click areas are <rect> elements with onClick handlers inside the SVG.
    The SVG is a child of the container div. Same mechanism: pointerdown on the rect
    bubbles to container, pointer capture is set, click never fires on the rect.
  implication: Confirms "clicking on entrant does nothing" is the SAME root cause, not a separate bug.

- timestamp: 2026-02-01T00:00:35Z
  checked: src/components/ui/button.tsx (full read)
  found: Standard shadcn/ui Button component. No special pointer event handling. No onPointerDown. No stopPropagation.
  implication: Buttons have no defense against the parent container stealing their pointer events.

## Resolution

root_cause: |
  The usePanZoom hook's handlePointerDown handler (src/hooks/use-pan-zoom.ts, line 68-74)
  calls setPointerCapture(e.pointerId) on the container element for EVERY pointerdown event
  that occurs within the container, including clicks on the zoom control buttons and SVG
  entrant click targets.

  setPointerCapture redirects all subsequent pointer events (including pointerup) to the
  capturing element, which prevents the browser from synthesizing a 'click' event on the
  original target (the button or SVG rect). The onClick handlers (zoomIn, zoomOut, resetZoom,
  onEntrantClick) therefore never fire.

  Wheel zoom works because wheel events are independent of the pointer capture mechanism.

  This is a single root cause that explains BOTH symptoms:
  1. Zoom buttons don't function
  2. Clicking on entrants does nothing

fix_direction: |
  The handlePointerDown handler needs to be prevented from firing (or from calling
  setPointerCapture) when the click target is an interactive child element. Several
  approaches:

  Option A (Recommended): Add e.stopPropagation() via onPointerDown on the zoom control
  button container div, preventing pointerdown from reaching the pan/zoom container.
  Similarly, the SVG entrant click rects need onPointerDown with stopPropagation.

  Option B: In handlePointerDown, check e.target against known interactive elements
  (buttons, elements with data-* attributes) and bail out early.

  Option C: Use a dedicated drag handle / only enable drag on middle-click or modifier key,
  so normal left clicks pass through to children.

  Option A is minimal and surgical. Add one onPointerDown={(e) => e.stopPropagation()}
  to the floating controls div in bracket-zoom-wrapper.tsx, and similar treatment for
  clickable entrant areas.

verification:
files_changed: []
