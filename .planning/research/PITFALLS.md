# Pitfalls Research

**Domain:** EdTech classroom polling and tournament bracket web application
**Researched:** 2026-01-28
**Confidence:** MEDIUM (based on training data; WebSearch/WebFetch unavailable for verification. Findings are grounded in well-established domain patterns but should be validated where flagged.)

---

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or product failure.

### Pitfall 1: Device Fingerprinting Collision on Identical School Hardware

**What goes wrong:**
School-issued devices (Chromebooks, iPads, managed Windows laptops) are cloned from a single OS image. Every device in a classroom has the same browser version, screen resolution, installed fonts, timezone, OS version, GPU, and canvas/WebGL rendering output. Traditional fingerprinting libraries (like FingerprintJS) produce identical or near-identical fingerprints for 60-90% of devices in a classroom, causing vote deduplication failures (multiple students treated as one) or vote fraud (one student casting votes on multiple devices that appear unique when they are not).

**Why it happens:**
Browser fingerprinting was designed to distinguish devices across the open internet where hardware/software diversity is enormous. School environments are the worst-case scenario for fingerprinting: homogeneous hardware, locked-down identical OS images, same browser version pushed via MDM (Mobile Device Management), identical screen resolution, and often identical installed fonts. The standard fingerprinting signals (canvas rendering, WebGL renderer, audio context, fonts, plugins, screen dimensions, timezone, language) all return identical values across an entire classroom fleet.

**How to avoid:**
1. DO NOT rely on traditional browser fingerprinting alone. It will fail in schools.
2. Use a layered identity strategy:
   - **Layer 1: Session token** -- On first visit to a class session, generate a cryptographically random session token stored in `localStorage` AND `sessionStorage`. This is the primary identifier.
   - **Layer 2: Server-assigned cookie** -- Set an HttpOnly cookie as backup identity. If localStorage is cleared, cookie persists and vice versa.
   - **Layer 3: Fingerprint as tiebreaker** -- Use fingerprinting signals only as a supplementary signal to detect if two sessions might be the same person (e.g., a student opening two browser tabs). Never use it as primary identity.
   - **Layer 4: Class code + position** -- Within a single class session, the combination of class code + join order + randomly assigned fun name creates a unique session identity.
3. Accept the tradeoff: if a student clears all browser storage mid-session, they will appear as a new participant. This is acceptable at classroom scale.
4. For vote integrity, the question is not "is this the same device across sessions" but "is this the same participant within this voting session." Session tokens solve this without fingerprinting at all.

**Warning signs:**
- During testing, two browser profiles produce the same fingerprint hash
- QA tests on identical hardware show fingerprint collision rates above 5%
- Students report being "merged" with another student's votes
- Vote counts are consistently lower than the number of students the teacher sees participating

**Phase to address:**
Phase 1 (Foundation/Auth). Device identity is foundational -- everything else (voting, brackets, analytics) depends on correctly distinguishing participants. Get this wrong and no feature works.

---

### Pitfall 2: Double-Elimination Bracket State Corruption

**What goes wrong:**
Double-elimination brackets have two parallel brackets (winners bracket and losers bracket) with a complex flow: losers drop down to the losers bracket, and the final grand finals may require a "reset" match if the losers bracket champion wins the first grand finals. Developers who have only built single-elimination brackets underestimate this complexity by 5-10x. Common failures include:
- A team appearing in both brackets simultaneously after a loss
- Losers bracket matchups being generated before winners bracket round completes
- Grand finals reset logic missing or broken (the losers bracket winner must beat the winners bracket winner twice, but many implementations miss this)
- Bye placement in losers bracket being wrong (losers bracket byes follow different seeding logic)
- State desync when a teacher manually overrides a match result mid-bracket

**Why it happens:**
Single-elimination is a simple tree. Double-elimination is two interconnected trees with cross-references between them and a special-case final. Most developers model it as "two single-elimination brackets" when it is actually a directed acyclic graph with specific feed-in rules. The losers bracket structure depends on the winners bracket structure, and the number of rounds in each bracket is not equal.

