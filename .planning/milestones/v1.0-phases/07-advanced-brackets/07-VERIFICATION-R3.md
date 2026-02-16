---
status: gaps_found
score: 2/5
verified_date: 2026-02-02
round: 3
---

# Phase 7: Advanced Brackets — Verification R3 (UAT)

## Must-Haves Status

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 1 | DE bracket: winners, losers, grand finals rendered correctly | FAIL | WB works, LB visible but unplayable, GF never reached |
| 2 | RR bracket: every entrant plays every other, standings displayed | PARTIAL | Students can vote R1, but teacher has no vote counts or round advancement |
| 3 | Predictive bracket: students submit predictions, scored leaderboard | FAIL | Bracket invisible to students, no activate path |
| 4 | Non-power-of-two brackets with auto-byes | PASS | Confirmed working |
| 5 | Predictive leaderboard with scoring breakdown | FAIL | Blocked by #3 (can't test if students can't see bracket) |

## Gap Details

### GAP-R3-01: DE Live Dashboard Is Not DE-Aware (Tests 5, 6)

**Symptom:** Teacher can only open/close voting and advance in Winners bracket. No controls for Losers bracket or Grand Finals. After WB final, champion declared immediately.

**Root Causes:**
1. `currentRound` in `live-dashboard.tsx:150-157` loops rounds 1..totalRounds where totalRounds = log2(size) = WB rounds only. LB matchups exist at higher DB round numbers (offset by wbMaxRound) and are invisible to the round logic.
2. `handleOpenVoting` and `handleCloseAndAdvance` filter matchups by `m.round === currentRound`, so they never find LB/GF matchups.
3. `isBracketComplete` in `advancement.ts:204-220` checks highest-round matchup for winnerId. After WB final is advanced, completion is triggered before LB/GF can play.
4. `totalRounds` on the live page is calculated as `log2(size)` — WB only. LB and GF rounds are not accounted for.

**What works:** WB voting and advancement works correctly. WB losers from R1/R2 do drop to LB via `advanceDoubleElimMatchup`. The WB FINAL loser may or may not reach LB final (completion fires first).

**Fix needed:** Live dashboard must understand DE's three-region structure (WB → LB → GF) with region-based navigation instead of flat round numbers. `isBracketComplete` must require GF completion for DE brackets.

**Files:** `src/components/teacher/live-dashboard.tsx`, `src/lib/bracket/advancement.ts`, `src/app/(dashboard)/brackets/[bracketId]/live/page.tsx`

---

### GAP-R3-02: RR Vote Counts + Round Advancement Missing (Tests 10, 11)

**Symptom:** Students CAN vote on R1 matchups (07-18 fix worked). Teacher sees no vote totals on matchup cards. No button to advance to next round after R1 completes. Teacher had to manually select winners blind.

**Root Causes:**
1. RoundRobinMatchups teacher view shows win/declare buttons but no vote counts. The `castVote` data exists in DB but is not fetched or displayed.
2. The existing `canAdvanceRoundRobin` logic in live-dashboard.tsx may not detect round completion correctly, or the "Advance Round" button is not rendering.
3. Missing: auto-populate winner from vote majority, display vote count per entrant on each matchup card.

**What works:** Student vote UI renders correctly. Voting submits successfully. RR round 1 auto-opens on activation.

**Fix needed:** Display vote counts on RR matchup cards for teacher. Add auto-populate-from-votes functionality. Ensure round advancement button appears after round completion.

**Files:** `src/components/bracket/round-robin-matchups.tsx`, `src/components/teacher/live-dashboard.tsx`, `src/lib/dal/round-robin.ts`

---

### GAP-R3-03: Predictive Bracket Invisible to Students (Tests 12, 13, 14)

**Symptom:** Teacher creates predictive bracket, opens predictions. Student session shows no brackets. Bracket never becomes visible.

**Root Causes:**
1. Decision [07-16] hid the Activate button for predictive brackets — only "Open Predictions" is available.
2. Without activation, bracket stays in `draft` status with `predictionStatus: predictions_open`.
3. Student session page filters for `active` brackets only (or brackets assigned to the session that are active).
4. Predictive brackets in prediction phase are invisible because they're not `active`.
5. No alternative path exists for predictive brackets to appear on student session during prediction phase.

**Fix needed:** Either (a) auto-activate predictive brackets when predictions are opened, (b) student session page also shows `draft` + `predictions_open` brackets, or (c) restore a modified activate flow for predictive brackets. Option (a) is cleanest.

**Files:** `src/lib/dal/bracket.ts` or `src/actions/bracket.ts`, `src/app/(student)/session/[sessionId]/page.tsx`

---

### GAP-R3-04: Large Bracket Navigation UX Redesign (Test 16)

**Symptom:** Zoom in/out/reset buttons don't work. Two-finger scroll hijacked for zoom (can't scroll page). Students can't click entrants within zoom wrapper. Buttons positioned inside bracket frame.

**Root Causes:**
1. 07-20's `stopPropagation` fix didn't resolve the pointer capture issue (or didn't deploy correctly).
2. Wheel event listener captures all scroll events for zoom, preventing normal page scroll.
3. The entire pan/zoom UX model is wrong for this use case — users expect to scroll past the bracket, not zoom into it.

**User direction:** ESPN-style section navigation — show a miniature bracket overview, user clicks a section to see that section's entrants in full size for voting. No dynamic zoom/pan.

**Fix needed:** Replace BracketZoomWrapper with a section-based navigation component. Small overview shows full bracket structure; clicking a round/section expands it to full-size entrant cards. Remove wheel zoom hijacking entirely.

**Files:** `src/components/bracket/bracket-zoom-wrapper.tsx`, `src/hooks/use-pan-zoom.ts`, `src/components/bracket/bracket-diagram.tsx`

---

## Summary

| Gap | Severity | Plans Needed |
|-----|----------|-------------|
| GAP-R3-01: DE lifecycle | Critical | 1-2 (dashboard + completion logic) |
| GAP-R3-02: RR vote counts | High | 1 (vote display + round advancement) |
| GAP-R3-03: Predictive visibility | Critical | 1 (activation path + student page) |
| GAP-R3-04: Large bracket UX | High | 1 (section navigation redesign) |

**Estimated plans:** 4-5 gap closure R3 plans
