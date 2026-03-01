# Feature Research

**Domain:** Classroom voting platform -- teacher activity controls, creation UX, real-time indicators
**Researched:** 2026-02-28
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features teachers expect from any live classroom activity tool once it supports basic creation and voting.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Pause/Resume activities | Every major competitor (Mentimeter, Poll Everywhere, Slido) supports toggling participation on/off. Teachers interrupt activities for discussion constantly. Kahoot community has requested this for years -- it is the #1 teacher control expectation. | MEDIUM | Requires new `isPaused` column on Bracket + Poll, a broadcast event for student-facing overlay, and gating vote submission server-side. The playful "needs to cook" student message is a differentiator on top of table-stakes pause functionality. |
| Edit display settings after creation | Poll Everywhere, Vevox, and Mentimeter all let presenters change display/behavior settings after creation. Teachers realize they picked the wrong setting only after seeing students interact. | MEDIUM | Bracket already has `bracket-edit-form.tsx` for entrants. Settings editing (viewingMode, showVoteCounts, showSeedNumbers, votingTimerSeconds, showLiveResults, allowVoteChange) needs a separate settings panel. Safe to allow even while live since these are display-only. |
| "Go Live" terminology | Industry standard across Kahoot, Mentimeter, Slido. "View Live" is ambiguous -- sounds read-only. Teachers expect an action verb. | LOW | Pure label change. Grep for "View Live" and replace. No logic changes. |
| Bug fix: duplicated poll retains removed options | Data integrity issue. Users who duplicate and edit expect a clean copy. This is a basic correctness expectation. | LOW | Server action `duplicatePollDAL` likely copies options snapshot including any that were soft-removed. Fix in the duplication logic. |
| Bug fix: 2-option poll centering | Visual polish. A 2-option poll with off-center layout looks broken. | LOW | CSS fix in the student poll vote component grid layout. |
| Bug fix: duplicate name flow clarity | UX clarity. When a student enters a name already in use, the disambiguation flow should suggest "add last initial" rather than feel like an error. | LOW | Copy change in `name-disambiguation.tsx` or `name-entry-form.tsx`. |

### Differentiators (Competitive Advantage)