**How to avoid:**
1. Model bracket state as an immutable event log, not a mutable tree. Every match result is an event. Current bracket state is derived by replaying events. This makes undo/override trivial and prevents state corruption.
2. Pre-generate the full bracket structure (all matches, including placeholder matches) at creation time. Each match has defined "source" references (e.g., "winner of WB-R1-M1" and "loser of WB-R2-M3"). Do not dynamically generate the next round after each match completes.
3. Define bracket templates for each format/size as data (JSON), not as code. Templates encode the full match graph including feed-in rules.
4. Implement grand finals reset as a conditional match that exists in the template but is only activated if the losers bracket winner wins the first grand finals match.
5. Write exhaustive integration tests for every bracket size (4, 5, 6, 7, 8, 12, 16, etc.) with non-power-of-two sizes being the hardest.

**Warning signs:**
- Match slots showing "TBD" after both source matches are complete
- A team name appearing in two active matches simultaneously
- Grand finals ending after one match when the losers bracket winner won
- Manual override of a match result not propagating downstream
- Non-power-of-two brackets having teams in wrong positions after byes

**Phase to address:**
Phase 2-3 (Core bracket logic). This must be built methodically with extensive testing. Do NOT start with the UI -- build and exhaustively test the bracket state engine first, then layer the UI on top. Bracket logic is the hardest part of this entire project.

---

### Pitfall 3: Non-Power-of-Two Brackets with Incorrect Bye Placement

**What goes wrong:**
When a bracket has a number of entrants that is not a power of two (e.g., 6, 10, 12, 14 teams), byes must be assigned so that higher-seeded teams receive them. The standard approach is to place byes in the first round so that the second round has a clean power-of-two field. However, developers commonly:
- Place byes randomly instead of by seed, destroying competitive fairness
- Place all byes at the top or bottom of the bracket instead of distributing them, causing lopsided brackets
- Fail to handle the case where byes propagate into the losers bracket in double-elimination (a team that got a bye in round 1 and loses in round 2 enters the losers bracket at round 1, but there may not be a losers bracket round 1 opponent for them)
- Miscalculate the number of byes needed (it is always `nextPowerOfTwo(N) - N`)

**Why it happens:**
Bye placement follows a specific seeding algorithm (typically Hasse diagram / standard tournament seeding), but most developers try to figure it out themselves rather than implementing the established algorithm. The interaction between byes and double-elimination losers bracket feed-in is genuinely complex and not well documented outside of tournament software communities.

**How to avoid:**
1. Use the standard tournament seeding algorithm: for N entrants in a bracket of size S (next power of two >= N), seed 1 plays seed S, seed 2 plays seed S-1, etc. Byes replace the highest seed numbers. This naturally distributes byes correctly.
2. Pre-generate bye positions as part of the bracket template, not as runtime logic.
3. Test with every combination: 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 entrants, in both single and double elimination. That is a test matrix of 26+ configurations.
4. For double-elimination, model bye feed-in explicitly: when a team enters the losers bracket from a round where their opponent had a bye, they should enter an appropriate losers bracket round (not necessarily round 1).

**Warning signs:**
- Teacher creates a 6-team bracket and the first two rounds look wrong
- Byes are all clustered on one side of the bracket
- A 5-team single-elimination bracket completes in the wrong number of rounds
- Double-elimination with non-power-of-two produces "ghost matches" in the losers bracket

**Phase to address:**
Same phase as bracket logic (Phase 2-3). Bye placement is part of bracket generation and cannot be deferred.

---

### Pitfall 4: WebSocket Failures in School Network Environments

**What goes wrong:**
The live voting dashboard and real-time features rely on persistent WebSocket connections. School networks commonly:
- Block WebSocket connections entirely (some school firewalls only allow HTTP/HTTPS)
- Terminate WebSocket connections after 30-60 seconds of inactivity via transparent proxies
- Use content-filtering proxies that break the WebSocket upgrade handshake
- Throttle connections per-device, causing WebSocket drops when many students connect simultaneously
- Use NAT configurations that limit concurrent connections from the same external IP

The result: the teacher sees a live dashboard that stops updating, students see "connecting..." spinners, votes are lost silently, and the product appears broken.

**Why it happens:**
WebSockets require a persistent TCP connection that many school network architectures are not designed to support. School firewalls (Securly, GoGuardian, Cisco Umbrella, Lightspeed, iBoss) inspect traffic at the application layer and some do not properly handle the HTTP-to-WebSocket upgrade. Content filtering proxies that perform SSL interception (MITM for student safety monitoring) can interfere with WebSocket handshakes.

