---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Teacher Power-Ups
status: in-progress
last_updated: "2026-03-02T11:37:41Z"
progress:
  total_phases: 18
  completed_phases: 17
  total_plans: 55
  completed_plans: 53
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Teachers can instantly engage any classroom through voting -- on any topic, in any format -- and see participation happen in real time.
**Current focus:** v2.0 Teacher Power-Ups -- Phase 37: User Profile & Admin Access

## Current Position

Phase: 37 of 38 (User Profile & Admin Access) -- IN PROGRESS
Plan: 1 of 3 complete
Status: Completed Plan 37-01
Last activity: 2026-03-02 - Completed 37-01: Backend foundation (mustChangePassword, profile actions, proxy intercept)

Progress: [##░░░░░░░░] 17% (v2.0)

## Performance Metrics

**v1.0 MVP (shipped 2026-02-16):** 13 phases, 101 plans, 447 commits, 20 days
**v1.1 Production Readiness (shipped 2026-02-21):** 5 phases, 9 plans, 38 commits, 6 days
**v1.2 Classroom Hardening (shipped 2026-02-24):** 6 phases, 20 plans, 4 days
**v1.3 Bug Fixes & UX Parity (shipped 2026-02-26):** 4 phases, 11 plans, 68 commits, 2 days

**Cumulative:** 28 phases, 141 plans across 4 milestones

## Accumulated Context

### Decisions

All decisions archived in PROJECT.md Key Decisions table.
Recent from research:
- v2.0: Use `paused` as status value (not separate `pausedAt` column) -- simpler, no migration, reuses VALID_TRANSITIONS
- v2.0: Only @radix-ui/react-switch, @radix-ui/react-tabs, and optionally sonner needed as new packages
- 29-01: Read old status before DAL transition to distinguish resume (paused->active) from initial activation (draft->active)
- 29-01: Live page guard only blocks 'draft' -- paused passes through without modification
- 29-02: Instant pause toggle with no confirmation dialog; Go Live button always visible with pulsing state indicator
- 29-03: Top-level useRealtimeBracket for bracketStatus avoids duplicating overlay integration across sub-components
- 30-01: Undone matchups reset to 'pending' (not 'voting') since bracket auto-pauses on undo
- 30-01: GF reset matches are fully deleted (not just cleared) since they are dynamically created
- 30-01: Predictive undo adjusts revealedUpToRound and predictionStatus when in revealing/completed state
- 30-02: Auto-pause active brackets via DAL, completed brackets via direct prisma update before undo
- 30-02: DE undo requires explicit region parameter; server action returns error if missing
- 30-02: Round validation via getMostRecentAdvancedRound prevents undoing non-latest rounds
- 30-03: Client-side undoable round detection via useMemo (no extra server call)
- 30-03: Type-specific undo labels: SE/DE use round numbers, RR uses "Results", Predictive uses "Resolution"
- 30-03: Generic cascade warning in confirmation dialog (avoids extra server call for specific counts)
- 31-01: Bracket reopen uses undo engine to clear final round (champion is implicitly cleared via winnerId)
- 31-01: Poll reopen locks allowVoteChange=false to prevent already-voted students from changing votes
- 31-01: Bypass VALID_TRANSITIONS for completed->paused and closed->paused via direct prisma update
- 31-02: No confirmation dialog on reopen -- paused state is safe by default
- 31-02: Reopen menu item placed after Duplicate, before Archive separator
- 31-02: Poll Reopen button rewired from handleStatusChange(draft) to reopenPoll server action
- 31.1-01: Used inline style for gridTemplateColumns instead of Tailwind arbitrary value for reliable cross-build compatibility
- 31.1-01: QuickSettingsToggle uses label element wrapping for accessible click-to-toggle interaction
- 31.1-02: Bracket viewing mode toggle works on all states (display-only setting, no integrity impact)
- 31.1-02: Poll settings broadcast only fires when allowVoteChange or showLiveResults change
- 31.1-03: Bracket viewing mode toggle only shown for single_elimination brackets (not DE, RR, or Predictive)
- 31.1-03: Students see settings changes in real time via broadcast + refetch (no page refresh needed)
- 32-01: Keep existing updateBracketViewingMode for backward compat until Plans 02-03 migrate callers
- 32-01: Default showVoteCounts/showSeedNumbers to true in hook state, matching DB defaults
- 32-03: Used 'archived' instead of 'completed' in poll disabled check -- PollStatus has no 'completed' value
- 32-04: SELiveView wrapper keeps useRealtimeBracket call unconditional per React hooks rules
- 32-04: DESimpleVoting uses MatchupVoteCard's internal useVote hook (no double-submit via onVoteTracked pattern)
- 32-04: RR isSimpleMode purely from realtime viewingMode (no roundRobinVotingStyle fallback)
- 32-04: effectiveBracket pattern: useMemo merging realtime showSeedNumbers/showVoteCounts into bracket prop
- 32-05: effectivePoll pattern mirrors effectiveBracket from 32-04 for consistency across student views
- 33-01: Step-by-Step is default tab (wizard shows first, matching user decision)
- 33-01: Fisher-Yates shuffle called per-create for fresh random entrants each time
- 33-01: SUBJECT_COLORS duplicated locally in bracket-quick-create for component independence
- 34-01: CATEGORY_COLORS duplicated locally in poll-form.tsx for component independence (matching bracket-quick-create pattern)
- 34-01: Quick Create hardcodes simple poll type, allowVoteChange=false, showLiveResults=false
- 34-01: Template prop kept on PollWizard interface for backward compat
- 34-02: Draft fallback pattern mirrors EntrantImageUpload: pollId ?? 'draft' for creation mode
- 34-02: Square aspect ratio enforced via aspectRatio={1} on ImageUploadModal
- 34-02: Camera icon always visible when not disabled (no pollId gate)
- 35-01: Optional spread for participantId in broadcast payloads keeps backward-compatible
- 35-01: Poll voterIds uses rank=1 filter for one-row-per-voter across simple and ranked polls
- 35-01: Bracket state API fetches voterIds in parallel with voteCounts via Promise.all
- 35-03: Dual useRealtimePoll subscription is safe (Supabase channel-level dedup)
- 35-03: Poll voterIds is flat array (not per-matchup) since polls have single voting context
- 35-03: Pass poll.id as selectedMatchupId for stable truthy value in ParticipationSidebar
- [Phase 35]: Not-voted students sort to top of sidebar (aVoted - bVoted comparator)
- [Phase 35]: hasActiveVotingContext prop defaults true for backward compat with poll live page
- [Phase 35]: RR intersection: student must vote on ALL round matchups for green dot
- [Phase 35]: Removed realtimeExcess heuristic -- replaced with accurate mergedVoterIds union
- 36-01: Delete-first in updatePollOptionsDAL transaction to avoid @@unique constraint violations
- 36-01: Guard deleteMany with optionIds.length > 0 to prevent accidental deletion of all options
- 36-01: Session ownership verified in createPoll action before passing sessionId to DAL
- 36-01: PollCreationPage wrapper mirrors BracketCreationPage pattern exactly
- 36-05: Union (not intersection) for SE/DE voter IDs -- green dot if voted on ANY matchup in current round
- 36-05: hasActiveVotingContext also checks for any voting matchups, not just selectedMatchupId
- 36-03: Direct "Name taken" prompt replaces candidate list; returning student flow via secondary "Returning student? Tap here" link
- 36-03: Client-side exact-same-name blocking with case-insensitive check (no server round-trip needed)
- 36-02: CSS transition for student live results bars instead of framer-motion (lighter for student devices)
- 36-02: OPTION_COLORS duplicated locally in simple-poll-vote.tsx for component independence
- 36-02: is2Options layout pattern: flex-col/flex-row for 2 options, grid for 3+
- 36-04: Fullscreen overlay decoupled from Fullscreen API; onExitRef pattern prevents re-render cycles
- 36-04: Eliminated dual useRealtimePoll subscription; PollLiveClient owns single subscription, passes data to PollResults
- 36-04: Parent F key handler only enters presentation; PresentationMode handles exit internally
- 37-01: Prisma column approach for mustChangePassword (no Supabase app_metadata needed)
- 37-01: forceSetPassword clears flag before redirect to avoid proxy race condition
- 37-01: /set-password is NOT in AUTH_PAGES -- special onboarding route for authenticated users

### Roadmap Evolution

- Phase 31.1 inserted after Phase 31: Activity Card Layout Fix & Quick Settings Toggle (URGENT)
- Phase 37 added: User Profile & Admin Access (profile page, password change, forced temp password reset, admin sidebar link)
- Phase 38 added: Require Email Verification Before Login (enforce email verification link before dashboard access; Google OAuth bypass)

### Pending Todos

None -- all v1.3 requirements shipped.

### Blockers/Concerns

- Microsoft and Apple OAuth held -- code complete, needs console config
- FingerprintJS cleanup deferred (CLEAN-01, CLEAN-02)
- DE bracket undo is highest-risk engineering in v2.0 (loser bracket reversal)

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 1 | Change favicon and logo from Vercel to SparkVote throughout the site | 2026-02-25 | 4352d86 | | [1-change-favicon-and-logo-from-vercel-to-s](./quick/1-change-favicon-and-logo-from-vercel-to-s/) |
| 2 | Make prediction bracket simple mode show one matchup at a time | 2026-02-26 | 5f06d27 | | [2-make-prediction-bracket-simple-mode-show](./quick/2-make-prediction-bracket-simple-mode-show/) |
| 3 | Enhance voted-entrant highlight in advanced bracket mode | 2026-02-26 | 85d9bac | | [3-student-bracket-advanced-mode-show-match](./quick/3-student-bracket-advanced-mode-show-match/) |
| 4 | Add vote progress indicator (X of Y voted) to bracket live dashboard | 2026-02-26 | 281bce7 | | [4-add-vote-progress-indicator-x-of-y-voted](./quick/4-add-vote-progress-indicator-x-of-y-voted/) |
| 5 | Fix predictive bracket crash with try-catch, $transaction, and error boundary | 2026-02-26 | ae36962 | | [5-fix-predictive-bracket-crash-add-error-b](./quick/5-fix-predictive-bracket-crash-add-error-b/) |
| 6 | Fix predictive bracket light mode borders and green voted backgrounds | 2026-02-26 | 4c85325 | | [6-predictive-bracket-light-mode-add-matchu](./quick/6-predictive-bracket-light-mode-add-matchu/) |
| 7 | Fix square images for brackets/polls and enlarge simple bracket cards/images/text for younger students | 2026-02-27 | 83a0afe | | [7-fix-square-images-for-brackets-polls-and](./quick/7-fix-square-images-for-brackets-polls-and/) |
| 8 | Enable RLS on _prisma_migrations table (Supabase security alert) | 2026-02-27 | 0307de5 | | [8-enable-rls-on-public-prisma-migrations-t](./quick/8-enable-rls-on-public-prisma-migrations-t/) |
| 9 | Add triple-dot context menu to activity cards on Activities page | 2026-02-27 | 83bd165 | | [9-cards-on-activities-page-don-t-have-trip](./quick/9-cards-on-activities-page-don-t-have-trip/) |
| 10 | Add complete info and session filtering to bracket/poll cards | 2026-02-27 | 721a43f | | [10-add-complete-info-to-bracket-poll-cards-](./quick/10-add-complete-info-to-bracket-poll-cards-/) |
| 11 | Fix bracket edit page entrant images (logoUrl serialization) | 2026-02-27 | d5e54de | | [11-when-uploading-images-and-creating-the-b](./quick/11-when-uploading-images-and-creating-the-b/) |
| 12 | Resize predictive bracket simple mode vote cards to match SE sizing | 2026-02-27 | 8a248d5 | | [12-predictive-bracket-simple-mode-vote-card](./quick/12-predictive-bracket-simple-mode-vote-card/) |
| 13 | Show bracket/poll card metadata near top of detail and live pages | 2026-02-27 | 84f5d8e | | [13-show-bracket-poll-card-metadata-near-top](./quick/13-show-bracket-poll-card-metadata-near-top/) |
| 14 | Move prediction bracket submit button above diagram and restyle for visibility | 2026-02-27 | a6a993d | | [14-move-prediction-bracket-submit-button-to](./quick/14-move-prediction-bracket-submit-button-to/) |
| 15 | Fix localStorage session caching bug for multi-tab isolation | 2026-02-28 | 16fe4e3 | | [15-fix-localstorage-session-caching-bug-mul](./quick/15-fix-localstorage-session-caching-bug-mul/) |
| 16 | Show correct bracket/poll settings on cards (viewingMode guard) | 2026-02-28 | 62335a3 | Verified | [16-show-correct-bracket-poll-settings-on-ca](./quick/16-show-correct-bracket-poll-settings-on-ca/) |
| 18 | Fix prediction bracket tabulation results lost on remount | 2026-03-01 | d16bccc | Verified | [18-fix-prediction-bracket-tabulation-result](./quick/18-fix-prediction-bracket-tabulation-result/) |
| 19 | Reduce display settings vertical space with horizontal flex-wrap layout | 2026-03-01 | 1fae2c1 | Verified | [19-reduce-display-settings-vertical-space-o](./quick/19-reduce-display-settings-vertical-space-o/) |
| 20 | Replace viewing mode on/off switch with Simple/Advanced segmented control | 2026-03-02 | 9e9d283 | Verified | [20-fix-simple-advanced-viewing-mode-toggle-](./quick/20-fix-simple-advanced-viewing-mode-toggle-/) |
| Phase 31 P01 | 3min | 2 tasks | 10 files |
| Phase 31 P02 | 5min | 3 tasks | 4 files |
| Phase 31.1 P01 | 2min | 2 tasks | 5 files |
| Phase 31.1 P02 | 2min | 2 tasks | 4 files |
| Phase 31.1 P03 | 3min | 3 tasks | 6 files |
| Phase 32 P01 | 2min | 2 tasks | 5 files |
| Phase 32 P02 | 3min | 2 tasks | 2 files |
| Phase 32 P03 | 2min | 2 tasks | 2 files |
| Phase 32 P04 | 5min | 2 tasks | 3 files |
| Phase 32 P05 | 1min | 1 tasks | 1 files |
| Phase 33 P01 | 2min | 2 tasks | 3 files |
| Phase 34 P01 | 3min | 2 tasks | 3 files |
| Phase 34 P02 | 2min | 2 tasks | 2 files |
| Phase 35 P01 | 2min | 2 tasks | 6 files |
| Phase 35 P03 | 3min | 2 tasks | 3 files |
| Phase 35 P02 | 5min | 2 tasks | 3 files |
| Phase 36 P02 | 2min | 1 tasks | 2 files |
| Phase 36 P03 | 2min | 1 tasks | 2 files |
| Phase 36 P05 | 2min | 2 tasks | 4 files |

## Session Continuity

Last session: 2026-03-02
Stopped at: Completed 37-01: Backend foundation (mustChangePassword, profile actions, proxy intercept)
Resume: Continue with 37-02 (UI pages)
| Phase 36 P01 | 3min | 2 tasks | 6 files |
| Phase 36 P04 | 6min | 2 tasks | 3 files |
| Phase 37 P01 | 2min | 2 tasks | 4 files |
