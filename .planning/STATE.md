# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-28)

**Core value:** Teachers can instantly engage any classroom through voting -- on any topic, in any format -- and see participation happen in real time.
**Current focus:** Phase 7 gap closure COMPLETE -- All 16 plans executed

## Current Position

Phase: 7 of 10 (Advanced Brackets - Gap Closure Complete)
Plan: 16 of 16 in current phase (all gap closure plans complete)
Status: Phase complete
Last activity: 2026-02-01 -- Completed 07-15-PLAN.md (Live Dashboard Bracket Type Routing)

Progress: [##########] 100% (55/55 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 55
- Average duration: ~4.1 min
- Total execution time: ~4.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-and-auth | 5/5 | ~1.5h | ~18m |
| 02-student-join-flow | 6/6 | ~13m | ~2.2m |
| 03-bracket-creation-management | 7/7 | ~15.8m | ~2.3m |
| 04-voting-and-real-time | 6/6 | ~45.6m | ~7.6m |
| 05-polls | 10/10 | ~26.0m | ~2.6m |
| 06-billing-and-subscriptions | 5/5 | ~17.0m | ~3.4m |

| 07-advanced-brackets | 16/16 | ~52.9m | ~3.3m |

**Recent Trend:**
- Last 5 plans: 07-12 (~3.0m), 07-13 (~2.0m), 07-14 (~2.6m), 07-16 (~2.0m), 07-15 (~2.6m)
- Trend: Gap closure plans executing fast -- all 3 gap closure plans completed

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
- [06-02]: redirect() placed outside try/catch to avoid swallowing Next.js internal throw in server actions
- [06-02]: Promise.all for billing overview queries (parallel teacher+subscription, bracket counts, poll count)
- [06-02]: PRICE_IDS.includes(priceId) guard before Stripe API call to prevent arbitrary price injection
- [06-02]: allow_promotion_codes enabled on checkout sessions for future promo code support
- [06-03]: Inline 'use server' wrapper for createPortalSession to satisfy form action void return type
- [06-03]: TIER_ORDER index comparison for clean upgrade/downgrade/current tier detection in PricingCards
- [06-03]: /pricing added to PUBLIC_PAGES in proxy.ts for unauthenticated visitor access
- [06-04]: CSS-only tooltip (invisible group-hover:visible) for UpgradePrompt hover interaction
- [06-04]: TIER_ORDER index comparison as safety guard in UpgradePrompt to prevent showing when user has access
- [06-04]: Welcome page reads Stripe Checkout Session directly to avoid webhook race condition
- [06-04]: Parallel Promise.all for sessions + billing overview in dashboard shell
- [06-05]: Split analytics into basicAnalytics (true for all) and csvExport (false for free) to reconcile BILL-01/BILL-02
- [06-05]: Bracket type gate uses safe fallback to single_elimination since schema does not yet include bracketType field
- [06-05]: New brackets always created as draft; createBracket checks draft limit, updateBracketStatus checks live limit on activation
- [06-05]: Gate-before-mutation pattern: all server actions check tier limits before any prisma call
- [07-01]: BracketSize widened to number type alias (not removed) for backwards compatibility with bracket-form.tsx imports
- [07-01]: All new Bracket/Matchup fields optional or have defaults -- zero migration risk for existing data
- [07-01]: bracketTypeSchema uses .default('single_elimination') so existing create flows work unchanged
- [07-01]: updateEntrantsSchema min lowered from 4 to 3 to match bracketSizeSchema.min(3)
- [07-02]: Top seeds receive byes by natural seeding order (seed 1 vs bracketSize is first bye)
- [07-02]: Bye matchups set phantom seed to null and isBye=true; auto-advancement at DB layer not engine
- [07-02]: generateMatchupsWithByes composes on generateMatchups rather than building separate algorithm
- [07-03]: Losers bracket built iteratively: R1 minor, then alternating major/minor per remaining WB round
- [07-03]: LB final has null nextMatchupPosition; DAL layer wires it to grand finals during persistence
- [07-03]: Grand finals uses round=1, position=1 with null seeds (filled by WB and LB champions)
- [07-03]: seedLosersFromWinnersRound uses split-and-reverse for 3+ losers to avoid rematches
- [07-04]: Circle method fixes seed 1 and rotates [2..N]; pairs i with N-1-i for balanced round-robin scheduling
- [07-04]: Odd entrant counts add phantom BYE_SEED=N+1, filtered from output matchups (one bye per round)
- [07-04]: Win=3, Tie=1, Loss=0 scoring; rank by points desc then wins desc with head-to-head tiebreaker
- [07-04]: Circular head-to-head ties (a>b>c>a) assign equal rank; only pairwise h2h resolves
- [07-05]: getPointsForRound takes only round number (no totalRounds) -- standard doubling is round-independent
- [07-05]: scorePredictions returns empty array (not error) for empty inputs or no resolved matchups
- [07-05]: participantName set to empty string by engine; DAL fills from DB on read
- [07-05]: Tiebreaker uses correctPicks descending after totalPoints descending
- [07-06]: Preset sizes [4,8,16,32,64] + Custom toggle with number input for arbitrary sizes 3-128
- [07-06]: 2x2 grid card layout for bracket type selector with tier badges as visual indicators
- [07-06]: BYE badge computed via useMemo from calculateBracketSizeWithByes on each reorder
- [07-06]: Pan/zoom uses CSS transforms with useRef-based event listeners for zero re-renders during drag
- [07-07]: getSlotForPosition duplicated as local helper in DAL (not exported from advancement.ts) to avoid coupling
- [07-07]: maxEntrants set on Bracket record for diagram layout; size remains actual entrant count
- [07-07]: BYE text in italic muted style with muted background fill; bye connectors dashed at 0.4 opacity
- [07-07]: bracketSize prop optional on BracketDiagram; falls back to 2^totalRounds for zoom detection
- [07-10]: Round-robin DAL routes from createBracketDAL via bracketType branch (not separate action endpoint)
- [07-10]: Matchup position is globally unique within bracket (incrementing across all rounds)
- [07-10]: Round advancement opens next round by setting pending matchups to voting status
- [07-10]: Standings fetched server-side on bracket detail page and passed as prop
- [07-08]: Round offsets for DE unique constraint: WB unmodified, LB offset by wbRounds, GF offset by wbRounds+lbRounds
- [07-08]: WB R1 losers fill both LB R1 entrant slots (2 per matchup); WB R2+ losers fill entrant2 in LB major rounds
- [07-08]: LB final -> GF uses explicit entrant2 override (not position parity) for correct WB/LB champion placement
- [07-08]: Play-in count fixed at 8 extra entrants (4 play-in matches) for NCAA First Four model
- [07-08]: advanceMatchup server action detects bracketType and routes to correct advancement function
- [07-08]: Dynamic GF reset match created at runtime when LB champion wins GF match 1 (not pre-created)
- [07-11]: Delete + createMany for prediction upsert (not individual upserts) -- guarantees clean state on edit
- [07-11]: Bye matchups filtered at DAL layer (isBye=false) before scoring -- never included in prediction UI or scoring
- [07-11]: prediction_status_changed added to BracketUpdateType for prediction lifecycle broadcasts
- [07-11]: Dual-mode prediction UI: simple form cards vs interactive bracket diagram clicks, determined by predictiveMode
- [07-11]: totalRounds uses Math.ceil(Math.log2(effectiveSize)) for bye bracket support in detail page
- [07-09]: Round normalization at rendering layer (not DAL) to keep DB rounds intact for advancement logic
- [07-09]: Grand Finals rendered as centered card layout (not SVG bracket) since only 1-2 matchups
- [07-09]: Overview tab computes entrant status from matchup data (no separate status field needed)
- [07-09]: BracketZoomWrapper applied per-tab for Winners/Losers when 32+ entrants
- [07-12]: Bulk getAllMatchupPredictionStats uses single groupBy query with matchupId+predictedWinnerId
- [07-12]: Gold/silver/bronze rank badges match 05-04 poll leaderboard pattern (amber-400, gray-300, amber-600)
- [07-12]: Leaderboard renders only when bracket status is active or completed (not during draft/predictions_open)
- [07-12]: Server-side score prefetch as initialScores prop, with client-side real-time updates via usePredictions
- [07-13]: Single-elimination cards show no extra badge (default type, avoids visual noise)
- [07-13]: Violet badge color for bracket type to distinguish from status badges
- [07-13]: Double-elim max of 64 enforced at form level, matching pro tier entrant limit
- [07-14]: Student RR page passes empty standings array; RoundRobinStandings handles empty gracefully
- [07-14]: Predictive brackets with predictions_open + draft status enter ready state for student prediction submission
- [07-15]: SE action bar retained for DE brackets (same matchup status model); RR hides all SE controls
- [07-15]: Predictive brackets render standard BracketDiagram in live view (prediction phase is before go-live)
- [07-15]: totalRounds=1 for RR live page since RR matchups grouped by roundRobinRound, not SE round numbers
- [07-15]: Live page totalRounds uses Math.ceil(Math.log2(effectiveSize)) with maxEntrants fallback for bye support
- [07-16]: 30s transaction timeout for large bracket creation (not batching optimization -- minimal fix)
- [07-16]: Hide Activate button for predictive brackets; Complete and Delete remain for all types

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

Last session: 2026-02-01
Stopped at: Completed 07-15-PLAN.md (Live Dashboard Bracket Type Routing) -- Phase 7 gap closure COMPLETE (16/16 plans)
Resume file: None