**How to avoid:**
1. ALWAYS implement transport fallback: WebSocket -> Server-Sent Events (SSE) -> HTTP long-polling. Libraries like Socket.IO do this automatically, but if using raw WebSocket or a framework like Supabase Realtime, ensure fallback exists.
2. Implement heartbeat/keepalive at the application level (not just TCP keepalive). Send a ping every 15-20 seconds. If no pong in 5 seconds, reconnect.
3. Design the data model for offline-tolerance: votes are submitted via regular HTTP POST (not WebSocket), and the live dashboard is a read-only real-time feed. If the real-time feed drops, votes are NOT lost because they were submitted via HTTP.
4. Implement exponential backoff reconnection with jitter to prevent thundering herd when a network proxy restarts and 30 students reconnect simultaneously.
5. Test from behind a corporate proxy. Use tools like `mitmproxy` to simulate school SSL inspection.
6. Consider using Supabase Realtime or Firebase as the real-time transport -- these services have already solved the transport fallback problem.

**Warning signs:**
- Works perfectly on home WiFi but fails in classroom testing
- Dashboard goes blank after 30-60 seconds (proxy timeout)
- Students can submit votes but teacher's live view does not update
- Reconnection attempts create cascading failures (thundering herd)
- Browser dev tools show WebSocket connection in "pending" state

**Phase to address:**
Phase 1-2 (Infrastructure). Real-time transport architecture must be decided early and tested in school-like network conditions before building features on top of it.

---

### Pitfall 5: Freemium Feature Gating as Afterthought

**What goes wrong:**
Teams build all features first, then try to add subscription tiers and feature gating at the end. This results in:
- Feature checks scattered throughout the codebase with no consistent pattern
- Race conditions where a user downgrades mid-session and cached permissions allow access to gated features
- No graceful degradation -- gated features show errors instead of upgrade prompts
- Bracket data created on Pro tier becomes inaccessible after downgrade, causing teacher distress
- Free tier users discovering workarounds because gating is shallow (client-side only)

**Why it happens:**
Feature gating feels like a "simple if-check" but is actually a cross-cutting concern that touches every layer: UI (show/hide/upgrade prompts), API (enforce limits), database (data ownership after downgrade), billing (subscription state sync), and UX (graceful messaging). Adding it retroactively means touching every feature.

**How to avoid:**
1. Define the tier matrix FIRST (already done per PROJECT.md: Free / Pro $12/mo / Pro Plus $20/mo).
2. Build a centralized feature gate system in Phase 1:
   ```
   canAccess(user, feature) -> { allowed: boolean, reason?: string, upgradeTarget?: tier }
   ```
3. Every feature check goes through this gate, never inline `if (user.tier === 'pro')`.
4. Server-side enforcement is mandatory. Client-side gating is for UX only.
5. Define downgrade behavior explicitly: what happens to existing data when a teacher downgrades? Options: (a) data is preserved but read-only, (b) data is preserved and accessible until subscription period ends, (c) excess items are archived. Choose (a) or (b) -- never delete a teacher's data on downgrade.
6. Implement tier-aware rate limits from the start (e.g., Free = 3 active brackets, Pro = 25, Pro Plus = unlimited).

**Warning signs:**
- Feature flags are checked differently in different parts of the codebase
- A free-tier user can access a pro feature by manipulating the URL or API directly
- Downgrading a subscription causes errors or data loss
- No "upgrade" CTA -- gated features just disappear or show generic errors
- Billing webhook failures silently leave a user on a tier they did not pay for

**Phase to address:**
Phase 1 (Foundation). The feature gate system and tier definitions must exist before building any gated features. Every subsequent phase uses the gate system.

---

### Pitfall 6: Predictive Bracket Scoring Edge Cases

**What goes wrong:**
Predictive brackets (where students predict outcomes of real tournaments and earn points for correct picks) have scoring edge cases that break leaderboards:
- Upset chains: if a team that many students picked in later rounds loses in round 1, how do you score the "missed potential" picks in later rounds? Most systems just award 0 for all subsequent rounds, but this is unfair because a student who picked a team to win rounds 2, 3, and 4 loses all those points due to one upset.
- Late joiners: a student who joins the prediction pool after round 1 has already started cannot have retroactive picks. How are they scored? Most implementations exclude them, causing teacher frustration.
- Tiebreaking: multiple students with the same score is common. Need a consistent tiebreaker (first to submit, more correct upsets, etc.).
- Real tournament changes: real-world tournaments have forfeits, disqualifications, and bracket modifications (e.g., a team is declared ineligible after the bracket is published). The scoring system must handle this.

