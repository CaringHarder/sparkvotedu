# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-28)

**Core value:** Teachers can instantly engage any classroom through voting -- on any topic, in any format -- and see participation happen in real time.
**Current focus:** Phase 11 (Visual Bracket Placement) -- Plans 01+02+03+04 complete, 2 remaining.

## Current Position

Phase: 11 of 11 (Visual Bracket Placement)
Plan: 4 of 6 in current phase
Status: In Progress
Last activity: 2026-02-16 -- Completed 11-04-PLAN.md (Mode toggle + form integration)

Progress: [####################] 100/102 plans (98%)

## Performance Metrics

**Velocity:**
- Total plans completed: 100
- Average duration: ~3.5 min
- Total execution time: ~5.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-and-auth | 5/5 | ~1.5h | ~18m |
| 02-student-join-flow | 6/6 | ~13m | ~2.2m |
| 03-bracket-creation-management | 7/7 | ~15.8m | ~2.3m |
| 04-voting-and-real-time | 6/6 | ~45.6m | ~7.6m |
| 05-polls | 10/10 | ~26.0m | ~2.6m |
| 06-billing-and-subscriptions | 5/5 | ~17.0m | ~3.4m |

| 07-advanced-brackets | 34/34 | ~87.1m | ~2.6m |

| 07.1-predictive-auto-resolution | 10/10 | ~29m | ~2.9m |

| 08-sports-integration | 4/4 | ~20m | ~5m |

| 09-analytics | 3/3 | ~8m | ~2.7m |

| 10-landing-page-and-polish | 5/5 | ~36m | ~7.2m |

| 11-visual-bracket-placement | 4/6 | ~10m | ~2.5m |

**Recent Trend:**
- Last 5 plans: 11-01 (~3m), 11-03 (~2m), 11-02 (~3m), 11-04 (~2m)
- Trend: Phase 11 progressing well. Plan 04 in ~2m (mode toggle + form integration). 4 of 6 plans complete.

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
- [07-17]: Wrapper components for hook isolation -- hooks must be called unconditionally; separate components per bracket type avoid conditional hook violations
- [07-17]: Optimistic vote updates with revert in DEVotingView follows AdvancedVotingView pattern
- [07-17]: RR voting wired pre-emptively -- RoundRobinMatchups already has onStudentVote/votedMatchups props
- [07-18]: Auto-open RR round 1 in updateBracketStatusDAL eliminates chicken-and-egg problem
- [07-18]: Open Round 1 fallback button for brackets activated before auto-open fix
- [07-18]: Student vote buttons replace static entrant names during voting -- contextual UI
- [07-18]: visibleRounds filtering hides future rounds for students in round_by_round pacing
- [07-20]: Fix at child level not hook level -- setPointerCapture essential for reliable drag-to-pan; children opt out via stopPropagation
- [07-20]: Conditional stopPropagation on matchup rect -- only prevents propagation when onMatchupClick provided (teacher view)
- [07-19]: Position parity slot assignment (odd->entrant1, even->entrant2) reuses existing advancement engine convention for cascade propagation
- [07-19]: Speculative entrants only fill empty slots -- preserves real DB data when present
- [07-19]: BFS downstream invalidation via nextMatchupId chain clears all dependent picks on earlier-round change
- [07-19]: Dashed blue border + "predicted matchup" badge visually distinguishes speculative from DB-populated matchups
- [07-22]: Vote leader highlighted with ring-2 ring-green-400 border on Win button for visual emphasis
- [07-22]: Batch decide resolves ties as null winnerId (tie) rather than skipping -- ensures all matchups get decided
- [07-22]: currentRoundRobinRound uses max active round (non-pending) to prevent premature jump breaking canAdvanceRoundRobin
- [07-22]: Batch decide button uses violet-600 color to visually distinguish from manual Win/Tie buttons
- [07-23]: Auto-activate predictive brackets to 'active' status when predictions opened (Option A from R3 verification)
- [07-23]: OR condition in activities API includes predictionStatus:'predictions_open' as safety net for pre-fix brackets
- [07-23]: broadcastActivityUpdate on session channel when predictions open for real-time student page refresh
- [07-21]: DE region tabs in top bar independent of DoubleElimDiagram's own tab navigation (controls scope to selected region)
- [07-21]: Display round normalization via minRound offset subtraction for LB/GF region rounds
- [07-21]: GF tab hidden until GF matchups exist (created when WB/LB champions determined)
- [07-21]: isBracketComplete accepts optional bracketType for DE-aware GF completion check
- [07-24]: Native overflow:auto scrolling replaces pointer-capture drag-to-pan -- eliminates all interaction conflicts
- [07-24]: stopPropagation calls in bracket-diagram.tsx left in place (harmless, provide safety margin)
- [07-24]: use-pan-zoom.ts hook left in place (unused but not deleted for safety)
- [07-25]: Chain celebration to WinnerReveal onComplete instead of independent 4s timer -- eliminates animation overlap
- [07-25]: useEffect auto-navigates to grand_finals tab when deBracketDone -- survives component remount
- [07-25]: Auto-select first unresolved matchup for tiebreak on partial advance via setSelectedMatchupId
- [07-27]: Intercept ctrlKey wheel events for pinch zoom on bracket container, pass through normal scroll
- [07-27]: Top/Bottom for 32+, quadrant TL/TR/BL/BR for 64+ section navigation buttons
- [07-27]: viewingMode defaults to 'advanced' for backwards compatibility with existing SE brackets
- [07-27]: touch-action: pan-x pan-y on bracket container prevents browser zoom on mobile pinch
- [07-26]: Client-side standings via calculateRoundRobinStandings -- updates instantly on every realtime matchup change without state API modification
- [07-26]: Direct CelebrationScreen for RR (no WinnerReveal countdown) -- RR has no dramatic final matchup
- [07-26]: !isRoundRobin guard on SE winner detection prevents totalRounds=1 misfiring for RR matchups
- [07-29]: isRoundRobinComplete reuses getRoundRobinStandings for winner determination rather than duplicating standings logic
- [07-29]: isBracketComplete returns 'rr_complete' sentinel for RR brackets since actual winner requires standings calculation
- [07-28]: Inner ref check inside setTimeout for fallback celebration prevents race with chained reveal path
- [07-28]: Sibling button layout (flex div wrapping collapse button + batch decide button) eliminates nested button hydration error
- [07-31]: Positional X-axis mirroring (not CSS scaleX) keeps text readable in right-to-left quadrant brackets
- [07-31]: Round-1 ancestor tracing for quadrant assignment -- simple arithmetic back-trace through feeder positions
- [07-31]: skipZoom prop on BracketDiagram lets parent components manage zoom independently for sub-brackets
- [07-30]: Record<number, number> per-round matchup index for simple mode one-at-a-time navigation
- [07-30]: Auto-advance to next undecided matchup when current one is decided in simple mode
- [07-32]: AdvancedVotingView as student integration point -- modifying that component covers both active and completed SE bracket states
- [07-32]: maxEntrants fallback chain for 64+ detection: entrants.length (detail), 0 (live), bracket.size (student)
- [07-33]: Exclude DE from Path 4 via && !isDoubleElim guard rather than restructuring celebration paths
- [07-34]: Use bracket.size (always present) instead of 0 or entrants.length as fallback for maxEntrants null safety
- [07.1-01]: Position parity cascade in tabulatePredictions reuses existing SE advancement convention (odd->entrant1, even->entrant2)
- [07.1-01]: Empty predictions returns empty array (consistent with scorePredictions pattern)
- [07.1-01]: Predictions for eliminated entrants silently ignored in later rounds (not counted, not errored)
- [07.1-01]: revealedUpToRound nullable Int on Bracket model for progressive round reveal
- [07.1-02]: Mode-specific transition maps (MANUAL vs AUTO) selected by predictiveResolutionMode
- [07.1-02]: Auto-open matchups for voting restricted to vote_based mode only (auto resolves via tabulation)
- [07.1-02]: Override triggers full downstream clear + re-tabulate (simpler than incremental patch)
- [07.1-02]: Reveal validates sequential order (revealedUpToRound + 1) to prevent round skipping
- [07.1-02]: Reopen clears all non-bye winners and propagated entrants for rounds > 1
- [07.1-03]: LiveDashboard delegates to PredictiveBracket for auto mode rather than adding inline controls
- [07.1-03]: Presentation mode uses fixed overlay with dark bg (matching 05-05 pattern)
- [07.1-03]: Override triggers re-prepare to refresh tabulation results with downstream recalculation
- [07.1-03]: Auto mode hides SE-style round tabs, action buttons, and completion badge in LiveDashboard
- [07.1-04]: SVG overlay approach for bracket accuracy coloring -- imports layout constants from BracketDiagram, renders transparent overlay on top
- [07.1-04]: Dense ranking for student leaderboard: tied scores share same rank number
- [07.1-04]: Countdown skipped for Round 1 (first reveal starts immediately, no 3-2-1)
- [07.1-04]: Server-side prediction fetch triggers when entering revealing/completed state (Promise.all for parallel fetch)
- [07.1-04]: Podium auto-dismiss at 12 seconds (longer than CelebrationScreen's 10s for staggered entries)
- [07.1-05]: Return TabulationResult[] from overrideMatchupWinnerDAL to avoid blocked prepareResults call showing stale data
- [07.1-05]: Chain revealRoundDAL(bracketId, teacherId, 1) inside releaseResultsDAL for auto-reveal of round 1
- [07.1-05]: Filter unresolvedCount by !winnerId only -- bye matchups already excluded from results at DAL layer
- [07.1-06]: isPredictiveAuto guard skips outer PredictionLeaderboard for auto-mode since PredictiveBracket renders its own
- [07.1-06]: Presentation mode overlay in completed branch mirrors revealing branch pattern exactly for consistency
- [07.1-06]: Escape key handler added to existing F key useEffect for presentation mode exit
- [07.1-08]: Completed auto-mode predictive brackets route to 'ready' state (PredictiveStudentView) for PredictionReveal podium instead of generic completed view
- [07.1-08]: Single combined "Close Predictions & Prepare Results" button replaces Fragment-wrapped two-button layout in auto-mode teacher UI
- [07.1-09]: reveal_round and reveal_complete event types added to useRealtimeBracket alongside existing 5 types
- [07.1-09]: reveal_complete triggers setBracketCompleted(true) for podium celebration path
- [07.1-10]: Inline SVG accuracy badges via accuracyMap prop instead of separate absolute-positioned SVG overlay
- [07.1-10]: RegionBracketView for >= 32 entrants in BracketAccuracyView matches AdvancedVotingView conditional pattern
- [07.1-10]: accuracyMap typed as Record<string, 'correct' | 'incorrect' | null> for simple prop forwarding through component tree
- [08-01]: Raw SportsDataIO types isolated in sportsdataio/ directory with pure mapper bridge -- never imported outside
- [08-01]: Provider factory uses cached singleton (created once per process) with lazy env var read
- [08-01]: All new Prisma sports fields optional/nullable -- zero migration risk for existing data
- [08-01]: BracketEntrantData extended with externalTeamId, logoUrl, abbreviation for team logo display
- [08-01]: MatchupData extended with externalGameId, homeScore, awayScore, gameStatus, gameStartTime for live scores
- [08-02]: Two-pass matchup creation: first create all matchups, then wire nextMatchupId via previousHomeGameId/previousAwayGameId
- [08-02]: Position parity for winner propagation in sync (odd->entrant1, even->entrant2) reusing existing advancement convention
- [08-02]: Season extraction from bracket name regex for sync (avoids storing season separately)
- [08-02]: Duplicate import prevention per session via externalTournamentId + sessionId query
- [08-02]: Logo resolver returns null when SportsDataIO URL absent, letting components decide fallback rendering
- [08-03]: SVG overlay approach for sports data (logos, scores, status) -- SportsMatchupOverlay renders on top of standard matchup boxes, matching accuracyMap pattern from 07.1-10
- [08-03]: Sports brackets route through RegionBracketView for 32+ entrants with isSports prop forwarding for consistent rendering
- [08-03]: Emerald badge color for sports brackets to visually distinguish from violet type badges on other bracket types
- [08-03]: Tournament browser uses client-side fetch via useEffect on mount, matching existing server action call patterns
- [08-04]: CRON_SECRET Bearer token auth for Vercel cron endpoint (standard Vercel cron security pattern)
- [08-04]: Adaptive polling: always syncs even without live games to catch recently finalized results
- [08-04]: Per-bracket try/catch error isolation in cron (matches 06-01 webhook per-operation pattern)
- [08-04]: Sports brackets render through existing SE diagram path (RegionBracketView for 64 entrants) -- no new diagram component needed
- [08-04]: Manual override uses advanceMatchup (bracket-type agnostic) rather than overrideMatchupWinner (predictive-gated)
- [08-04]: SE voting controls hidden for sports brackets (auto-sync, not manual voting)
- [09-01]: Predictive scoring detail gated to pro_plus directly (no TIER_LIMITS key -- predictive brackets are Pro Plus only)
- [09-01]: Single groupBy query for batch vote distribution avoids N+1 across all matchups
- [09-01]: Borda scores used as 'votes' metric for ranked poll distribution (percentage of total Borda points)
- [09-02]: LineChart icon for Analytics sidebar nav to avoid visual confusion with BarChart3 used for Polls
- [09-02]: Analytics hub uses direct Prisma queries (not DAL) for lightweight listing with _count
- [09-02]: Only non-draft brackets/polls shown on analytics hub (active, completed, closed, archived)
- [09-03]: Server-side tier re-check in every export server action prevents API-level bypass of CSV export restriction
- [09-03]: PapaParse unparse for client-side CSV generation (handles escaping, quoting, special characters)
- [09-03]: Predictive export gated to pro_plus directly (not csvExport) since predictive brackets are Pro Plus only
- [09-03]: Per-round point columns in predictive export use getPointsForRound for header labels: R1 (1pts), R2 (2pts), etc.
- [10-01]: oklch color space for brand-blue (hue 230) and brand-amber (hue 75) -- perceptually uniform across light/dark modes
- [10-01]: Dark variant uses :where(.dark, .dark *) for zero-specificity targeting of both .dark element and descendants
- [10-01]: ThemeProvider with attribute=class and disableTransitionOnChange for no-FOUC dark mode
- [10-01]: Logo assets deployed as-is to /public/ -- Next.js Image handles WebP/AVIF conversion at serve time
- [10-02]: Minimal nav with only logo + ThemeToggle + Sign In (no multi-link navbar per user decision)
- [10-02]: HomeJoinInput reused in both hero and final CTA for dual student entry points
- [10-02]: PricingCards called with no props for public visitor mode (Get Started links)
- [10-02]: Brand-blue gradient on hero headline text and solid brand-blue background on final CTA section
- [10-02]: Responsive icon/horizontal logo in nav (icon on mobile, horizontal lockup on desktop)
- [10-03]: Sidebar reorganized into three zones (main, activities, bottom) with flex spacer pushing Analytics/Billing down
- [10-03]: Brand-blue/10 active state and brand-blue/5 hover state for all sidebar navigation items
- [10-03]: Progress bar indicators for plan usage limits (brand-blue for live, brand-amber for draft brackets)
- [10-03]: Create Session card uses gradient border and bg-gradient for visual prominence as primary CTA
- [10-03]: Session codes displayed in brand-amber monospace for high visibility
- [10-03]: Auth layout background uses diagonal gradient from brand-blue/5 to brand-amber/5
- [10-04]: Brand-blue for brackets, brand-amber for polls visual differentiation in activity cards
- [10-04]: Circular SVG progress indicator replaces flat progress bar on welcome screen countdown
- [10-04]: Multi-wave confetti with brand colors (blue, amber, white) for sustained celebration
- [10-04]: Staggered podium reveal order: 3rd (0.5s), 2nd (1.5s), 1st (2.5s) for dramatic buildup
- [10-04]: 800ms pause after countdown "1" before winner reveal text for maximum classroom impact
- [10-04]: Custom branded join button with brand-blue background instead of shadcn Button
- [11-01]: buildSeedOrder exported from engine.ts for reuse by placement module (export keyword only, no implementation change)
- [11-01]: PlacementEntrant minimal interface (id, name, seedPosition) for data-layer independence from Prisma types
- [11-01]: Immutable placement operations: all functions return new arrays, never mutate input
- [11-01]: Swap-based placement: placeEntrantInSlot delegates to swapSlots for both entrant-entrant and entrant-bye cases
- [11-03]: RR visual placement is pool reorder + live matchup preview (not drag-to-slot, since RR has no bracket tree)
- [11-03]: Matchup grid is read-only computed visualization from generateRoundRobinRounds -- no droppable slots in grid
- [11-03]: Seed positions reassigned sequentially 1..N on reorder (pool order = seed order)
- [11-03]: BYE detection by finding seed not present in any round matchup (for odd entrant counts)
- [11-03]: @dnd-kit/react sortable useSortable with isSortable type guard for DragEnd event handling
- [11-02]: PlacementDragData discriminated union (type: 'entrant' | 'slot') for onDragEnd source/target routing
- [11-02]: Combined draggableRef+droppableRef via callback ref merger on occupied PlacementSlot elements for dual drag+drop
- [11-02]: EntrantPool shows all real entrants (seedPosition <= entrantCount) as view over entrants array (not separate data)
- [11-02]: Desktop sidebar + mobile chip bar pattern using hidden/md:block responsive toggle for EntrantPool
- [11-02]: PlacementBracket responsive grid adapts columns (1-4) based on matchup count breakpoints
- [11-04]: handleVisualPlacement sets entrants directly (no seedPosition renumbering) since placement components manage positions
- [11-04]: PlacementModeToggle appears only when entrants.length > 0 (visual placement needs entrants to be useful)
- [11-04]: Edit form Entrant interface extended with id field, initialized from bracket.entrants[].id for stable keys
- [11-04]: bracketType passed from server page with fallback to single_elimination for pre-existing brackets

### Pending Todos

- Configure Google, Microsoft, Apple OAuth providers in external consoles and Supabase dashboard (non-blocking, code complete)
- Create 'poll-images' bucket in Supabase Storage dashboard for poll option image uploads
- Configure production Stripe webhook URL (https://yourdomain.com/api/webhooks/stripe) in Stripe Dashboard when deploying (using Stripe CLI for local dev)
- Create Stripe Products (Pro, Pro Plus) with Monthly/Annual prices and add Price IDs to .env.local
- Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to .env.local
- ~~Unify 32+ bracket layout across predictive modes on teacher dashboard~~ (DONE - PredictiveDiagram helper renders RegionBracketView for 32+)
- ~~Add option to show or hide seed numbers for entrants when creating bracket~~ (DONE - showSeedNumbers boolean on Bracket model, toggle in creation form, passed through all diagram components)
- Add visual bracket placement with drag-and-drop seeding (let teachers place matchups on the bracket, not just reorder a list) → Phase 11
- Add SPORTSDATAIO_API_KEY to .env.local (sign up at https://sportsdata.io/free-trial)
- Add CRON_SECRET to Vercel environment variables for cron job authentication

### Roadmap Evolution

- Phase 11 added: Visual Bracket Placement — drag-and-drop seeding where teachers place entrants directly on the bracket diagram

### Blockers/Concerns

- ~~[Research]: Sports API provider selection is LOW confidence -- needs deep research before Phase 8~~ (RESOLVED - SportsDataIO selected, provider abstraction built in 08-01)
- [Research]: Device fingerprinting collision rates on identical school hardware need real-world validation in Phase 2

## Session Continuity

Last session: 2026-02-16
Stopped at: Completed 11-04-PLAN.md (Mode toggle + form integration)
Resume file: .planning/phases/11-visual-bracket-placement/11-05-PLAN.md
Note: Phase 11 in progress. Plans 01+02+03+04 complete. PlacementModeToggle created and integrated into both bracket-form.tsx and bracket-edit-form.tsx. Visual placement available for all bracket types. 2 plans remaining (05: large bracket nav, 06: testing/polish).
