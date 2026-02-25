# Project Research Summary

**Project:** SparkVotEDU v1.3 — Bug Fixes & UX Parity
**Domain:** EdTech classroom voting platform — targeted bug fixes and UI consistency sprint
**Researched:** 2026-02-24
**Confidence:** HIGH

## Executive Summary

SparkVotEDU v1.3 is a tightly scoped sprint of five targeted fixes to an existing Next.js 16 / React 19 / Supabase Realtime platform. Every fix operates against the established stack and architecture — zero new npm packages are required. The overarching theme across all five items is **React state lifecycle management**: specifically, understanding when `useRef` guards must be set inside vs. outside `setTimeout` callbacks, when React effect cleanup cancels timers, and how to propagate deletions and participant changes through an existing dual-channel Supabase broadcast architecture. The `hasShownRevealRef` pattern established and validated in Phase 24 is the canonical solution for all timer-race issues.

The recommended implementation approach is to proceed in ascending-risk order: sign-out button feedback first (purely additive, no realtime surface), poll context menu second (UI-only, clear reference pattern in `session-card-menu.tsx`), student dynamic activity removal third (adds `broadcastActivityUpdate` call to delete actions), SE bracket final round realtime fourth (investigation-first, likely a `cache: 'no-store'` fix), and RR all-at-once completion last (requires verification of `isRoundRobinComplete` query scope and possible celebration guard additions in `RRLiveView`). Features 1 and 4 compound positively — the new context menu's Delete action will immediately trigger the broadcast removal on student dashboards once both fixes are in place.

The primary risks in this milestone are the two investigation-required bugs (SE final round, RR all-at-once): both touch the celebration trigger chain established in Phase 24. The key mitigation is to apply the Pitfall 1 pattern everywhere (ref inside timer, not before it), verify `RRLiveView` has a `hasShownRevealRef` guard matching `DEVotingView`, and ensure any new Supabase channel subscriptions added for student removal are paired with `removeChannel` in cleanup. None of these risks are novel — Phase 24 already solved the canonical versions; v1.3 is applying known solutions to remaining locations.

---

## Key Findings

### Recommended Stack

All five v1.3 features are achievable with the already-installed package set. No new dependencies are needed. React 19.2.3 provides `useFormStatus` (stable, from `react-dom`) and `useTransition` for server action pending states. The `@radix-ui/react-dropdown-menu` package is already installed as a shadcn/ui primitive and provides keyboard navigation, Escape-to-close, and focus management for the poll context menu at no extra cost. Supabase JS 2.93.3's broadcast REST API (used via service_role key in `src/lib/realtime/broadcast.ts`) is the established transport for all realtime events and is simply extended with two new call sites.

The critical pattern reference across all timer-related fixes is the `hasShownRevealRef` guard: set inside the `setTimeout` callback, not before it. This pattern is already validated in Phase 24-05 (`DEVotingView`, teacher live-dashboard) and must be verified and applied to `RRLiveView` and any other celebration effects that lack it.

**Core technologies (unchanged):**
- **Next.js 16.1.6:** Server actions, `revalidatePath`, API routes — no changes to the framework layer
- **React 19.2.3:** `useRef`, `useFormStatus` (stable in React 19), `useTransition` — existing hooks cover all five fixes
- **@radix-ui/react-dropdown-menu ^2.1.16:** Already installed; wrapped by `src/components/ui/dropdown-menu.tsx`; provides accessible context menu for poll cards
- **@supabase/supabase-js ^2.93.3:** Broadcast REST API for activity deletion events; existing `broadcastActivityUpdate` needs to be called from two additional sites
- **Prisma ^7.3.0:** DAL layer; `deletePoll`/`deleteBracket` need to return `sessionId` before delete to enable broadcast
- **lucide-react ^0.563.0:** `MoreVertical`, `Trash2` already imported in `bracket-card.tsx`; same icons reused for poll menu

### Expected Features

Research confirmed five features scoped for v1.3, all at LOW-to-MEDIUM implementation complexity. Prioritized by user impact and implementation risk:

**Must have (table stakes — ship in v1.3):**
- **Poll card triple-dot context menu** — brackets have it; UX inconsistency is immediately noticeable to teachers
- **Student dashboard removes deleted activities** — activation appears live; deletion should too; without this, deleted activities linger on student screens during live class sessions
- **Sign-out button pending feedback** — any server action button that takes 200ms-2s with no feedback looks broken; leads to double-click confusion

**Should have (correctness bugs — ship in v1.3):**
- **RR all-at-once bracket correct completion** — broken pacing mode is a correctness bug, not cosmetic; teachers who use all-at-once RR cannot complete brackets
- **SE bracket final round realtime updates** — live vote watching to the last matchup is core teacher UX; final round currently goes dark on student views

