# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v3.0 — Student Join Overhaul + Cleanup

**Shipped:** 2026-03-09
**Phases:** 7 | **Plans:** 11

### What Was Built
- Complete student identity overhaul: fun name + emoji system replacing name-only join
- 3-step join wizard with AnimatePresence transitions and useReducer state machine
- localStorage auto-rejoin with 90-day TTL and schema versioning
- Cross-device identity reclaim via firstName-only lookup with confirmation card
- Teacher sidebar controls: fun/real name toggle with DB-persisted global default
- FingerprintJS complete removal (code, package, database columns)

### What Worked
- Sequential phase structure (schema -> DAL -> UI -> persistence -> cleanup -> polish) prevented rework
- Sentinel emoji migration pattern cleanly handled pre-existing participants without data backfill complexity
- Phase 45 added mid-milestone to close TCHR-02 gap -- adaptive roadmapping worked well
- Entire milestone completed in 2 days despite 7 phases and 11 plans

### What Was Inefficient
- Phase 44 plan 02 required checkpoint pause and context reset due to complexity of toggle + edit + migration in single plan
- SUMMARY.md one_liner extraction via gsd-tools didn't work (returned None for all) -- had to read summaries directly
- TCHR-02 gap (toggle persistence) wasn't caught until Phase 44 was nearly complete; earlier traceability checking would have caught it

### Patterns Established
- Sentinel migration pattern: placeholder value in DB detected on next visit, triggers one-time interstitial
- useReducer with discriminated union actions for multi-step wizard state machines
- localStorage identity store with schema versioning (v: 1) and TTL pruning
- Real-time sidebar refresh via dedicated Supabase channel subscription (useRealtimeParticipants)

### Key Lessons
1. Identity systems should assign identity instantly (fun name) and collect details progressively -- don't gate entry on forms
2. localStorage persistence works for same-device return but server-side name matching must be the authoritative fallback for school hardware
3. When a requirement has a gap, add a targeted polish phase rather than reopening the original phase

### Cost Observations
- Model mix: quality profile (Opus-heavy)
- Sessions: ~5 sessions across 2 days
- Notable: Small focused phases (1-2 plans each) executed very efficiently

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v3.0 | 7 | 11 | Adaptive roadmapping -- added Phase 45 mid-milestone to close requirement gap |

### Top Lessons (Verified Across Milestones)

1. Sequential schema->DAL->UI phase ordering prevents rework (validated v1.0, v1.2, v3.0)
2. Sentinel/placeholder patterns handle data migrations cleanly without downtime (validated v1.2 name migration, v3.0 emoji migration)
