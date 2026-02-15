# Roadmap: SparkVotEDU

## Overview

SparkVotEDU is rebuilt from the ground up across 10 phases, progressing from authentication and student identity through core bracket creation, real-time voting, polls, billing, advanced bracket types, sports integration, analytics, and finally landing page polish. The build order prioritizes foundational dependencies first (auth before ownership, identity before voting, single-elimination before advanced brackets) and defers the highest external risk (sports API) and enhancement work (analytics, landing) until the core classroom experience is proven. Every phase delivers a coherent, verifiable capability that builds on the previous phases.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Auth** - Project scaffolding, database schema, teacher accounts, and session management
- [x] **Phase 2: Student Join Flow** - Anonymous student participation via class codes with device fingerprinting and fun names
- [x] **Phase 3: Bracket Creation & Management** - Teachers create, edit, and manage single-elimination brackets with entrant tools
- [x] **Phase 4: Voting & Real-Time** - Students vote on matchups with live updating dashboard and real-time bracket state
- [x] **Phase 5: Polls** - Simple and ranked polls with real-time results display
- [x] **Phase 6: Billing & Subscriptions** - Stripe integration, tier enforcement, and upgrade prompts
- [x] **Phase 7: Advanced Brackets** - Double-elimination, round-robin, predictive brackets, and non-power-of-two support
- [x] **Phase 7.1: Predictive Auto-Resolution Mode** - Third resolution mode where predictions auto-count as votes without voting rounds (INSERTED)
- [ ] **Phase 8: Sports Integration** - Real sports tournament brackets from external APIs for classroom prediction competitions
- [ ] **Phase 9: Analytics** - Participation metrics, vote distribution views, CSV export, and predictive leaderboard scoring
- [ ] **Phase 10: Landing Page & Polish** - Public landing page, responsive design audit, and interface refinement
- [ ] **Phase 11: Visual Bracket Placement** - Drag-and-drop seeding where teachers place entrants directly on the bracket diagram

## Phase Details

### Phase 1: Foundation & Auth
**Goal**: Teachers can create accounts, sign in through multiple providers, and maintain persistent sessions in a fully scaffolded application
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07
**Success Criteria** (what must be TRUE):
  1. Teacher can create an account with email/password, then log in and see a dashboard shell
  2. Teacher can sign in with Google, Microsoft, or Apple OAuth and land on the same dashboard
  3. Teacher can close the browser, reopen it, and still be logged in (session persists)
  4. Teacher can reset a forgotten password by receiving an email link
  5. Teacher can log out from any page and be returned to the sign-in screen
**Plans**: 5 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffolding, Prisma v7 + Supabase setup, Teacher model, client utilities
- [x] 01-02-PLAN.md — Email/password auth, proxy.ts, session management, dashboard shell
- [x] 01-03-PLAN.md — Google, Microsoft, Apple OAuth sign-in buttons
- [x] 01-04-PLAN.md — Password reset flow and sign-out button
- [x] 01-05-PLAN.md — Feature gating system (canAccess, TIER_LIMITS, unit tests)

### Phase 2: Student Join Flow
**Goal**: Students can join a class session anonymously via code, receive a fun name, and be recognized on return
**Depends on**: Phase 1
**Requirements**: STUD-01, STUD-02, STUD-03, STUD-04, STUD-05, STUD-06
**Success Criteria** (what must be TRUE):
  1. Student can enter a class code on the join page and immediately enter the session without creating an account
  2. Student is assigned a random fun name (e.g., "Cosmic Penguin") visible to themselves and the teacher
  3. Student can close the browser, reopen it, and return to the same session with the same fun name
  4. Student can see a list of active brackets and polls in their session and select one to participate in
  5. Two students on identical school-issued laptops are recognized as distinct participants
**Plans**: 6 plans

Plans:
- [x] 02-01-PLAN.md — Database schema (ClassSession, StudentParticipant), class code generator, fun name generator, student types
- [x] 02-02-PLAN.md — Device fingerprinting system (FingerprintJS, localStorage UUID, useDeviceIdentity hook)
- [x] 02-03-PLAN.md — Join flow backend (DAL, server actions, proxy update for student routes)
- [x] 02-04-PLAN.md — Join page UI, welcome screen, session layout, reroll and recovery code components
- [x] 02-05-PLAN.md — Teacher session management, student activity grid, Supabase Realtime hooks
- [x] 02-06-PLAN.md — Dashboard navigation gap closure (sidebar nav, session quick-actions)