**Why it happens:**
Developers model predictive brackets as "did they pick correctly or not" (binary) without considering the cascade effects and edge cases that real tournaments produce. Real bracket challenges (like ESPN's or Yahoo's) have years of edge-case handling that simple implementations miss.

**How to avoid:**
1. Define the scoring system formally before writing code. Document: points per round, how upset bonuses work, tiebreaker rules, late-join policy, and forfeit/DQ handling.
2. Use a progressive scoring model: 1 point for round 1 correct, 2 for round 2, 4 for round 3, etc. (doubling or a custom scale). This is the industry standard.
3. For late joiners: allow joining with a penalty (e.g., they get 0 for all missed rounds) or allow the teacher to set a cutoff time after which no new predictions are accepted.
4. For real-tournament changes: score based on actual outcomes regardless of how they happened. A forfeit win still counts as a win for scoring.
5. Store predictions immutably. Never modify a student's prediction after submission. Score by comparing immutable predictions against actual outcomes.

**Warning signs:**
- Leaderboard shows all students at the same score
- Teacher asks "what happens if a team forfeits?" and there is no answer
- A student complains that their correct pick was not counted
- Late-joining students cannot participate at all

**Phase to address:**
Phase 3-4 (Predictive brackets / Sports integration). This is a later phase, but the scoring rules must be designed before the predictive bracket UI.

---

### Pitfall 7: Sports API Data Inconsistency and Unavailability

**What goes wrong:**
Sports APIs (ESPN, SportsData.io, MySportsFeeds, The Sports DB, API-Football, etc.) are unreliable in ways developers do not anticipate:
- API rate limits are hit during March Madness when every classroom wants live updates simultaneously
- Data formats change between seasons without notice
- Game results are delayed -- a game might end but the API does not reflect the result for 15-60 minutes
- Different APIs disagree on team names, IDs, and abbreviations ("North Carolina" vs "UNC" vs "N. Carolina")
- APIs go down during peak moments (tournament time is peak for everyone)
- Free tiers of sports APIs have aggressive rate limits (100-1000 requests/day)
- Scheduled games change (postponements, cancellations), requiring bracket updates

**Why it happens:**
Sports data is messy. Unlike structured databases, sports APIs are maintained by different organizations with different standards, update frequencies, and reliability guarantees. Developers assume "get tournament bracket from API" is a simple operation when it is actually "integrate with a flaky external system that changes unpredictably."

**How to avoid:**
1. Cache aggressively. Fetch sports data on a server-side schedule (every 5-15 minutes during active tournaments) and serve from cache. NEVER have client devices calling sports APIs directly.
2. Build a normalization layer: ingest sports data into your own data model with canonical team names and IDs. Map external API team IDs to your internal IDs.
3. Support manual override: teachers must be able to manually input or correct tournament results when the API is wrong, delayed, or down.
4. Design for API failure: if the sports API is down, the app must still function. Pre-populate tournament brackets at the start of a tournament (teams/seeds), then update results incrementally.
5. Have a fallback data source. Consider using two sports API providers and reconciling between them.
6. Budget for a paid API tier. Free tiers will not survive a classroom of 30 students during March Madness.

**Warning signs:**
- "Works in development but fails during March Madness" (rate limits)
- Team names in the API do not match team names students entered
- Tournament results show up hours late or not at all
- API provider changes pricing or terms mid-season

