# Phase 24: Bracket & Poll UX Consistency - Research

**Researched:** 2026-02-23
**Domain:** Supabase realtime broadcasting, bracket/poll UX unification, celebration animations
**Confidence:** HIGH

## Summary

Phase 24 addresses three distinct UX issues: (1) round robin and predictive brackets not auto-showing on the student dashboard when activated, (2) round robin "simple vote" mode using a cramped Prev/Next carousel instead of single bracket's full-sized matchup card presentation, and (3) inconsistent celebration/reveal animations across bracket types and polls.

The realtime broadcast gap is a focused server-side bug: the `updateBracketStatus` action (in `src/actions/bracket.ts`) calls `updateBracketStatusDAL` which updates the database but never calls `broadcastActivityUpdate(sessionId)` to notify the `activities:{sessionId}` channel. This is the same channel that `useRealtimeActivities` (the student dashboard hook) subscribes to. Polls got this right in Phase 21 (dual-channel broadcast pattern), but brackets were never patched. The fix is small and surgical.

The round robin simple vote UX issue is a UI architecture gap: single elimination's `SimpleVotingView` renders one `MatchupVoteCard` at a time with full-width animated transitions (large tap targets, centered layout, `max-w-md`), while round robin's `RoundRobinMatchups` in simple mode renders a compact inline navigation bar with small `px-2.5 py-1 text-xs` vote buttons -- a fundamentally different and inferior experience. The fix requires either reusing `MatchupVoteCard` inside the round robin flow or building an equivalent full-sized presentation for round robin matchups.

For celebration unification, the codebase currently has five different celebration patterns: (1) `WinnerReveal` (3-2-1 countdown + "And the winner is...") used by single elimination and double elimination, (2) `CelebrationScreen` (trophy + confetti + "CHAMPION!") chained after WinnerReveal for brackets, (3) `CountdownOverlay` (3-2-1 + "Round N Results") used by predictive reveal, (4) `PodiumCelebration` (staggered podium + confetti) for predictive brackets, and (5) `PollReveal` ("Winner!" text + confetti, no countdown) for polls. The phase goal is to adopt double elimination's 3-2-1 countdown + stars as the canonical pattern across all bracket types and polls.

**Primary recommendation:** Three focused plans: (1) `broadcastActivityUpdate` fix in bracket activation + predictive activation paths, (2) round robin simple vote UI refactor to use `MatchupVoteCard`-style presentation, (3) unified celebration animation component replacing divergent patterns.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| motion (Framer Motion) | ^12.29.2 | Animation framework for celebration overlays, countdowns, transitions | Already in use across 14 component files; `motion/react` import path |
| canvas-confetti | ^1.9.4 | Particle effects for celebration bursts | Already in use in CelebrationScreen, PodiumCelebration, PollReveal |
| Supabase Realtime | via REST API | Server-side broadcast for activity updates | Established pattern from Phase 2/4/21 |
| Tailwind CSS | (project standard) | Styling for all UI components | Project-wide standard |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | (project standard) | Icons (Trophy, ChevronDown, etc.) | UI elements in bracket/poll views |

### Alternatives Considered

No new libraries needed. All required capabilities exist in the current stack.

## Architecture Patterns

### Existing Codebase Structure (Relevant Files)

```
src/
├── lib/realtime/broadcast.ts        # Server-side broadcast functions
├── hooks/
│   ├── use-realtime-activities.ts   # Student dashboard activity subscription
│   ├── use-realtime-bracket.ts      # Bracket-specific subscription
│   └── use-realtime-poll.ts         # Poll-specific subscription
├── actions/
│   ├── bracket.ts                   # Bracket CRUD + activation (MISSING broadcast)
│   ├── bracket-advance.ts           # Advancement + voting (HAS broadcast)
│   ├── round-robin.ts               # RR result recording
│   ├── prediction.ts                # Predictive bracket actions
│   └── poll.ts                      # Poll actions (HAS dual-channel broadcast)
├── components/
│   ├── bracket/
│   │   ├── celebration-screen.tsx   # Trophy + confetti (SE/DE/RR champion)
│   │   ├── winner-reveal.tsx        # 3-2-1 countdown + "And the winner is..."
│   │   ├── countdown-overlay.tsx    # 3-2-1 + "Round N Results" (predictive reveal)
│   │   ├── podium-celebration.tsx   # Top-3 podium (predictive)
│   │   ├── prediction-reveal.tsx    # Orchestrates countdown + podium
│   │   ├── matchup-vote-card.tsx    # Full-sized voting card (SE simple mode)
│   │   └── round-robin-matchups.tsx # Matchup grid with Prev/Next navigation
│   ├── poll/
│   │   └── poll-reveal.tsx          # "Winner!" + confetti (polls)
│   └── student/
│       └── simple-voting-view.tsx   # SE simple mode orchestrator
└── app/
    └── (student)/session/[sessionId]/
        ├── page.tsx                 # Student session (ActivityGrid)
        ├── bracket/[bracketId]/page.tsx  # Student bracket page
        └── poll/[pollId]/page.tsx        # Student poll page
```