**Defer to v1.4:**
- Poll archiving — requires schema changes; no DB model exists
- Student notification message on deletion — complexity without proportionate value; EmptyState handles zero-activity gracefully
- Spinner icon on sign-out — inconsistent with established text-pending pattern ("Deleting...", "Ending...")

### Architecture Approach

SparkVotEDU uses a dual-channel Supabase Realtime broadcast architecture. Teacher server actions write to Prisma (via Prisma bypassrls) and broadcast via REST API to either activity-specific channels (`bracket:{id}`, `poll:{id}`) or the session-wide channel (`activities:{sessionId}`). All five v1.3 fixes are either (a) pure UI changes with no realtime impact, (b) additions of `broadcastActivityUpdate` call sites to existing delete server actions, or (c) verification and correction of React effect guard patterns in existing hooks and page components. One new broadcast event type (`participant_removed`) is added to the `activities:{sessionId}` channel for the student dynamic removal fix. One new file is created (`src/components/poll/poll-card-menu.tsx`); seven to eight existing files are modified.

**Major components touched:**
1. `src/components/poll/poll-card-menu.tsx` — NEW; mirrors `session-card-menu.tsx` Radix DropdownMenu pattern
2. `src/actions/poll.ts` and `src/actions/bracket.ts` — MODIFY; add `broadcastActivityUpdate(sessionId)` on delete
3. `src/actions/class-session.ts` — MODIFY; add `participant_removed` broadcast to `removeStudent`/`banStudent`
4. `src/hooks/use-realtime-activities.ts` — MODIFY; add `participant_removed` listener, return `removed` state
5. `src/components/student/activity-grid.tsx` — MODIFY; render `RemovedState` when `removed === true`
6. `src/app/api/brackets/[bracketId]/state/route.ts` — INVESTIGATE; likely add `cache: 'no-store'`
7. `src/components/auth/signout-button.tsx` — MODIFY; add `useFormStatus` inner component

### Critical Pitfalls

1. **hasShownRevealRef set before setTimeout (Pitfall 1)** — when two rapid broadcasts (`winner_selected` + `bracket_completed`) fire in succession, the second triggers a dependency re-run that cancels the timer, but the ref is already `true`, permanently blocking rescheduling. Fix: move `hasShownRevealRef.current = true` inside the `setTimeout` callback. This pattern is confirmed as the root cause in Phase 24 debug files and the fix is validated in `DEVotingView`. Apply to all remaining celebration effects.

2. **Missing hasShownRevealRef guard causing infinite loop (Pitfall 2)** — `RRLiveView` in `bracket/[bracketId]/page.tsx` has no `hasShownRevealRef` guard. After `CelebrationScreen` auto-dismisses (12 seconds), `bracketCompleted` is still `true` and all other conditions reset to `false`, causing the effect to re-fire and loop infinitely. Fix: add `const hasShownRevealRef = useRef(false)` and `!hasShownRevealRef.current` to the effect condition in `RRLiveView`, mirroring `DEVotingView`.

3. **Dual-channel deletion broadcast missing (Pitfall 5)** — broadcasting only to `activities:{sessionId}` updates the activity grid but leaves students already inside a deleted bracket/poll page on a stale view. Fix: after confirming the activity-grid broadcast works, also send a deletion event to the activity's own channel so students on the activity page are redirected back to `/session/{sessionId}`.

4. **Supabase channel not in cleanup causing subscription leak (Pitfall 6)** — any new channel subscription added without a paired `supabase.removeChannel()` in the cleanup causes channel count growth. In React StrictMode the effect runs twice, surfacing the leak immediately. Fix: count `.channel(...).subscribe()` calls and match them with `removeChannel` calls in every `useEffect` cleanup.

5. **e.stopPropagation missing on context menu trigger (Pitfall 8)** — the DropdownMenuTrigger button sits inside a `<Link>` wrapper. Without `e.stopPropagation()` + `e.preventDefault()` on the trigger button's `onClick`, clicking the menu also navigates the card. Fix: copy the pattern from `session-card-menu.tsx` lines 33-35 exactly.

---

## Implications for Roadmap

Research points to a clear 5-phase structure matching the five scoped features, ordered by ascending risk and dependency. No feature requires another to ship first, but grouping the two realtime-investigation bugs after the simpler additive work reduces noise during root-cause tracing.

### Phase 1: Sign-Out Button Pending Feedback

**Rationale:** Purely additive; zero realtime surface area; no risk of regression; builds confidence before touching shared code. Single-file change. Pattern already established in `useTransition` throughout the codebase.
**Delivers:** Teachers see "Signing out..." label + disabled state immediately on click; no double-submit possible.
**Addresses:** Feature 5 (FEATURES.md); table stakes UX polish.
**Avoids:** Sign-out double-submit (security/UX).