Features that set SparkVotEDU apart from Kahoot, Mentimeter, and tournament bracket tools.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Undo round advancement / reopen voting | Challonge supports editing match results and reopening tournaments, but most classroom tools do NOT offer undo. Teachers make mistakes -- advancing the wrong winner is stressful. SparkVotEDU already has `undoAdvancement` for individual matchups; extending to "reopen voting on a round" is the differentiator. | MEDIUM | Existing `undoMatchupAdvancement` in `bracket-advance.ts` handles single matchup undo. "Reopen voting" means setting decided matchups back to `voting` status, clearing winnerId, and broadcasting. Must cascade: if matchup in round N was undone, dependent matchups in round N+1 that used this winner as entrant must also be cleared (Challonge warns about this). For polls: reopen = status `closed` -> `active`, no vote data lost. |
| Reopen completed brackets/polls | Challonge has "Reopen Tournament" under Advanced Options. Most classroom polling tools (Mentimeter, Slido) do NOT support reopening closed activities -- you create a new one. This saves teachers from re-creating. | MEDIUM | For polls: `closed` -> `active` status change. Existing `updatePollStatus` action already handles `active`/`closed` transitions; adding `completed` -> `active` is straightforward. For brackets: need to clear the bracket completion state, set the final matchup back to `voting`, and broadcast. Must confirm this does not destroy vote history. |
| Real-time student vote indicators (green dots) across all activity types | Existing `ParticipationSidebar` already shows green dots for bracket matchup voters, but ONLY when a specific matchup is selected. The differentiator: show "has voted on the current active matchup/poll" as a persistent green dot without requiring matchup selection, and extend to polls (which currently have NO student activity panel on their live dashboard). | MEDIUM | Bracket sidebar already has the UI pattern (green dot, sorted by voted status). For polls: need to add `ParticipationSidebar` to `PollLiveClient` and pipe voter IDs from the poll vote realtime channel. The "across all types" unification is what competitors lack -- most show participation as a number, not per-student status. |
| Quick Create for brackets (topic chips + entrant count) | BracketFights and similar tools offer "fill in names and go" but none combine curated educational topic lists with a size picker as a 2-click flow. SparkVotEDU already has `TopicPicker` with curated topics (planets, presidents, etc.) and `CURATED_TOPICS` data. Quick Create wraps this: pick a topic list -> pick # of entrants (4/8/16) -> create. | MEDIUM | Existing `TopicPicker` component + `CURATED_TOPICS` data + `createBracket` action are all built. Quick Create is a new UI wrapper: topic chip grid -> size selector -> auto-submit. The bracket-form.tsx wizard has 4+ steps; Quick Create collapses to 2 interactions. Needs a new page or mode toggle similar to how polls already have Quick Create vs Step-by-Step. |
| Simplified poll Quick Create (question + options only) | Polls already have Quick Create (`PollForm`) and Step-by-Step (`PollWizard`). The simplification: Quick Create should be question + options ONLY with smart defaults (simple type, allow vote change = true, show live results = false). Settings belong in Step-by-Step only. | LOW | `PollForm` already renders all fields including settings toggles. Simplification means hiding settings controls in Quick Create mode and using defaults. Could be a prop (`showSettings={false}`) or a layout restructure. Minimal backend change. |
| Playful "needs to cook" paused message | No competitor shows a fun, themed paused state to students. Kahoot just blocks input. Mentimeter shows generic "Voting closed." SparkVotEDU's brand is playful engagement -- a cooking/fire themed pause screen fits the "Spark" brand and turns a frustrating moment into a delightful one. | LOW | Pure frontend: overlay component on student views when `isPaused` is true. Could reuse the `countdown-overlay.tsx` pattern (fullscreen overlay with animation). Framer Motion for a fun entrance animation. |
| Poll image options matching bracket preview style | Visual consistency. Bracket entrants with images show a polished preview during creation. Poll options with images look different. Unifying the preview style makes the product feel cohesive. | LOW | CSS/component alignment. The bracket entrant image upload uses `EntrantImageUpload`. Poll uses `OptionImageUpload`. Aligning the preview card layout. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full activity history / audit log for undo | "Let me see every change and revert to any point" | Massively increases DB complexity. Every matchup advancement, vote, and status change would need an event log. Undo-to-any-point conflicts with real-time broadcast (which students already saw). | Single-level undo (revert last round / reopen last close) covers 95% of teacher mistakes without audit trail complexity. |
| Edit entrants/options while activity is live | "I need to fix a typo in an entrant name during voting" | Changing entrants mid-vote invalidates existing votes. Renaming is safe; adding/removing breaks vote integrity. Students who already voted on "Option A" would have their vote reference a changed entity. | Allow rename of entrants/options while live (cosmetic). Block add/remove while live. For structural changes: pause -> edit -> resume. |
| Bulk undo (revert multiple rounds at once) | "I messed up round 2 and want to go back to round 1" | Cascading undo across multiple rounds requires clearing all dependent matchups, votes, and advancement state. Risk of data loss. Complex state management with realtime sync. | Undo one round at a time. If teacher needs to go back further, they can undo sequentially. Each undo is atomic and safe. |
| Auto-pause when all students voted | "Pause automatically when 100% participation reached" | Removes teacher control over pacing. Some teachers want to wait for latecomers; others want to advance immediately. Auto-behavior is unpredictable in classroom context (students leave, rejoin). | Show "All voted!" badge prominently (already exists in ParticipationSidebar). Let teacher decide when to advance. |
| Student-facing vote timer with auto-close | "Give students exactly 30 seconds to vote" | Timer pressure works in quiz games (Kahoot) but conflicts with SparkVotEDU's deliberative voting model. Brackets involve discussion and debate. Timed voting reduces thoughtfulness. | Optional timer display (already exists as `votingTimerSeconds` + `matchup-timer.tsx`). Keep it optional, never auto-close. Teacher manually advances. |
| Granular per-student pause (pause one student) | "This student is being disruptive, pause just them" | Per-student pause is really per-student ban. Creates moderation complexity, potential for misuse, and COPPA concerns. Requires tracking which students are "muted." | Existing `banned` field on StudentParticipant handles true disruption. Pause is activity-wide, which is the appropriate classroom tool. |

