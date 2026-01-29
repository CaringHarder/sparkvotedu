# Feature Research

**Domain:** EdTech classroom engagement (polling, voting, tournament brackets)
**Researched:** 2026-01-28
**Confidence:** MEDIUM (WebSearch/WebFetch unavailable; based on training knowledge of Kahoot, Mentimeter, Poll Everywhere, BracketFights, Challonge, and the existing SparkVotEDU product context. Competitor feature sets may have evolved since training cutoff.)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or unprofessional.

#### 1. Participation & Access

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Join via short code (no account) | Kahoot, Mentimeter, and Poll Everywhere all offer code-based join. Students expect zero-friction entry. | LOW | 6-8 character alphanumeric codes. Must be unique per active session. |
| Mobile-responsive student view | Students use phones, tablets, Chromebooks. Kahoot popularized phone-as-controller. | MEDIUM | Student view must be touch-first, large tap targets, minimal scrolling. |
| Real-time participation feedback | Students expect instant confirmation their vote registered. Kahoot shows "answer locked in" immediately. | MEDIUM | WebSocket or SSE required. Optimistic UI updates. |
| Fun/anonymous display names | Kahoot's random name generator (e.g., "FunkyPanda42") is iconic. Students expect playful anonymity. | LOW | Pre-built word lists (adjective + noun + number). Must filter for inappropriate combinations. |
| Works on school networks | School Wi-Fi often blocks WebSocket ports, restricts domains. Product must work behind restrictive firewalls. | MEDIUM | Fallback from WebSocket to SSE to long-polling. No exotic ports. HTTPS only. |

#### 2. Teacher Experience

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Teacher authentication (email/pass + OAuth) | Every SaaS education product requires teacher accounts. Google and Microsoft are critical (school ecosystems). Apple is nice-to-have. | MEDIUM | Google + Microsoft are P1 (school districts use these). Apple is P2. |
| Dashboard to manage all brackets/polls | Teachers expect a central hub. Kahoot has "My Kahoots," Mentimeter has "My presentations." | MEDIUM | CRUD for brackets and polls. Search, filter, sort by date/status. |
| Live results display (projector-friendly) | Teachers project results on classroom screen. Kahoot's live leaderboard is the gold standard. | HIGH | Must look good at 1024x768 (projectors). Large fonts, high contrast, animated transitions. Real-time data binding. |
| Duplicate/reuse content | Teachers reuse activities across periods/years. Every competitor allows this. | LOW | Deep clone of bracket/poll with new code generation. |
| Simple poll creation (multiple choice) | The most basic engagement unit. Mentimeter and Poll Everywhere both lead with this. | LOW | Title + 2-6 options. Optional image per option. |

#### 3. Core Bracket Functionality

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Single-elimination bracket | The fundamental bracket type. BracketFights, Challonge, and every bracket tool offers this. | MEDIUM | Binary tree structure. Power-of-two is simplest. Visual bracket rendering is the hard part. |
| Visual bracket display | Users expect the classic bracket diagram (lines connecting matchups). Text-only lists feel broken. | HIGH | SVG or Canvas rendering. Must handle 4 to 64+ entrants. Responsive across screen sizes. This is one of the hardest UI components in the app. |
| Vote to advance winner | Core mechanic for SparkVotEDU. Students vote on matchups; majority wins. Standard in BracketFights. | MEDIUM | Real-time vote tallying. Tie-breaking rules needed. |
| Teacher-chosen advancement | Teachers override votes for educational contexts (e.g., "the correct answer advances"). Standard in educational bracket tools. | LOW | Teacher dashboard toggle: vote-based vs. teacher-pick per round or per matchup. |
| Bracket results/history | After completion, users expect to see the full bracket with results. Archive view. | LOW | Read-only bracket view with winner highlighted. |

#### 4. Freemium & Pricing

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Free tier that is genuinely usable | EdTech products must have a functional free tier. Teachers will not pay before trying. Kahoot, Mentimeter, Poll Everywhere all have free tiers. | MEDIUM | Must be enough to validate: e.g., single-elim brackets up to 8, basic polls, limited active sessions. |
| Clear pricing page | Users expect transparent pricing. Kahoot, Mentimeter all have /pricing pages with comparison tables. | LOW | Feature comparison matrix across tiers. Monthly/annual toggle. |
| Stripe-based subscription | Standard payment infrastructure for SaaS. | MEDIUM | Stripe Checkout or embedded billing. Webhook handling for subscription lifecycle. |
| Feature gating (soft walls) | Locked features should be visible but gated with upgrade prompts, not hidden entirely. Mentimeter does this well. | MEDIUM | UI patterns: grayed-out options with "Pro" badge, upgrade modal on click. Server-side enforcement. |