### Pattern 1: Dual-Channel Broadcast (Established in Phase 21)

**What:** When a bracket or poll status changes, broadcast to both the activity-specific channel AND the session's activity channel.
**When to use:** Any time an activity becomes visible/invisible to students (activation, completion, archival).
**Example (from poll.ts -- the pattern that brackets should follow):**

```typescript
// Source: src/actions/poll.ts, lines 238-257
if (status === 'active') {
  broadcastPollUpdate(pollId, 'poll_activated').catch(console.error)
  if (result.sessionId) {
    broadcastActivityUpdate(result.sessionId).catch(console.error)
  }
}
```

### Pattern 2: MatchupVoteCard Full-Sized Presentation (SE Simple Mode)

**What:** Single matchup displayed with full-width card, large tap targets (min-h-16), "VS" divider, and animated slide transitions.
**When to use:** Simple mode for younger students -- maximum clarity, one decision at a time.
**Example (from matchup-vote-card.tsx):**

```typescript
// Source: src/components/bracket/matchup-vote-card.tsx, lines 96-108
<button
  className={`
    relative flex min-h-16 flex-1 items-center justify-center rounded-xl border-2 px-4 py-3
    transition-all duration-200
    ${isInteractive ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'}
    ...
  `}
>
  <span className="text-center text-lg font-semibold">{entrant.name}</span>
</button>
```

**Contrast with RR simple mode (round-robin-matchups.tsx, lines 313-343):**

```typescript
// Source: src/components/bracket/round-robin-matchups.tsx, lines 316-327
<button
  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ...`}
>
  {entrant1Name}
</button>
<span className="text-xs text-muted-foreground">vs</span>
<button
  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ...`}
>
  {entrant2Name}
</button>
```

The RR simple mode buttons are `text-xs`, `px-2.5 py-1` -- dramatically smaller than SE's `text-lg`, `min-h-16`, `px-4 py-3`.

### Pattern 3: Celebration Animation Sequence (DE Canonical Pattern)

**What:** The double elimination winner reveal follows: 3-2-1 countdown (brand-blue, large numbers, glow effect) -> pause with pulsing dots -> "And the winner is..." -> CelebrationScreen (trophy, confetti, "CHAMPION!").
**When to use:** This is the phase goal -- make ALL bracket types and polls use this pattern.

The sequence is implemented across two components chained together:
1. `WinnerReveal` -- countdown + reveal text (auto-dismisses after 2.2s)
2. `CelebrationScreen` -- trophy + multi-wave confetti (auto-dismisses after 12s)

The chaining is done via `handleRevealComplete`:

```typescript
// Source: src/components/teacher/live-dashboard.tsx, lines 317-321
const handleRevealComplete = useCallback(() => {
  setRevealState(null)
  setShowCelebration(true)
}, [])
```

### Anti-Patterns to Avoid

- **Separate countdown implementations per bracket type:** Currently CountdownOverlay (predictive) and WinnerReveal (SE/DE) are separate components with the same 3-2-1 concept but different styling. Unify into one.
- **Broadcasting to bracket channel but not activity channel:** The current bracket activation bug -- always broadcast to both channels.
- **Inline small vote buttons for "simple mode":** RR simple mode currently puts tiny vote buttons inline. This defeats the purpose of "simple" mode.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confetti effects | Custom particle system | canvas-confetti (already in project) | 1.5KB, GPU-accelerated, handles cleanup |
| Animation orchestration | Manual setTimeout chains | motion/react AnimatePresence + useReducedMotion | Handles reduced motion, exit animations, layout shifts |
| Realtime transport | Custom WebSocket management | Supabase Broadcast REST API (already in project) | Server-stateless, handles auth, REST fallback |