## Feature Dependencies

```
Pause/Resume
    |
    +-- requires --> isPaused column on Bracket + Poll (schema migration)
    +-- requires --> Broadcast pause/resume event type
    +-- requires --> Student-facing paused overlay component
    +-- enhances --> Undo Round (pause first, then undo, then resume)
    +-- enhances --> Edit Settings (pause, edit, resume)

Undo Round Advancement
    |
    +-- requires --> Existing undoMatchupAdvancement engine (already built)
    +-- requires --> Cascade logic for dependent matchups
    +-- enhances --> Reopen Completed (undo final round = reopen)

Reopen Completed Activity
    |
    +-- requires --> Status transition: completed -> active (brackets) / closed -> active (polls)
    +-- requires --> Broadcast reopen event
    +-- depends-on --> Pause/Resume (reopen should land in paused state so teacher can review first)

Quick Create Brackets
    |
    +-- requires --> Existing TopicPicker + CURATED_TOPICS (already built)
    +-- requires --> Existing createBracket action (already built)
    +-- independent of --> All other v2.0 features

Simplified Poll Quick Create
    |
    +-- requires --> Existing PollForm component (already built)
    +-- independent of --> All other v2.0 features

Real-time Vote Indicators
    |
    +-- requires --> Existing ParticipationSidebar pattern (already built for brackets)
    +-- requires --> Poll live dashboard to add ParticipationSidebar
    +-- requires --> Realtime voter ID tracking for polls
    +-- independent of --> Pause/Resume (indicators work regardless)

Edit Settings After Creation
    |
    +-- requires --> Settings panel UI (new component)
    +-- requires --> Update actions for bracket settings + poll settings
    +-- enhances --> Pause/Resume (edit while paused)

"Go Live" Terminology
    |
    +-- independent of --> Everything. Pure label sweep.

Bug Fixes (3)
    |
    +-- independent of --> Everything. Can ship in any order.
```

### Dependency Notes

- **Pause/Resume is the foundation** for Undo Round and Reopen Completed. Teachers should pause before undoing to avoid students seeing intermediate states. Build pause first.
- **Undo Round requires cascade logic** that validates dependent matchups. If round 2 matchup A was decided using round 1 matchup B's winner, undoing matchup B must also clear matchup A. The existing `undoMatchupAdvancement` handles single matchups; the new feature needs a "revert entire round" batch operation.
- **Reopen Completed should land in paused state.** When a teacher reopens a completed bracket, it should start paused so they can review and decide which round to reopen voting on, rather than immediately exposing students to a "back from the dead" bracket.
- **Quick Create Brackets and Simplified Poll Quick Create are independent.** They touch creation flows only and have zero overlap with live activity controls.
- **Real-time Vote Indicators are independent** but share the `ParticipationSidebar` component with the bracket live dashboard. Poll live dashboard needs its own sidebar instance.

## MVP Definition

### Must Ship (v2.0 Core)

These define the milestone. Missing any of these means the "Teacher Power-Ups" milestone is incomplete.

- [x] Pause/Resume brackets and polls -- foundation for teacher control
- [x] Undo round advancement -- most requested teacher fix
- [x] Reopen completed activities -- prevents re-creation frustration
- [x] Quick Create for brackets -- reduces creation friction from 4+ steps to 2 clicks
- [x] Real-time vote indicators across all types -- unifies the live dashboard experience
- [x] "Go Live" terminology -- consistency fix
- [x] All 3 bug fixes -- data integrity and visual polish