#### 5. Basic Analytics

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Participation count per activity | Teachers need to know how many students engaged. Basic metric. | LOW | Count of unique participants per bracket/poll. |
| Vote distribution per matchup/question | Teachers want to see how votes split. Standard in all polling tools. | LOW | Bar chart or percentage breakdown. |
| Activity completion status | Which brackets/polls are active, in progress, or completed. | LOW | Status badges on dashboard. |

---

### Differentiators (Competitive Advantage)

Features that set SparkVotEDU apart. Not expected in every tool, but create clear value.

#### 1. Bracket Variety (Primary Differentiator)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Double-elimination brackets | No mainstream EdTech tool offers this. Challonge does for esports, but not in classroom context. Gives eliminated entrants a second chance -- great for educational debates. | HIGH | Requires winners bracket + losers bracket + grand final. Complex state machine. Visual layout is significantly harder than single-elim. |
| Round-robin brackets | Every entrant faces every other. Great for small groups (4-8 entrants). Challonge offers this but not in EdTech context. | MEDIUM | N*(N-1)/2 matchups. Standings table with W-L-T records. Tiebreaker logic. |
| Predictive brackets with leaderboard | Students predict outcomes before the bracket plays out, earn points for correct picks. March Madness bracket pool concept applied to any topic. This is SparkVotEDU's killer feature -- no EdTech competitor offers this. | HIGH | Two-phase: prediction submission phase, then resolution phase. Scoring system (correct pick = points, weighted by round). Leaderboard with real-time updates. |
| Non-power-of-two brackets with auto-byes | Most bracket tools force 4/8/16/32. Supporting 5, 6, 7, 9-15, etc. with automatic byes is a usability win. Challonge does this; most EdTech tools do not. | MEDIUM | Algorithm to place byes optimally (top seeds get byes). Bracket rendering must handle asymmetric trees. |

#### 2. Sports API Integration (Unique Differentiator)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| NCAA March Madness auto-brackets | Teachers create classroom prediction pools tied to the real tournament. Students engage with real-world events. No EdTech competitor does this. | HIGH | Requires sports data API (ESPN, SportsDataIO, or similar). Real-time score updates during tournament. Mapping API data to bracket structure. Seasonal -- only relevant Feb-Apr. |
| NCAA FBS 12-team playoff brackets | College football playoff prediction. Timely and engaging. | HIGH | Same API infrastructure as March Madness. Different bracket format (12-team with byes for top 4 seeds). |
| NBA/NHL/MLB playoff brackets | Extends sports integration beyond college. Broader appeal. | HIGH | Each league has different playoff format. NBA/NHL: 16-team, best-of-7 series. MLB: different structure. Need format adapters per league. |
| Auto-resolution of sports brackets | When real games end, brackets auto-update. Students see their predictions scored in real time. | HIGH | Webhook or polling for game results. Auto-advance winners. Recalculate prediction scores. |

#### 3. Live Event Mode

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Timed voting rounds | Teacher sets a countdown timer per round. Creates urgency and excitement. Kahoot's timer is its most engaging mechanic. Applied to brackets, this is novel. | MEDIUM | Configurable timer (30s, 1m, 2m, 5m, custom). Visual countdown on student and projector views. Auto-close voting when timer expires. |
| Synchronized class experience | All students see the same matchup at the same time. Teacher controls pace. Like Kahoot's teacher-paced mode but for brackets. | HIGH | Teacher "advance to next matchup" control. WebSocket broadcast to sync all clients. Late-joiner handling. |
| Projector-optimized live view | Full-screen display mode for classroom projector showing current matchup, live vote tally, bracket progress. | MEDIUM | Dedicated /live route. Dark theme option. Auto-scaling layout. Animated vote counter. |

