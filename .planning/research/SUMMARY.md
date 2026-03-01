# Project Research Summary

**Project:** SparkVotEDU v2.0 Teacher Power-Ups
**Domain:** EdTech classroom voting platform -- teacher activity controls, quick-create UX, real-time indicators
**Researched:** 2026-02-28
**Confidence:** HIGH

## Executive Summary

SparkVotEDU v2.0 adds teacher control features (pause/resume, undo round, reopen completed activities, edit settings) and creation UX improvements (quick-create brackets and polls) to an existing 80K LOC Next.js classroom voting platform. The research confirms that every v2.0 feature integrates cleanly into the existing architecture: the layered Server Action -> DAL -> Broadcast -> Refetch pattern extends to all new mutations, and the dual-channel Supabase Realtime broadcast system handles all new event types without structural changes. Only two new Radix UI packages (switch, tabs) and one optional package (sonner for toasts) are needed; no framework upgrades required.

The recommended approach is to treat pause/resume as the foundational feature -- it touches the status transition maps, broadcast event types, and student-side vote guards that all other control features (undo, reopen, settings edit) depend on. Quick-create brackets and simplified poll creation are fully independent of the control features and can be built in parallel. The critical architectural decision is how to model pause state: STACK.md recommends a `pausedAt` timestamp column (orthogonal to status), while ARCHITECTURE.md recommends a `paused` status value in the existing String status field. Both approaches are viable but the `paused` status value approach is simpler -- it reuses the existing `VALID_TRANSITIONS` maps, requires zero schema migration (status is already a String), and ensures the `castVote` check (`status !== 'voting'`) automatically rejects paused votes. **Recommendation: use `paused` as a status value**, not a separate column.

The top risks are: (1) undo round advancement leaving stale votes in downstream matchups, especially in double-elimination brackets where loser placement must also be reversed; (2) quick-create bypassing session assignment, creating invisible brackets; and (3) vote indicator queries causing N+1 query storms if voter IDs are fetched on every broadcast instead of accumulated client-side. All three have clear prevention strategies documented in the pitfalls research and should be addressed during their respective implementation phases.

## Key Findings

### Recommended Stack

The existing stack (Next.js 16, React 19, Prisma 7, Supabase, Tailwind v4) handles all v2.0 requirements without upgrades. Two new Radix UI packages and one optional toast library are the only additions.

**New packages:**
- `@radix-ui/react-switch@^1.2.6`: Toggle controls for bracket/poll display settings -- correct semantic control for boolean toggles with ARIA support
- `@radix-ui/react-tabs@^1.1.13`: Quick Create / Step-by-Step mode switching -- provides tablist/tab/tabpanel ARIA roles and keyboard navigation
- `sonner@^2.0.7` (optional, recommended): Toast feedback for rapid teacher actions (pause, undo, settings save) -- shadcn/ui has a first-class wrapper

**What does NOT need new packages:** Pause/resume (database state + broadcast + button swap), undo round (extends existing `undoMatchupAdvancement` engine), reopen (status transition), quick-create brackets (existing `TopicPicker` + `CURATED_TOPICS` data + `createBracket` action), vote indicators (extends existing `ParticipationSidebar`).

**No schema migration needed.** The `status` field on Bracket and Poll is already a plain String type. Adding `paused` as a valid status value requires only updating the transition validation maps in the DAL.

### Expected Features

**Must have (table stakes):**
- Pause/Resume activities -- every major competitor (Mentimeter, Poll Everywhere, Slido) supports this; teachers interrupt for discussion constantly
- Edit display settings after creation -- Poll Everywhere and Mentimeter allow it; teachers realize wrong setting only after seeing students interact
- "Go Live" terminology -- industry standard; "View Live" sounds read-only
- Three bug fixes (duplicate poll options, 2-option centering, duplicate name flow) -- data integrity and basic correctness