### Phase 3: Bracket Creation & Management
**Goal**: Teachers can create single-elimination brackets, populate them with entrants using multiple methods, and manage bracket lifecycle
**Depends on**: Phase 1
**Requirements**: BRKT-01, BRKT-07, BRKT-09, BRKT-10, BRKT-11, MGMT-04, MGMT-05, MGMT-06, MGMT-08
**Success Criteria** (what must be TRUE):
  1. Teacher can create a single-elimination bracket with 4, 8, or 16 entrants and see it rendered as a visual tournament diagram
  2. Teacher can populate a bracket by typing entrants manually, uploading a CSV, or selecting from a curated topic list
  3. Teacher can edit entrants (add, remove, reorder) while the bracket is in draft status
  4. Teacher can set a bracket to draft, active, or completed status
  5. Teacher dashboard shows all brackets with their current status at a glance
**Plans**: 7 plans

Plans:
- [x] 03-01-PLAN.md — Prisma schema (Bracket, BracketEntrant, Matchup), TypeScript types, Zod validation
- [x] 03-02-PLAN.md — Bracket engine TDD (calculateRounds, generateMatchups, seeding)
- [x] 03-03-PLAN.md — Curated topic lists + CSV parser (PapaParse)
- [x] 03-04-PLAN.md — SVG bracket diagram component (custom React SVG renderer)
- [x] 03-05-PLAN.md — Bracket DAL + server actions (CRUD with ownership auth)
- [x] 03-06-PLAN.md — Bracket creation wizard + entrant management UI (manual, CSV, topics)
- [x] 03-07-PLAN.md — Bracket list, detail, lifecycle pages + sidebar navigation

### Phase 4: Voting & Real-Time
**Goal**: Students can vote on bracket matchups with results updating live for everyone, and teachers can advance brackets through rounds
**Depends on**: Phase 2, Phase 3
**Requirements**: MGMT-01, MGMT-02, MGMT-03, MGMT-07, BRKT-08, RT-01, RT-02, RT-03, RT-04
**Success Criteria** (what must be TRUE):
  1. Student can cast a vote on an active matchup and see the bracket update without refreshing
  2. Teacher sees vote counts update on the live dashboard as students submit votes in real time
  3. Teacher can advance the bracket to the next round by accepting vote results or manually choosing a winner
  4. Each student can only vote once per matchup, enforced even if they try from the same device
  5. Dashboard shows the number of currently connected/participating students
**Plans**: 6 plans

Plans:
- [x] 04-01-PLAN.md — Schema updates (Vote model, Matchup.status, Bracket voting fields), Vote DAL, server-side Broadcast helper
- [x] 04-02-PLAN.md — Bracket advancement engine TDD (winner propagation, undo, round completion)
- [x] 04-03-PLAN.md — Vote + advancement server actions, real-time hooks, transport fallback, bracket state API
- [x] 04-04-PLAN.md — Student voting interface (simple + advanced modes, optimistic vote feedback)
- [x] 04-05-PLAN.md — Live teacher dashboard (vote counts, participation sidebar, round controls, timer)
- [x] 04-06-PLAN.md — Winner reveal animations, celebration screen, full integration wiring

### Phase 5: Polls
**Goal**: Teachers can create simple and ranked polls that students vote on with results displayed in real time
**Depends on**: Phase 4
**Requirements**: POLL-01, POLL-02, POLL-03, POLL-04, POLL-05, POLL-06
**Success Criteria** (what must be TRUE):
  1. Teacher can create a simple poll (pick one from multiple choices) and see students vote with live-updating result bars
  2. Teacher can create a ranked poll where students order options by preference, with aggregated rankings displayed (Borda count or instant-runoff)
  3. Teacher can set a poll to draft, active, or closed and delete polls they no longer need
  4. Poll results update in real time as students submit their votes (no page refresh needed)
**Plans**: 10 plans

Plans:
- [x] 05-01-PLAN.md — Schema, types, validation, Borda count algorithm
- [x] 05-02-PLAN.md — DAL, server actions, broadcast, feature gates, poll state API
- [x] 05-03-PLAN.md — Poll creation UI, templates, teacher pages
- [x] 05-04-PLAN.md — Student poll voting UI (simple + ranked)
- [x] 05-05-PLAN.md — Real-time results, charts, reveal animation, presentation mode
- [x] 05-06-PLAN.md — Navigation refactor, activities integration, image upload
- [x] 05-07-PLAN.md — Gap closure: fix update button hang + polls 404 page
- [x] 05-08-PLAN.md — Gap closure: session assignment UI for polls
- [x] 05-09-PLAN.md — Gap closure: fix winner reveal race condition + vote retabulation
- [x] 05-10-PLAN.md — Gap closure: student poll page winner reveal on poll close