### Should Ship (v2.0 Complete)

These complete the milestone but could be deferred to a fast-follow if time is tight.

- [ ] Edit settings after creation -- valuable but not blocking any workflow
- [ ] Simplified poll Quick Create -- polls already have Quick Create; this is a refinement
- [ ] Poll image options matching bracket style -- visual consistency, not functional
- [ ] Playful "needs to cook" student message -- delightful but basic "Voting paused" works too

### Future Consideration (v2.x+)

- [ ] Undo for round-robin (revert a round-robin round) -- more complex pacing model
- [ ] Undo for predictive brackets -- predictions-as-votes adds complexity to revert
- [ ] Quick Create for double-elimination and round-robin -- SE is sufficient for quick create
- [ ] Settings presets / templates -- "save my preferred settings for next time"

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Phase Order Rationale |
|---------|------------|---------------------|----------|----------------------|
| Pause/Resume | HIGH | MEDIUM | P1 | Foundation for undo/reopen. Build first. |
| Undo Round Advancement | HIGH | MEDIUM | P1 | Depends on pause. Build second. |
| Reopen Completed | HIGH | LOW-MEDIUM | P1 | Depends on pause + undo concepts. Build third. |
| Quick Create Brackets | HIGH | MEDIUM | P1 | Independent. Can parallelize with controls work. |
| Real-time Vote Indicators | MEDIUM | MEDIUM | P1 | Independent. Enhances live dashboard. |
| "Go Live" Terminology | MEDIUM | LOW | P1 | Trivial. Bundle with any phase. |
| Bug: duplicate poll options | MEDIUM | LOW | P1 | Data integrity. Fix early. |
| Bug: 2-option centering | LOW | LOW | P2 | Visual only. Bundle with polish phase. |
| Bug: duplicate name flow | LOW | LOW | P2 | UX copy. Bundle with polish phase. |
| Edit Settings After Creation | MEDIUM | MEDIUM | P2 | Enhances pause workflow but not required for it. |
| Simplified Poll Quick Create | LOW | LOW | P2 | Refinement of existing feature. |
| Poll Image Options Style | LOW | LOW | P3 | Visual consistency. Defer to polish. |
| Playful Paused Message | MEDIUM | LOW | P2 | Brand differentiator but basic pause works without it. |

**Priority key:**
- P1: Must have -- defines the v2.0 milestone
- P2: Should have -- completes the milestone, ship if time allows
- P3: Nice to have -- polish for a fast-follow

## Competitor Feature Analysis

| Feature | Kahoot | Mentimeter | Poll Everywhere | Challonge | SparkVotEDU v2.0 |
|---------|--------|------------|-----------------|-----------|-------------------|
| Pause/Resume | No native pause (frequently requested). Teacher controls pacing by advancing questions. | Yes. Toggle via Presentation Menu or "C" keyboard shortcut. "Turn off responses" / "Turn on responses." | Yes. "Lock" button stops responses. "Unlock" resumes. Distinct from deactivation. | N/A (not a live voting tool) | Pause/Resume with playful student-facing message. Both brackets and polls. |
| Undo/Revert | No. Questions are one-way. | No. Slides are one-way during presentation. | No. Cannot revert a closed poll to open with original data. | Yes. Edit match results, reopen matches, reopen completed tournaments. Warns about dependent match impact. | Undo single matchup (already exists). New: undo entire round with cascade. |
| Reopen Completed | No. | No. | Can "Reopen" a closed poll -- previous responses remain, new responses allowed. | Yes. Settings > Advanced > Reopen. All scores preserved, become editable. | Reopen brackets (completed -> paused) and polls (closed -> active). Vote data preserved. |
| Quick Create | Template library. Pick a Kahoot, play it. No custom quick-create. | Template gallery for slide types. | Template library for activity types. | N/A | Topic chip grid -> size picker -> create bracket in 2 clicks. Educational topics curated for K-12. |
| Vote Indicators | Shows "X of Y answered" as number. No per-student breakdown during live. | Shows response count. No per-student identification (anonymous by design). | Shows response count bar. No per-student view. | N/A | Green dot per student in sidebar. Shows who voted, who is connected, who is absent. Sorted by status. Already built for brackets; extending to polls. |
| Edit Settings Live | Settings locked after question starts. | Can toggle responses on/off. Cannot change question type or options while live. | Can lock/unlock. Cannot change question structure. Settings like "anonymous" cannot be toggled after responses exist. | Can edit match scores anytime. Cannot change tournament format. | Display settings (show vote counts, viewing mode, timer) editable anytime. Structural settings (bracket type, entrant count) locked after creation. |

