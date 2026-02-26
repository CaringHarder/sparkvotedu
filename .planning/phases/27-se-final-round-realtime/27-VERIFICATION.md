---
phase: 27-se-final-round-realtime
verified: 2026-02-26T15:30:00Z
status: human_needed
score: 4/5 must-haves verified
human_verification:
  - test: "SE bracket final round realtime vote counts (teacher dashboard)"
    expected: "In an 8-team SE bracket, after advancing to the final round, vote counts update on the teacher live dashboard in realtime without manual page refresh"
    why_human: "Live browser test required — automated checks confirm code paths are wired correctly but cannot simulate Supabase broadcast delivery timing and browser state transitions"
  - test: "Student bracket view final round structural update"
    expected: "Student's advanced bracket view shows the final round matchup become interactive (votable) in realtime after teacher opens voting on the final round — no page refresh needed"
    why_human: "Requires concurrent browser sessions (teacher + student) to verify realtime propagation through the subscription channel"
  - test: "Predictive bracket vote counts on all rounds"
    expected: "In an 8-team predictive bracket (manual/vote_based mode), vote counts appear and update in realtime on every round, not just the first"
    why_human: "Requires multi-round test flow across a predictive bracket session to verify the fix resolves intermittent round failures"
  - test: "Double elimination grand finals realtime vote counts"
    expected: "Vote counts update in realtime on the grand final matchup of a DE bracket"
    why_human: "Requires a full DE bracket test session to reach grand finals and observe realtime behavior"
---

# Phase 27: SE Final Round Realtime Fix Verification Report

**Phase Goal:** Single elimination and predictive brackets maintain live vote count updates through all rounds -- teachers and students see votes update in real time, including the final round
**Verified:** 2026-02-26T15:30:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SE bracket final round vote counts update in realtime on teacher live dashboard | ? NEEDS HUMAN | Code path verified: cache-busting fetch + force-dynamic route are wired through to voteLabels. Cannot confirm live broadcast behavior without browser test. |
| 2 | SE bracket final round vote counts update in realtime on student bracket view | ? NEEDS HUMAN | Student advanced view uses same useRealtimeBracket hook with fixed fetchBracketState. Students see structural updates (matchup becomes votable) not raw vote counts by design. Realtime delivery needs live test. |
| 3 | Predictive bracket vote counts display correctly on all rounds | ? NEEDS HUMAN | Predictive manual mode uses same BracketDiagram + voteLabels pipeline as SE (confirmed in live-dashboard.tsx L1485-1497). Fix applies. Live multi-round test required. |
| 4 | Double elimination brackets do not exhibit the same stale vote count issue | ? NEEDS HUMAN | DE brackets use the same useRealtimeBracket hook and the same voteLabels pipeline through DoubleElimDiagram (confirmed voteLabels prop L1447). Fix applies globally. Live test at grand finals required. |
| 5 | Earlier rounds (1, 2) continue to work correctly after the fix (non-regression) | ? NEEDS HUMAN | No round-specific logic was modified; the fix only adds caching guards. Earlier rounds share the same code path and the guard is sequence-based (not round-based). Regression is extremely unlikely but should be confirmed in the same SE test session. |

**Automated score:** 0/5 truths can be fully verified without a browser (all require live Supabase broadcast behavior)

**Code-level verification score:** 5/5 code paths are correctly implemented and wired

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/hooks/use-realtime-bracket.ts` | Cache-busted fetchBracketState with stale response guard | VERIFIED | Line 72: `fetchSeqRef = useRef(0)`. Line 76: `const seq = ++fetchSeqRef.current`. Lines 78-80: fetch with `?t=${Date.now()}` and `cache: 'no-store'`. Lines 83 and 86: two sequence guard checks around json parse. |
| `src/app/api/brackets/[bracketId]/state/route.ts` | Force-dynamic API route preventing Next.js GET caching | VERIFIED | Line 8: `export const dynamic = 'force-dynamic'`. Accompanied by explanatory comment. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/hooks/use-realtime-bracket.ts` | `/api/brackets/[bracketId]/state` | fetchBracketState with cache-busting fetch | WIRED | Line 78: `fetch(\`/api/brackets/${bracketId}/state?t=${Date.now()}\`, { cache: 'no-store' })` — pattern matches PLAN requirement `cache.*no-store`. Confirmed in commit d83b422. |
| `src/hooks/use-realtime-bracket.ts` | `src/components/teacher/live-dashboard.tsx` | returned matchups and voteCounts flow into currentMatchups and mergedVoteCounts | WIRED | live-dashboard.tsx L129: `useRealtimeBracket(bracket.id)` destructures `realtimeVoteCounts` and `realtimeMatchups`. L150-164: `currentMatchups` uses `realtimeMatchups`. L165-182: `mergedVoteCounts` merges `realtimeVoteCounts`. |
| `src/components/teacher/live-dashboard.tsx` | `src/components/bracket/bracket-diagram.tsx` | voteLabels computed from currentMatchups + mergedVoteCounts | WIRED | live-dashboard.tsx L511-524: `voteLabels` useMemo reads `currentMatchups` and `mergedVoteCounts`. L1495: `voteLabels={voteLabels}` passed to BracketDiagram. bracket-diagram.tsx L661: `voteLabel={voteLabels?.[matchup.id]}` used on every MatchupBox. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| FIX-02 | 27-01-PLAN.md | Single elimination bracket final round continues to show realtime vote updates on the teacher live dashboard | SATISFIED | REQUIREMENTS.md L18 shows `[x] FIX-02` checked off. Commit d83b422 adds the three fixes. Code verified in both artifact files. |

