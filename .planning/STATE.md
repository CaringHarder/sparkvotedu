# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Teachers can instantly engage any classroom through voting -- on any topic, in any format -- and see participation happen in real time.
**Current focus:** Phase 28 -- RR All-at-Once Completion (v1.3 Bug Fixes & UX Parity)

## Current Position

Phase: 28 of 28 (RR All-at-Once Completion)
Plan: 3 of 3 in current phase (28-01, 28-02, 28-03 complete)
Status: Phase 28 complete -- all plans executed (including gap closure 28-03)
Last activity: 2026-02-26 - Completed 28-03: Batch decide round filter fix for all-at-once RR brackets

Progress: [################################] 100% (milestones v1.0-v1.3 complete, all 28 phases done)

## Performance Metrics

**v1.0 MVP (shipped 2026-02-16):**
- Phases: 13 (1-11 + 7.1)
- Plans: 101
- Commits: 447 (215 feat/fix)
- LOC: 41,773 TypeScript
- Timeline: 20 days (2026-01-28 to 2026-02-16)

**v1.1 Production Readiness & Deploy (shipped 2026-02-21):**
- Phases: 5 (14-18)
- Plans: 9
- Tasks: 22
- Commits: 38
- LOC: 45,280 TypeScript (final)
- Timeline: 6 days (2026-02-16 to 2026-02-21)

**v1.2 Classroom Hardening (shipped 2026-02-24):**
- Phases: 6 (19-24)
- Plans: 20
- Timeline: 4 days (2026-02-21 to 2026-02-24)

**v1.3 Bug Fixes & UX Parity (in progress):**
- Phases: 4 (25-28)
- Plans: 5 estimated
- Requirements: 5

## Accumulated Context

### Decisions

All prior decisions archived in PROJECT.md Key Decisions table.
Recent decisions for v1.3 roadmap:
- Combined UXP-01 and UXP-02 into single Phase 25 -- both are small additive UI changes with no realtime surface area
- Ascending risk order (25-28) -- low-risk additive UI first, then straightforward broadcast fix, then investigation-required bugs last
- Phase 26 after 25 so poll context menu Delete action immediately triggers student broadcast removal
- CardContextMenu uses onStartRename callback prop (parent card handles inline edit UI)
- Archive menu item hidden when item is already archived
- DeleteConfirmDialog uses amber for live impact warning (distinct from red destructive buttons)
- AnimatePresence with popLayout mode for card list removal animations (delete=fade, archive=slide-left)
- Archived items filtered at server page level before passing to client list components
- Poll rename uses 'question' field (matching renamePollInputSchema), not 'name'
- useEffect prop sync pattern: client components with useState(serverProp) need useEffect([serverProp]) to reflect post-refresh changes
- Unarchived brackets -> 'completed', unarchived polls -> 'closed' (safe terminal states)
- Archive view pattern: server page + client card list with recover/delete, consistent across sessions/brackets/polls
- Pre-read sessionId before DAL cascade deletes (row disappears, sessionId unreadable after)
- AnimatePresence popLayout mode for student dashboard card removal (200ms fade, layout reflow)
- hadActivities state tracking differentiates initial empty vs post-removal empty state variant
- Subscribe to activities:{sessionId} directly on bracket/poll pages (no collision since dashboard unmounted on different route)
- Verify bracket/poll existence via state API fetch on each activity_update broadcast event
- useEffect redirect for not-found state avoids render-phase side-effect violation
- Default roundRobinPacing to 'round_by_round' when null -- existing brackets without pacing set behave as before
- Removed dismissTimerRef entirely from CelebrationScreen rather than leaving dead code
- Removed currentRoundRobinRound from handleBatchDecideByVotes useCallback deps -- roundNumber is now a function parameter, not a closure variable
- Reuse existing standings useMemo in student RRLiveView for post-celebration overlay (no duplicate computation)
- needsRoundsOpen checks all matchups pending (not just round 1) for broader all-at-once fallback coverage
- All-at-once fallback loops advanceRound sequentially per round (acceptable overhead for recovery path)
- Belt-and-suspenders cache busting: timestamp query param + cache no-store for realtime-critical bracket state fetches
- useRef sequence counter pattern to guard against out-of-order fetch responses in useRealtimeBracket
- force-dynamic export on bracket state API route to prevent Next.js framework-level GET caching
- [Phase 28]: Removed currentRoundRobinRound from handleBatchDecideByVotes useCallback deps -- roundNumber is now a function parameter

### Pending Todos

All 5 pending todos from v1.2 have been promoted to v1.3 requirements (UXP-01, UXP-02, FIX-01, FIX-02, FIX-03).

### Blockers/Concerns

- Microsoft and Apple OAuth held -- code complete, needs console config (not blocking v1.3)
- FingerprintJS cleanup deferred to post-classroom-verification (CLEAN-01, CLEAN-02 in future requirements)
- FIX-02 (SE final round) fully resolved: cache-bust fetch + stale response guard + force-dynamic API route (27-01)
- FIX-01 (RR all-at-once) fully resolved: activation (28-01) + progress/standings/fallback (28-02) + batch decide round filter (28-03)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Change favicon and logo from Vercel to SparkVote throughout the site | 2026-02-25 | 4352d86 | [1-change-favicon-and-logo-from-vercel-to-s](./quick/1-change-favicon-and-logo-from-vercel-to-s/) |
| 2 | Make prediction bracket simple mode show one matchup at a time | 2026-02-26 | 5f06d27 | [2-make-prediction-bracket-simple-mode-show](./quick/2-make-prediction-bracket-simple-mode-show/) |
| 3 | Enhance voted-entrant highlight in advanced bracket mode | 2026-02-26 | 85d9bac | [3-student-bracket-advanced-mode-show-match](./quick/3-student-bracket-advanced-mode-show-match/) |
| 4 | Add vote progress indicator (X of Y voted) to bracket live dashboard | 2026-02-26 | 281bce7 | [4-add-vote-progress-indicator-x-of-y-voted](./quick/4-add-vote-progress-indicator-x-of-y-voted/) |
| Phase 28 P03 | 1min | 1 tasks | 2 files |

## Session Continuity

Last session: 2026-02-26
Stopped at: Completed 28-03-PLAN.md (batch decide round filter fix for all-at-once RR brackets)
Resume: Phase 28 complete with gap closure. v1.3 milestone complete. All planned phases (25-28) executed.