#### 4. Content Generation & Import

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Curated topic libraries | Pre-built entrant lists by subject (e.g., "US Presidents," "Elements," "World Capitals," "Literary Characters"). Reduces teacher setup time massively. | MEDIUM | Seed database with curated lists. Categorized by subject/grade level. Teachers can customize after selection. |
| CSV upload for entrants | Power users want bulk import. Standard in enterprise polling tools but rare in consumer EdTech. | LOW | Parse CSV, validate entries, preview before import. Handle common encoding issues (UTF-8 BOM). |
| Manual multi-add | Quick entry of multiple entrants without CSV overhead. | LOW | Textarea with one-entry-per-line parsing, or repeated add-field UI. |

#### 5. Ranked Polls (Standalone)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Ranked-choice polls | Students rank options in preference order. Richer data than simple polls. Mentimeter offers this but competitors often do not. | MEDIUM | Drag-to-rank UI (mobile-friendly). Borda count or instant-runoff tallying. Results visualization showing rank distribution. |

#### 6. Advanced Analytics

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| CSV export of all data | Teachers want to take data into gradebooks or spreadsheets. Pro feature in most competitors. | LOW | Export participation, votes, timestamps, results per bracket/poll. |
| Engagement trends over time | Show participation rates across multiple activities. Helps teachers identify engagement patterns. | MEDIUM | Line charts over time. Requires tracking participation across sessions. Pro/Pro Plus feature. |
| Predictive bracket leaderboard with scoring breakdown | For sports/predictive brackets: detailed scoring showing which picks were correct, round-by-round breakdown. | MEDIUM | Table view with pick-by-pick accuracy. Exportable. |

---

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this specific product.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Student accounts with passwords | "We want persistent identity" | Adds massive COPPA/FERPA compliance burden. Students forget passwords. IT departments resist another login. SparkVotEDU's anonymous-by-design is a feature, not a limitation. | Device fingerprinting for session continuity. Fun names provide identity without accounts. |
| Real-time chat between students | "Students could discuss matchups" | Moderation nightmare in K-12. Bullying vector. Liability for school. Every chat feature in EdTech requires content moderation. | No chat. Teacher controls narrative. Students discuss in person (the point is classroom engagement). |
| LMS integration (Canvas, Google Classroom, Schoology) | "Teachers want it in their workflow" | Each LMS has different API, approval process takes months, maintenance burden is ongoing. For v1, the friction of a separate URL is acceptable. | Defer to v2+. Share via link/code is sufficient. LMS integration is a growth feature after PMF. |
| AI-generated bracket content | "Use AI to suggest topics" | Unpredictable outputs in K-12 context. Age-inappropriate content risk. Added infrastructure cost. Parents and administrators are skeptical of AI in classroom tools. | Curated topic libraries (human-vetted) + manual entry. Teacher controls all content. |
| Public/shareable brackets (social media) | "Students could share brackets on social" | Privacy concern -- even anonymous brackets could expose school activities. COPPA implications for students under 13. Teachers lose control of content. | Keep brackets private to class. Teacher can screenshot/share at their discretion. |
| Gamification with persistent points/badges | "Reward students across sessions" | Requires persistent student identity (conflicts with anonymous design). Creates pressure/anxiety. Research shows extrinsic gamification can reduce intrinsic motivation over time. | Per-session leaderboards (predictive brackets). No cross-session tracking of student performance. |
| Multi-language / i18n | "Our school has Spanish-speaking students" | Significant engineering effort for v1. Translation quality matters in education. Each language multiplies QA effort. | English only for v1. Internationalization architecture can be designed in, but defer implementation. |
| Native mobile apps | "An app would be more accessible" | App store approval process. Two codebases to maintain. Teachers need browser-based projector display regardless. Students already have browser access. | Progressive Web App (PWA) for mobile-like experience. Responsive web design handles all devices. |
| Real-time collaborative bracket editing | "Multiple teachers editing the same bracket" | Massive complexity (CRDT/OT algorithms). Edge cases around simultaneous edits. Not a real use case -- one teacher owns each bracket. | Single-owner editing. Share read-only bracket view with other teachers. |
| Offline mode | "School Wi-Fi is unreliable" | Brackets require real-time vote aggregation by nature. Offline voting creates sync conflicts. | Ensure app works on slow connections. Graceful degradation with retry logic. Server-sent events with reconnection. |

---

## Feature Dependencies

