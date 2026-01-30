# Requirements: SparkVotEDU

**Defined:** 2026-01-28
**Core Value:** Teachers can instantly engage any classroom through voting -- on any topic, in any format -- and see participation happen in real time.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: Teacher can create account with email and password
- [x] **AUTH-02**: Teacher can sign in with Google OAuth
- [x] **AUTH-03**: Teacher can sign in with Microsoft OAuth
- [x] **AUTH-04**: Teacher can sign in with Apple OAuth
- [x] **AUTH-05**: Teacher session persists across browser refresh
- [x] **AUTH-06**: Teacher can reset password via email link
- [x] **AUTH-07**: Teacher can log out from any page

### Student Participation

- [x] **STUD-01**: Student can join a class session by entering a class code
- [x] **STUD-02**: Student is identified by device fingerprint (composite signals for identical school hardware)
- [x] **STUD-03**: Student receives a random fun name upon joining (Kahoot-style)
- [x] **STUD-04**: Student session persists across page refresh and reconnection
- [x] **STUD-05**: Student can see and choose from active brackets or polls in their session
- [x] **STUD-06**: Returning student is recognized and assigned their previous fun name

### Brackets

- [x] **BRKT-01**: Teacher can create single-elimination brackets (4, 8, 16 teams)
- [ ] **BRKT-02**: Teacher can create double-elimination brackets (Pro Plus)
- [ ] **BRKT-03**: Teacher can create round-robin brackets (Pro Plus)
- [ ] **BRKT-04**: Teacher can create predictive brackets where students predict outcomes (Pro Plus)
- [ ] **BRKT-05**: Predictive brackets display a scored leaderboard ranking student accuracy (Pro Plus)
- [ ] **BRKT-06**: Teacher can create non-power-of-two brackets with auto-byes (Pro Plus)
- [x] **BRKT-07**: Bracket displays as a visual tournament diagram (not just text lists)
- [ ] **BRKT-08**: Bracket updates in real-time as votes come in and winners advance
- [x] **BRKT-09**: Teacher can set bracket as draft, active, or completed
- [x] **BRKT-10**: Teacher can edit bracket before activation (add/remove/reorder entrants)
- [x] **BRKT-11**: Teacher can delete a bracket

### Polls

- [ ] **POLL-01**: Teacher can create simple polls (multiple choice, pick one)
- [ ] **POLL-02**: Teacher can create ranked polls (students rank options in preference order)
- [ ] **POLL-03**: Poll results display vote distribution in real-time
- [ ] **POLL-04**: Ranked poll results show aggregated rankings (Borda count or instant-runoff)
- [ ] **POLL-05**: Teacher can set poll as draft, active, or closed
- [ ] **POLL-06**: Teacher can delete a poll

### Bracket & Poll Management

- [ ] **MGMT-01**: Students vote on matchups to determine the winner
- [ ] **MGMT-02**: Teacher can manually choose a winner (override votes)
- [ ] **MGMT-03**: Teacher can advance bracket to next round after matchups are decided
- [x] **MGMT-04**: Teacher can auto-generate entrants from curated topic lists
- [x] **MGMT-05**: Teacher can upload entrants via CSV file
- [x] **MGMT-06**: Teacher can manually add multiple entrants at once
- [ ] **MGMT-07**: Each student can only vote once per matchup (enforced server-side)
- [x] **MGMT-08**: Teacher dashboard shows all brackets and polls with status

### Real-Time Features

- [ ] **RT-01**: Teacher sees a live dashboard with vote counts updating as students submit
- [ ] **RT-02**: Students see bracket/poll state update without manual refresh
- [ ] **RT-03**: Dashboard shows number of connected/participating students
- [ ] **RT-04**: Real-time updates work on school networks (fallback transport if WebSocket blocked)

### Sports Integration

- [ ] **SPRT-01**: Teacher can browse available real sports tournament brackets (NCAA March Madness, NCAA FBS 12-team, NBA, NHL, MLB playoffs)
- [ ] **SPRT-02**: Teacher can import a sports tournament as a predictive bracket for their class
- [ ] **SPRT-03**: Sports brackets auto-update with real game results when available
- [ ] **SPRT-04**: Teacher can manually override sports bracket results if API data is delayed or incorrect

