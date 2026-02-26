# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Teachers can instantly engage any classroom through voting -- on any topic, in any format -- and see participation happen in real time.
**Current focus:** Phase 25 -- UX Parity (v1.3 Bug Fixes & UX Parity)

## Current Position

Phase: 25 of 28 (UX Parity) -- COMPLETE
Plan: 4 of 4 in current phase (all plans complete)
Status: Phase Complete
Last activity: 2026-02-25 - Completed 25-04: Archive views for brackets and polls

Progress: [##########################░░░░░] 86% (milestones v1.0-v1.2 complete, phase 25 done)

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

### Pending Todos

All 5 pending todos from v1.2 have been promoted to v1.3 requirements (UXP-01, UXP-02, FIX-01, FIX-02, FIX-03).

### Blockers/Concerns

- Microsoft and Apple OAuth held -- code complete, needs console config (not blocking v1.3)
- FingerprintJS cleanup deferred to post-classroom-verification (CLEAN-01, CLEAN-02 in future requirements)
- FIX-02 (SE final round) root cause unconfirmed -- likely route caching but needs investigation
- FIX-01 (RR all-at-once) most complex fix -- needs activation path trace before implementation

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Change favicon and logo from Vercel to SparkVote throughout the site | 2026-02-25 | 4352d86 | [1-change-favicon-and-logo-from-vercel-to-s](./quick/1-change-favicon-and-logo-from-vercel-to-s/) |

## Session Continuity

Last session: 2026-02-26
Stopped at: Phase 26 context gathered
Resume: `/gsd:plan-phase 26` to plan Phase 26 (student activity removal)
Resume file: .planning/phases/26-student-activity-removal/26-CONTEXT.md