**Should have (differentiators):**
- Undo round advancement / reopen voting -- Challonge supports this but most classroom tools do NOT; highest-value teacher fix
- Reopen completed activities -- saves teachers from re-creating; Challonge has it, Mentimeter/Slido do not
- Quick Create brackets (topic chips + entrant count) -- no competitor combines curated educational topics with 2-click creation
- Real-time per-student vote indicators -- competitors show aggregate counts; SparkVotEDU shows per-student status
- Simplified poll Quick Create -- refinement of existing poll creation flow
- Playful "needs to cook" paused message -- brand differentiator, turns frustrating pause into delightful moment

**Defer (v2.x+):**
- Undo for round-robin and predictive brackets -- more complex pacing models
- Quick Create for DE/RR/Predictive -- SE is sufficient for quick create
- Settings presets/templates -- "save my preferred settings"
- Full audit log / undo-to-any-point -- 95% of mistakes covered by single-level undo

### Architecture Approach

All v2.0 features integrate into the existing layered architecture: Teacher UI -> Server Actions (auth -> validate -> DAL -> broadcast -> revalidate) -> Prisma -> PostgreSQL, with Supabase Realtime broadcast for student-side updates. Five new broadcast event types (`bracket_paused`, `bracket_resumed`, `poll_paused`, `poll_resumed`, `settings_changed`) follow the existing fire-and-forget pattern. No new channels, no new subscription hooks. The existing `useRealtimeBracket`/`useRealtimePoll` hooks already trigger full refetch on any structural event.

**Major new components:**
1. `PausedOverlay` -- student-facing pause message, auto-dismisses on resume broadcast
2. `BracketQuickCreate` -- single-panel creation: topic chips + size picker, calls existing `createBracket` action
3. `PollQuickCreate` -- question + options only, calls existing `createPoll` action
4. `BracketSettingsPanel` / `PollSettingsPanel` -- slide-out panels with Switch toggles for display settings

**Key modified components:**
- `ParticipationSidebar` -- new `activityVoterIds` prop for activity-level green dots
- `RoundAdvancementControls` -- "Undo Round" button for batch undo
- `LiveDashboard` + `PollLiveClient` -- Pause/Resume buttons, Settings gear icons

### Critical Pitfalls

1. **Pause desynchronizes optimistic vote state.** Students with in-flight votes see confusing reverts and technical errors. **Avoid by:** broadcasting specific `voting_paused` events, disabling vote buttons based on matchup status from realtime hook, returning a distinct `PAUSED` error code from `castVote`.

2. **Undo round cascading failure with stale votes.** Undoing a matchup clears the winner but leaves stale votes in the next-round matchup. When re-advanced with a different winner, old votes produce wrong results. In DE brackets, loser placement is not reversed. **Avoid by:** deleting downstream matchup votes in the undo transaction, implementing DE-aware undo that clears loser bracket placement, blocking undo if downstream matchups have already been advanced.

3. **Quick-create skips session assignment.** Brackets without a session are invisible to students. Teacher activates, students see nothing. **Avoid by:** making session selection mandatory in quick-create (auto-assign if only one active session), validating `sessionId` at activation time.

4. **Settings edit allows structural changes on active brackets.** Changing bracket size or type on an active bracket corrupts all matchup and vote state. **Avoid by:** hard-partitioning display vs. structural settings with separate server actions and Zod schemas.

5. **Vote indicators cause N+1 query storms.** Fetching per-student voter IDs on every vote broadcast causes `participantCount * matchupCount / batchInterval` queries per second. **Avoid by:** including voter participant ID in broadcast payloads, accumulating client-side, full refetch only on structural changes.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Status Infrastructure + Pause/Resume
**Rationale:** Pause/resume is the foundation for undo, reopen, and settings edit workflows. It touches the status transition maps and broadcast event types that all other control features depend on. Highest teacher value, validates the entire broadcast-refetch pattern for new status values.
**Delivers:** Pause/Resume for brackets and polls, student-facing PausedOverlay, server-side vote guard, "Go Live" label change
**Addresses:** Table-stakes pause/resume feature, "Go Live" terminology (trivial, bundle here)
**Avoids:** Pitfall 1 (pause desync) by implementing broadcast + client status check together; Pitfall 8 (pause not persisted) by using database status value