**Phase to address:**
Phase 4 (Sports integration). This is a later-phase feature, but API provider selection and caching architecture should be decided during Phase 1-2 infrastructure planning.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Client-side only feature gating | Faster to implement | Free users bypass all limits by calling API directly | Never -- always enforce server-side |
| Storing bracket state as a mutable JSON blob | Simple to start | Cannot undo, audit, or recover from corruption; concurrent updates cause data loss | Only for read-only display, never for state of truth |
| Using localStorage as sole identity | No backend needed for identity | Student clears browser = lost identity = duplicate votes | Acceptable for MVP if combined with server-assigned session |
| Hardcoding bracket sizes (4, 8, 16) | Fewer edge cases to handle | Adding new sizes requires code changes, not config changes | Never -- parameterize from day one |
| Single WebSocket connection for everything | Simple architecture | One dropped connection kills all features; reconnect logic becomes complex | Never -- separate concerns (votes channel, results channel, presence channel) |
| Direct API-to-client sports data | Avoids building a cache layer | Rate limits, CORS issues, API key exposure, no offline tolerance | Never -- always server-side proxy with cache |
| Skipping bracket state tests for non-power-of-two | Saves time during build | Byes break in production, teacher creates 6-team bracket and it crashes | Never -- test every size 3-16 at minimum |
| Using Stripe webhooks without idempotency | Works in happy path | Duplicate webhook delivery creates double charges or tier desync | Never |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Stripe subscriptions | Trusting client-side subscription status | Always verify via Stripe API or webhook-updated DB field; use webhook events as source of truth for tier status |
| Stripe webhooks | Not handling `customer.subscription.updated` vs `customer.subscription.deleted` differently | Handle every subscription lifecycle event: created, updated, deleted, past_due, canceled, resumed |
| Sports APIs (any) | Calling API from client-side JavaScript | Server-side proxy with cache layer; never expose API keys to client |
| Sports APIs (free tier) | Assuming free tier is sufficient for production | Free tiers have 100-1000 req/day limits; a single classroom refresh can burn through this; budget for paid tier |
| OAuth providers (Google, Microsoft, Apple) | Not testing with school-managed Google/Microsoft accounts | School-managed accounts have admin restrictions; Google Workspace for Education may block third-party OAuth by default; test with real school accounts |
| FingerprintJS (or similar) | Assuming library works out-of-box for school use case | Default configuration produces identical fingerprints on identical hardware; must add custom entropy signals or use different identity approach |
| Supabase Realtime | Not handling channel subscription limits | Default concurrent channel limits exist; 30 students in one class may hit limits if subscription architecture is per-student-per-feature |
| Email delivery (password reset, etc.) | Sending from unverified domain | School email systems aggressively filter unknown senders; verify SPF, DKIM, DMARC for sparkvotedu.com; use a transactional email service (SendGrid, Postmark) |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Broadcasting every vote to every client in real-time | Dashboard updates beautifully with 5 test users | Use debounced/batched updates: accumulate votes server-side and broadcast aggregated counts every 1-2 seconds, not per-vote | 30+ students voting simultaneously; one broadcast per vote = 30 messages/second to each client |
| Loading full bracket state on every page view | Fast with a 4-team bracket | Fetch bracket structure once, then use incremental updates (match results) via real-time subscription | 16+ team double-elimination bracket = large JSON payload; loaded on every navigation |
| Rendering large bracket as a single DOM tree | Smooth with 8 teams | Use virtualization or segmented rendering; show one round at a time with horizontal scroll | 64-team bracket in double-elimination = 126+ match nodes; DOM thrashing on mobile devices |
| Querying all votes for a poll to count them | Instant with 10 votes | Maintain a running vote tally in a separate counter table; update count on vote, not on read | 500+ votes (multiple class periods voting on the same poll) |
| No database indexes on class_code lookups | Fast with 10 classes | Add indexes on class_code, session_id, and bracket_id from day one | 100+ classes; full table scan on every student join |
| Real-time subscriptions without cleanup | No obvious symptoms at first | Unsubscribe from channels on component unmount and on session end | Memory leak; server tracks thousands of zombie subscriptions |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Class codes that are sequential or guessable (e.g., CLASS001, CLASS002) | Students from other classes join and troll | Use 6-character alphanumeric codes generated randomly; consider making codes expire after class session ends |
| No rate limiting on vote submission | A student writes a script to vote 1000 times | Server-side rate limit: 1 vote per participant per matchup; enforce via database unique constraint on (session_id, match_id) |
| Exposing teacher's admin API to student client | Student accesses teacher endpoints by inspecting network traffic | Separate auth scopes: student sessions have NO access to teacher endpoints; use middleware that checks auth type before every admin route |
| Storing device fingerprints as PII | COPPA/FERPA compliance risk; fingerprints can be considered personally identifiable | Hash fingerprint data server-side; store only the hash, never raw signals; document in privacy policy that no PII is collected |
| Stripe API key in client-side code | Anyone can create charges against your account | Only use Stripe publishable key on client; secret key is server-side only; use Stripe Checkout or Payment Elements (not direct API) on client |
| Class codes that never expire | Codes can be shared and used weeks later | Tie class codes to sessions with expiration; teacher explicitly opens/closes a session |
| Sports API key in client bundle | API key is publicly visible; quota abuse | Server-side proxy for all sports API calls; key is environment variable on server only |
| No COPPA consideration for students under 13 | Legal liability for the platform | Since students are anonymous with no accounts and no PII collected, COPPA risk is minimized, but verify: device fingerprints stored as hashes are not PII; do not collect email, name, or any identifying information from students; document compliance posture explicitly |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Bracket UI requires horizontal scrolling on mobile | Students on phones cannot see the full bracket; teacher on laptop is fine | Design bracket view as progressive disclosure: show current round prominently, past rounds collapsed, future rounds as preview; or provide a "current matchup" card view for mobile |
| No loading state during vote submission | Students tap vote button multiple times thinking it did not register | Show immediate optimistic UI feedback (button changes state instantly); deduplicate on server |
| Timer for Live Event mode is client-side only | Different student devices show different remaining times due to clock skew | Sync timer from server; send "round ends at timestamp X" not "round has Y seconds remaining"; client calculates remaining time from its own clock vs server timestamp |
| Too many steps to create a bracket | Teachers abandon during setup | Wizard with progress indicator; allow creating a bracket with just a name and adding entrants later; support paste/CSV for bulk entry |
| Real-time dashboard that auto-scrolls or jumps | Teacher loses their place as new votes come in | New data appears in-place without layout shift; use animations to draw attention to changes without moving content |
| No confirmation before advancing a bracket round | Teacher accidentally clicks "advance" and the match result is locked | Require confirmation for irreversible actions; even better, allow undo within a grace period |
| Student lands on expired/closed class code | "Error" page with no guidance | Show friendly message: "This class session has ended. Ask your teacher for a new code." |
| Predictive bracket offers no feedback after pick | Student does not know if their pick was saved | Animate the pick, show a confirmation badge, update a "your picks" summary panel |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Device Identity:** Often missing fallback when localStorage is cleared -- verify that a student who clears browser data during a session can still be associated with their previous votes (via server-side session or HttpOnly cookie backup)
- [ ] **Double-Elimination Bracket:** Often missing grand finals reset logic -- verify that the losers bracket winner beating the winners bracket winner triggers a second match, not an immediate championship
- [ ] **Bracket Display:** Often missing the losers bracket visual entirely -- verify that double-elimination shows both brackets with clear feed-in arrows, not just the winners bracket
- [ ] **Vote Deduplication:** Often missing server-side enforcement -- verify that the same session cannot vote twice on the same matchup even if the client allows it (database unique constraint)
- [ ] **Real-time Dashboard:** Often missing reconnection logic -- verify that if WebSocket drops and reconnects, the dashboard shows current state (not stale pre-disconnect state)
- [ ] **Subscription Downgrade:** Often missing data preservation -- verify that a teacher who downgrades from Pro to Free can still VIEW their existing brackets (even if they cannot create new Pro-tier brackets)
- [ ] **Non-Power-of-Two Byes:** Often missing correct seeding -- verify that a 6-team bracket gives byes to seeds 1 and 2 (top seeds), not random teams
- [ ] **Live Event Timer:** Often missing server-authoritative time -- verify that the countdown is based on server timestamp, not client clock
- [ ] **Sports API Integration:** Often missing error handling -- verify that the app works (read-only, shows last known data) when the sports API is down
- [ ] **Class Code Lifecycle:** Often missing expiration -- verify that a class code becomes invalid after the teacher closes the session, not usable forever
- [ ] **Fun Name Generation:** Often missing collision detection -- verify that two students in the same class session cannot get the same random name
- [ ] **CSV Upload:** Often missing validation and error feedback -- verify that malformed CSV shows specific errors ("Row 5 is missing a team name") not a generic failure
- [ ] **Ranked Polls:** Often missing clear visualization of rank results -- verify that ranked poll results show aggregated rankings (e.g., Borda count or instant-runoff), not just raw ranks

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Fingerprint collisions merge students | MEDIUM | Retroactively separate by adding session token layer; cannot recover lost vote data but can prevent future collisions; affected class sessions may need teacher to re-run the vote |
| Double-elimination state corruption | HIGH | If using event sourcing: replay from last known good event; if using mutable state: manual database intervention required; may need to reset bracket and re-enter results |
| Bye placement wrong in existing brackets | MEDIUM | Generate corrected bracket; teacher manually re-enters results for completed matches; no automated migration possible because match results depend on matchups |
| WebSocket failures in school | LOW | Deploy SSE/polling fallback; no data loss because votes are HTTP-submitted; real-time dashboard gracefully degrades to periodic refresh |
| Feature gating bypass | MEDIUM | Add server-side enforcement to all gated endpoints; audit existing data for free-tier users who accessed pro features; decide policy on grandfathering vs. restricting |
| Predictive bracket scoring errors | HIGH | Recalculate all scores from stored immutable predictions + actual outcomes; if predictions were not stored immutably, scores cannot be recalculated |
| Sports API data corruption | LOW-MEDIUM | If cache layer exists: invalidate cache, re-fetch; if data was persisted to bracket state: manual correction; teacher override capability is essential |
| Stripe webhook desync | MEDIUM | Run Stripe webhook replay for missed events; reconcile database tier status against Stripe subscription status; build an admin reconciliation tool |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Device fingerprint collision | Phase 1: Foundation | Test with 5+ identical-config browser profiles; collision rate must be 0% using session tokens |
| Double-elimination state corruption | Phase 2-3: Bracket Engine | Integration tests for every bracket size (3-16 teams) in double-elim; test manual override propagation |
| Non-power-of-two bye placement | Phase 2-3: Bracket Engine | Visual inspection of generated brackets for all sizes 3-16; compare against standard tournament seeding charts |
| WebSocket school network failure | Phase 1-2: Infrastructure | Test behind a corporate proxy with SSL inspection; verify fallback transport activates automatically |
| Feature gating as afterthought | Phase 1: Foundation | Feature gate system exists before any gated feature is built; test that free-tier API calls are rejected for pro features |
| Predictive bracket scoring | Phase 3-4: Predictive Brackets | Document scoring rules formally; test with known bracket outcomes and verify leaderboard matches expected scores |
| Sports API unreliability | Phase 4: Sports Integration | Load test with simulated API failures and rate limits; verify app degrades gracefully (shows last cached data) |
| Class code security | Phase 1: Foundation | Verify codes are random, non-sequential, and expire when session closes; penetration test for code enumeration |
| Vote deduplication | Phase 2: Voting Engine | Database unique constraint on (session_id, match_id); test submitting duplicate votes via API directly (bypass UI) |
| Real-time reconnection | Phase 2: Real-time Features | Kill WebSocket connection during active voting; verify dashboard recovers to current state within 5 seconds |
| Subscription downgrade data access | Phase 3-4: Billing | Downgrade a test account and verify all existing data is viewable but creation of new gated items is blocked |
| OAuth with school accounts | Phase 1: Auth | Test with a real Google Workspace for Education account and a real Microsoft 365 Education account |
| Timer sync | Phase 2-3: Live Events | Run timer on two devices with 30-second clock skew; verify both show the same remaining time (within 2 seconds) |
| Fun name collisions | Phase 1: Student Join Flow | Join 30 students to same class; verify all names are unique; if name pool is small, verify graceful fallback (append number) |