### Phase 6: Billing & Subscriptions
**Goal**: Teachers can subscribe to Pro or Pro Plus tiers via Stripe, with features gated and upgrade prompts shown for locked capabilities
**Depends on**: Phase 1
**Requirements**: BILL-01, BILL-02, BILL-03, BILL-04, BILL-05, BILL-06, BILL-07
**Success Criteria** (what must be TRUE):
  1. Free tier teacher can use single-elimination brackets (4/8/16), up to 2 live and 2 drafts, and basic analytics
  2. Teacher can subscribe to Pro ($12/mo) or Pro Plus ($20/mo) through a Stripe Checkout flow
  3. Teacher can manage their subscription (upgrade, downgrade, cancel) through the Stripe Customer Portal
  4. Locked features (e.g., double-elimination, CSV export) show an upgrade prompt rather than being hidden
  5. Feature limits are enforced server-side so bypassing the UI does not grant access to paid features
**Plans**: 5 plans

Plans:
- [x] 06-01-PLAN.md — Stripe SDK, Subscription model, pricing config, webhook route handler
- [x] 06-02-PLAN.md — Billing DAL and server actions (createCheckout, createPortalSession)
- [x] 06-03-PLAN.md — Pricing page UI (cards, toggle, public /pricing, in-app /billing)
- [x] 06-04-PLAN.md — Upgrade prompts, welcome page, plan badge, sidebar billing nav
- [x] 06-05-PLAN.md — Server-side tier enforcement in bracket/poll actions, TIER_LIMITS reconciliation

### Phase 7: Advanced Brackets
**Goal**: Teachers on Pro Plus can create double-elimination, round-robin, and predictive brackets, including non-power-of-two sizes with automatic byes
**Depends on**: Phase 4, Phase 6
**Requirements**: BRKT-02, BRKT-03, BRKT-04, BRKT-05, BRKT-06
**Success Criteria** (what must be TRUE):
  1. Teacher can create a double-elimination bracket and see winners bracket, losers bracket, and grand finals rendered correctly
  2. Teacher can create a round-robin bracket where every entrant plays every other entrant with standings displayed
  3. Teacher can create a predictive bracket where students submit predictions and a scored leaderboard ranks accuracy
  4. Teacher can create a bracket with a non-power-of-two number of entrants (e.g., 5, 6, 7, 10) and byes are placed automatically and fairly
  5. Predictive bracket leaderboard shows each student's scoring breakdown (points per correct pick by round)
**Plans**: 34 plans

Plans:
- [x] 07-01-PLAN.md — Schema evolution, TypeScript types, and Zod validation for all bracket types
- [x] 07-02-PLAN.md — Bye placement algorithm (TDD)
- [x] 07-03-PLAN.md — Double-elimination bracket engine (TDD)
- [x] 07-04-PLAN.md — Round-robin bracket engine (TDD)
- [x] 07-05-PLAN.md — Predictive bracket scoring engine (TDD)
- [x] 07-06-PLAN.md — Bracket form update (type selector, custom sizing, pan/zoom)
- [x] 07-07-PLAN.md — Bye DAL integration and bracket diagram BYE rendering
- [x] 07-08-PLAN.md — Double-elimination DAL, server actions, and advancement logic
- [x] 07-09-PLAN.md — Double-elimination tabbed visualization
- [x] 07-10-PLAN.md — Round-robin DAL, actions, standings, and matchup UI
- [x] 07-11-PLAN.md — Predictive bracket DAL, actions, and prediction submission UI
- [x] 07-12-PLAN.md — Predictive bracket leaderboard (student + teacher views)
- [x] 07-13-PLAN.md — Integration verification and end-to-end testing
- [x] 07-14-PLAN.md — Gap closure R1: State API enrichment + student page bracket type routing
- [x] 07-15-PLAN.md — Gap closure R1: LiveDashboard bracket type routing for DE and RR
- [x] 07-16-PLAN.md — Gap closure R1: Large bracket creation timeout + predictive lifecycle controls
- [x] 07-17-PLAN.md — Gap closure R2: DE student voting + real-time subscription
- [x] 07-18-PLAN.md — Gap closure R2: RR voting lifecycle + student vote UI + round controls
- [x] 07-19-PLAN.md — Gap closure R2: Predictive bracket prediction cascade engine
- [x] 07-20-PLAN.md — Gap closure R2: Zoom pointer capture fix for buttons and entrant clicks
- [x] 07-21-PLAN.md — Gap closure R3: DE live dashboard region-based navigation
- [x] 07-22-PLAN.md — Gap closure R3: RR vote counts + round advancement
- [x] 07-23-PLAN.md — Gap closure R3: Predictive bracket visibility to students
- [x] 07-24-PLAN.md — Gap closure R3: ESPN-style section navigation for large brackets
- [x] 07-25-PLAN.md — Gap closure R4: DE teacher UX (partial advance tiebreak, GF tab persistence, winner animation timing)
- [x] 07-26-PLAN.md — Gap closure R4: RR student experience (celebration, standings, tabs, votingStyle, round visibility)
- [x] 07-27-PLAN.md — Gap closure R4: Zoom pinch scoping, section navigation for 32+, SE simple/advanced creation
- [x] 07-28-PLAN.md — Gap closure R5: DE duplicate celebration fix, RR nested button fix, batch decide loading
- [x] 07-29-PLAN.md — Gap closure R5: RR completion detection + celebration broadcast
- [x] 07-30-PLAN.md — Gap closure R5: RR simple/advanced matchup layout behavior
- [x] 07-31-PLAN.md — Gap closure R5: 64-entrant quadrant bracket layout (component + mirrorX)
- [x] 07-32-PLAN.md — Gap closure R5: 64-entrant quadrant layout view integration
- [x] 07-33-PLAN.md — Gap closure R6: DE duplicate celebration fix
- [x] 07-34-PLAN.md — Gap closure R6: 64-entrant teacher quadrant layout fallback fix

