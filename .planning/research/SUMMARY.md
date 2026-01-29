# Project Research Summary

**Project:** SparkVotEDU
**Domain:** EdTech classroom engagement (polling and tournament brackets)
**Researched:** 2026-01-28
**Confidence:** MEDIUM-HIGH

## Executive Summary

SparkVotEDU is an EdTech classroom engagement platform that combines real-time polling with tournament bracket voting. The product occupies a unique market position: existing polling tools (Kahoot, Mentimeter, Poll Everywhere) lack bracket features, while bracket platforms (BracketFights, Challonge) lack classroom-oriented controls and code-based anonymous joining. This white space creates a compelling differentiator.

The recommended technical approach is a Next.js 16 + Supabase stack optimized for real-time classroom interactions. Next.js 16 (verified current stable) with App Router provides the full-stack framework; Supabase delivers PostgreSQL (ideal for relational bracket data) bundled with real-time subscriptions and authentication. This combination eliminates the need for separate WebSocket infrastructure and authentication services. The architecture follows a server-authoritative pattern where bracket state machines run exclusively server-side, preventing the race conditions and state corruption common in collaborative voting applications.

The highest-risk technical challenges are: (1) device fingerprinting failures on identical school-issued hardware (traditional browser fingerprinting produces 60-90% collision rates in classrooms), requiring a layered identity strategy with session tokens as the primary identifier; (2) double-elimination bracket state complexity, which is 5-10x harder than single-elimination and requires immutable event-sourcing patterns; and (3) WebSocket failures in school network environments with restrictive firewalls, requiring transport fallback (WebSocket -> SSE -> long-polling). Mitigating these risks early in Phase 1-2 is critical to product viability.

## Key Findings

### Recommended Stack

The stack is optimized for rapid development with managed services that collapse infrastructure complexity. Next.js 16 (verified December 2025 release) provides the full-stack framework with React Server Components for teacher dashboards and Client Components for real-time student voting interfaces. Supabase serves as the combined database, authentication, and real-time layer, eliminating three separate service dependencies. Stripe handles subscription billing with webhook-driven tier synchronization. The sports API integration (ESPN unofficial for MVP, SportsDataIO for production) is deferred to later phases with an abstracted provider interface.

**Core technologies:**
- Next.js 16.1 + React 19.2: Full-stack framework — verified current stable, App Router mature, Turbopack default bundler
- Supabase (PostgreSQL + Realtime + Auth): Database and backend services — relational data model for brackets, built-in WebSocket subscriptions, OAuth for teachers
- Prisma 6.x: Type-safe ORM — auto-generated TypeScript types from schema, migration system for iterative development
- Stripe: Subscription billing — industry standard for SaaS, handles Free/Pro/Pro Plus tiers with Customer Portal
- FingerprintJS + session tokens: Anonymous student identity — layered approach to handle identical school devices
- shadcn/ui + Tailwind CSS: UI components — full control with accessible primitives, rapid development

**Critical version notes:**
- Next.js 16.1 verified via nextjs.org/blog (HIGH confidence)
- React 19.2 ships with Next.js 16 (HIGH confidence)
- Supabase features known from training data, exact version unverified (MEDIUM confidence)
- Sports API provider needs phase-specific research (LOW confidence on ESPN unofficial API reliability)

### Expected Features

SparkVotEDU must deliver table stakes features to compete with polling tools while adding bracket functionality as a differentiator. The free tier must be genuinely usable (not a demo) to gain teacher adoption in the education market where "try before buy" is non-negotiable.

**Must have (table stakes):**
- Join via class code with zero-friction anonymous participation (Kahoot-style)
- Teacher authentication (email/password + Google + Microsoft OAuth for schools)
- Simple multiple-choice polls with real-time results display
- Single-elimination brackets with visual bracket rendering (SVG/Canvas)
- Vote-based winner advancement AND teacher-chosen advancement (educational override)
- Real-time vote dashboard for projector display in classroom
- Teacher dashboard for CRUD operations on brackets/polls
- Free tier with meaningful limits (3 brackets, 16 entrants max, basic polls only)
- Device fingerprinting for session continuity (student can close/reopen browser)
- Basic analytics (participation count, vote distribution)