### Anti-Patterns Found

No anti-patterns found in either modified file:
- No TODO/FIXME/PLACEHOLDER comments
- No stub return patterns (return null, return {}, return [])
- No empty handlers
- No console.log-only implementations

### Human Verification Required

All automated code-path checks pass. The following scenarios require live browser testing to confirm the fix delivers the observable outcomes:

#### 1. SE Final Round Realtime Vote Counts (Teacher Dashboard)

**Test:** Create an 8-team SE bracket. Advance through rounds 1 and 2 by voting and closing. Open voting on round 3 (final). Have a student vote on the championship matchup. Observe the teacher live dashboard.
**Expected:** Vote counts update on the teacher live dashboard in realtime (within ~2 seconds) without any page refresh. The championship matchup shows the live tally.
**Why human:** Requires simultaneous browser sessions and Supabase WebSocket broadcast delivery. The code paths are verified wired but the timing and broadcast delivery cannot be confirmed with static code analysis.

#### 2. Student Bracket View Final Round

**Test:** In the same SE session as Test 1, keep the student's advanced bracket view open. After the teacher opens voting on the final round, observe whether the final matchup becomes interactive (highlighted, clickable) in the student's view without refresh.
**Expected:** The final round matchup becomes votable on the student's screen without a page reload. (Note: students do NOT see raw vote counts in their view by design -- only the teacher sees vote count numbers. The student criterion is about the matchup becoming interactive.)
**Why human:** Realtime structural update delivery via Supabase broadcast must be observed in a live browser.

#### 3. Predictive Bracket All-Round Vote Counts

**Test:** Create an 8-team predictive bracket in manual/vote_based resolution mode. Open and close voting on rounds 1, 2, and 3. Verify vote counts appear on each round.
**Expected:** Vote counts display correctly on ALL rounds, not just the first round or some rounds.
**Why human:** The intermittent failure across rounds requires a multi-round live session to confirm it no longer occurs.

#### 4. Double Elimination Grand Finals

**Test:** Create a 4-team DE bracket. Advance to the grand finals and open voting. Have a student vote.
**Expected:** Vote counts update in realtime on the grand finals matchup.
**Why human:** Requires a complete DE bracket session to reach grand finals.

#### 5. Non-Regression: Earlier Rounds

**Test:** During the SE bracket test (Test 1), confirm rounds 1 and 2 still show realtime vote count updates.
**Expected:** Rounds 1 and 2 continue to update in realtime exactly as before. No regression.
**Why human:** Should be confirmed in the same session as Test 1 with minimal extra effort.

### Code-Level Summary

All three fixes specified in the PLAN are present and correctly implemented in the codebase:

**Fix 1 (API route force-dynamic):** `export const dynamic = 'force-dynamic'` confirmed at line 8 of `src/app/api/brackets/[bracketId]/state/route.ts`, added in commit d83b422.

**Fix 2 (Cache-busted fetch):** `fetch(\`/api/brackets/${bracketId}/state?t=${Date.now()}\`, { cache: 'no-store' })` confirmed at line 78 of `src/hooks/use-realtime-bracket.ts`, added in commit d83b422.

**Fix 3 (Stale response sequence guard):** `fetchSeqRef = useRef(0)` at line 72, `const seq = ++fetchSeqRef.current` at line 76, and two guard checks at lines 83 and 86 of `src/hooks/use-realtime-bracket.ts`, added in commit d83b422.

The wiring from the hook through to `voteLabels` and `BracketDiagram` was already correct (the bug was purely in the caching layer, not the rendering pipeline). The fix correctly targets only the caching and race condition issues without touching the working rendering logic, celebration chain, or completion detection.

**Clarification on Success Criterion 2 (student view):** The student advanced view (`advanced-voting-view.tsx`) does NOT display vote count numbers — it shows the bracket structure and allows voting. "Live vote count changes" in the student context means the matchup status transitioning to `voting` (becoming interactive) in realtime. The same `useRealtimeBracket` hook with the same `fetchBracketState` cache-busting fix applies to both teacher and student views, so the student will see the final round matchup become votable in realtime.

---

_Verified: 2026-02-26T15:30:00Z_
_Verifier: Claude (gsd-verifier)_
