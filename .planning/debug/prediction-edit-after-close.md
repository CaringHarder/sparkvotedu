---
status: resolved
trigger: "Students can still navigate to Edit Results and change/resubmit predictions after teacher clicks Close Predictions"
created: 2026-02-13T00:00:00Z
updated: 2026-02-13T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Multiple layered deficiencies allow students to edit/resubmit after predictions close
test: Code trace through all four layers (parent page, component, server action, DAL)
expecting: At least one layer blocks edits after close
next_action: Document root cause findings

## Symptoms

expected: After teacher clicks "Close Predictions" (transitions predictionStatus to 'active'), students should see a locked UI and be unable to edit or resubmit predictions.
actual: Students can still click "Edit Predictions", modify their picks, and successfully resubmit.
errors: None (silently succeeds)
reproduction: 1) Teacher opens predictions. 2) Student submits predictions. 3) Teacher clicks "Close Predictions". 4) Student clicks "Edit Predictions" button and resubmits.
started: Likely since predictive bracket feature was built

## Eliminated

(none needed -- root cause found on first pass)

## Evidence

- timestamp: 2026-02-13T00:01:00Z
  checked: PredictiveBracket component (predictive-bracket.tsx) - both SimplePredictionMode and AdvancedPredictionMode
  found: Both modes use `bracket.predictionStatus` from the INITIAL prop, NOT from any real-time source. The `predictionStatus` param comes from `bracket.predictionStatus ?? 'draft'` at line 36, set once on mount.
  implication: The PredictiveBracket component never receives real-time prediction status updates from the parent.

- timestamp: 2026-02-13T00:02:00Z
  checked: Student bracket page (page.tsx) - PredictiveStudentView component (lines 688-849)
  found: PredictiveStudentView correctly tracks `effectiveStatus` via useRealtimeBracket (line 707). When status changes from 'predictions_open' to 'active', line 747 (`if effectiveStatus === 'predictions_open' || effectiveStatus === 'draft'`) would no longer match, so PredictiveBracket would NOT be rendered. HOWEVER, PredictiveBracket is rendered without being passed the real-time predictionStatus.
  implication: The parent routing logic works correctly for fresh renders, but the PredictiveBracket component internally tracks its OWN `predictionStatus` from the bracket prop which is stale.

- timestamp: 2026-02-13T00:03:00Z
  checked: PredictiveBracket internal state flow
  found: PredictiveBracket receives `bracket` prop (line 33). It reads `predictionStatus` at line 36: `const predictionStatus = bracket.predictionStatus ?? 'draft'`. This is the bracket object from initial page load. The `usePredictions` hook (line 37) fetches prediction data but does NOT return or track predictionStatus. Even when the parent PredictiveStudentView stops rendering PredictiveBracket (because effectiveStatus changed), there's a RACE CONDITION: the student is already inside the component, viewing the "Edit Predictions" button and form.
  implication: The key issue is what happens DURING the transition -- the student already has the component mounted with predictions_open state.

- timestamp: 2026-02-13T00:04:00Z
  checked: The "Edit Predictions" button in SimplePredictionMode (line 729) and AdvancedPredictionMode (line 909)
  found: Both "Edit Predictions" buttons only check `isPredictionsOpen` to gate the edit form rendering. But `isPredictionsOpen` is derived from the STATIC `predictionStatus` prop (line 638/802), not from any real-time value. Once the student clicks "Edit Predictions", `isEditing` becomes true (local state), and the form is shown. There is NO re-check of predictionStatus before showing the form or before submission.
  implication: The Edit button and form are gated only by the initial prop value, never re-validated.

- timestamp: 2026-02-13T00:05:00Z
  checked: Submit flow in SimplePredictionMode (line 674) and AdvancedPredictionMode (line 848)
  found: handleSubmit calls `submitPrediction` server action which calls `submitPredictions` DAL. The DAL (prediction.ts line 36) checks `bracket.predictionStatus !== 'predictions_open'` and returns an error. SO THE SERVER-SIDE VALIDATION EXISTS AND WORKS.
  implication: The DAL correctly rejects submissions when predictions are closed. But the CLIENT never shows the error to the user -- it only checks `'success' in result` (line 687/857). If the result has an error, the submit silently fails (no error UI shown) and `setIsEditing(false)` is never called, so the student stays stuck in the editing form.

- timestamp: 2026-02-13T00:06:00Z
  checked: PredictiveStudentView real-time routing (page.tsx line 747)
  found: When effectiveStatus changes from 'predictions_open' to 'active' via real-time broadcast, the parent component re-renders. The condition at line 747 (`effectiveStatus === 'predictions_open' || effectiveStatus === 'draft'`) no longer matches, so PredictiveBracket unmounts. The student would then see the manual/vote_based tabbed view (lines 796-848) or auto-mode waiting state (line 758). This IS correct behavior -- the PredictiveBracket component IS unmounted.
  implication: The real-time routing in the PARENT works. The bug is a timing/UX issue plus missing error handling.

## Resolution

root_cause: |
  THREE interacting deficiencies create the bug:

  1. **PredictiveBracket uses stale predictionStatus (PRIMARY)**: The `PredictiveBracket` component reads `predictionStatus` from `bracket.predictionStatus` (a prop set at initial render) and never updates it from real-time sources. The `usePredictions` hook it uses does NOT track or return `predictionStatus`. So while the student is inside the component, the `isPredictionsOpen` flag (lines 638, 802) remains `true` even after the teacher closes predictions.

  2. **"Edit Predictions" button lacks real-time status check**: Both `SimplePredictionMode` (line 729) and `AdvancedPredictionMode` (line 909) show the "Edit Predictions" button unconditionally when `isPredictionsOpen && hasSubmitted && !isEditing`. Since `isPredictionsOpen` is stale (from issue #1), the button remains visible and clickable.

  3. **Submit error is silently swallowed**: When the student submits after predictions close, the server action correctly returns `{ error: 'Predictions are not currently open' }`. But the client code (lines 687, 857) only acts on `'success' in result`. On error, nothing happens -- no toast, no redirect, no state change. The student stays in the editing form, confused.

  The PARENT component (`PredictiveStudentView` in page.tsx) actually does handle real-time status correctly via `useRealtimeBracket` and would unmount `PredictiveBracket` when status changes. But there's a race window between the teacher clicking "Close Predictions" and the real-time broadcast arriving at the student's client. During that window, the student can click "Edit Predictions" and enter the editing form. Once in the form, even if PredictiveBracket unmounts and remounts, the stale state persists.

  Additionally, if real-time (WebSocket) is not connected and the student is on polling (3-second interval), the window is even larger.

fix: |
  Three changes needed (in priority order):

  1. **Pass real-time predictionStatus into PredictiveBracket**: In `PredictiveStudentView`, pass `effectiveStatus` as a prop to `PredictiveBracket`, or modify the bracket object to include the real-time status before passing. This way `isPredictionsOpen` inside the component stays current.

  2. **Show error feedback on failed submission**: In both `SimplePredictionMode.handleSubmit` and `AdvancedPredictionMode.handleSubmit`, handle the error case -- show a toast/alert with the error message (e.g., "Predictions are closed") and force `isEditing = false`.

  3. **Disable "Edit Predictions" button reactively**: Once PredictiveBracket receives real-time predictionStatus, the `isPredictionsOpen` check will naturally hide the Edit button and show the "Predictions are closed" locked state instead.

  The server-side validation (DAL) is already correct and needs no changes.

verification: N/A (diagnosis only, no fix applied)
files_changed: []