**Key insight:** All three issues can be solved by extending or refactoring existing patterns, not building new infrastructure.

## Common Pitfalls

### Pitfall 1: Missing broadcastActivityUpdate After DB Update

**What goes wrong:** Student dashboard shows stale activity list -- newly activated brackets don't appear.
**Why it happens:** The `updateBracketStatus` action calls `updateBracketStatusDAL` which writes to the DB, but neither function calls `broadcastActivityUpdate(sessionId)`. The student's `useRealtimeActivities` hook only listens to `activities:{sessionId}` channel events, NOT bracket-specific channels.
**How to avoid:** After every status change that affects activity visibility (draft->active, active->completed), check if `bracket.sessionId` exists and call `broadcastActivityUpdate(bracket.sessionId)`.
**Warning signs:** Testing only with manual refresh -- always test with a student browser open to verify live updates.

### Pitfall 2: Race Condition Between Bracket Channel and Activity Channel

**What goes wrong:** Student navigates to bracket before activity grid re-fetches, hitting a stale state.
**Why it happens:** The `bracket:{id}` channel broadcast may arrive before the `activities:{sessionId}` broadcast, or vice versa.
**How to avoid:** The dual-channel pattern is fine -- `useRealtimeActivities` re-fetches the full list from the API, so it always gets current state. The key is ensuring BOTH channels are notified, not the ordering.
**Warning signs:** Intermittent "bracket not found" errors on student devices after activation.

### Pitfall 3: Breaking RR Teacher View When Changing Student View

**What goes wrong:** Refactoring `RoundRobinMatchups` to use MatchupVoteCard breaks teacher controls (Win/Tie/Decide by Votes buttons).
**Why it happens:** `RoundRobinMatchups` is shared between teacher and student views with `isTeacher` flag. The teacher view needs inline result recording buttons, not large vote cards.
**How to avoid:** Use the `isTeacher` flag to conditionally render the full-sized card layout (student) vs the compact teacher layout. Or better: only change the student-facing `simple` votingStyle rendering, leaving teacher and advanced modes untouched.
**Warning signs:** Teacher live dashboard layout breaks after RR UI changes.

### Pitfall 4: Animation Timing Conflicts in Celebration Chain

**What goes wrong:** Countdown overlay and celebration screen overlap, or celebration fires before countdown finishes.
**Why it happens:** Multiple `useEffect` hooks with timeouts can race each other if component re-renders.
**How to avoid:** Use a single state machine for the celebration flow (countdown -> pause -> reveal -> celebration -> done) rather than multiple independent boolean states. The existing WinnerReveal -> CelebrationScreen chain works because it uses callback-based sequencing (`onComplete`).
**Warning signs:** Two overlays appearing simultaneously, or celebration appearing without countdown.

### Pitfall 5: No Framer Motion in PresentationResults

**What goes wrong:** Adding celebration to teacher presentation mode breaks projector rendering.
**Why it happens:** Phase 22 decision explicitly excluded Framer Motion from PresentationResults for reliable projector rendering.
**How to avoid:** Keep PresentationResults (the projector-specific view) free of `motion/react` animations. Celebrations should be in the parent component (the live dashboard), not inside PresentationResults.
**Warning signs:** Projector display flickers or animations stutter on low-powered projector hardware.

## Code Examples

### Fix 1: Add broadcastActivityUpdate to Bracket Activation

```typescript
// In src/actions/bracket.ts, updateBracketStatus function:
// After successful DAL update and revalidatePath calls

import { broadcastActivityUpdate } from '@/lib/realtime/broadcast'

// After result = await updateBracketStatusDAL(...)
// If status is 'active' or 'completed' and bracket has a sessionId:
if (['active', 'completed'].includes(parsed.data.status)) {
  const bracket = await prisma.bracket.findUnique({
    where: { id: parsed.data.bracketId },
    select: { sessionId: true },
  })
  if (bracket?.sessionId) {
    broadcastActivityUpdate(bracket.sessionId).catch(console.error)
  }
}
```

