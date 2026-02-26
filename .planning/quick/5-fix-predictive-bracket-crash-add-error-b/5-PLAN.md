---
phase: quick
plan: 5
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/dal/prediction.ts
  - src/app/(dashboard)/brackets/[bracketId]/page.tsx
  - src/app/(dashboard)/brackets/[bracketId]/error.tsx
autonomous: true
requirements: [BUGFIX-predictive-bracket-crash]

must_haves:
  truths:
    - "A database error in scoreBracketPredictions does NOT crash the entire site"
    - "A database error in scoreBracketPredictions shows a recoverable bracket page with empty leaderboard"
    - "If the error.tsx boundary triggers, the user sees a friendly message with a retry button"
    - "tabulateBracketPredictions writes all matchup updates atomically -- partial failures cannot corrupt bracket state"
  artifacts:
    - path: "src/app/(dashboard)/brackets/[bracketId]/error.tsx"
      provides: "Next.js error boundary for bracket detail route"
      contains: "use client"
    - path: "src/lib/dal/prediction.ts"
      provides: "Hardened scoreBracketPredictions and tabulateBracketPredictions"
      contains: "$transaction"
    - path: "src/app/(dashboard)/brackets/[bracketId]/page.tsx"
      provides: "Try-catch wrapped scoreBracketPredictions call"
      contains: "catch"
  key_links:
    - from: "src/app/(dashboard)/brackets/[bracketId]/page.tsx"
      to: "src/lib/dal/prediction.ts"
      via: "try-catch around scoreBracketPredictions"
      pattern: "try.*scoreBracketPredictions.*catch"
    - from: "src/app/(dashboard)/brackets/[bracketId]/error.tsx"
      to: "Next.js error boundary mechanism"
      via: "export default function acting as route error boundary"
      pattern: "reset.*retry"
---

<objective>
Fix a critical production bug where a predictive bracket with 24 participants crashes the ENTIRE site (all pages, all users) when advancing rounds. The crash persists across browsers, cache clears, and sign-out/sign-in because the server component throws an unhandled DB error on every render with no error boundary to catch it.

Purpose: Eliminate a site-wide outage vector caused by three compounding failures -- no try-catch in the server component caller, no try-catch inside the DAL function, and no error.tsx boundary.

Output: Hardened prediction DAL, resilient server component, and a user-friendly error boundary for the bracket detail route.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/dal/prediction.ts
@src/app/(dashboard)/brackets/[bracketId]/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Harden prediction DAL functions with try-catch and $transaction</name>
  <files>src/lib/dal/prediction.ts</files>
  <action>
Two changes in this file:

1. **scoreBracketPredictions** (lines 125-190): Wrap the entire function body in a try-catch. On ANY error, log the error with `console.error('[scoreBracketPredictions] Error scoring predictions for bracket', bracketId, error)` and return an empty array `[]` instead of throwing. This is a read-only scoring function -- returning empty scores is a safe degradation that lets the page render without the leaderboard.

2. **tabulateBracketPredictions** (lines 493-607): The write loop at lines 575-593 runs 12+ sequential `prisma.matchup.update()` calls in a bare `for` loop with no transaction wrapper. A failure mid-loop leaves some matchups with winnerId set and others without, corrupting bracket state. Fix: wrap the entire write loop (lines 575-593) AND the final status transition to 'previewing' (line 601-604) in a single `prisma.$transaction(async (tx) => { ... })` block. Inside the transaction, replace all `prisma.matchup.update` calls with `tx.matchup.update` and `prisma.bracket.update` with `tx.bracket.update`. Keep the tabulation engine call and data fetching OUTSIDE the transaction (reads don't need atomicity). The transaction should cover: (a) all matchup winnerId writes, (b) all next-matchup entrant propagation writes, (c) the bracket status update to 'previewing'. If the transaction fails, the function should let the error propagate (caller handles retry) but bracket state remains consistent at 'tabulating' status.

Do NOT modify any other functions in this file. Do NOT change the function signatures or return types.
  </action>
  <verify>Run `npx tsc --noEmit` from project root -- no type errors in prediction.ts. Verify the $transaction is properly structured by reading the file back.</verify>
  <done>scoreBracketPredictions has try-catch returning [] on error. tabulateBracketPredictions write loop + status transition wrapped in $transaction. No type errors.</done>
</task>

<task type="auto">
  <name>Task 2: Add try-catch in page.tsx and create error.tsx boundary</name>
  <files>src/app/(dashboard)/brackets/[bracketId]/page.tsx, src/app/(dashboard)/brackets/[bracketId]/error.tsx</files>
  <action>
Two files:

**page.tsx** -- Lines 40-43 call `scoreBracketPredictions` directly with no error handling. Even though Task 1 adds a try-catch inside the DAL function, defense-in-depth requires the caller to also handle failures. Wrap the prediction scoring call (lines 40-43) in a try-catch:

```typescript
let predictionScores: PredictionScore[] = []
try {
  predictionScores =
    isPredictive && (bracket.status === 'active' || bracket.status === 'completed')
      ? await scoreBracketPredictions(bracket.id)
      : []
} catch (error) {
  console.error('[BracketDetailPage] Failed to load prediction scores:', error)
  predictionScores = []
}
```

Add the `PredictionScore` type import from `@/lib/bracket/types` (it is already transitively available but add an explicit import for the type annotation). Keep everything else in the file unchanged.

**error.tsx** -- Create NEW file. This is the Next.js App Router error boundary for the `[bracketId]` route segment. Must be a client component. Structure:

- `'use client'` directive at top
- Accept `{ error, reset }` props (standard Next.js error boundary signature)
- `useEffect` to log `error` to console on mount
- Render a centered card with:
  - A warning icon or heading "Something went wrong"
  - Message: "We had trouble loading this bracket. This is usually temporary."
  - The error message in a subtle/muted text block (error.message)
  - A "Try again" button that calls `reset()`
  - A "Back to Brackets" link to `/brackets`
- Use Tailwind classes consistent with the project (dark backgrounds, rounded corners, etc.)
- Do NOT use any external UI library -- plain HTML + Tailwind only.
  </action>
  <verify>Run `npx tsc --noEmit` -- no type errors. Verify error.tsx exists and exports a default function. Verify page.tsx has the try-catch around scoreBracketPredictions.</verify>
  <done>page.tsx has defense-in-depth try-catch for prediction scoring. error.tsx exists as a client component error boundary with retry button and back link. No type errors.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with zero errors
2. `src/lib/dal/prediction.ts` contains `$transaction` in tabulateBracketPredictions
3. `src/lib/dal/prediction.ts` contains try-catch in scoreBracketPredictions
4. `src/app/(dashboard)/brackets/[bracketId]/page.tsx` contains try-catch around scoring call
5. `src/app/(dashboard)/brackets/[bracketId]/error.tsx` exists with 'use client' and reset() call
</verification>

<success_criteria>
- A database error during prediction scoring no longer crashes the page -- the bracket renders with an empty leaderboard
- If any unhandled error escapes to the route level, the error boundary catches it and shows a retry UI instead of a white screen
- Tabulation writes are atomic -- a failure mid-write rolls back all matchup updates, preventing corrupted bracket state
- All three files pass TypeScript compilation
</success_criteria>

<output>
After completion, create `.planning/quick/5-fix-predictive-bracket-crash-add-error-b/5-SUMMARY.md`
</output>