### Phase 2: Undo Round Advancement
**Rationale:** Most requested teacher fix. Depends on stable status infrastructure from Phase 1. Extends existing `undoMatchupAdvancement` engine to batch operations. The cascade logic for stale votes and DE loser placement is the most complex engineering work in v2.0.
**Delivers:** Batch undo for entire rounds, cascading vote cleanup, DE-aware loser placement reversal
**Addresses:** Differentiator undo feature, existing undo enhancement
**Avoids:** Pitfall 2 (cascading failure) and Pitfall 10 (DE loser placement) by handling vote cleanup and LB reversal in the core implementation

### Phase 3: Reopen Completed Activities
**Rationale:** Small incremental step after Phase 1 status infrastructure. Adds `completed -> active` transition for brackets and `closed -> active` for polls. Must reset client-side completion state and celebration refs.
**Delivers:** Reopen buttons on completed bracket/poll detail pages, broadcast-driven client state reset
**Addresses:** Differentiator reopen feature
**Avoids:** Pitfall 6 (stale celebration) by extending `BracketUpdateType` with `bracket_reopened` and resetting `hasShownRevealRef` in the realtime hook

### Phase 4: Quick Create Brackets
**Rationale:** Independent of control features. High teacher value -- reduces bracket creation from 4+ steps to 2 clicks. Uses existing `CURATED_TOPICS` data and `createBracket` action. Needs new `@radix-ui/react-tabs` package.
**Delivers:** `BracketQuickCreate` component with topic chip grid + size picker, tab toggle on `/brackets/new`
**Addresses:** Differentiator quick-create feature
**Avoids:** Pitfall 4 (session assignment) by making session mandatory; Pitfall 7 (feature gate bypass) by calling existing `createBracket` action

### Phase 5: Settings Editing
**Rationale:** Enhances the pause workflow (pause -> edit settings -> resume) but not required for pause to function. Uses new `@radix-ui/react-switch` package. Server action for bracket display settings already exists (`updateBracketVotingSettings`); polls need a new one.
**Delivers:** `BracketSettingsPanel` and `PollSettingsPanel` with toggle switches, settings change broadcast for live sync
**Addresses:** Table-stakes settings editing feature
**Avoids:** Pitfall 3 (structural settings corruption) by hard-partitioning display vs. structural settings with separate actions and schemas

### Phase 6: Vote Indicators + Poll Quick Create + Polish
**Rationale:** Final enhancement phase. Vote indicators extend existing `ParticipationSidebar`. Poll quick-create is a small refinement. Bundle with bug fixes and visual polish.
**Delivers:** Activity-level green dots across all types, simplified poll creation, poll image style alignment, three bug fixes (duplicate poll options, 2-option centering, duplicate name flow)
**Addresses:** Vote indicator differentiator, poll quick-create refinement, all bug fixes
**Avoids:** Pitfall 5 (N+1 queries) by designing broadcast payload to include voter IDs before building the UI; Pitfall 9 (poll no-options) by including inline option fields with min-2 enforcement

### Phase Ordering Rationale

- **Status infrastructure must come first** because pause/resume, undo, and reopen all depend on expanded transition maps and new broadcast event types. Building these features without the foundation leads to fragmented, hard-to-integrate implementations.
- **Undo before reopen** because undo is more complex (cascade logic, DE awareness) and reopen is a simpler status transition. Getting undo right validates the entire undo/reopen pattern.
- **Quick create is independent** and can be built in parallel with Phases 2-3 if resources allow. It touches creation flows only, with zero overlap with live activity controls.
- **Settings editing after pause/resume** because the ideal workflow is pause -> edit -> resume. The settings UI and partitioning decisions are cleaner once pause is stable.
- **Vote indicators and polish last** because they are enhancement-only features that add value but do not enable new teacher workflows. Bug fixes can be interspersed across phases if convenient.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Undo Round):** The DE loser placement reversal and cascade logic is the most complex engineering work. Needs careful analysis of `advanceDoubleElimMatchup` to mirror its logic in reverse. Consider `/gsd:research-phase` to map all advancement paths.
- **Phase 6 (Vote Indicators):** The data flow design (broadcast payload vs. API fetch) needs to be finalized before UI work. The existing `ParticipationSidebar` was designed for matchup-scoped display; activity-level aggregation is a different paradigm.