## Sources

- Training data knowledge of tournament bracket algorithms (standard seeding, double-elimination structure) -- MEDIUM confidence
- Training data knowledge of browser fingerprinting limitations on identical hardware -- MEDIUM confidence (well-documented limitation in fingerprinting literature, but specific school-device collision rates are estimated)
- Training data knowledge of school network firewall behavior (Securly, GoGuardian, Cisco Umbrella) -- MEDIUM confidence
- Training data knowledge of Stripe subscription lifecycle and webhook patterns -- HIGH confidence (well-documented official patterns)
- Training data knowledge of sports API ecosystem (ESPN, SportsData.io) -- LOW-MEDIUM confidence (API landscape changes frequently; specific pricing, rate limits, and data quality need phase-specific validation)
- Training data knowledge of COPPA/FERPA compliance for anonymous student participation -- MEDIUM confidence (legal guidance should be verified by counsel)
- Training data knowledge of real-time web architecture (WebSocket, SSE, long-polling fallback) -- HIGH confidence (well-established patterns)
- NOTE: WebSearch and WebFetch were unavailable during this research session. All findings are from training data. Recommend validating sports API specifics, FingerprintJS school-device behavior, and current school firewall product behavior during implementation phases.

---
*Pitfalls research for: EdTech classroom polling and tournament bracket web application (SparkVotEDU)*
*Researched: 2026-01-28*
