# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-28)

**Core value:** Teachers can instantly engage any classroom through voting -- on any topic, in any format -- and see participation happen in real time.
**Current focus:** Phase 6 in progress -- Stripe foundation and webhook handler complete (06-01)

## Current Position

Phase: 6 of 10 (Billing & Subscriptions)
Plan: 1 of 5 in current phase (Stripe foundation + webhook handler complete)
Status: In progress
Last activity: 2026-01-31 -- Completed 06-01-PLAN.md (Stripe Foundation & Webhook Handler)

Progress: [######....] 67% (36/53 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 36
- Average duration: ~5.2 min
- Total execution time: ~3.13 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-and-auth | 5/5 | ~1.5h | ~18m |
| 02-student-join-flow | 6/6 | ~13m | ~2.2m |
| 03-bracket-creation-management | 7/7 | ~15.8m | ~2.3m |
| 04-voting-and-real-time | 6/6 | ~45.6m | ~7.6m |
| 05-polls | 10/10 | ~26.0m | ~2.6m |
| 06-billing-and-subscriptions | 1/5 | ~5.0m | ~5.0m |

**Recent Trend:**
- Last 5 plans: 05-08 (~2.0m), 05-09 (~2.0m), 05-10 (~1.8m), 06-01 (~5.0m)
- Trend: Phase 6 start slightly longer due to Stripe v20 API type adaptations

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
- [04-04]: Client component bracket page reads localStorage for participantId (no server-side identity resolution)
- [04-04]: SVG overlay with duplicated layout constants for interactive bracket diagram (keeps base BracketDiagram clean)
- [04-04]: New /api/brackets/[bracketId]/votes?pid= endpoint for participant vote state restoration
- [04-05]: Sentinel ID '__no_session__' for useSessionPresence to avoid conditional hook violation
- [04-05]: Vote count overlays as interactive card grid below diagram (not inline SVG overlays)
- [04-05]: Client-side timer with persistence to bracket.votingTimerSeconds via server action
- [04-05]: ParticipationSidebar sorts tiles voted > connected > disconnected
- [04-06]: 4-second delay between WinnerReveal and CelebrationScreen to prevent overlay stacking
- [04-06]: CelebrationScreen onDismiss clears both celebration AND reveal state
- [04-06]: QR code as compact chip with expandable dropdown on live dashboard
- [04-06]: AnimatePresence mode="wait" for sequential card transitions in simple voting
- [04-06]: prisma db push (not migrate) for cascade fix due to migration drift
- [05-01]: @@unique([pollId, participantId, rank]) handles both simple (rank=1) and ranked (rank=1..N) vote deduplication
- [05-01]: pollType as string (not DB enum) for flexibility, matching bracket status pattern
- [05-01]: Borda scoring uses rankingDepth as base for partial rankings to avoid score inflation
- [05-01]: Cascade delete on PollOption and PollVote from Poll, matching Bracket cascade pattern
- [05-02]: Poll DAL uses same ownership verification pattern as bracket DAL (findFirst with teacherId)
- [05-02]: castPollVote is unauthenticated (student action) with poll status + banned flag checks
- [05-02]: Ranked poll broadcasts Borda scores as voteCounts for real-time leaderboard updates
- [05-02]: maxPollOptions added to TIER_LIMITS: free=6, pro=12, pro_plus=32
- [05-02]: /api/polls/ routes added as public pages in proxy for student polling access
- [05-03]: 18 curated poll templates across 5 categories (Icebreakers, Classroom Decisions, Academic Debates, Fun & Trivia, Feedback)
- [05-03]: PollForm supports both create and edit mode via existingPoll prop (single component, two flows)
- [05-03]: STATUS_ACTIONS Record keyed by PollStatus for clean conditional status transition button rendering
- [05-03]: Quick Create and Step-by-Step as tabbed modes on same page, not separate routes
- [05-04]: Single usePollVote hook serves both simple and ranked polls with pollType parameter
- [05-04]: Rank badges use gold/silver/bronze (amber-400, gray-300, amber-600) for top 3
- [05-04]: Student poll page reads localStorage for participantId, matching 04-04 bracket page pattern
- [05-05]: PollResults detects active->closed status change to auto-trigger reveal animation (replaced by forceReveal prop in 05-09)
- [05-05]: Presentation mode uses CSS class overrides ([&_*]:text-white) for dark theme without modifying child components
- [05-05]: F key shortcut for presentation mode toggle (excluded from input fields)
- [05-05]: BordaLeaderboardEntry derived client-side from BordaScore broadcast data with maxPossiblePoints computed from poll metadata
- [05-05]: Server component fetches session code + participant count for QR chip and participation rate
- [05-06]: Unified sidebar navigation with Activities section and always-visible Brackets/Polls sub-items
- [05-06]: Existing bracket routes kept intact -- /activities is additive, not a replacement
- [05-06]: Signed upload URL pattern for images bypasses Next.js server action body limits
- [05-06]: Canvas API image compression (max 800px, JPEG 0.8) for poll option images
- [05-07]: try/catch/finally pattern for isSubmitting state reset ensures all exit paths reset the button
- [05-07]: Polls index page follows exact /brackets page pattern (server component, auth guard, serialized data, grid cards)
- [05-08]: Nullable sessionId in assignPollToSession schema matches bracket pattern exactly
- [05-08]: Session assignment UI placed inline (not sidebar) since polls have no diagram
- [05-09]: forceReveal prop replaces racy status transition detection for winner reveal animation
- [05-09]: getSimplePollVoteCounts returns zeros for all options (not just options with votes)
- [05-09]: Real-time hook flush uses full replacement since DAL now returns complete vote state
- [05-10]: Student poll page wires useRealtimePoll hook for live poll_closed detection and PollReveal animation
- [05-10]: prevPollStatusRef guards against spurious reveal on initial mount (draft is hook's default before first fetch)
- [06-01]: Stripe v20 API (2026-01-28.clover): current_period_end on subscription items, not subscription object
- [06-01]: Invoice subscription ID accessed via invoice.parent.subscription_details.subscription (v20 structure)
- [06-01]: past_due status preserves paid tier access (grace period via Stripe dunning settings)
- [06-01]: Webhook returns 200 even on processing errors to prevent Stripe retries for app-level bugs
- [06-01]: Upsert for all subscription DB writes ensures idempotent webhook processing
- [06-01]: Per-operation try/catch in webhooks prevents partial failure from blocking acknowledgment

### Pending Todos

- Configure Google, Microsoft, Apple OAuth providers in external consoles and Supabase dashboard (non-blocking, code complete)
- Create 'poll-images' bucket in Supabase Storage dashboard for poll option image uploads
- Configure production Stripe webhook URL (https://yourdomain.com/api/webhooks/stripe) in Stripe Dashboard when deploying (using Stripe CLI for local dev)
- Create Stripe Products (Pro, Pro Plus) with Monthly/Annual prices and add Price IDs to .env.local
- Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to .env.local

### Blockers/Concerns

- [Research]: Sports API provider selection is LOW confidence -- needs deep research before Phase 8
- [Research]: Device fingerprinting collision rates on identical school hardware need real-world validation in Phase 2

## Session Continuity

Last session: 2026-01-31
Stopped at: Completed 06-01-PLAN.md (Stripe Foundation & Webhook Handler)
Resume file: None