Phases with standard patterns (skip `/gsd:research-phase`):
- **Phase 1 (Pause/Resume):** Well-documented status transition pattern already exists in the codebase. Broadcast + refetch pattern is established.
- **Phase 3 (Reopen):** Simple status transition addition. Pattern identical to existing transitions.
- **Phase 4 (Quick Create Brackets):** UI-only with existing data sources and server actions. Topic picker data and creation action already built.
- **Phase 5 (Settings Editing):** Server action for bracket settings already exists. Pattern is established; extend to polls and add UI.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified against installed versions, package.json, and existing codebase patterns. Radix packages confirmed React 19 compatible. |
| Features | HIGH | Feature landscape mapped against 6 competitors (Kahoot, Mentimeter, Poll Everywhere, Slido, Challonge, Vevox). Dependencies and MVP definition clearly delineated. |
| Architecture | HIGH | Direct analysis of 564 files, 80,750 LOC. Every integration point mapped to specific files and line numbers. Status transition maps, broadcast types, and DAL patterns analyzed. |
| Pitfalls | HIGH | All pitfalls grounded in specific codebase analysis -- actual state machines, broadcast patterns, vote action status checks, and undo engine logic. Recovery strategies documented. |

**Overall confidence:** HIGH

All four research files drew from the same codebase and cross-reference the same files, producing strong internal consistency. The main area of disagreement -- pause modeling (timestamp column vs. status value) -- has been resolved in this synthesis with a clear recommendation.

### Gaps to Address

- **Pause modeling disagreement:** STACK.md recommends `pausedAt` timestamp column. ARCHITECTURE.md recommends `paused` status value. This synthesis recommends the status value approach (simpler, no migration, reuses existing transition validation). Resolve during Phase 1 planning with a definitive decision.
- **Round-robin undo complexity:** Pitfalls research notes RR undo is "simpler" but does not deeply analyze RR-specific edge cases (e.g., undoing a round in all-at-once pacing where multiple rounds may be open simultaneously). Address during Phase 2 if RR undo is in scope.
- **Poll live dashboard sidebar:** The `PollLiveClient` currently has no `ParticipationSidebar`. Adding one requires fetching poll voter IDs, which may need a new endpoint or extension to the poll state API. Design during Phase 6 planning.
- **Sonner integration:** Whether to add sonner (toast notifications) for teacher action feedback. Optional per STACK.md. Decide during Phase 1 execution -- if inline state changes feel sufficient, skip it.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** -- 564 files, 80,750 LOC TypeScript. Key files: `src/lib/dal/bracket.ts` (VALID_TRANSITIONS), `src/lib/dal/poll.ts` (VALID_POLL_TRANSITIONS), `src/lib/realtime/broadcast.ts` (event types), `src/lib/bracket/advancement.ts` (undo engine), `src/actions/bracket-advance.ts` (server actions), `src/components/teacher/participation-sidebar.tsx` (green dots), `src/hooks/use-realtime-bracket.ts` (lifecycle hooks), `prisma/schema.prisma` (data model)
- **package.json** -- All installed versions verified directly
- **Radix UI npm registry** -- @radix-ui/react-switch@1.2.6, @radix-ui/react-tabs@1.1.13 React 19 compatibility confirmed
- **sonner npm registry** -- v2.0.7, React 18+ and Next.js App Router support confirmed
- **shadcn/ui docs** -- Switch, Tabs, Sonner component wrappers documented

### Secondary (MEDIUM confidence)
- **Competitor feature analysis** -- Mentimeter, Poll Everywhere, Challonge, Kahoot, Vevox, BracketFights documentation and support articles
- **shadcn/ui February 2026 changelog** -- unified radix-ui package for new-york style; individual packages remain supported

### Tertiary (LOW confidence)
- **UX design patterns** -- Wizard Design Pattern (UX Planet), WebSocket Architecture Best Practices (Ably) -- general guidance, not SparkVotEDU-specific

---
*Research completed: 2026-02-28*
*Ready for roadmap: yes*
