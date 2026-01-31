# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-28)

**Core value:** Teachers can instantly engage any classroom through voting -- on any topic, in any format -- and see participation happen in real time.
**Current focus:** Phase 4 in progress — Voting and Real-Time

## Current Position

Phase: 4 of 10 (Voting and Real-Time)
Plan: 3 of 6 in current phase
Status: In progress
Last activity: 2026-01-31 -- Completed 04-03-PLAN.md (Server Actions and Real-Time Hooks)

Progress: [####......] 40% (21/52 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 21
- Average duration: ~7 min
- Total execution time: ~2.4 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-and-auth | 5/5 | ~1.5h | ~18m |
| 02-student-join-flow | 6/6 | ~13m | ~2.2m |
| 03-bracket-creation-management | 7/7 | ~15.8m | ~2.3m |
| 04-voting-and-real-time | 3/6 | ~12.6m | ~4.2m |

**Recent Trend:**
- Last 5 plans: 03-06 (~5m), 03-07 (~3m), 04-01 (~4.8m), 04-02 (~4m), 04-03 (~3.8m)
- Trend: Stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 10 phases derived from 62 requirements across 10 categories; comprehensive depth
- [Roadmap]: Build order follows Foundation -> Auth -> Student -> Brackets -> Voting -> Polls -> Billing -> Advanced -> Sports -> Analytics -> Landing
- [Roadmap]: Real-time requirements (RT-01 through RT-04) grouped with voting (Phase 4) rather than as standalone phase
- [01-01]: Used prisma-client-js generator for Turbopack compatibility
- [01-01]: dotenv.config({ path: '.env.local' }) in prisma.config.ts
- [01-01]: Supabase SSR uses getAll/setAll cookie pattern
- [01-02]: getClaims() used everywhere instead of getSession() for JWT validation security
- [01-02]: Proxy is UX convenience only; DAL is the authoritative auth boundary
- [01-02]: Teacher records auto-created on first authentication via DAL (not database triggers)
- [01-02]: Zod v4 uses .issues[] not .errors[] for safeParse error extraction
- [01-04]: Form-wrapped signOut action for button invocation (standard Next.js server action pattern)
- [01-04]: All auth forms follow useActionState + Zod schema + Supabase server client pattern
- [01-05]: Pure functions over middleware for feature gating -- gate functions take tier as input, caller handles DB lookup
- [01-05]: Smart upgradeTarget skips intermediate tiers when feature requires higher tier (free->pro_plus for sportsIntegration)
- [01-05]: Vitest chosen as test runner for ESM-native support matching project type:module
- [01-05]: as const on TIER_LIMITS for TypeScript literal type inference
- [02-01]: crypto.randomInt for secure class code generation (not Math.random)
- [02-01]: Word lists keyed by letter (Record<string, string[]>) for alliteration enforcement
- [02-01]: 435 adjectives, 287 animals covering all 26 letters for fun name pool
- [02-02]: FingerprintJS load promise cached at module level for singleton initialization
- [02-02]: DeviceIdentity interface defined locally in hook (02-01 types now available)
- [02-03]: DAL alias pattern for action/DAL name conflicts (endSessionDAL, banParticipantDAL)
- [02-03]: toParticipantData helper maps Prisma model to StudentParticipantData interface
- [02-03]: Student routes (/join, /session, /api/sessions) added as public pages in proxy
- [02-04]: localStorage key pattern sparkvotedu_session_{sessionId} for per-session participant identity
- [02-04]: HomeJoinInput on homepage redirects to /join/{code} instead of calling joinSession directly
- [02-04]: Welcome screen uses 3-second countdown for auto-redirect, returning students get manual rejoin
- [02-04]: Session layout is client component to access localStorage for participant identity
- [02-05]: Server Component + Client Component split for session detail (SC fetches, CC handles interactivity)
- [02-05]: useMemo for Supabase client in hooks to prevent duplicate channel subscriptions
- [02-05]: Broadcast channel over Postgres Changes for activity updates (scalability in 30+ student classrooms)
- [03-01]: sessionId optional on Bracket model -- brackets can exist without sessions, assigned when activated
- [03-01]: Self-referential Matchup.nextMatchupId for tournament advancement chain
- [03-01]: Literal union (4|8|16) for bracket size validation -- no byes until Phase 7
- [03-01]: Cascade delete on BracketEntrant and Matchup from Bracket
- [03-02]: Recursive doubling algorithm for standard tournament seeding (NCAA-style 1v16, 8v9, etc.)
- [03-03]: PapaParse header auto-detection with lowercase normalization for flexible CSV column matching
- [03-03]: Fallback to first column value when no recognized header found
- [03-03]: 10 curated topic lists with exactly 16 entries each covering 7 subjects
- [03-04]: Recursive getMatchPosition centers later rounds between feeder matchups
- [03-04]: SVG inline styles with CSS custom properties for Tailwind theme compatibility in SVG elements
- [03-04]: Bracket-style H-V-H connector paths for clean tournament visual lines
- [03-05]: Shared createMatchupsInTransaction helper for DRY matchup creation across create and update flows
- [03-05]: Forward-only status transitions via VALID_TRANSITIONS Record lookup
- [03-05]: Combined createBracketWithEntrantsSchema defined in action file for bracket + entrants creation
- [03-06]: HTML5 native drag-and-drop for entrant reorder (zero dependencies)
- [03-06]: Custom segmented control tabs instead of Radix Tabs for lightweight wizard UI
- [03-06]: Subject color mapping Record for consistent topic badge theming
- [03-07]: BracketStatus cast from Prisma string to literal union type via 'as BracketStatus' in server component serialization
- [03-07]: Custom modal dialog for delete confirmation instead of window.confirm for consistent UX
- [04-01]: Compound unique @@unique([matchupId, participantId]) enables race-safe upsert for vote deduplication
- [04-01]: Matchup status uses string field with app-level transition validation (not DB enum) for flexibility
- [04-01]: Broadcast helper uses raw fetch to Supabase REST API -- server actions are stateless, no persistent WebSocket
- [04-01]: Broadcast errors logged but never thrown -- real-time is best-effort, must not break vote flow
- [04-01]: openMatchupsForVoting uses updateMany with status filter for atomic batch state change
- [04-02]: Position parity determines next-round slot: odd -> entrant1Id, even -> entrant2Id (matches Phase 3 bracket engine)
- [04-02]: Undo blocked by vote count check on next matchup (not status check) for precise safety
- [04-02]: Read-only queries (checkRoundComplete, isBracketComplete) skip $transaction for performance
- [04-03]: castVote is unauthenticated (student action) -- validates matchup status + banned flag instead of teacher auth
- [04-03]: All bracket-advance actions verify teacher ownership via findFirst with teacherId filter
- [04-03]: Non-blocking broadcast (.catch(console.error)) in server actions prevents broadcast failures from breaking vote flow
- [04-03]: useRef accumulator batches vote_update events; bracket_update events trigger immediate full refetch
- [04-03]: Transport fallback uses 5s WebSocket timeout, 3s polling interval
- [04-03]: /api/brackets/ routes added as public pages in proxy for student polling access

### Pending Todos

- Configure Google, Microsoft, Apple OAuth providers in external consoles and Supabase dashboard (non-blocking, code complete)

### Blockers/Concerns

- [Research]: Sports API provider selection is LOW confidence -- needs deep research before Phase 8
- [Research]: Device fingerprinting collision rates on identical school hardware need real-world validation in Phase 2
- [Research]: WebSocket transport reliability in school networks needs testing in Phase 4

## Session Continuity

Last session: 2026-01-31
Stopped at: Completed 04-03-PLAN.md (Server Actions and Real-Time Hooks)
Resume file: None