### Fix 2: RR Simple Mode Using MatchupVoteCard Layout

The approach: when `votingStyle === 'simple'` and `!isTeacher`, render matchups one-at-a-time using the same full-sized card layout as `MatchupVoteCard` (large tap targets, centered VS, animated transitions).

The existing SimpleVotingView in `src/components/student/simple-voting-view.tsx` provides the orchestration pattern (currentIndex, AnimatePresence mode="wait", onVoteSubmitted auto-advance). The RR student view should adopt this pattern instead of the compact Prev/Next carousel.

Two approaches:
- **Option A:** Extract a shared `SimpleMatchupView` component used by both SE SimpleVotingView and RR student view.
- **Option B:** In the RR student page (`RRLiveView`), when `votingStyle === 'simple'`, render a `SimpleVotingView`-like experience that filters matchups by the current round and presents them one at a time with `MatchupVoteCard`.

Option B is simpler because it avoids touching the shared `RoundRobinMatchups` component (which also serves teacher and advanced student views). The RR student page already routes differently (`RRLiveView` component).

### Fix 3: Unified Celebration Component

Create a single celebration orchestrator component that handles the canonical pattern:

```
Phase 1: 3-2-1 countdown (WinnerReveal pattern)
Phase 2: Brief pause with pulsing dots
Phase 3: "And the winner is..." / "Results are in!" reveal text
Phase 4: CelebrationScreen (trophy + multi-wave confetti + winner name)
```

This replaces:
- `PollReveal` (no countdown, just "Winner!" + confetti)
- `WinnerReveal` + `CelebrationScreen` (already correct -- combine into single orchestrator)
- Round robin's direct `CelebrationScreen` (skips countdown -- add it)
- Predictive's `CountdownOverlay` + `PodiumCelebration` (different sequence -- keep for predictive but unify countdown styling)

## Inventory of Current Celebration Behavior by Bracket/Poll Type

### Single Elimination (Teacher + Student)

| View | Trigger | Components | Sequence |
|------|---------|------------|----------|
| Teacher LiveDashboard | Final matchup decided | WinnerReveal -> CelebrationScreen | 3-2-1 -> pause -> "And the winner is..." -> trophy + confetti |
| Student SimpleVotingView | bracketCompleted flag | WinnerReveal -> CelebrationScreen | Same as teacher |
| Student AdvancedVotingView | bracketCompleted flag | CelebrationScreen only | Trophy + confetti (no countdown) |

### Double Elimination (Teacher + Student)

| View | Trigger | Components | Sequence |
|------|---------|------------|----------|
| Teacher LiveDashboard | GF decided + bracketCompleted | WinnerReveal -> CelebrationScreen | 3-2-1 -> pause -> "And the winner is..." -> trophy + confetti |
| Student DEVotingView | bracketCompleted flag | WinnerReveal -> CelebrationScreen | Same as teacher |

### Round Robin (Teacher + Student)

| View | Trigger | Components | Sequence |
|------|---------|------------|----------|
| Teacher LiveDashboard | bracketCompleted + fallback timeout | CelebrationScreen only | Trophy + confetti (NO countdown) |
| Student RRLiveView | bracketCompleted flag | CelebrationScreen only | Trophy + confetti (NO countdown) |

### Predictive Bracket (Auto-mode)

| View | Trigger | Components | Sequence |
|------|---------|------------|----------|
| Student PredictionReveal | New round revealed | CountdownOverlay | 3-2-1 -> "Round N Results" (different style than WinnerReveal) |
| Student PredictionReveal | revealComplete flag | PodiumCelebration | Staggered podium reveal + confetti (unique to predictive) |

### Polls

| View | Trigger | Components | Sequence |
|------|---------|------------|----------|
| Teacher PollResults | forceReveal (close poll) | PollReveal | "Winner!" text + confetti (NO countdown, 5s auto-dismiss) |
| Student PollVotingPage | active->closed transition | PollReveal | Same as teacher |

### Gaps vs. Canonical Pattern

The canonical pattern (from DE) is: **3-2-1 countdown -> pause -> reveal text -> trophy/confetti celebration**.