```
[Teacher Auth]
    |
    +--creates--> [Dashboard]
    |                 |
    |                 +--creates--> [Simple Polls]
    |                 |
    |                 +--creates--> [Ranked Polls]
    |                 |
    |                 +--creates--> [Single-Elimination Bracket]
    |                 |                 |
    |                 |                 +--extends--> [Double-Elimination Bracket]
    |                 |                 |
    |                 |                 +--extends--> [Non-Power-of-Two + Auto-Byes]
    |                 |                 |
    |                 |                 +--extends--> [Predictive Bracket Mode]
    |                 |                 |                 |
    |                 |                 |                 +--requires--> [Leaderboard / Scoring]
    |                 |                 |
    |                 |                 +--extends--> [Sports API Brackets]
    |                 |                                     |
    |                 |                                     +--requires--> [Sports Data API Integration]
    |                 |                                     |
    |                 |                                     +--requires--> [Auto-Resolution Engine]
    |                 |
    |                 +--creates--> [Round-Robin Bracket]
    |                 |
    |                 +--enables--> [Analytics]
    |                                   |
    |                                   +--extends--> [CSV Export]
    |
    +--enables--> [Subscription / Billing]
                       |
                       +--gates--> [Feature Gating]

[Student Join via Code]
    |
    +--requires--> [Code Generation System]
    |
    +--requires--> [Device Fingerprinting]
    |
    +--requires--> [Fun Name Generator]
    |
    +--connects--> [Real-Time Voting (WebSocket/SSE)]
                       |
                       +--powers--> [Live Vote Dashboard]
                       |
                       +--powers--> [Timed Rounds / Live Event Mode]
                       |
                       +--powers--> [Projector View]

[Bracket Rendering Engine] (SVG/Canvas)
    |
    +--required-by--> [All Bracket Types]
    |
    +--hardest-dependency--> [Visual bracket display is on critical path]

[Curated Topic Libraries]
    +--enhances--> [All Bracket/Poll Creation]

[CSV Upload]
    +--enhances--> [All Bracket/Poll Creation]

[Landing Page + Pricing]
    +--independent-- (can be built in parallel)
```

### Dependency Notes

- **Bracket Rendering Engine is the critical path:** Every bracket type depends on the visual bracket display component. This SVG/Canvas component is the hardest UI work in the entire application. It must be built first and built well. Single-elim is the base case; double-elim, round-robin, and predictive all extend it.
- **Real-time infrastructure underlies everything interactive:** WebSocket/SSE connection management, room-based broadcasting, and reconnection logic must be solid before Live Event Mode, timed rounds, or live dashboard can work reliably.
- **Single-elimination must come before all other bracket types:** Double-elim extends it (adds losers bracket). Predictive extends it (adds prediction phase). Non-power-of-two extends it (adds bye logic). Build and validate single-elim first.
- **Teacher Auth must come before Dashboard:** Everything teacher-facing requires authentication and session management.
- **Student Join must come before Voting:** The anonymous participation flow (code entry, fingerprinting, name assignment) must work before any voting feature.
- **Sports API is an isolated vertical:** Sports brackets require external API integration, data mapping, and auto-resolution -- all independent of core bracket creation. Can be deferred entirely and added as an enhancement.
- **Subscription/Billing is independent of core features:** Build all features first, then add gating. Never let billing block feature development.
- **Predictive brackets require Leaderboard:** Predictions without scoring/ranking are pointless. These must ship together.

---

## MVP Definition

### Launch With (v1.0)

Minimum viable product -- what is needed to replace the existing sparkvotedu.com and validate the rebuild.

- [ ] **Teacher auth (email/pass + Google + Microsoft)** -- gate to all teacher features
- [ ] **Student join via class code + fun name generation** -- core participation flow
- [ ] **Device fingerprinting for session continuity** -- students reconnect without re-joining
- [ ] **Simple polls (multiple choice)** -- lowest complexity engagement unit
- [ ] **Single-elimination brackets (4, 8, 16)** -- core bracket experience
- [ ] **Vote-based winner advancement** -- core mechanic
- [ ] **Teacher-chosen winner advancement** -- educational override
- [ ] **Visual bracket rendering** -- the bracket display component
- [ ] **Real-time vote dashboard (teacher view)** -- live engagement feedback
- [ ] **Teacher dashboard (CRUD for brackets/polls)** -- content management
- [ ] **Free tier with feature limits** -- usable without paying
- [ ] **Landing page with branding + pricing** -- public face
- [ ] **Basic analytics (participation count, vote distribution)** -- minimal insights