## Implementation Notes by Feature

### Pause/Resume -- Expected Behavior

**Teacher side:**
1. Teacher clicks "Pause" button on live dashboard toolbar
2. Button changes to "Resume" with visual state change (amber/yellow indicator)
3. Vote progress bar shows "Paused" state
4. All incoming vote attempts return a "paused" error from server action
5. Realtime broadcast: `{ event: 'activity_paused', payload: { isPaused: true } }`

**Student side:**
1. Student receives broadcast, overlay appears immediately
2. Overlay shows playful message: "This activity needs to cook! Your teacher paused voting."
3. Vote buttons are disabled / hidden behind overlay
4. When teacher resumes: overlay dismisses with animation, voting re-enabled
5. Students who joined during pause see the paused state from initial page load

**Schema change:** Add `isPaused Boolean @default(false) @map("is_paused")` to both Bracket and Poll models.

**Server-side enforcement:** Vote actions (`castVote`, `castSimplePollVote`, `castRankedPollVote`) must check `isPaused` before accepting votes. This is the critical path -- client overlay is cosmetic, server check is authoritative.

### Undo Round -- Expected Behavior

**For SE/DE brackets:**
1. Teacher clicks "Undo" on the most recent decided round
2. Confirmation dialog: "This will clear winners from Round X and reopen voting. Students will need to vote again."
3. All matchups in that round: `status` = `voting`, `winnerId` = null
4. Dependent matchups in round X+1: clear entrant references that came from round X winners
5. Votes are preserved (students already voted; they can change if `allowVoteChange` is on)
6. Broadcast: `{ event: 'round_advanced', payload: { action: 'undo_round', round: X } }`

**For polls:**
1. "Reopen Voting" button when poll is `closed`
2. Status: `closed` -> `active`
3. All existing votes preserved. New votes accepted.
4. Broadcast: `{ event: 'poll_reopened' }`

**Constraint:** Only the most recent round can be undone. No jumping back multiple rounds in one action (anti-feature: bulk undo).

### Reopen Completed -- Expected Behavior

**For brackets:**
1. On the completed bracket detail page (showing champion), teacher sees "Reopen" button
2. Confirmation: "This will reopen the bracket for more voting. The current champion will be cleared."
3. Bracket status: `completed` -> `active`, bracket lands in paused state
4. Final matchup: `winnerId` = null, `status` = `voting`
5. Teacher must explicitly resume to allow student voting

**For polls:**
1. On the closed poll results page, teacher sees "Reopen" button (this may partially exist already via `updatePollStatus`)
2. Status: `closed` -> `active`
3. All votes preserved. Students can vote again or change votes.

### Quick Create Brackets -- Expected Behavior