### Phase 7.1: Predictive Auto-Resolution Mode (INSERTED)
**Goal**: Add a third predictive bracket resolution mode where student predictions automatically count as votes, resolving the entire bracket without voting rounds — teacher simply releases results on Go Live
**Depends on**: Phase 7
**Requirements**: Extension of BRKT-05 (Predictive brackets)
**Success Criteria** (what must be TRUE):
  1. Teacher can select "Predictive" as the resolution mode when creating a predictive bracket (alongside existing Manual and Vote-based options)
  2. When predictions close, the system automatically tabulates predictions as votes and determines winners for all rounds without opening any voting
  3. Teacher clicks "Release Results" and students see the bracket progressively fill in with winners derived from their collective predictions
  4. Prediction leaderboard correctly scores student accuracy against the prediction-derived outcomes
  5. Students see a reveal experience showing how predictions translated to bracket results
**Plans**: 10 plans

Plans:
- [x] 07.1-01-PLAN.md — Tabulation engine TDD (pure function, types, schemas, DB column)
- [x] 07.1-02-PLAN.md — DAL + server actions for auto-resolution lifecycle (prepare, override, release, reveal, complete)
- [x] 07.1-03-PLAN.md — Teacher UI (preview with overrides, reveal controls, presentation mode, form update)
- [x] 07.1-04-PLAN.md — Student reveal experience (progressive bracket, accuracy overlay, animated leaderboard, podium celebration)
- [x] 07.1-05-PLAN.md — Gap closure: override stale entrants fix + release auto-reveal round 1
- [x] 07.1-06-PLAN.md — Gap closure: duplicate leaderboard guard + completed state presentation mode
- [x] 07.1-07-PLAN.md — Gap closure: accuracy badge unicode + podium cold-start + closed prediction enforcement
- [x] 07.1-08-PLAN.md — Gap closure R2: completed bracket podium routing + auto-mode button consolidation
- [x] 07.1-09-PLAN.md — Gap closure R3: real-time reveal event handling for student progressive updates
- [x] 07.1-10-PLAN.md — Gap closure R3: 32+ entrant predictive bracket regional layout + accuracy badge alignment

### Phase 8: Sports Integration
**Goal**: Teachers can browse real sports tournaments, import them as classroom prediction brackets, and results update automatically from live game data
**Depends on**: Phase 7
**Requirements**: SPRT-01, SPRT-02, SPRT-03, SPRT-04
**Success Criteria** (what must be TRUE):
  1. Teacher can browse available NCAA March Madness tournaments (men's and women's) during active tournament season
  2. Teacher can import a sports tournament as a predictive bracket for their class with one click
  3. Sports bracket results auto-update as real games are played (within the API refresh interval)
  4. Teacher can manually override any sports bracket result if the API data is delayed or incorrect
**Plans**: 4 plans