**Should have (competitive differentiators):**
- Double-elimination brackets (no EdTech competitor offers this)
- Round-robin brackets for small-group discussions
- Predictive brackets with leaderboard (students predict outcomes, earn points — killer feature)
- Non-power-of-two brackets with automatic bye placement (usability win over competitors)
- Sports API integration for NCAA/NBA/NHL/MLB tournament data (unique in EdTech)
- Live Event mode with timed voting rounds (adds urgency like Kahoot's timer)
- Curated topic libraries (pre-built entrant lists by subject to reduce teacher setup time)
- Ranked-choice polls (richer data than simple polls)
- CSV upload for bulk entrant import (power user feature)

**Defer to v2+ (future consideration):**
- LMS integration (Canvas, Google Classroom) — requires months-long approval process per platform
- PWA/mobile app — responsive web design sufficient for v1
- AI-generated bracket content — unpredictable outputs create K-12 safety concerns
- Multi-language/i18n — significant engineering effort, defer until market validated
- Public/shareable brackets — privacy concerns in K-12 context

**Anti-features (explicitly reject):**
- Student accounts with passwords — massive COPPA/FERPA compliance burden, anonymous-by-design is a feature
- Real-time chat between students — moderation nightmare and bullying vector
- Gamification with persistent cross-session points — creates pressure/anxiety, conflicts with anonymous design
- Native mobile apps — unnecessary complexity, PWA sufficient

### Architecture Approach

The architecture follows Next.js App Router best practices with a server-authoritative pattern for all bracket state transitions. Server Components fetch and display data; Client Components handle interactive voting with optimistic UI updates. A centralized Data Access Layer (DAL) enforces authorization on every database query. Bracket logic is isolated in pure TypeScript state machines (lib/engine/) that never touch the database directly — this separation enables exhaustive testing independent of the web framework.

**Major components:**
1. **Bracket Engine** (lib/engine/) — Pure TypeScript state machine for bracket types (single/double/round-robin/predictive). Handles round advancement, bye assignment, winner tracking. Event-sourced for audit trail and undo capability. Double-elimination modeled as directed acyclic graph, not two separate trees.

2. **Voting Engine** (Server Actions + DAL) — Vote submission with deduplication via database unique constraint on (session_id, matchup_id). Real-time broadcast to Supabase Realtime channels for live dashboard updates. Optimistic client updates with server validation and rollback.

3. **Anonymous Identity System** (lib/fingerprint/) — Layered approach: session tokens (localStorage + HttpOnly cookie) as primary identifier, browser fingerprint as supplementary signal. Composite key: hash(session_token + fingerprint + class_code). Mitigates identical school device collisions by not relying on fingerprint alone.

4. **Feature Gating Module** (middleware + components + DAL) — Three-layer enforcement: Next.js middleware for route-level checks (UX), component-level gates with upgrade prompts (UI), DAL-level rejection of operations exceeding tier limits (security). Prevents bypass via direct API calls.

5. **Sports Data Integration** (Supabase Edge Functions + cache) — Server-side scheduled fetch from external API (cron every 5-15 minutes during tournaments), normalize into standard bracket structure, cache in Supabase. Teachers browse cached tournaments and import as bracket templates. Decouples classroom experience from external API availability.

6. **Subscription Management** (Stripe webhooks -> Supabase) — Stripe events (checkout.session.completed, customer.subscription.updated/deleted) sync subscription tier to users table via webhook. Middleware uses DB state as source of truth, never JWT claims alone. Customer Portal handles plan changes.

**Critical patterns:**
- Bracket state is immutable event log, not mutable tree (prevents corruption, enables undo)
- Real-time uses debounced broadcast (accumulate votes for 300-500ms before broadcasting to prevent thundering herd)
- WebSocket transport with SSE/long-polling fallback (school firewalls block WebSocket on 20-40% of networks)
- Sports data cached aggressively (never call external API from client, rate limits kill free tiers)

### Critical Pitfalls

These pitfalls cause rewrites, data corruption, or product failure if not addressed in the correct phase.

1. **Device Fingerprinting Collision on Identical School Hardware** — Traditional browser fingerprinting produces 60-90% identical fingerprints in classrooms due to cloned OS images. Causes vote deduplication failures (multiple students treated as one) or vote fraud (one student, multiple devices). **Mitigation:** Use session tokens (localStorage + HttpOnly cookie) as primary identity; fingerprint only as supplementary signal. Accept tradeoff that clearing browser storage creates new identity. **Phase to address:** Phase 1 (Foundation) — identity is foundational to all features.

2. **Double-Elimination Bracket State Corruption** — Double-elimination has two parallel brackets (winners + losers) with complex feed-in rules and grand finals reset logic. 5-10x harder than single-elimination. Common failures: teams appearing in both brackets, incorrect losers bracket matchup generation, missing grand finals reset. **Mitigation:** Model as immutable event log, pre-generate full bracket structure at creation (not dynamically per round), use bracket templates encoded as JSON data. Write exhaustive integration tests for every size (4-16 teams). **Phase to address:** Phase 2-3 (Bracket Engine) — build and test state machine before UI.

3. **Non-Power-of-Two Brackets with Incorrect Bye Placement** — Brackets with 5, 6, 7, 9-15 entrants need byes. Developers commonly place byes randomly (destroys fairness) or cluster them on one side (lopsided bracket). **Mitigation:** Use standard tournament seeding algorithm (seed 1 vs seed N, seed 2 vs seed N-1), pre-generate bye positions in bracket template. Test every size 3-16 in both single and double elimination. **Phase to address:** Phase 2-3 (Bracket Engine) — part of bracket generation logic.

4. **WebSocket Failures in School Network Environments** — School firewalls block WebSocket on 20-40% of networks; transparent proxies terminate connections after 30-60 seconds. Live voting dashboard stops updating, appears broken. **Mitigation:** Implement transport fallback (WebSocket -> SSE -> long-polling). Application-level heartbeat (ping every 15-20s). Exponential backoff reconnection with jitter. Votes submitted via HTTP POST (not WebSocket) so vote data survives connection loss. **Phase to address:** Phase 1-2 (Infrastructure) — real-time transport architecture must be decided before features depend on it.

5. **Freemium Feature Gating as Afterthought** — Teams build features first, add subscription tiers later. Results in scattered tier checks, race conditions on downgrade, client-side-only gating that can be bypassed. **Mitigation:** Define tier matrix in Phase 1. Build centralized canAccess(user, feature) gate system before any gated features. Three-layer enforcement (middleware + component + DAL). Document downgrade behavior (data preserved read-only, never deleted). **Phase to address:** Phase 1 (Foundation) — gate system must exist before gated features.

6. **Predictive Bracket Scoring Edge Cases** — Scoring fails on: upset chains (team picked for later rounds loses early), late joiners (cannot retroactively pick), tiebreakers, real tournament changes (forfeits/DQs). **Mitigation:** Define scoring system formally before implementation (points per round, tiebreaker rules, late-join policy). Use progressive scoring (1pt/2pt/4pt/8pt per round). Store predictions immutably; score by comparing predictions to outcomes. **Phase to address:** Phase 3-4 (Predictive Brackets) — design rules before building feature.

7. **Sports API Data Inconsistency and Unavailability** — Sports APIs have rate limits (hit during March Madness), delayed results (15-60 min lag), format changes between seasons, and downtime during peak moments. Free tiers have 100-1000 req/day limits (burned by one classroom). **Mitigation:** Server-side cache layer with 5-15 minute refresh intervals. Normalization layer to map API data to internal bracket structure. Teacher manual override capability. Budget for paid API tier ($25-100/mo). **Phase to address:** Phase 4 (Sports Integration) — but provider selection and caching architecture decided in Phase 1-2 infrastructure planning.

## Implications for Roadmap

Based on research, the suggested phase structure optimizes for dependency order (authentication before ownership, state machine before UI) and risk mitigation (hardest problems early, revenue later).

### Phase 1: Foundation & Student Join Flow
**Rationale:** Authentication and student identity are dependencies for all downstream features. Device fingerprinting is the highest technical risk and must be validated early with real school hardware. Feature gating system must exist before building any gated features to avoid retroactive refactoring.

**Delivers:**
- Next.js 16 + Supabase project scaffolding
- Teacher authentication (email/password + Google + Microsoft OAuth)
- Student join via class code with fun name generation
- Layered device identity (session tokens + fingerprint + HttpOnly cookie)
- Database schema (core tables: users, brackets, matchups, votes, polls, subscriptions)
- Data Access Layer (DAL) structure with authorization checks
- Feature gating system (canAccess() gate, tier definitions, middleware + component + DAL enforcement)
- UI component library (shadcn/ui)

**Addresses:**
- Pitfall #1 (device fingerprinting) — validate identity approach on identical hardware
- Pitfall #5 (feature gating) — gate system before gated features
- Feature: Teacher auth (email + Google + Microsoft) — table stakes
- Feature: Student join via code — table stakes

**Avoids:**
- Building features before identity works (impossible to deduplicate votes)
- Building Pro/Pro Plus features before gating exists (security vulnerability)

**Research flag:** Standard patterns; no additional research needed.

---

### Phase 2: Core Bracket Engine & Voting
**Rationale:** Bracket state machine is the hardest technical work in the entire project. Single-elimination must be built, tested exhaustively, and validated before any other bracket type. Building the engine before the UI allows testing bracket logic in isolation. Voting with real-time updates proves the Supabase Realtime integration and validates transport fallback for school networks.

**Delivers:**
- Bracket engine for single-elimination (state machine, round advancement, winner tracking)
- Non-power-of-two bracket support with automatic bye placement
- Bracket creation wizard (teacher UI)
- Student voting interface (optimistic UI updates)
- Vote deduplication (database unique constraint + server validation)
- Teacher bracket management (advance rounds, choose winners, view results)
- Supabase Realtime integration (live vote counts, bracket state updates)
- Real-time transport fallback (WebSocket -> SSE -> long-polling)

**Addresses:**
- Pitfall #2 (bracket state) — single-elimination proves state machine pattern
- Pitfall #3 (bye placement) — test all sizes 3-16 with byes
- Pitfall #4 (WebSocket failures) — fallback transport tested in school network conditions
- Feature: Single-elimination brackets — table stakes
- Feature: Vote-based + teacher-chosen advancement — table stakes
- Feature: Real-time vote dashboard — table stakes
- Architecture: Bracket engine (state machine) — foundational component
- Architecture: Voting engine (deduplication + real-time) — foundational component

**Avoids:**
- Building complex bracket types (double-elim, predictive) before proving single-elim works
- Building UI before bracket logic works (prevents iterative testing)

**Research flag:** Bracket state machine for non-power-of-two needs validation via exhaustive testing, but no external research needed (standard algorithms). WebSocket fallback implementation may need school network testing.

---

### Phase 3: Polls & Visual Bracket Display
**Rationale:** Polls are lower complexity than brackets (no state machine, no rounds) and prove the real-time voting pattern in a simpler context. Visual bracket rendering (SVG/Canvas) is high-complexity UI work that can proceed in parallel with poll voting. Both depend on the voting engine from Phase 2.

**Delivers:**
- Simple polls (multiple choice) with creation wizard
- Ranked-choice polls with Borda count/instant-runoff tabulation
- Poll voting interface (anonymous, real-time results)
- Visual bracket display component (SVG-based tree rendering)
- Bracket visualization for single-elimination (4 to 64+ entrants)
- Responsive bracket layout (desktop/tablet/mobile)
- Student session persistence (return to same session after closing browser)

**Addresses:**
- Feature: Simple polls — table stakes
- Feature: Ranked polls — differentiator
- Feature: Visual bracket rendering — table stakes (critical for UX)
- Architecture: Bracket visualization component — most complex UI in app

**Avoids:**
- Building polls before voting engine exists
- Building complex bracket visualization before single-elim bracket data model is stable

**Research flag:** SVG rendering for large brackets (64+ teams) may need performance research. Standard patterns otherwise.

---

### Phase 4: Subscription & Billing
**Rationale:** Subscription billing comes after core features are working. Allows development velocity without tier checks blocking every feature. By Phase 4, the free tier is fully functional and can be validated with early users before building upgrade flows.

**Delivers:**
- Stripe integration (Checkout Sessions, Customer Portal)
- Subscription webhook handling (sync tier status to Supabase)
- Pricing page with tier comparison
- Feature gating enforcement (middleware + component + DAL using gate system from Phase 1)
- Upgrade prompts in UI for gated features
- Subscription management UI (account settings, billing portal)
- Tier limits enforcement (bracket count, entrant count, feature access)
- Downgrade handling (preserve data read-only, block new creation)

**Addresses:**
- Feature: Stripe subscription billing — table stakes for monetization
- Feature: Free tier with limits — table stakes
- Feature: Feature gating by tier — required for Pro/Pro Plus
- Architecture: Subscription Gate Module — enforces tier limits

**Avoids:**
- Building billing before features exist to gate
- Letting subscription checks slow down feature development

**Research flag:** Stripe webhook idempotency and subscription lifecycle edge cases are standard patterns. No additional research needed.

---

### Phase 5: Advanced Brackets
**Rationale:** Advanced bracket types (double-elimination, round-robin, predictive) build on the proven single-elimination state machine from Phase 2. These are gated Pro/Pro Plus features, so subscription billing from Phase 4 must exist first. Double-elimination is significantly harder than single-elimination and needs methodical development.

**Delivers:**
- Double-elimination bracket engine (winners bracket + losers bracket + grand finals reset)
- Round-robin bracket engine (group stage, standings table, tiebreaker logic)
- Predictive bracket engine (prediction phase + resolution phase + scoring)
- Predictive bracket leaderboard with detailed scoring breakdown
- Double-elimination visual rendering (two-bracket display with feed-in arrows)
- Round-robin standings display
- Live Event mode (timed voting rounds with server-authoritative countdown)
- CSV upload for bulk entrant import

**Addresses:**
- Pitfall #2 (double-elimination state) — addressed with exhaustive testing
- Pitfall #6 (predictive scoring) — scoring rules defined formally before implementation
- Feature: Double-elimination brackets — differentiator
- Feature: Round-robin brackets — differentiator
- Feature: Predictive brackets + leaderboard — killer feature differentiator
- Feature: Live Event mode with timed rounds — differentiator
- Feature: CSV upload — power user feature

**Avoids:**
- Building double-elimination before single-elimination is proven stable
- Building predictive brackets before basic voting and brackets work

**Research flag:** Double-elimination grand finals reset logic needs validation with esports/tournament software patterns. Predictive bracket scoring algorithms (Borda count, weighted rounds) are standard but need formal design. Moderate additional research during phase planning recommended.

---

### Phase 6: Sports API Integration
**Rationale:** Sports API integration is the most complex external dependency. Requires API provider selection, contract/billing, data normalization, and scheduled cron jobs. This feature is seasonal (NCAA March Madness Feb-Apr, NBA/NHL playoffs Apr-Jun) and can be deferred until core product is validated. Depends on predictive brackets from Phase 5.

**Delivers:**
- Sports API provider integration (SportsDataIO or ESPN unofficial)
- Scheduled fetch of tournament bracket data (Supabase Edge Functions or Next.js cron)
- Sports data normalization layer (map external API to internal bracket structure)
- Sports data cache table in Supabase
- Teacher UI to browse and import sports brackets
- Auto-resolution engine (real game results advance bracket automatically)
- NCAA March Madness, NBA playoffs, NHL playoffs, MLB playoffs support

**Addresses:**
- Pitfall #7 (sports API unreliability) — server-side cache, manual override capability
- Feature: Sports API integration — unique differentiator
- Feature: Auto-resolution of sports brackets — automation for sports use case
- Architecture: Sports Data Integration (cached import pipeline)

**Avoids:**
- Building sports integration before core bracket and predictive features work
- Choosing sports API provider before validating demand (expensive commitment)

**Research flag:** HIGH — Sports API provider selection needs deep research. Must evaluate ESPN unofficial API (free but undocumented), SportsDataIO ($25/sport/mo), The Odds API, API-Sports. Key requirement: structured bracket/tournament data, not just scores. NCAA March Madness bracket data specifically is hard to find. Recommend `/gsd:research-phase` for this phase.

---

### Phase 7: Analytics, Content, & Polish
**Rationale:** Analytics and curated content are enhancements that build on usage data and core features. This phase adds teacher value after the core product works. Landing page can be built anytime but benefits from having screenshots of the working product.

**Delivers:**
- Analytics dashboard (participation trends, vote distribution, engagement over time)
- CSV export of all data (votes, participation, timestamps, results)
- Curated topic libraries (pre-built entrant lists by subject/grade level)
- Teacher ability to customize imported topics
- Landing page and marketing site (branding, feature showcase, pricing)
- Projector-optimized live view (dedicated full-screen route for classroom display)
- Performance optimization (debounced broadcasts, indexed queries, connection pooling)
- Error handling and edge case polish

**Addresses:**
- Feature: Basic analytics — table stakes
- Feature: CSV export — Pro/Pro Plus feature
- Feature: Curated topic libraries — differentiator (reduces teacher setup time)
- Feature: Landing page + pricing — table stakes
- Feature: Projector-optimized view — enhancement of live dashboard

**Avoids:**
- Building analytics before features generate data to analyze
- Building content libraries before understanding teacher usage patterns

**Research flag:** Standard patterns; no additional research needed.

---

### Phase Ordering Rationale

- **Authentication before brackets:** Brackets are owned by teachers (foreign key dependency).
- **Single-elimination before other bracket types:** Proves state machine pattern; double/round-robin/predictive all extend it.
- **Voting before real-time:** Real-time displays vote data that must exist first.
- **Polls in parallel with bracket UI:** Polls are lower complexity and prove voting pattern; bracket visualization is complex UI that can proceed independently.
- **Subscription after core features:** Enables faster development without tier checks blocking every feature; free tier can be validated before building upgrade flows.
- **Advanced brackets after subscription:** Double-elim, predictive, round-robin are gated Pro/Pro Plus features.
- **Sports API deferred:** Highest external dependency risk; seasonal; can validate product without it first.
- **Analytics last:** Reads data produced by all other features; benefits from real usage patterns.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 5 (Advanced Brackets):** Double-elimination grand finals reset logic and predictive bracket scoring algorithms need validation with esports/tournament software patterns. MODERATE research recommended.
- **Phase 6 (Sports API Integration):** Sports API provider selection is HIGH priority research. Must evaluate provider reliability, data structure (bracket/tournament not just scores), NCAA coverage, rate limits, and pricing. ESPN unofficial API is undocumented (LOW confidence). SportsDataIO pricing may be outdated (MEDIUM confidence). Recommend `/gsd:research-phase` before this phase.

Phases with standard patterns (skip research-phase):

- **Phase 1 (Foundation):** Next.js auth patterns, Supabase setup, fingerprinting libraries all well-documented. Standard patterns.
- **Phase 2 (Bracket Engine):** Bracket state machine algorithms are standard (tournament seeding, single-elimination tree structure). Extensive testing needed but no novel research.
- **Phase 3 (Polls & UI):** Polling and ranked-choice tabulation are established patterns. SVG bracket rendering is complex UI work but not novel.
- **Phase 4 (Subscription):** Stripe integration patterns are industry-standard and well-documented.
- **Phase 7 (Analytics & Polish):** Analytics queries and data export are standard patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Next.js 16.1 verified via official docs (Dec 2025 release). React 19.2, TypeScript 5.x, Tailwind CSS 4.x verified as bundled defaults. Supabase feature set known from training (Realtime, Auth, PostgreSQL) but exact current version not verified. Prisma, Stripe, shadcn/ui versions estimated from training data trajectory. Sports API provider selection LOW confidence (needs phase-specific research). |
| Features | MEDIUM | Feature expectations based on training knowledge of Kahoot, Mentimeter, Poll Everywhere, BracketFights, Challonge. Competitor feature sets may have evolved since training cutoff (May 2025). WebSearch/WebFetch unavailable during research — could not verify current competitor capabilities. Feature prioritization (table stakes vs differentiators) grounded in EdTech market patterns. Predictive brackets as differentiator HIGH confidence (no competitor identified in training data). |
| Architecture | HIGH | Next.js App Router patterns (route groups, Server Components, Server Actions, DAL) verified via official docs. Supabase Realtime patterns (Broadcast, Presence, Postgres Changes) known from training data but not verified. Stripe webhook patterns well-established. Bracket state machine architecture based on general software engineering knowledge of tournament software. Double-elimination complexity and event-sourcing recommendation HIGH confidence. Device fingerprinting limitations on identical hardware well-documented in fingerprinting literature. |
| Pitfalls | MEDIUM-HIGH | Device fingerprinting collision rates on identical school hardware estimated (60-90%) based on training knowledge of fingerprinting limitations. School network WebSocket blocking (20-40%) estimated from training knowledge of school firewalls (Securly, GoGuardian, Cisco Umbrella). Double-elimination state complexity validated by tournament software domain knowledge. Predictive bracket scoring edge cases based on training knowledge of ESPN/Yahoo bracket challenge implementations. Sports API unreliability patterns known from general API integration experience. COPPA/FERPA guidance should be verified by legal counsel. |

**Overall confidence:** MEDIUM-HIGH

Research findings are grounded in verified official documentation (Next.js, Vercel) and strong training knowledge of established patterns (Supabase, Stripe, tournament brackets, EdTech market). Confidence is reduced by: (1) inability to verify current competitor features via WebSearch/WebFetch, (2) sports API provider selection requires deeper research, (3) device fingerprinting collision rates on school hardware need real-world validation, (4) Supabase Realtime exact current capabilities not verified.

### Gaps to Address

**Gap: Device fingerprinting uniqueness rates on identical school hardware**
- **Impact:** If session token + fingerprint approach still produces >5% collisions, vote deduplication fails.
- **Mitigation:** Phase 1 MUST include testing with 5+ browser profiles configured identically (same OS, browser version, screen resolution, timezone). If collision rate exceeds 5%, fall back to session tokens only (accept that browser storage clearing creates new identity). Alternative: add teacher-generated per-session 4-digit PIN for students to enter alongside name (manual identity supplement).
- **Validation:** Real-world testing in Phase 1 with school-issued Chromebooks if possible; simulated testing with identical browser configs mandatory.

**Gap: Sports API provider for structured bracket/tournament data**
- **Impact:** Most sports APIs provide scores and schedules, not structured bracket advancement data. NCAA March Madness bracket data specifically is hard to find in free/affordable APIs.
- **Mitigation:** Phase 6 planning MUST include `/gsd:research-phase` to evaluate ESPN unofficial API (site.api.espn.com endpoints), SportsDataIO (official but expensive), The Odds API, Ball Don't Lie (NBA), and others. Key requirement: API must provide bracket structure (rounds, matchups, seeds) and game results, not just game schedules.
- **Validation:** Prototype API integration during Phase 6 planning before committing to full implementation.

**Gap: WebSocket transport reliability in school networks**
- **Impact:** If Supabase Realtime does not gracefully fall back to SSE/long-polling, 20-40% of school networks may experience broken live dashboard.
- **Mitigation:** Phase 2 MUST test Supabase Realtime behind a corporate proxy with SSL inspection. If fallback is not automatic, implement custom SSE/long-polling transport layer. Alternative: use Pusher or Ably which have battle-tested fallback.
- **Validation:** Deploy test environment accessible from school network; ask pilot teachers to test live dashboard reliability.

**Gap: Double-elimination grand finals reset logic specification**
- **Impact:** If grand finals reset is implemented incorrectly (losers bracket winner must beat winners bracket winner twice), leaderboard and bracket completion are wrong.
- **Mitigation:** Phase 5 planning MUST include formal specification of double-elimination rules with test cases for every scenario (grand finals reset triggered, not triggered, bye interactions). Reference Challonge or esports tournament software as ground truth.
- **Validation:** Exhaustive integration tests with manual verification against known-correct bracket outcomes.

**Gap: Supabase Realtime channel connection limits at classroom scale**
- **Impact:** 30+ students subscribing to real-time channels simultaneously may hit concurrency limits.
- **Mitigation:** Phase 2 load testing with 50 concurrent WebSocket connections to same channel. If limits exist, architect subscriptions as one-channel-per-class (not per-student-per-matchup). Use Broadcast for vote counts (fan-out to all clients).
- **Validation:** Load test during Phase 2 infrastructure work.

**Gap: COPPA/FERPA compliance for hashed device fingerprints**
- **Impact:** If hashed fingerprints are legally considered PII, COPPA compliance (parental consent for students under 13) is required.
- **Mitigation:** Document in privacy policy that no PII is collected (students are anonymous, no accounts, no names stored server-side, fingerprints hashed immediately). Consult legal counsel before launch.
- **Validation:** Legal review of privacy policy and data handling practices.

## Sources

### Primary (HIGH confidence)
- **Next.js 16.1 release:** nextjs.org/blog — verified v16.1 release (December 18, 2025), Turbopack stable, React 19.2 support, Cache Components, React Compiler stable
- **Next.js installation defaults:** nextjs.org/docs/getting-started/installation — verified TypeScript, Tailwind CSS, ESLint, App Router, Turbopack all scaffolded by default with `--yes` flag
- **Next.js data fetching patterns:** nextjs.org/docs/app/building-your-application/data-fetching — verified Server Components, streaming, Suspense, React cache()
- **Next.js Server Actions:** nextjs.org/docs/app/api-reference/functions/server-actions — verified form handling, validation with Zod, useActionState, optimistic updates
- **Next.js authentication patterns:** nextjs.org/docs/app/building-your-application/authentication — verified DAL pattern, middleware auth, RBAC, session management
- **Vercel deployment features:** vercel.com/docs/frameworks/nextjs — verified ISR, SSR, streaming, image optimization, middleware for Next.js on Vercel

### Secondary (MEDIUM confidence)
- **Supabase features:** Training data knowledge (as of May 2025). Realtime (Broadcast, Presence, Postgres Changes), Auth with OAuth providers (Google, Apple, Microsoft), PostgreSQL, Edge Functions. Exact current version not verified via WebFetch.
- **Prisma ORM:** Training data knowledge. Version 6.x estimated from trajectory. Type-safe ORM with migration system well-established.
- **Stripe subscriptions:** Training data knowledge. SDK version ^17.x estimated. Subscription billing, Customer Portal, webhooks — well-established API patterns.
- **FingerprintJS:** Training data knowledge. Open-source v4.x estimated. Browser fingerprinting capabilities and school hardware limitations well-documented in fingerprinting literature.
- **shadcn/ui, TanStack Query, Zustand, Framer Motion, Recharts:** Training data knowledge. Well-known libraries, versions estimated. Verify at install time.
- **Kahoot, Mentimeter, Poll Everywhere feature sets:** Training data knowledge (as of mid-2025). Could not verify current features via WebFetch. Feature sets may have evolved.
- **BracketFights, Challonge feature sets:** Training data knowledge. Challonge well-documented; BracketFights less well-known (fewer training data points).
- **EdTech market patterns:** Training data knowledge of SaaS education tools. Freemium models, school OAuth requirements, anonymous student participation — relatively stable industry patterns.
- **Bracket algorithms:** Training data knowledge of tournament bracket implementations. Single-elimination, double-elimination, round-robin, seeding algorithms — well-established computer science domain.
- **Real-time web architecture:** Training data knowledge. WebSocket, SSE, long-polling fallback — well-established patterns.

### Tertiary (LOW confidence)
- **Sports APIs (ESPN unofficial, SportsDataIO, The Odds API, API-Sports):** Training data knowledge. ESPN unofficial API endpoints known from community usage (undocumented). SportsDataIO pricing ($25/sport/mo) from training data may be outdated. Coverage of structured bracket/tournament data (not just scores) uncertain. **This area needs the deepest phase-specific research during Phase 6 planning.**
- **School network firewall behavior:** Training data knowledge of Securly, GoGuardian, Cisco Umbrella, Lightspeed, iBoss. WebSocket blocking and SSL inspection patterns known, but specific current product behavior not verified.
- **Device fingerprinting collision rates on school hardware:** Estimated 60-90% identical fingerprints on cloned school devices based on training knowledge of fingerprinting limitations. Real-world rates need validation during Phase 1 testing.
- **COPPA/FERPA compliance for hashed fingerprints:** Training data knowledge. Legal guidance should be verified by counsel.

---

*Research completed: 2026-01-28*
*Ready for roadmap: yes*