### Phase 2: Poll Context Menu

**Rationale:** UI-only change; no data mutations change; no realtime events; clear reference implementation in `session-card-menu.tsx`. Establishing the context menu now means the student deletion broadcast (Feature 4) immediately surfaces in the menu UX without a second pass.
**Delivers:** Poll list shows triple-dot menu with Edit, Duplicate, Delete matching bracket card UX; keyboard-accessible via Radix.
**Addresses:** Feature 1 (FEATURES.md); table stakes UX consistency.
**Avoids:** Event bubbling from context menu trigger (Pitfall 8); must include `e.stopPropagation()`.

### Phase 3: Student Dynamic Activity Removal

**Rationale:** Extends the existing broadcast architecture with two new call sites and one new event type. Should be done before the investigation-required bugs so the broadcast infrastructure is well-exercised and any issues are isolated. Feature 1 (poll context menu) enhances this — the new Delete action in the menu will immediately trigger the student broadcast once this phase is in place.
**Delivers:** Deleted brackets and polls disappear from student session dashboards within ~2 seconds; removed students see a "You've been removed" state rather than stale UI.
**Addresses:** Feature 4 (FEATURES.md); table stakes live-session UX.
**Avoids:** Single-channel broadcast omission (Pitfall 5); channel subscription leak (Pitfall 6); missing sessionId lookup before delete.

### Phase 4: SE Bracket Final Round Realtime Fix

**Rationale:** Investigation-first bug; likely a trivial `cache: 'no-store'` addition to the bracket state API route. By doing this before the RR all-at-once fix, if the SE and RR bugs share a root cause (premature `status: 'completed'` in API response), that is discovered here first and informs Phase 5.
**Delivers:** SE bracket final round vote counts update in real time on student views without manual refresh.
**Addresses:** Feature 3 (FEATURES.md); differentiator: live vote dashboard to the last vote.
**Avoids:** Premature `bracketCompleted` signal; ref-outside-timer race (Pitfall 1); reconnect fallback gap (Pitfall 7).

### Phase 5: RR All-at-Once Bracket Completion Fix

**Rationale:** Most investigation-heavy fix; touches the most code paths (celebration chain, bracket activation, `isRoundRobinComplete` query). Doing this last means lessons from Phase 4's investigation are available, and the broadcast infrastructure from Phase 3 is proven. Phase 24-06 (`calculateRoundRobinStandings`) must be preserved as a non-regression throughout.
**Delivers:** RR all-at-once brackets complete correctly when all matchups are decided; celebration fires on teacher and student views; `RRLiveView` celebration guard added to prevent infinite loop.
**Addresses:** Feature 2 (FEATURES.md); differentiator: flexible classroom pacing with auto-completion.
**Avoids:** Ref-outside-timer blocking celebration (Pitfall 1); missing ref guard causing infinite loop (Pitfall 2); `bracketDone` broken for RR type (Pitfall 4); content bleed-through behind celebration overlay (UX Pitfalls).

### Phase Ordering Rationale

- Phases 1-2 are zero-risk additive work: doing them first builds confidence and surfaces any environment issues before touching shared realtime infrastructure.
- Phase 3 introduces the only net-new broadcast event type (`participant_removed`); isolating it on its own makes any subscription or cleanup issues immediately attributable.
- Phases 4-5 require investigation before implementation; ordering them last keeps investigation windows clean and avoids conflating root causes.
- Features 1 and 4 compound: poll context menu Delete action triggers the student broadcast from Phase 3. This is a natural sequencing bonus, not a hard dependency.
- Phase 24's `hasShownRevealRef` and `calculateRoundRobinStandings` work must be treated as non-regressions throughout Phase 5.

### Research Flags

Needs investigation during planning/execution:
- **Phase 4:** Read `src/app/api/brackets/[bracketId]/state/route.ts` before writing code — root cause is unconfirmed but highly likely to be Next.js route caching. Approximately 15 minutes of investigation.
- **Phase 5:** Read `src/actions/bracket.ts` + `src/lib/dal/bracket.ts` activation path and `bracket/[bracketId]/page.tsx` `RRLiveView` celebration effect before writing code. Approximately 30 minutes of investigation.
- **Phase 3 (minor):** Confirm `deletePoll` and `deleteBracket` DAL return values and whether `sessionId` is available pre-delete without an extra query. Approximately 5 minutes of reading.