| Type | Missing Countdown | Missing Trophy/Stars | Notes |
|------|-------------------|----------------------|-------|
| SE Advanced (student) | YES | No (has CelebrationScreen) | Skips WinnerReveal, goes straight to celebration |
| Round Robin (all views) | YES | No (has CelebrationScreen) | Skips WinnerReveal entirely |
| Polls (all views) | YES | YES (uses PollReveal, not CelebrationScreen) | Completely different pattern |
| Predictive | Has CountdownOverlay (different style) | Has PodiumCelebration (different from CelebrationScreen) | Style differs but conceptually similar |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-bracket-type celebration logic | Should be unified celebration orchestrator | Phase 24 (upcoming) | Consistent student experience across all activity types |
| Activity channel not broadcast on bracket activation | Should dual-channel broadcast (like polls) | Phase 24 (upcoming) | Brackets auto-appear on student dashboard |
| RR simple mode = compact inline buttons | Should match SE simple mode (full-sized cards) | Phase 24 (upcoming) | Consistent "simple mode" experience |

## Open Questions

1. **Should predictive bracket keep its unique PodiumCelebration?**
   - What we know: PodiumCelebration shows top-3 students with staggered reveal, which is specific to prediction scoring. The canonical "champion" celebration doesn't apply since predictive brackets celebrate top students, not a single entrant winner.
   - What's unclear: Does the phase description intend to replace PodiumCelebration with the generic celebration, or just unify the countdown styling?
   - Recommendation: Keep PodiumCelebration for predictive brackets (it serves a unique purpose) but unify the CountdownOverlay styling to match WinnerReveal's brand-blue glow numbers. The phase description says "3-2-1 countdown + stars as canonical pattern" -- apply that countdown style everywhere, but allow the post-countdown content to vary (champion vs. podium).

2. **Does "stars" in the phase description refer to confetti or the animated sparkle dots?**
   - What we know: CelebrationScreen has small pulsing dot "sparkle effects" around the trophy (lines 174-189). WinnerReveal has "pulsing dots" in the pause phase. canvas-confetti handles the large particle bursts.
   - What's unclear: Whether "stars" means the sparkle dots, the confetti particles, or star-shaped confetti.
   - Recommendation: Use the CelebrationScreen sparkle dots pattern (animated scale/opacity circles around the winner content) plus multi-wave confetti bursts. canvas-confetti supports star shapes via the `shapes` option if desired.

3. **Should the teacher poll live dashboard also get the 3-2-1 countdown on close?**
   - What we know: Currently the teacher gets `PollReveal` on close (immediate "Winner!" + confetti), no countdown. Phase description says "both teacher and student views."
   - Recommendation: Yes, add the countdown to the teacher poll close flow. The teacher is often projecting to the class, so the dramatic reveal is the point.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/actions/bracket.ts` -- confirmed no `broadcastActivityUpdate` call on status change
- Codebase analysis: `src/actions/poll.ts` lines 238-257 -- confirmed poll dual-channel pattern (the reference implementation)
- Codebase analysis: `src/lib/dal/bracket.ts` `updateBracketStatusDAL` function -- confirmed no activity broadcast
- Codebase analysis: `src/lib/dal/prediction.ts` lines 463-466 -- confirmed `broadcastActivityUpdate` only for `predictions_open`, not for `active`
- Codebase analysis: `src/hooks/use-realtime-activities.ts` -- confirmed student dashboard only listens to `activity_update` event on `activities:{sessionId}` channel
- Codebase analysis: All 5 celebration components compared for animation sequences
- Codebase analysis: `src/components/bracket/matchup-vote-card.tsx` vs `src/components/bracket/round-robin-matchups.tsx` -- confirmed UI size discrepancy

### Secondary (MEDIUM confidence)
- Phase description from ROADMAP.md -- interpretation of "3-2-1 countdown + stars as canonical pattern"
- Prior decisions from STATE.md -- Phase 22 "No Framer Motion in PresentationResults" constraint

## Metadata

**Confidence breakdown:**
- Realtime broadcast fix: HIGH -- root cause verified by tracing code paths; fix pattern established by polls
- RR simple vote UI: HIGH -- UI discrepancy measured in component source; SE simple mode provides reference implementation
- Celebration unification: HIGH for inventory, MEDIUM for design decisions (some interpretation of "canonical pattern" needed)

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (stable codebase, no external dependency changes expected)