1. On the bracket creation page, new mode toggle: "Quick Create" | "Step-by-Step" (mirroring poll creation page pattern)
2. Quick Create shows: curated topic chip grid (reuse `TopicPicker` data), subject category filter chips
3. Teacher taps a topic (e.g., "Planets & Celestial Bodies")
4. Below the selected topic, size picker appears: chips for 4 / 8 / 16 (filtered by topic's available entrant count)
5. Teacher taps a size (e.g., "8")
6. "Create Bracket" button appears. One click creates with defaults (SE, vote-based advancement, show vote counts ON, advanced viewing mode)
7. Redirects to the new bracket detail page

**Why not auto-select bracket type?** Quick Create defaults to single-elimination because it is the simplest and most universally understood format. DE, RR, and Predictive have configuration options (pacing, resolution mode) that belong in Step-by-Step.

### Real-time Vote Indicators -- Expected Behavior

**Current state (brackets only):**
- `ParticipationSidebar` shows green dots ONLY when a specific matchup is selected
- Without matchup selection: shows "Select a matchup to see voting status"
- Voter IDs come from `initialVoterIds` prop + realtime updates

**Target state (all activity types):**
- Green dot = student has voted on ANY currently-active matchup/poll (not just the selected one)
- No matchup selection required for basic "has this student participated?" indication
- For brackets: aggregate across all `voting` status matchups in the current round
- For polls: voted on the active poll = green dot
- Sidebar added to poll live dashboard (`PollLiveClient`) with same component

**Implementation approach:**
- Bracket: collect all voter IDs across all `voting` matchups, union into a single Set
- Poll: voter IDs from poll vote records for the active poll
- Same `ParticipationSidebar` component, different data source

### Edit Settings After Creation -- Expected Behavior

**Which settings are safe to edit anytime (including while live):**
- `viewingMode` (simple/advanced) -- display only, no data impact
- `showVoteCounts` -- display only
- `showSeedNumbers` -- display only
- `votingTimerSeconds` -- affects future matchups only
- `showLiveResults` (polls) -- display only
- `allowVoteChange` (polls) -- behavioral but safe to toggle

**Which settings must be locked after creation:**
- `bracketType` -- structural, determines matchup generation
- `size` -- structural, determines bracket tree
- `pollType` -- structural, determines vote schema
- Entrant count -- can only add/remove while in draft (entrants are bound to matchups)

**UI pattern:** Settings gear icon on live dashboard toolbar. Opens a slide-out panel or modal with toggle switches for editable settings. Grayed-out locked settings show "Set during creation" tooltip.

**Broadcast on settings change:** When display settings change, broadcast to student views so they update in real time (e.g., switching from advanced to simple viewing mode mid-activity).

## Sources

- [Mentimeter: Enable/Disable Participation](https://help.mentimeter.com/en/articles/422270-how-to-enable-and-disable-participation-for-a-specific-slide) -- toggle responses, "C" keyboard shortcut, timer-based close
- [Poll Everywhere: Locking/Unlocking Activities](https://support.polleverywhere.com/hc/en-us/articles/13839740560667-Locking-and-unlocking-activities) -- Lock button stops responses, Unlock resumes, distinct from deactivation
- [Challonge: Reopen Tournament](https://kb.challonge.com/en/article/reopen-tournament-4jkuqg/) -- Settings > Advanced > Reopen, scores preserved and editable
- [Challonge: Edit Match Results](https://kb.challonge.com/en/article/how-to-edit-match-results-1bf545k/) -- dependent matches require new scores after edit
- [Challonge: Reset Tournament API](https://api.challonge.com/v1/documents/tournaments/reset) -- full reset deletes all scores (destructive alternative to reopen)
- [Kahoot Pause Feature Request](https://support.kahoot.com/hc/en-us/community/posts/360037988953-Pause-Play-Kahoot-Feature) -- highly requested, not natively supported
- [Vevox: Edit a Poll](https://help.vevox.com/hc/en-us/articles/360012815977-Edit-a-poll) -- cannot change type or add/delete options after responses exist
- [BracketFights: Quick Create](https://bracketfights.com/create/) -- rapid bracket creation with image upload

---
*Feature research for: classroom voting platform -- teacher activity controls and creation UX*
*Researched: 2026-02-28*
