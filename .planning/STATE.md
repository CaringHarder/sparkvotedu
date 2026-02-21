# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Teachers can instantly engage any classroom through voting -- on any topic, in any format -- and see participation happen in real time.
**Current focus:** Phase 19 -- Security & Schema Foundation (v1.2 Classroom Hardening)

## Current Position

Phase: 19 of 22 (Security & Schema Foundation)
Plan: 2 of 2 in current phase (all complete)
Status: Phase 19 complete -- RLS + schema migration + validation + banner shipped
Last activity: 2026-02-21 -- Completed 19-01 (RLS + schema migration + data wipe)

Progress: [######################........] 72% (112/112 plans -- 110 v1.0+v1.1, 2 completed Phase 19)

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

### Pending Todos

None.

### Blockers/Concerns

- Microsoft and Apple OAuth held -- code complete, needs console config (not blocking v1.2)
- FingerprintJS cleanup deferred to post-classroom-verification (CLEAN-01, CLEAN-02 in future requirements)

## Session Continuity

Last session: 2026-02-21
Stopped at: Phase 20 context gathered
Resume: .planning/phases/20-name-based-student-identity/20-CONTEXT.md
