# Roadmap: SparkVotEDU

## Milestones

- ✅ **v1.0 MVP** -- Phases 1-11 (shipped 2026-02-16) | [Archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Production Readiness & Deploy** -- Phases 14-18 (shipped 2026-02-21) | [Archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Classroom Hardening** -- Phases 19-24 (shipped 2026-02-24) | [Archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Bug Fixes & UX Parity** -- Phases 25-28 (shipped 2026-02-26) | [Archive](milestones/v1.3-ROADMAP.md)
- 🚧 **v2.0 Teacher Power-Ups** -- Phases 29-37 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-11) -- SHIPPED 2026-02-16</summary>

- [x] Phase 1: Foundation & Auth (5/5 plans) -- completed 2026-01-29
- [x] Phase 2: Student Join Flow (6/6 plans) -- completed 2026-01-29
- [x] Phase 3: Bracket Creation & Management (7/7 plans) -- completed 2026-01-30
- [x] Phase 4: Voting & Real-Time (6/6 plans) -- completed 2026-01-31
- [x] Phase 5: Polls (10/10 plans) -- completed 2026-01-31
- [x] Phase 6: Billing & Subscriptions (5/5 plans) -- completed 2026-02-01
- [x] Phase 7: Advanced Brackets (34/34 plans) -- completed 2026-02-08
- [x] Phase 7.1: Predictive Auto-Resolution (10/10 plans) -- completed 2026-02-15
- [x] Phase 8: Sports Integration (4/4 plans) -- completed 2026-02-15
- [x] Phase 9: Analytics (3/3 plans) -- completed 2026-02-15
- [x] Phase 10: Landing Page & Polish (5/5 plans) -- completed 2026-02-15
- [x] Phase 11: Visual Bracket Placement (6/6 plans) -- completed 2026-02-16

</details>

<details>
<summary>✅ v1.1 Production Readiness & Deploy (Phases 14-18) -- SHIPPED 2026-02-21</summary>

- [x] Phase 14: Service Configuration (2/2 plans) -- completed 2026-02-16
- [x] Phase 15: UX Polish (2/2 plans) -- completed 2026-02-16
- [x] Phase 16: Legal Pages (1/1 plans) -- completed 2026-02-16
- [x] Phase 17: Admin Panel (3/3 plans) -- completed 2026-02-17
- [x] Phase 18: Production Deploy (1/1 plans) -- completed 2026-02-21

</details>

<details>
<summary>✅ v1.2 Classroom Hardening (Phases 19-24) -- SHIPPED 2026-02-24</summary>

- [x] Phase 19: Security & Schema Foundation (2/2 plans) -- completed 2026-02-21
- [x] Phase 20: Name-Based Student Identity (3/3 plans) -- completed 2026-02-21
- [x] Phase 21: Poll Realtime Bug Fix (3/3 plans) -- completed 2026-02-22
- [x] Phase 22: UX Polish (3/3 plans) -- completed 2026-02-22
- [x] Phase 23: Session Archiving (3/3 plans) -- completed 2026-02-23
- [x] Phase 24: Bracket & Poll UX Consistency (6/6 plans) -- completed 2026-02-24

</details>

<details>
<summary>✅ v1.3 Bug Fixes & UX Parity (Phases 25-28) -- SHIPPED 2026-02-26</summary>

- [x] Phase 25: UX Parity (5/5 plans) -- completed 2026-02-26
- [x] Phase 26: Student Activity Removal (2/2 plans) -- completed 2026-02-26
- [x] Phase 27: SE Final Round Realtime Fix (1/1 plans) -- completed 2026-02-26
- [x] Phase 28: RR All-at-Once Completion Fix (3/3 plans) -- completed 2026-02-26

</details>

### 🚧 v2.0 Teacher Power-Ups (In Progress)

**Milestone Goal:** Give teachers full control over their activities (pause, undo, reopen, edit settings), streamline creation with quick-create workflows, and polish student-facing UX.

- [x] **Phase 29: Pause/Resume & Go Live** - Teachers can freeze and unfreeze any activity, with playful student-facing feedback and server-side vote enforcement (completed 2026-03-01)
- [x] **Phase 30: Undo Round Advancement** - Teachers can reverse the most recent round in any bracket type, with cascading cleanup of downstream matchups (completed 2026-03-01)
- [x] **Phase 31: Reopen Completed Activities** - Teachers can bring completed brackets and closed polls back to life for additional voting (completed 2026-03-01)
- [x] **Phase 31.1: Activity Card Layout Fix & Quick Settings Toggle** - Fix card title truncation at mid-width viewports and add inline simple/advanced toggle (INSERTED) (completed 2026-03-01)
- [x] **Phase 32: Settings Editing** - Teachers can adjust display settings on brackets and polls after creation, even while live (completed 2026-03-01)
- [x] **Phase 33: Bracket Quick Create** - Teachers can create a bracket in two clicks using curated topic chips and an entrant count picker (completed 2026-03-02)
- [x] **Phase 34: Poll Quick Create & Image Polish** - Teachers can create polls with just a question and options, with image previews matching bracket style (completed 2026-03-02)
- [ ] **Phase 35: Real-Time Vote Indicators** - Teachers see per-student green dot indicators as students vote, updating live across all activity types
- [ ] **Phase 36: Bug Fixes** - Fix nine bugs: duplicate poll options, 2-option centering, duplicate name prompt, poll quick create session selector, show live results, fullscreen auto-close, poll realtime updates, bracket vote indicators, Go Live/Start flow
- [ ] **Phase 37: User Profile & Admin Access** - User profile page with name editing and password change, forced password reset on first login with temporary password, and streamlined admin panel access from sidebar
- [ ] **Phase 38: Require Email Verification Before Login** - Email signup requires clicking verification link before dashboard access; Google OAuth unaffected

## Phase Details

### Phase 29: Pause/Resume & Go Live
**Goal**: Teachers can freeze any active bracket or poll to stop voting, then resume when ready -- with students seeing a playful "needs to cook" overlay and the server rejecting any sneaky vote attempts
**Depends on**: Nothing (foundation for v2.0 control features)
**Requirements**: CTRL-01, CTRL-02, CTRL-03, CTRL-04, CTRL-05, CTRL-06, LIVE-04
**Success Criteria** (what must be TRUE):
  1. Teacher clicks Pause on an active bracket and all student voting stops immediately; students see a themed "needs to cook" overlay instead of vote buttons
  2. Teacher clicks Resume on a paused bracket and students can vote again without refreshing; the overlay disappears automatically
  3. Pause and resume work identically for polls (same overlay, same server enforcement)
  4. A student who tries to submit a vote on a paused activity via API manipulation receives a rejection (server-side guard)
  5. All "View Live" buttons and labels throughout the app now read "Go Live"
**Plans:** 3/3 plans complete

Plans:
- [ ] 29-01-PLAN.md -- Backend foundation: types, validation, DAL transitions, broadcast events, vote guards, realtime hooks, API filters
- [ ] 29-02-PLAN.md -- Teacher controls: Radix Switch, pause toggle + banner in dashboards, Go Live rename + state indicators, status badges
- [ ] 29-03-PLAN.md -- Student overlay: cooking-themed PausedOverlay component, bracket + poll student page integration

### Phase 30: Undo Round Advancement
**Goal**: Teachers can reverse the most recent round advancement in any bracket type, restoring the bracket to its pre-advancement state with all downstream effects cleaned up
**Depends on**: Phase 29 (undo should be performed while paused; pause infrastructure provides status management foundation)
**Requirements**: CTRL-07, CTRL-08, CTRL-09, CTRL-10, CTRL-11
**Success Criteria** (what must be TRUE):
  1. Teacher clicks Undo Round on an SE bracket and the most recent round's winners are cleared, matchups reopen for voting, and any downstream matchups that used those winners are also cleared
  2. Teacher clicks Undo Round on a DE bracket and winners are cleared, loser bracket placements from that round are reversed, and downstream matchups in both winner and loser brackets are cleaned up
  3. Teacher clicks Undo Round on an RR bracket and the most recent round's results are cleared, reopening those matchups for voting
  4. Teacher clicks Undo Round on a predictive bracket and the most recent round's resolutions are reversed, restoring matchups to unresolved state
  5. If a teacher already advanced rounds beyond the one being undone, all cascading dependent matchups and votes in later rounds are cleared as part of the undo
**Plans:** 3/3 plans complete

Plans:
- [ ] 30-01-PLAN.md -- Backend undo engine: SE + RR + DE + Predictive undo functions and round detection utility in advancement.ts
- [ ] 30-02-PLAN.md -- Server action: broadcast type, validation schema, undoRoundAdvancement action with auto-pause
- [ ] 30-03-PLAN.md -- Frontend UI: undo button, confirmation dialog, dynamic labels, loading states in live-dashboard

### Phase 31: Reopen Completed Activities
**Goal**: Teachers can bring completed brackets and closed polls back for additional voting instead of recreating them from scratch
**Depends on**: Phase 29 (reopened activities land in paused state; requires pause infrastructure)
**Requirements**: CTRL-12, CTRL-13
**Success Criteria** (what must be TRUE):
  1. Teacher clicks Reopen on a completed bracket and it returns to a paused state with all existing data preserved; teacher can then resume to allow more voting
  2. Teacher clicks Reopen on a closed poll and it returns to a paused state with all existing votes preserved; teacher can then resume to collect more votes
  3. Students who had previously seen the completion/celebration screen now see the active activity again (no stale celebration stuck on screen)
**Plans:** 2/2 plans complete

Plans:
- [ ] 31-01-PLAN.md -- Backend reopen infrastructure: DAL functions, server actions, broadcast events, realtime hook fixes
- [ ] 31-02-PLAN.md -- UI reopen controls: context menu, live dashboard buttons, poll reopen fix, status badge, student transition verification

### Phase 31.1: Activity Card Layout Fix & Quick Settings Toggle (INSERTED)

**Goal:** Activity cards display properly at all screen sizes with readable titles/descriptions/metadata, and teachers can quickly toggle key bracket/poll settings inline on detail and live dashboard pages
**Requirements**: Overlaps with CTRL-14/15/16/17 scope (quick-toggle subset)
**Depends on:** Phase 31
**Success Criteria** (what must be TRUE):
  1. Activity cards never squeeze below readable width -- grids auto-adjust column count with a minimum card width floor
  2. Teacher can toggle bracket viewing mode (simple/advanced) on both the bracket detail page and live dashboard for single_elimination brackets
  3. Teacher can toggle "Show Live Results" and "Allow Vote Change" on both the poll detail page and live dashboard
  4. Settings changes on live activities take effect immediately for connected students without page refresh
  5. Toggles have visible labels and blend into existing page layout (no separate Quick Settings section)
**Plans:** 3/3 plans complete

Plans:
- [ ] 31.1-01-PLAN.md -- Card layout fix (auto-fill grid, badge wrap) + QuickSettingsToggle reusable component
- [ ] 31.1-02-PLAN.md -- Backend: updateBracketViewingMode action, broadcast types, updatePoll broadcast
- [ ] 31.1-03-PLAN.md -- Wire toggles on 4 teacher pages + student real-time hook updates

### Phase 32: Settings Editing
**Goal**: Teachers can adjust display settings on brackets and polls after creation -- even while live -- without risking structural data corruption
**Depends on**: Phase 29 (settings editing enhances the pause-edit-resume workflow; broadcast infrastructure needed for live sync)
**Requirements**: CTRL-14, CTRL-15, CTRL-16, CTRL-17
**Success Criteria** (what must be TRUE):
  1. Teacher opens a bracket's settings and can toggle display options (simple/advanced mode, show seeds, show vote counts, timer) even if the bracket is currently live; changes save and persist
  2. Teacher opens a poll's settings and can toggle display options (show live results, allow vote change) even if the poll is currently live; changes save and persist
  3. When a teacher changes display settings on a live activity, all connected student views update in real time without requiring a page refresh
  4. Structural settings (bracket type, bracket size, poll type) are visibly locked after creation with a clear indicator explaining they cannot be changed
**Plans:** 5/5 plans complete

Plans:
- [ ] 32-01-PLAN.md -- Foundation: DisplaySettingsSection, LockedSettingIndicator, consolidated updateBracketSettings action, useRealtimeBracket hook extension
- [ ] 32-02-PLAN.md -- Bracket teacher pages: DisplaySettingsSection on bracket detail + live dashboard with all toggles and locked indicators
- [ ] 32-03-PLAN.md -- Poll teacher pages: DisplaySettingsSection on poll detail + live dashboard with locked indicators
- [ ] 32-04-PLAN.md -- Student bracket page: viewingMode routing for all bracket types, DE simple mode, showVoteCounts/showSeedNumbers reactivity

### Phase 33: Bracket Quick Create
**Goal**: Teachers can create a bracket in two clicks by picking a curated topic and entrant count, skipping the multi-step wizard entirely
**Depends on**: Nothing (independent creation UX; uses existing createBracket action and CURATED_TOPICS data)
**Requirements**: CREATE-01, CREATE-02
**Success Criteria** (what must be TRUE):
  1. Bracket creation page shows a Quick Create mode with topic list chips (matching the existing poll quick-create pattern)
  2. Teacher picks a topic chip and selects an entrant count (4/8/16), clicks create, and a bracket is created with SE type, simple display mode, no seeds as defaults -- no other fields required
  3. The created bracket appears in the teacher's bracket list assigned to the correct session, ready to activate
**Plans:** 2/2 plans complete

Plans:
- [ ] 33-01-PLAN.md -- Page restructure with tab toggle + BracketQuickCreate component (topic chips, count picker, session dropdown, instant create)
- [ ] 33-02-PLAN.md -- Human verification of complete Quick Create flow

### Phase 34: Poll Quick Create & Image Polish
**Goal**: Teachers can create a poll with just a question and options, with settings available only in the step-by-step path, and image previews matching bracket visual style
**Depends on**: Nothing (independent creation UX)
**Requirements**: CREATE-03, CREATE-04, CREATE-05
**Success Criteria** (what must be TRUE):
  1. Poll Quick Create shows only a question field and option inputs -- no settings toggles visible (allow vote change, show live results are hidden)
  2. Poll settings (allow vote change, show live results) are available only when the teacher uses Step-by-Step creation mode
  3. Poll option images preview in the same card/thumbnail style as bracket entrant images before creation (consistent visual language)
**Plans:** 3/3 plans complete

Plans:
- [ ] 34-01-PLAN.md -- Poll creation page restructure + PollForm Quick Create mode + template chip grid
- [ ] 34-02-PLAN.md -- Image upload draft pattern + dashed-border camera icon + option row reorder
- [ ] 34-03-PLAN.md -- Human verification of complete Quick Create & Image Polish flow

### Phase 35: Real-Time Vote Indicators
**Goal**: Teachers see at a glance which students have voted on the current round or poll, with green dot indicators that update live as votes come in
**Depends on**: Nothing (independent live dashboard enhancement; extends existing ParticipationSidebar)
**Requirements**: LIVE-01, LIVE-02, LIVE-03
**Success Criteria** (what must be TRUE):
  1. Student Activity panel on the live dashboard shows a green dot next to each student who has voted on the active round or poll
  2. When a student casts a vote, their green dot appears within seconds without the teacher refreshing the page
  3. Vote indicators work across all activity types: SE brackets, DE brackets, RR brackets, predictive brackets, and polls
**Plans:** 3/4 plans executed

Plans:
- [ ] 35-01-PLAN.md -- Server-side broadcast augmentation + polling fallback APIs with participantId
- [ ] 35-02-PLAN.md -- Bracket realtime voterIds in hook + live-dashboard wiring + sidebar sort reversal
- [ ] 35-03-PLAN.md -- Poll ParticipationSidebar + poll realtime voterIds tracking
- [ ] 35-04-PLAN.md -- Human verification across all activity types

### Phase 36: Bug Fixes
**Goal**: Fix nine known bugs affecting poll duplication, poll layout, duplicate name flow, poll quick create parity, live results display, fullscreen mode, poll realtime updates, bracket vote indicators, and Go Live/Start flow
**Depends on**: Nothing (independent fixes)
**Requirements**: FIX-01, FIX-02, FIX-03, FIX-04, FIX-05, FIX-06, FIX-07, FIX-08, FIX-09
**Success Criteria** (what must be TRUE):
  1. Teacher duplicates a poll, removes some options, saves -- the duplicated poll correctly shows only the remaining options (no ghost options from the original)
  2. Student viewing a poll with exactly 2 options sees them as side-by-side larger cards, centered on screen (stacking vertically on mobile)
  3. When a student enters a name already taken in the session, the duplicate name prompt says "Name taken. Add your last initial to join." with the original name kept in the input
  4. Poll Quick Create includes an "Assign to session" dropdown matching the bracket Quick Create layout exactly
  5. When "Show Live Results" is toggled ON for a poll, students see the same results display the teacher dashboard shows (vote counts + bars) in real time
  6. Fullscreen mode on the teacher live dashboard stays open until Esc or F is pressed -- no auto-close
  7. Poll teacher live dashboard updates in real time as students vote (no manual refresh needed)
  8. Bracket vote indicators (blue/green dots) update correctly when students vote -- green dot + sort to bottom, matching poll behavior
  9. Go Live button is hidden on bracket/poll detail pages until after Start is clicked; clicking Start activates and auto-navigates to the live dashboard
**Plans:** 4/5 plans executed

Plans:
- [ ] 36-01-PLAN.md -- Fix ghost options on poll duplication + add session dropdown to Poll Quick Create
- [ ] 36-02-PLAN.md -- Fix 2-option poll centering + student live results display
- [ ] 36-03-PLAN.md -- Fix duplicate name prompt to direct "Name taken" message
- [ ] 36-04-PLAN.md -- Fix fullscreen auto-close + poll teacher dashboard realtime updates
- [ ] 36-05-PLAN.md -- Fix bracket vote indicators for SE/DE + Go Live/Start flow

## Progress

**Execution Order:**
Phases execute in numeric order: 29 -> 30 -> 31 -> 31.1 -> 32 -> 33 -> 34 -> 35 -> 36 -> 37 -> 38
Note: Phases 33-36 are independent of the control feature chain (29-32) and can be parallelized if convenient.

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Foundation & Auth | v1.0 | 5/5 | Complete | 2026-01-29 |
| 2. Student Join Flow | v1.0 | 6/6 | Complete | 2026-01-29 |
| 3. Bracket Creation & Management | v1.0 | 7/7 | Complete | 2026-01-30 |
| 4. Voting & Real-Time | v1.0 | 6/6 | Complete | 2026-01-31 |
| 5. Polls | v1.0 | 10/10 | Complete | 2026-01-31 |
| 6. Billing & Subscriptions | v1.0 | 5/5 | Complete | 2026-02-01 |
| 7. Advanced Brackets | v1.0 | 34/34 | Complete | 2026-02-08 |
| 7.1 Predictive Auto-Resolution | v1.0 | 10/10 | Complete | 2026-02-15 |
| 8. Sports Integration | v1.0 | 4/4 | Complete | 2026-02-15 |
| 9. Analytics | v1.0 | 3/3 | Complete | 2026-02-15 |
| 10. Landing Page & Polish | v1.0 | 5/5 | Complete | 2026-02-15 |
| 11. Visual Bracket Placement | v1.0 | 6/6 | Complete | 2026-02-16 |
| 14. Service Configuration | v1.1 | 2/2 | Complete | 2026-02-16 |
| 15. UX Polish | v1.1 | 2/2 | Complete | 2026-02-16 |
| 16. Legal Pages | v1.1 | 1/1 | Complete | 2026-02-16 |
| 17. Admin Panel | v1.1 | 3/3 | Complete | 2026-02-17 |
| 18. Production Deploy | v1.1 | 1/1 | Complete | 2026-02-21 |
| 19. Security & Schema Foundation | v1.2 | 2/2 | Complete | 2026-02-21 |
| 20. Name-Based Student Identity | v1.2 | 3/3 | Complete | 2026-02-21 |
| 21. Poll Realtime Bug Fix | v1.2 | 3/3 | Complete | 2026-02-22 |
| 22. UX Polish | v1.2 | 3/3 | Complete | 2026-02-22 |
| 23. Session Archiving | v1.2 | 3/3 | Complete | 2026-02-23 |
| 24. Bracket & Poll UX Consistency | v1.2 | 6/6 | Complete | 2026-02-24 |
| 25. UX Parity | v1.3 | 5/5 | Complete | 2026-02-26 |
| 26. Student Activity Removal | v1.3 | 2/2 | Complete | 2026-02-26 |
| 27. SE Final Round Realtime Fix | v1.3 | 1/1 | Complete | 2026-02-26 |
| 28. RR All-at-Once Completion Fix | v1.3 | 3/3 | Complete | 2026-02-26 |
| 29. Pause/Resume & Go Live | 3/3 | Complete    | 2026-03-01 | - |
| 30. Undo Round Advancement | 3/3 | Complete    | 2026-03-01 | - |
| 31. Reopen Completed Activities | 2/2 | Complete    | 2026-03-01 | - |
| 31.1 Activity Card Layout Fix & Quick Settings Toggle | 3/3 | Complete    | 2026-03-01 | - |
| 32. Settings Editing | 5/5 | Complete    | 2026-03-01 | - |
| 33. Bracket Quick Create | 1/2 | Complete    | 2026-03-02 | - |
| 34. Poll Quick Create & Image Polish | 2/3 | Complete    | 2026-03-02 | - |
| 35. Real-Time Vote Indicators | 3/4 | In Progress|  | - |
| 36. Bug Fixes | 4/5 | In Progress|  | - |
| 37. User Profile & Admin Access | v2.0 | 0/TBD | Not started | - |
| 38. Require Email Verification Before Login | v2.0 | 0/3 | Not started | - |

### Phase 37: User Profile & Admin Access
**Goal**: Teachers can manage their account from a profile page (edit name, change password), admins can access the admin panel directly from the sidebar, and accounts created with temporary passwords force an immediate password change on first login
**Depends on**: Nothing (independent account management features)
**Requirements**: PROFILE-01, PROFILE-02, PROFILE-03, ADMIN-01
**Success Criteria** (what must be TRUE):
  1. Teacher clicks "Profile" in the sidebar (below Billing) and sees a profile page where they can edit their display name and save it
  2. Teacher can change their password from the profile page (current password + new password + confirm)
  3. When an admin creates a teacher account via the admin panel with a temporary password, that teacher's first login forces them to set a new password before accessing the dashboard
  4. Admin users see an "Admin" link in the sidebar that navigates directly to /admin -- no manual URL typing required
**Plans**: TBD

Plans:
- [ ] 37-01: TBD

### Phase 38: Require Email Verification Before Login
**Goal**: Email signup flow enforces verification before granting access -- teachers who sign up with email must click a verification link before they can log in; Google sign-in is unaffected (already verified by OAuth)
**Depends on**: Nothing (independent auth enforcement)
**Requirements**: AUTH-01
**Success Criteria** (what must be TRUE):
  1. Teacher signs up with email and receives a verification email with a working confirmation link
  2. Teacher who has not verified their email is blocked from accessing the dashboard -- they see a "check your email" screen instead
  3. Clicking the verification link in the email marks the account as verified and allows login/dashboard access
  4. Teachers who sign in via Google OAuth bypass email verification entirely (Google already confirms email ownership)
**Plans:** 3 plans

Plans:
- [ ] 38-01-PLAN.md -- Backend auth actions (signUp/signIn interception, resendVerification), proxy update, callback expired link handling
- [ ] 38-02-PLAN.md -- Verify-email blocking page with resend/cooldown/Google/sign-out + signup/login form redirects
- [ ] 38-03-PLAN.md -- Human verification of complete email verification flow