### Add After Validation (v1.x)

Features to add once core is working and initial users are engaged.

- [ ] **Ranked polls** -- richer polling; add when simple polls are validated
- [ ] **Non-power-of-two brackets with auto-byes** -- when teachers request 5, 6, 7 entrants
- [ ] **Double-elimination brackets** -- when bracket engagement is validated
- [ ] **Round-robin brackets** -- when small-group use case emerges
- [ ] **Live Event mode with timed rounds** -- when teachers want more structure
- [ ] **Curated topic libraries** -- when teacher setup time is a friction point
- [ ] **CSV upload for entrants** -- when power users request bulk import
- [ ] **Stripe subscription billing (Pro / Pro Plus)** -- when free tier has active users ready to upgrade
- [ ] **Feature gating by tier** -- gates Pro/Pro Plus features
- [ ] **CSV export of analytics** -- when teachers ask for data portability
- [ ] **Apple OAuth** -- lower priority than Google/Microsoft for schools

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Predictive brackets with leaderboard** -- complex feature; defer until bracket engagement proven
- [ ] **Sports API integration (March Madness, NBA, etc.)** -- seasonal, requires API contracts, high complexity
- [ ] **Auto-resolution of sports brackets** -- depends on Sports API
- [ ] **Advanced analytics (engagement trends over time)** -- needs usage history
- [ ] **Projector-optimized live view (dedicated route)** -- enhancement of existing dashboard
- [ ] **LMS integration (Canvas, Google Classroom)** -- post-PMF growth feature
- [ ] **PWA support (install-to-home-screen)** -- polish feature

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Student join via code + fun names | HIGH | LOW | P1 |
| Teacher auth (email + Google + Microsoft) | HIGH | MEDIUM | P1 |
| Simple polls (multiple choice) | HIGH | LOW | P1 |
| Single-elimination brackets | HIGH | HIGH | P1 |
| Visual bracket rendering (SVG/Canvas) | HIGH | HIGH | P1 |
| Vote-based winner advancement | HIGH | MEDIUM | P1 |
| Teacher-chosen advancement | HIGH | LOW | P1 |
| Real-time vote dashboard | HIGH | HIGH | P1 |
| Teacher dashboard (CRUD) | HIGH | MEDIUM | P1 |
| Landing page + pricing | HIGH | LOW | P1 |
| Device fingerprinting | MEDIUM | MEDIUM | P1 |
| Free tier limits | MEDIUM | LOW | P1 |
| Basic analytics | MEDIUM | LOW | P1 |
| Non-power-of-two + auto-byes | MEDIUM | MEDIUM | P2 |
| Ranked polls | MEDIUM | MEDIUM | P2 |
| Double-elimination brackets | MEDIUM | HIGH | P2 |
| Round-robin brackets | MEDIUM | MEDIUM | P2 |
| Live Event mode (timed rounds) | MEDIUM | MEDIUM | P2 |
| Curated topic libraries | MEDIUM | MEDIUM | P2 |
| CSV upload | MEDIUM | LOW | P2 |
| Stripe billing + feature gating | HIGH | MEDIUM | P2 |
| CSV export | LOW | LOW | P2 |
| Predictive brackets + leaderboard | HIGH | HIGH | P3 |
| Sports API integration | HIGH | HIGH | P3 |
| Auto-resolution engine | MEDIUM | HIGH | P3 |
| Advanced analytics | LOW | MEDIUM | P3 |
| Projector-optimized view | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch (MVP)
- P2: Should have, add when possible (v1.x)
- P3: Nice to have, future consideration (v2+)

---

## Competitor Feature Analysis