### Analytics

- [ ] **ANLYT-01**: Teacher can view participation count per bracket/poll
- [ ] **ANLYT-02**: Teacher can view vote distribution per matchup/poll option
- [ ] **ANLYT-03**: Teacher can export bracket/poll data as CSV (Pro and above)
- [ ] **ANLYT-04**: Predictive bracket leaderboard shows scoring breakdown per student (Pro Plus)

### Billing & Subscriptions

- [ ] **BILL-01**: Free tier allows single-elimination brackets (4/8/16), up to 2 live and 2 drafts, basic analytics
- [ ] **BILL-02**: Pro tier ($12/mo) adds unlimited brackets, full analytics + CSV export, simple and ranked polls (up to 32 entrants)
- [ ] **BILL-03**: Pro Plus tier ($20/mo) adds predictive brackets, double-elimination, round-robin, non-power-of-two, polls up to 64 entrants
- [ ] **BILL-04**: Teacher can subscribe via Stripe Checkout
- [ ] **BILL-05**: Teacher can manage subscription via Stripe Customer Portal (upgrade, downgrade, cancel)
- [ ] **BILL-06**: Feature gating enforced server-side based on subscription tier
- [ ] **BILL-07**: Locked features show upgrade prompt (visible but gated, not hidden)

### Interface & Landing

- [ ] **UI-01**: Sleek, intuitive interface for teachers (dashboard, bracket creator, analytics)
- [ ] **UI-02**: Sleek, intuitive interface for students (join flow, voting, bracket view)
- [ ] **UI-03**: Responsive design works on desktop, tablet, and mobile
- [ ] **UI-04**: Landing page with branding, pitch, and pricing comparison
- [ ] **UI-05**: Existing logo and "Ignite student voice through voting" motto featured prominently

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Live Events

- **LIVE-01**: Teacher can enable timed rounds with countdown timer per matchup
- **LIVE-02**: Synchronized class experience where teacher controls pace
- **LIVE-03**: Projector-optimized full-screen display mode for classroom projector

### Engagement

- **ENGAGE-01**: Curated topic library browsable by subject and grade level
- **ENGAGE-02**: Advanced analytics showing engagement trends over time
- **ENGAGE-03**: PWA support for install-to-home-screen on mobile

### Integration