Plans:
- [x] 08-01-PLAN.md — Sports provider abstraction, SportsDataIO client, schema extensions, type updates
- [x] 08-02-PLAN.md — Sports bracket creation DAL, sync engine, server actions, logo resolver
- [ ] 08-03-PLAN.md — Tournament browser UI, import page, sports matchup box, bracket diagram integration
- [ ] 08-04-PLAN.md — Cron-based score sync endpoint, live dashboard sports mode, manual override

### Phase 9: Analytics
**Goal**: Teachers can view participation and voting data for their brackets and polls, export data as CSV, and see predictive bracket scoring details
**Depends on**: Phase 5, Phase 7
**Requirements**: ANLYT-01, ANLYT-02, ANLYT-03, ANLYT-04
**Success Criteria** (what must be TRUE):
  1. Teacher can view how many students participated in any bracket or poll
  2. Teacher can view vote distribution for each matchup or poll option
  3. Teacher on Pro or above can export bracket/poll data as a CSV file
  4. Teacher on Pro Plus can see a detailed scoring breakdown for each student on predictive bracket leaderboards
**Plans**: TBD

Plans:
- [ ] 09-01: Participation and vote distribution views
- [ ] 09-02: Analytics dashboard UI
- [ ] 09-03: CSV export (Pro and above)
- [ ] 09-04: Predictive leaderboard scoring detail (Pro Plus)

### Phase 10: Landing Page & Polish
**Goal**: The public-facing site has a polished landing page with branding and pricing, and the entire application delivers a sleek, responsive experience on all devices
**Depends on**: Phase 6 (pricing data), Phase 9 (feature completeness for screenshots)
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):
  1. Visitor lands on sparkvotedu.com and sees a branded landing page with the logo, "Ignite student voice through voting" motto, feature pitch, and pricing comparison
  2. Teacher interface (dashboard, bracket creator, analytics) feels sleek and intuitive with consistent design language
  3. Student interface (join flow, voting, bracket view) is simple and requires zero instruction to use
  4. Application works well on desktop, tablet, and mobile with no broken layouts or unusable interactions
**Plans**: TBD

Plans:
- [ ] 10-01: Landing page with branding, pitch, and pricing
- [ ] 10-02: Teacher interface design audit and refinement
- [ ] 10-03: Student interface design audit and refinement
- [ ] 10-04: Responsive design audit (desktop, tablet, mobile)
- [ ] 10-05: Final polish and deployment preparation

### Phase 11: Visual Bracket Placement
**Goal**: Teachers can drag entrants from a pool into bracket diagram positions, swap entrants within the bracket, and toggle between list reorder and visual placement modes
**Depends on**: Phase 7
**Success Criteria** (what must be TRUE):
  1. Teacher can see the bracket diagram with empty slots during bracket creation and drag entrants from a pool into specific positions
  2. Teacher can swap entrants between positions by dragging within the bracket
  3. Matchup pairings update in real-time as teachers place entrants
  4. Teacher can toggle between linear list reorder (current) and visual bracket placement modes
  5. Bye slots are handled correctly for non-power-of-2 brackets in visual placement mode
**Plans**: TBD

Plans:
- [ ] TBD (run /gsd:plan-phase 11 to break down)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 7.1 -> 8 -> 9 -> 10 -> 11

Note: Phase 3 depends only on Phase 1 (not Phase 2), so Phases 2 and 3 could theoretically run in parallel. Phase 6 depends only on Phase 1, so it could be pulled earlier if billing urgency requires it. However, the recommended linear order above maximizes coherence: build the user flows (auth, student, brackets, voting, polls) before layering on billing, advanced features, and polish.

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Foundation & Auth | 5/5 | Complete | 2026-01-29 |
| 2. Student Join Flow | 6/6 | Complete | 2026-01-29 |
| 3. Bracket Creation & Management | 7/7 | Complete | 2026-01-30 |
| 4. Voting & Real-Time | 6/6 | Complete | 2026-01-31 |
| 5. Polls | 10/10 | Complete | 2026-01-31 |
| 6. Billing & Subscriptions | 5/5 | Complete | 2026-02-01 |
| 7. Advanced Brackets | 34/34 | Complete | 2026-02-08 |
| 7.1 Predictive Auto-Resolution | 10/10 | Complete | 2026-02-15 |
| 8. Sports Integration | 0/4 | Not started | - |
| 9. Analytics | 0/4 | Not started | - |
| 10. Landing Page & Polish | 0/5 | Not started | - |
| 11. Visual Bracket Placement | 0/0 | Not started | - |