| Feature | Kahoot | Mentimeter | Poll Everywhere | BracketFights | Challonge | SparkVotEDU Approach |
|---------|--------|------------|-----------------|---------------|-----------|---------------------|
| Join via code | Yes (PIN) | Yes (code) | Yes (code) | No (open voting) | No (account) | Yes -- class code, zero friction |
| Anonymous participation | Nicknames | Anonymous | Optional | Anonymous | Account-based | Anonymous by design -- device fingerprint + fun names |
| Multiple choice polls | Yes | Yes | Yes | No | No | Yes -- table stakes |
| Ranked/ordered polls | No | Yes (ranking) | Yes (ranking) | No | No | Yes -- standalone ranked polls |
| Tournament brackets | No | No | No | Yes (single-elim) | Yes (all types) | Yes -- single, double, round-robin, predictive |
| Real-time results | Yes (live) | Yes (live) | Yes (live) | Yes (live tally) | Limited | Yes -- live vote dashboard |
| Timed rounds | Yes (per question) | Yes (per slide) | No | No | No | Yes -- per matchup timers |
| Projector mode | Yes (full screen) | Yes (presentation) | Yes (present) | No | No | Yes -- projector-optimized view |
| Sports data integration | No | No | No | No | No | Yes -- NCAA, NBA, NHL, MLB (unique differentiator) |
| Predictive brackets | No | No | No | No | No (predictions plugin) | Yes -- predictions + leaderboard (unique differentiator) |
| Free tier | Yes (limited) | Yes (2 Q's free) | Yes (25 responses) | Yes (free) | Yes (free) | Yes -- Free / Pro / Pro Plus |
| Education pricing | Yes ($6/mo teacher) | Yes ($12/mo) | Yes (per-seat) | N/A | N/A | $12/mo Pro, $20/mo Pro Plus |
| CSV import | No | No | Yes | No | Yes | Yes -- CSV upload for entrants |
| Analytics export | Pro only | Pro only | Yes | No | Pro only | Pro/Pro Plus -- CSV export |
| Curated content | Yes (Kahoot library) | Template library | No | User-generated | No | Yes -- curated topic libraries by subject |
| Double-elimination | No | No | No | No | Yes | Yes -- educational context (differentiator) |
| Round-robin | No | No | No | No | Yes | Yes -- small group format |
| Teacher advancement override | N/A | N/A | N/A | No | Yes (organizer) | Yes -- teacher picks winners |
| Device fingerprinting | No (nickname only) | No | No | No | No | Yes -- session continuity on school devices |

### Competitive Positioning Summary

SparkVotEDU occupies a unique intersection: **classroom polling tool + tournament bracket platform**. No single competitor offers both:

- **Kahoot/Mentimeter/Poll Everywhere** own classroom polling but have zero bracket/tournament features.
- **BracketFights/Challonge** own brackets/tournaments but have zero classroom/education features, no code-based joining, no teacher controls.

SparkVotEDU bridges this gap. The key insight: brackets are inherently more engaging than polls because they create narrative tension (who will win?), sustained engagement (multiple rounds over days/weeks), and natural discussion. Adding polling alongside brackets makes SparkVotEDU a complete classroom engagement platform.

**Biggest competitive risks:**
1. Kahoot adding bracket features (they have the distribution; unlikely near-term given their quiz focus)
2. Challonge adding education features (possible but they focus on esports/gaming communities)
3. A new entrant copying the bracket-in-classroom concept (first-mover advantage matters here)

---

## Sources

- Kahoot feature set: Based on training knowledge of Kahoot for Schools (as of mid-2025). **Confidence: MEDIUM** -- could not verify current features via WebFetch.
- Mentimeter feature set: Based on training knowledge of Mentimeter features page (as of mid-2025). **Confidence: MEDIUM** -- could not verify current features.
- Poll Everywhere feature set: Based on training knowledge (as of mid-2025). **Confidence: MEDIUM** -- could not verify current features.
- BracketFights feature set: Based on training knowledge of the platform. **Confidence: LOW** -- less well-known platform, fewer training data points.
- Challonge feature set: Based on training knowledge (as of mid-2025). **Confidence: MEDIUM** -- well-documented platform in training data.
- SparkVotEDU requirements: Based on PROJECT.md in this repository. **Confidence: HIGH** -- primary source document.
- EdTech market patterns: Based on training knowledge of SaaS education tools. **Confidence: MEDIUM** -- general industry patterns are relatively stable.
- Bracket algorithm patterns: Based on training knowledge of tournament bracket implementations. **Confidence: HIGH** -- well-established computer science domain.

**Verification note:** WebSearch and WebFetch were both unavailable during this research session. All competitor feature claims should be re-verified against current product pages before making final product decisions. Feature sets of Kahoot, Mentimeter, and Poll Everywhere may have changed since training cutoff (May 2025). Recommend manual verification of competitor features before roadmap finalization.

---
*Feature research for: EdTech classroom engagement (polling, voting, tournament brackets)*
*Researched: 2026-01-28*
