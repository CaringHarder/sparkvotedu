# Roadmap: SparkVotEDU

## Overview

SparkVotEDU is rebuilt from the ground up across 10 phases, progressing from authentication and student identity through core bracket creation, real-time voting, polls, billing, advanced bracket types, sports integration, analytics, and finally landing page polish. The build order prioritizes foundational dependencies first (auth before ownership, identity before voting, single-elimination before advanced brackets) and defers the highest external risk (sports API) and enhancement work (analytics, landing) until the core classroom experience is proven. Every phase delivers a coherent, verifiable capability that builds on the previous phases.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Auth** - Project scaffolding, database schema, teacher accounts, and session management
- [ ] **Phase 2: Student Join Flow** - Anonymous student participation via class codes with device fingerprinting and fun names
- [ ] **Phase 3: Bracket Creation & Management** - Teachers create, edit, and manage single-elimination brackets with entrant tools
- [ ] **Phase 4: Voting & Real-Time** - Students vote on matchups with live updating dashboard and real-time bracket state
- [ ] **Phase 5: Polls** - Simple and ranked polls with real-time results display
- [ ] **Phase 6: Billing & Subscriptions** - Stripe integration, tier enforcement, and upgrade prompts
- [ ] **Phase 7: Advanced Brackets** - Double-elimination, round-robin, predictive brackets, and non-power-of-two support
- [ ] **Phase 8: Sports Integration** - Real sports tournament brackets from external APIs for classroom prediction competitions
- [ ] **Phase 9: Analytics** - Participation metrics, vote distribution views, CSV export, and predictive leaderboard scoring
- [ ] **Phase 10: Landing Page & Polish** - Public landing page, responsive design audit, and interface refinement

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
**Plans**: 5 plans

Plans:
- [x] 02-01-PLAN.md — Database schema (ClassSession, StudentParticipant), class code generator, fun name generator, student types
- [x] 02-02-PLAN.md — Device fingerprinting system (FingerprintJS, localStorage UUID, useDeviceIdentity hook)
- [ ] 02-03-PLAN.md — Join flow backend (DAL, server actions, proxy update for student routes)
- [ ] 02-04-PLAN.md — Join page UI, welcome screen, session layout, reroll and recovery code components
- [ ] 02-05-PLAN.md — Teacher session management, student activity grid, Supabase Realtime hooks

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
**Plans**: TBD

Plans:
- [ ] 03-01: Bracket engine (single-elimination state machine)
- [ ] 03-02: Bracket creation wizard UI
- [ ] 03-03: Entrant management (manual, CSV upload, curated topics)
- [ ] 03-04: Visual bracket rendering (SVG tournament diagram)
- [ ] 03-05: Bracket lifecycle management (draft/active/completed, edit, delete)
- [ ] 03-06: Teacher dashboard with bracket/poll overview

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
**Plans**: TBD

Plans:
- [ ] 04-01: Vote submission engine with server-side deduplication
- [ ] 04-02: Student voting interface with optimistic updates
- [ ] 04-03: Real-time infrastructure (WebSocket with SSE/long-polling fallback)
- [ ] 04-04: Live teacher dashboard (vote counts, connected students)
- [ ] 04-05: Round advancement (vote-based and teacher override)
- [ ] 04-06: School network transport resilience testing

### Phase 5: Polls
**Goal**: Teachers can create simple and ranked polls that students vote on with results displayed in real time
**Depends on**: Phase 4
**Requirements**: POLL-01, POLL-02, POLL-03, POLL-04, POLL-05, POLL-06
**Success Criteria** (what must be TRUE):
  1. Teacher can create a simple poll (pick one from multiple choices) and see students vote with live-updating result bars
  2. Teacher can create a ranked poll where students order options by preference, with aggregated rankings displayed (Borda count or instant-runoff)
  3. Teacher can set a poll to draft, active, or closed and delete polls they no longer need
  4. Poll results update in real time as students submit their votes (no page refresh needed)
**Plans**: TBD

Plans:
- [ ] 05-01: Simple poll creation and voting
- [ ] 05-02: Ranked poll creation and tabulation (Borda/IRV)
- [ ] 05-03: Real-time poll results display
- [ ] 05-04: Poll lifecycle management (draft/active/closed, delete)

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
**Plans**: TBD

Plans:
- [ ] 06-01: Stripe integration (Checkout Sessions, webhooks, Customer Portal)
- [ ] 06-02: Subscription tier sync and database state management
- [ ] 06-03: Server-side feature gating enforcement (middleware + DAL)
- [ ] 06-04: UI tier gates and upgrade prompts
- [ ] 06-05: Tier limit enforcement (bracket count, entrant count, feature access)

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
**Plans**: TBD

Plans:
- [ ] 07-01: Double-elimination bracket engine and visualization
- [ ] 07-02: Round-robin bracket engine and standings display
- [ ] 07-03: Predictive bracket engine (prediction phase, resolution, scoring)
- [ ] 07-04: Predictive bracket leaderboard with scoring breakdown
- [ ] 07-05: Non-power-of-two bracket support with automatic bye placement
- [ ] 07-06: Advanced bracket integration testing (all types, all sizes)

### Phase 8: Sports Integration
**Goal**: Teachers can browse real sports tournaments, import them as classroom prediction brackets, and results update automatically from live game data
**Depends on**: Phase 7
**Requirements**: SPRT-01, SPRT-02, SPRT-03, SPRT-04
**Success Criteria** (what must be TRUE):
  1. Teacher can browse a catalog of available sports tournaments (NCAA March Madness, NCAA FBS, NBA, NHL, MLB playoffs)
  2. Teacher can import a sports tournament as a predictive bracket for their class with one click
  3. Sports bracket results auto-update as real games are played (within the API refresh interval)
  4. Teacher can manually override any sports bracket result if the API data is delayed or incorrect
**Plans**: TBD

Plans:
- [ ] 08-01: Sports API provider integration and data normalization
- [ ] 08-02: Server-side cache and scheduled fetch (cron)
- [ ] 08-03: Teacher UI for browsing and importing sports tournaments
- [ ] 08-04: Auto-resolution engine (real results advance brackets)
- [ ] 08-05: Manual override for sports bracket results

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

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10

Note: Phase 3 depends only on Phase 1 (not Phase 2), so Phases 2 and 3 could theoretically run in parallel. Phase 6 depends only on Phase 1, so it could be pulled earlier if billing urgency requires it. However, the recommended linear order above maximizes coherence: build the user flows (auth, student, brackets, voting, polls) before layering on billing, advanced features, and polish.

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Foundation & Auth | 5/5 | ✓ Complete | 2026-01-29 |
| 2. Student Join Flow | 2/5 | In Progress | - |
| 3. Bracket Creation & Management | 0/6 | Not started | - |
| 4. Voting & Real-Time | 0/6 | Not started | - |
| 5. Polls | 0/4 | Not started | - |
| 6. Billing & Subscriptions | 0/5 | Not started | - |
| 7. Advanced Brackets | 0/6 | Not started | - |
| 8. Sports Integration | 0/5 | Not started | - |
| 9. Analytics | 0/4 | Not started | - |
| 10. Landing Page & Polish | 0/5 | Not started | - |
