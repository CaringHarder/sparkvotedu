---
status: resolved
trigger: "Investigate why the predictive bracket prediction lifecycle doesn't connect to the live/student flow"
created: 2026-02-01T12:00:00Z
updated: 2026-02-01T12:30:00Z
---

## Current Focus

hypothesis: CONFIRMED - Three independent disconnects prevent prediction lifecycle from reaching students
test: Code trace through all 5 layers (teacher UI -> action -> DAL -> API -> student page)
expecting: Multiple break points in the pipeline
next_action: Report findings

## Symptoms

expected: Teacher opens predictions -> students see PredictiveBracket UI -> students submit predictions -> teacher closes predictions & starts bracket -> students see live bracket with results
actual: Teacher sees Open/Close buttons but bracket never goes "active" for Go Live; Students always see standard SE voting (SimpleVotingView/AdvancedVotingView); predictionStatus field is ignored in student page
errors: No runtime errors -- silent functional disconnect
reproduction: Create predictive bracket, assign to session, open predictions, check student view
started: Since predictive bracket type was added (never worked end-to-end on student side)

## Eliminated

(none needed -- root causes found on first investigation pass)

## Evidence

- timestamp: 2026-02-01T12:05:00Z
  checked: Student bracket page (src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx)
  found: Line 306 hardcodes bracketType to 'single_elimination'. predictionStatus hardcoded to null. predictiveMode hardcoded to null.
  implication: Student page ALWAYS thinks it has a standard SE bracket regardless of actual type.

- timestamp: 2026-02-01T12:08:00Z
  checked: State API endpoint (src/app/api/brackets/[bracketId]/state/route.ts)
  found: Response payload (lines 63-72) does NOT include bracketType, predictionStatus, or predictiveMode fields
  implication: Even if student page checked these fields, the API never sends them

- timestamp: 2026-02-01T12:10:00Z
  checked: Student page routing logic (lines 232-258)
  found: Routes ONLY on viewingMode ('simple' vs 'advanced') to SimpleVotingView or AdvancedVotingView. No check for bracketType === 'predictive'. PredictiveBracket component is never imported or rendered.
  implication: No code path exists to show prediction UI to students

- timestamp: 2026-02-01T12:12:00Z
  checked: BracketLifecycleControls (bracket-status.tsx)
  found: "Activate" button transitions bracket status draft->active via updateBracketStatus. This is SEPARATE from prediction lifecycle (updatePredictionStatus). For predictive brackets the lifecycle should be: draft -> predictions_open -> active -> completed (on predictionStatus), but BracketLifecycleControls doesn't know about bracketType.
  implication: Teacher has TWO competing lifecycle controls -- the generic Activate/Complete buttons AND the prediction-specific Open/Close buttons. They can conflict.

- timestamp: 2026-02-01T12:15:00Z
  checked: updatePredictionStatusDAL (lib/dal/prediction.ts lines 357-413)
  found: When predictionStatus transitions to 'active', it ALSO sets bracket.status to 'active' (line 395-396). This is correct behavior -- but the "Go Live" link in bracket-detail.tsx only shows when bracket.status === 'active' (line 117). So the flow works IF teacher uses the prediction lifecycle buttons in order (Open Predictions -> Close Predictions & Start). However...
  implication: The prediction lifecycle CAN make the bracket "active", but the student page still won't render the PredictiveBracket component.

- timestamp: 2026-02-01T12:18:00Z
  checked: Live dashboard page (brackets/[bracketId]/live/page.tsx)
  found: The live page renders LiveDashboard with the full serialized bracket (including bracketType, predictionStatus). It serializes these fields correctly. But it still renders as a standard bracket live view.
  implication: Live page passes data but may not differentiate predictive brackets either (would need to check LiveDashboard component, but that's secondary to the student-facing issue)

## Resolution

root_cause: |
  THREE independent root causes prevent predictive bracket lifecycle from reaching students:

  1. STATE API OMITS CRITICAL FIELDS: /api/brackets/[bracketId]/state/route.ts (line 63-72)
     does NOT return bracketType, predictionStatus, or predictiveMode in its response payload.
     The student page has no way to know the bracket is predictive.

  2. STUDENT PAGE HARDCODES bracketType: toBracketWithDetails() in the student page (line 306)
     hardcodes bracketType to 'single_elimination', predictionStatus to null, and
     predictiveMode to null. Even if the API returned these fields, they'd be overwritten.

  3. STUDENT PAGE HAS NO PREDICTIVE RENDERING PATH: The page routes only on viewingMode
     ('simple' -> SimpleVotingView, else -> AdvancedVotingView). There is no check for
     bracketType === 'predictive' and no import of PredictiveBracket component. The
     prediction UI component exists and works (predictive-bracket.tsx) but is never
     rendered in the student context.

  SECONDARY ISSUE: BracketLifecycleControls (bracket-status.tsx) shows generic
  "Activate"/"Complete" buttons even for predictive brackets, creating a competing
  lifecycle path that bypasses the prediction-specific Open/Close/Start flow.

fix: N/A (research only)
verification: N/A (research only)
files_changed: []