Phases with standard patterns (skip research-phase):
- **Phase 1:** `useFormStatus` is stable React 19; pattern is already in `session-detail.tsx` and `bracket-card.tsx`.
- **Phase 2:** Context menu pattern is fully specified in `session-card-menu.tsx`; no unknowns.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages verified from `package.json`; all referenced source files read directly; zero new dependencies needed |
| Features | HIGH | All five features traced to existing codebase, debug files, and Phase 24 UAT results; scope is well-defined |
| Architecture | HIGH | All modified files identified by name; dual-channel broadcast pattern fully understood; one fix (SE final round) has an unconfirmed but highly probable root cause |
| Pitfalls | HIGH | All critical pitfalls confirmed by direct debug file reads and codebase analysis, not inference; Phase 24 already encountered and solved the canonical versions |

**Overall confidence:** HIGH

### Gaps to Address

- **SE final round root cause (Phase 4):** The most likely cause is `cache: 'no-store'` missing from the bracket state API route, but this is not confirmed. Must read `src/app/api/brackets/[bracketId]/state/route.ts` before writing code. If the route is already `no-store`, investigation expands to the `useRealtimeBracket` hook's `fetchBracketState` call timing or the student bracket page's initial fetch on navigation.

- **RR all-at-once activation path (Phase 5):** Whether the bug is in `isRoundRobinComplete`'s query scope or in the round-opening logic at activation time is not fully determined. ARCHITECTURE.md notes both possibilities. Must trace the activation code path from `updateBracketStatus` through the DAL to the round-opening step before writing fixes.

- **Student removal navigation (Phase 3, lower priority):** ARCHITECTURE.md Fix 4 specifies that students already on a deleted bracket/poll page need to be redirected via a second broadcast to the activity's own channel. FEATURES.md marks this as acceptable to defer (404/notFound is acceptable for MVP), but PITFALLS.md Pitfall 5 flags it as a UX gap. Decision point: ship the session-grid removal (single-channel) first, then evaluate whether the per-activity-page redirect is needed in the same phase or can go to v1.4.

- **Mobile nav sign-out (Phase 1):** FEATURES.md notes that `src/components/dashboard/mobile-nav.tsx` may also contain a sign-out trigger that needs the same pending state treatment. Must verify during Phase 1 implementation.

---

## Sources

### Primary (HIGH confidence)
- `package.json` — all installed versions verified directly
- `src/components/bracket/bracket-card.tsx` — reference context menu implementation
- `src/components/teacher/session-card-menu.tsx` — reference Radix DropdownMenu pattern
- `src/hooks/use-realtime-activities.ts`, `use-realtime-bracket.ts`, `use-realtime-poll.ts` — realtime hook patterns and cleanup
- `src/lib/realtime/broadcast.ts` — REST API broadcast pattern and dual-channel coordination
- `src/actions/round-robin.ts`, `src/actions/bracket-advance.ts`, `src/actions/class-session.ts` — server action broadcast patterns
- `src/lib/dal/round-robin.ts` — `isRoundRobinComplete`, `advanceRoundRobinRound`
- `src/components/teacher/live-dashboard.tsx` — `bracketDone`, `rrAllDecided`, celebration trigger effects
- `src/components/auth/signout-button.tsx` — current sign-out implementation
- `.planning/debug/rr-bracket-completion-celebration.md` — confirmed celebration chain root causes
- `.planning/debug/celebration-loops-infinitely.md` — confirmed missing `hasShownRevealRef` on `RRLiveView`
- `.planning/debug/teacher-rr-celebration-not-triggering.md` — confirmed ref-outside-timer race condition
- `.planning/debug/poll-student-no-celebration.md` — confirmed early-return blocking poll student celebration
- `.planning/debug/rr-tiebreaker-declares-winner-in-tie.md` — confirmed `calculateRoundRobinStandings` is the correct function
- `.planning/phases/24-bracket-poll-ux-consistency/24-VERIFICATION.md` — Phase 24 Plan 05/06 patterns validated in production
- `.planning/phases/24-bracket-poll-ux-consistency/24-UAT.md` — Phase 24 passed UAT

### Secondary (MEDIUM confidence)
- React useFormStatus docs (https://react.dev/reference/react-dom/hooks/useFormStatus) — stable in React 19, must be child of form
- React useTransition docs (https://react.dev/reference/react/useTransition) — alternative for event-handler patterns
- shadcn/ui DropdownMenu docs (https://ui.shadcn.com/docs/components/dropdown-menu) — already installed via Radix
- Supabase Broadcast docs (https://supabase.com/docs/guides/realtime/broadcast) — REST API pattern confirmed
- Supabase TooManyChannels troubleshooting — cleanup requirements confirmed against codebase patterns

### Tertiary (LOW confidence — needs validation during implementation)
- SE bracket final round root cause: `cache: 'no-store'` hypothesis — inferred from architecture, not yet confirmed by reading the route file
- RR all-at-once activation path: specific line in DAL where rounds are opened for all-at-once pacing — inferred from function names, requires code trace

---
*Research completed: 2026-02-24*
*Ready for roadmap: yes*
