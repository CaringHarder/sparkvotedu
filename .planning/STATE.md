# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Teachers can instantly engage any classroom through voting -- on any topic, in any format -- and see participation happen in real time.
**Current focus:** Phase 24 -- Bracket & Poll UX Consistency

## Current Position

Phase: 24 of 24 (Bracket & Poll UX Consistency)
Plan: 6 of 6 in current phase (24-01, 24-02, 24-03, 24-04, 24-05, 24-06 complete)
Status: Phase Complete
Last activity: 2026-02-24 -- Completed 24-06 (Gap closure -- RR tiebreaker champion selection)

Progress: [##############################] 100% (130/130 plans -- 110 v1.0+v1.1, 2 Phase 19, 3 Phase 20, 3 Phase 21, 3 Phase 22, 3 Phase 23, 6 Phase 24)

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

**v1.2 Classroom Hardening (in progress):**
- Phases: 5 (19-23)
- Plans: TBD (pending phase planning)
- Requirements: 15

## Accumulated Context

### Decisions

All prior decisions archived in PROJECT.md Key Decisions table.
Recent decisions for v1.2:
- Deny-all RLS (no per-row policies) -- Prisma bypasses RLS via bypassrls user; deny-all locks PostgREST surface
- First-name identity over device fingerprint -- 24 students on identical Chromebooks produced only 6 fingerprints
- Additive schema migration -- keep device_id column (nullable), add first_name; no destructive changes
- Transitioned from prisma db push to prisma migrate with baseline approach for hand-editable SQL migrations
- Hand-edited migration SQL to combine data wipe + schema changes + RLS in one atomic migration
- Preserve name casing as entered -- no auto-capitalize; case-insensitive matching at lookup time (Phase 20)
- Reject emojis with error (not strip) -- "Please use letters only -- no emojis"
- Profanity wholeWord mode + whitelist for legitimate names (Dick, Fanny, etc.) to avoid false positives
- Fail-silent banner when localStorage unavailable -- better to miss notification than show forever
- Dynamic prisma import in claimIdentity/updateParticipantName for direct participant lookup by ID
- sessionEnded flag on JoinResult for ended-session results display rather than error
- NameDisambiguation rendered inline in NameEntryForm (no separate route) for smooth flow
- Two-click claim confirmation ("That's me!" -> "Confirm") to prevent accidental identity theft
- Added firstName to bracket live page participant query to ensure ParticipationSidebar shows real names in bracket context
- Poll lifecycle dual-channel broadcast pattern: poll:{pollId} + activities:{sessionId} for all transitions (Phase 21)
- participantCount filters banned=false to match active participant denominator (Phase 21)
- SSR fallback for participantCount: use initialParticipantCount until hook returns non-zero value (Phase 21)
- Connection status label "Near-realtime" instead of "Polling mode" -- less alarming for teacher projecting screen (Phase 21)
- Leading option uses border-transparent on non-leaders for consistent bar chart padding (Phase 21)
- broadcastParticipantJoined uses activities:{sessionId} channel with distinct event name participant_joined (Phase 21)
- useRealtimePoll subscribes to activities channel for participant_joined to re-fetch participantCount on student join (Phase 21)
- Blur-to-save pattern (no Save/Cancel buttons) for inline session name editing -- minimal friction (Phase 22)
- Empty name submission clears to null via DAL trim -- unnamed sessions show "Unnamed Session -- date" fallback (Phase 22)
- PresentationMode rendering moved from PollLiveClient into PollResults where bordaScores is in scope (Phase 22)
- No Framer Motion animations in PresentationResults for reliable projector rendering (Phase 22)
- "Start" replaces "Activate" for action buttons; "View Live" for navigation links to active sessions (Phase 22)
- "End"/"End Poll" replaces "Close"/"Close Poll" for stopping active activities (Phase 22)
- "Active" badge replaces "Live" badge on dashboard shell session cards (Phase 22)
- archivedAt DateTime? instead of status field -- preserves archive timestamp for sorting, null check cleaner for filtering (Phase 23)
- Recovered sessions return as ended -- archiving auto-ends activities, recovery is for data access not resuming (Phase 23)
- Only archived sessions can be permanently deleted -- two-step safety net per locked decision (Phase 23)
- Explicit bracket/poll deletion in transaction -- optional sessionId with no cascade means orphaned without explicit deletion (Phase 23)
- Server component stays server -- SessionCardMenu is client, revalidatePath handles refresh without client wrapper (Phase 23)
- Absolute-positioned menu overlay rather than client wrapper component -- simpler architecture, no extra file (Phase 23)
- Simple confirm dialog (Cancel/Action) without type-to-confirm for non-destructive operations like archive (Phase 23)
- Most-specific-prefix-match nav active state -- generic algorithm preventing /sessions from highlighting when on /sessions/archived (Phase 23)
- Student sees muted "no longer available" for archived sessions -- not destructive red, student-appropriate language (Phase 23)
- Delete button variant="secondary" not variant="destructive" -- classroom tool uses subtle styling, two-step safety net provides protection (Phase 23)
- Only broadcast for active/completed bracket statuses -- draft transitions do not affect student dashboard (Phase 24)
- Canonical celebration chain: WinnerReveal countdown -> CelebrationScreen/PollReveal for all views (simplified from countdown -> pause -> reveal in 24-04) (Phase 24)
- Poll WinnerReveal uses "The votes are in" as contextual reveal text since matchup names don't apply to polls (Phase 24)
- CountdownOverlay keeps "Round N Results" title but unified visual styling (brand-blue glow, pause stage) with WinnerReveal (Phase 24)
- Dynamic prisma import in prediction.ts following existing file convention (no top-level prisma import) (Phase 24)
- MatchupVoteCard handles server vote via useVote; parent tracks state via handleVoteTracked to avoid double-voting (Phase 24)
- Advanced mode explicitly set when not in simple mode (votingStyle='advanced') for clear separation (Phase 24)
- Simplified WinnerReveal to countdown-only (removed pause dots + "And the winner is..." text) for direct countdown -> celebration transition (Phase 24)
- CelebrationScreen fully opaque bg-black instead of bg-black/85 to prevent content bleed-through (Phase 24)
- RR bracketDone uses all-matchups-decided check (not round-based) since RR has no round progression structure (Phase 24)
- Poll early return guard triple condition (closedDetected && !showReveal && !showCountdown) for correct state machine (Phase 24)
- hasShownRevealRef.current = true placed INSIDE setTimeout callback to survive React effect cleanup race conditions (Phase 24)
- Inline computeRRChampionInfo helper per file rather than shared module to avoid cross-file dependency complexity (Phase 24)
- CelebrationScreen optional isTie/tiedNames props with backward-compatible defaults for non-RR bracket types (Phase 24)

### Pending Todos

- Fix go live button in polling (area: ui) -- students can see/vote on poll before teacher clicks Go Live
- Round robin and predictive brackets dont auto-show on student dashboard (area: ui) -- requires manual refresh to see newly activated brackets
- RR all-at-once bracket completes after first round blocks remaining rounds (area: ui) -- all-at-once mode triggers completion prematurely after first round
- SE bracket final round realtime updates stop working (area: ui) -- teacher live dashboard stops auto-updating votes after advancing to final round in 4-team bracket

### Roadmap Evolution

- Phase 23 added: Session Archiving
- Phase 24 added: Bracket & Poll UX Consistency

### Blockers/Concerns

- Microsoft and Apple OAuth held -- code complete, needs console config (not blocking v1.2)
- FingerprintJS cleanup deferred to post-classroom-verification (CLEAN-01, CLEAN-02 in future requirements)

## Session Continuity

Last session: 2026-02-24
Stopped at: Completed 24-06-PLAN.md (Gap closure -- RR tiebreaker champion selection). Phase 24 complete.
Resume: All 24 phases complete (130/130 plans). Review pending todos for remaining bugs.
Resume file: .planning/phases/24-bracket-poll-ux-consistency/24-06-SUMMARY.md
