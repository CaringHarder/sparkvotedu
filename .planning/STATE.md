# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Teachers can instantly engage any classroom through voting -- on any topic, in any format -- and see participation happen in real time.
**Current focus:** Phase 22 -- UX Polish (v1.2 Classroom Hardening)

## Current Position

Phase: 22 of 22 (UX Polish) -- COMPLETE
Plan: 3 of 3 in current phase (3 complete: 01, 02, 03)
Status: Phase 22 complete -- all UX polish plans executed
Last activity: 2026-02-22 -- Completed 22-03 (terminology & session dropdown polish)

Progress: [##############################] 100% (121/121 plans -- 110 v1.0+v1.1, 2 Phase 19, 3 Phase 20, 3 Phase 21, 3 Phase 22)

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
- Phases: 4 (19-22)
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

### Pending Todos

- Fix go live button in polling (area: ui) -- students can see/vote on poll before teacher clicks Go Live
- Make sessions archiveable with delete and recover (area: ui) -- teachers need to archive, delete, or recover sessions
- Unify celebration animations across all brackets and polls (area: ui) -- double elimination has the ideal 3-2-1 countdown + stars; polls and other brackets differ
- Round robin simple vote should match single bracket simple mode (area: ui) -- round robin requires Next button and looks small vs single bracket's full-sized presentation

### Blockers/Concerns

- Microsoft and Apple OAuth held -- code complete, needs console config (not blocking v1.2)
- FingerprintJS cleanup deferred to post-classroom-verification (CLEAN-01, CLEAN-02 in future requirements)

## Session Continuity

Last session: 2026-02-22
Stopped at: Completed 22-03-PLAN.md (terminology & session dropdown polish)
Resume: Phase 22 complete. All v1.2 phases (19-22) executed.