- **INTEG-01**: LMS integration with Canvas
- **INTEG-02**: LMS integration with Google Classroom

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Native mobile apps | Web-first with responsive design; adding app stores doubles maintenance |
| Real-time chat between students | Moderation nightmare in K-12; bullying vector; liability risk |
| Student accounts with passwords | Anonymous-by-design is a feature; avoids COPPA/FERPA burden of student PII |
| Content moderation AI | Unpredictable outputs in K-12; teacher controls all content manually |
| Multi-language / i18n | English only for v1; significant engineering effort with quality translation |
| AI-generated bracket content | Unpredictable outputs in K-12; parents/admins skeptical of AI in classrooms |
| Public/shareable brackets (social) | Privacy concern; COPPA implications for under-13 students |
| Gamification with persistent points | Conflicts with anonymous design; research shows extrinsic gamification can reduce intrinsic motivation |
| Collaborative bracket editing | Massive complexity (CRDT/OT); not a real use case (one teacher per bracket) |
| Offline mode | Brackets require real-time vote aggregation; offline creates sync conflicts |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1: Foundation & Auth | Complete |
| AUTH-02 | Phase 1: Foundation & Auth | Complete |
| AUTH-03 | Phase 1: Foundation & Auth | Complete |
| AUTH-04 | Phase 1: Foundation & Auth | Complete |
| AUTH-05 | Phase 1: Foundation & Auth | Complete |
| AUTH-06 | Phase 1: Foundation & Auth | Complete |
| AUTH-07 | Phase 1: Foundation & Auth | Complete |
| STUD-01 | Phase 2: Student Join Flow | Complete |
| STUD-02 | Phase 2: Student Join Flow | Complete |
| STUD-03 | Phase 2: Student Join Flow | Complete |
| STUD-04 | Phase 2: Student Join Flow | Complete |
| STUD-05 | Phase 2: Student Join Flow | Complete |
| STUD-06 | Phase 2: Student Join Flow | Complete |
| BRKT-01 | Phase 3: Bracket Creation & Management | Complete |
| BRKT-02 | Phase 7: Advanced Brackets | Pending |
| BRKT-03 | Phase 7: Advanced Brackets | Pending |
| BRKT-04 | Phase 7: Advanced Brackets | Pending |
| BRKT-05 | Phase 7: Advanced Brackets | Pending |
| BRKT-06 | Phase 7: Advanced Brackets | Pending |
| BRKT-07 | Phase 3: Bracket Creation & Management | Complete |
| BRKT-08 | Phase 4: Voting & Real-Time | Pending |
| BRKT-09 | Phase 3: Bracket Creation & Management | Complete |
| BRKT-10 | Phase 3: Bracket Creation & Management | Complete |
| BRKT-11 | Phase 3: Bracket Creation & Management | Complete |
| POLL-01 | Phase 5: Polls | Pending |
| POLL-02 | Phase 5: Polls | Pending |
| POLL-03 | Phase 5: Polls | Pending |
| POLL-04 | Phase 5: Polls | Pending |
| POLL-05 | Phase 5: Polls | Pending |
| POLL-06 | Phase 5: Polls | Pending |
| MGMT-01 | Phase 4: Voting & Real-Time | Pending |
| MGMT-02 | Phase 4: Voting & Real-Time | Pending |
| MGMT-03 | Phase 4: Voting & Real-Time | Pending |
| MGMT-04 | Phase 3: Bracket Creation & Management | Complete |
| MGMT-05 | Phase 3: Bracket Creation & Management | Complete |
| MGMT-06 | Phase 3: Bracket Creation & Management | Complete |
| MGMT-07 | Phase 4: Voting & Real-Time | Pending |
| MGMT-08 | Phase 3: Bracket Creation & Management | Complete |
| RT-01 | Phase 4: Voting & Real-Time | Pending |
| RT-02 | Phase 4: Voting & Real-Time | Pending |
| RT-03 | Phase 4: Voting & Real-Time | Pending |
| RT-04 | Phase 4: Voting & Real-Time | Pending |
| SPRT-01 | Phase 8: Sports Integration | Pending |
| SPRT-02 | Phase 8: Sports Integration | Pending |
| SPRT-03 | Phase 8: Sports Integration | Pending |
| SPRT-04 | Phase 8: Sports Integration | Pending |
| ANLYT-01 | Phase 9: Analytics | Pending |
| ANLYT-02 | Phase 9: Analytics | Pending |
| ANLYT-03 | Phase 9: Analytics | Pending |
| ANLYT-04 | Phase 9: Analytics | Pending |
| BILL-01 | Phase 6: Billing & Subscriptions | Pending |
| BILL-02 | Phase 6: Billing & Subscriptions | Pending |
| BILL-03 | Phase 6: Billing & Subscriptions | Pending |
| BILL-04 | Phase 6: Billing & Subscriptions | Pending |
| BILL-05 | Phase 6: Billing & Subscriptions | Pending |
| BILL-06 | Phase 6: Billing & Subscriptions | Pending |
| BILL-07 | Phase 6: Billing & Subscriptions | Pending |
| UI-01 | Phase 10: Landing Page & Polish | Pending |
| UI-02 | Phase 10: Landing Page & Polish | Pending |
| UI-03 | Phase 10: Landing Page & Polish | Pending |
| UI-04 | Phase 10: Landing Page & Polish | Pending |
| UI-05 | Phase 10: Landing Page & Polish | Pending |

**Coverage:**
- v1 requirements: 62 total
- Mapped to phases: 62
- Unmapped: 0

---
*Requirements defined: 2026-01-28*
*Last updated: 2026-01-28 after roadmap creation*
