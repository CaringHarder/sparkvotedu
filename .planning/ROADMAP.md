# Roadmap: SparkVotEDU

## Milestones

- ✅ **v1.0 MVP** -- Phases 1-11 (shipped 2026-02-16) | [Archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Production Readiness & Deploy** -- Phases 14-18 (shipped 2026-02-21) | [Archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Classroom Hardening** -- Phases 19-24 (shipped 2026-02-24) | [Archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Bug Fixes & UX Parity** -- Phases 25-28 (shipped 2026-02-26) | [Archive](milestones/v1.3-ROADMAP.md)
- ✅ **v2.0 Teacher Power-Ups** -- Phases 29-38 (shipped 2026-03-08)
- 🚧 **v3.0 Student Join Overhaul + Cleanup** -- Phases 39-44 (in progress)

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

<details>
<summary>✅ v2.0 Teacher Power-Ups (Phases 29-38) -- SHIPPED 2026-03-08</summary>

- [x] Phase 29: Pause/Resume & Go Live (3/3 plans) -- completed 2026-03-01
- [x] Phase 30: Undo Round Advancement (3/3 plans) -- completed 2026-03-01
- [x] Phase 31: Reopen Completed Activities (2/2 plans) -- completed 2026-03-01
- [x] Phase 31.1: Activity Card Layout Fix & Quick Settings Toggle (3/3 plans) -- completed 2026-03-01
- [x] Phase 32: Settings Editing (5/5 plans) -- completed 2026-03-01
- [x] Phase 33: Bracket Quick Create (2/2 plans) -- completed 2026-03-02
- [x] Phase 34: Poll Quick Create & Image Polish (3/3 plans) -- completed 2026-03-02
- [x] Phase 35: Real-Time Vote Indicators (4/4 plans) -- completed 2026-03-02
- [x] Phase 36: Bug Fixes (5/5 plans) -- completed 2026-03-02
- [x] Phase 37: User Profile & Admin Access (3/3 plans) -- completed 2026-03-02
- [x] Phase 38: Require Email Verification Before Login (3/3 plans) -- completed 2026-03-08

</details>

### 🚧 v3.0 Student Join Overhaul + Cleanup (In Progress)

**Milestone Goal:** Redesign the student join experience to be instant (fun name + emoji first, real name second) with seamless same-device auto-rejoin and cross-device identity reclaim, plus clean up legacy fingerprinting code.

- [x] **Phase 39: Schema Migration + Data Foundation** - Add emoji and lastInitial columns to StudentParticipant, create curated emoji pool module (completed 2026-03-08)
- [ ] **Phase 40: Server Actions + DAL** - Build backend logic for cross-device identity reclaim, name disambiguation, and unified join flow
- [ ] **Phase 41: Join Wizard UI** - Replace NameEntryForm with 3-step join wizard (fun name instant, name entry, emoji pick, welcome)
- [ ] **Phase 42: localStorage Persistence + Auto-Rejoin** - Same-device returning students auto-rejoin silently via localStorage session map
- [ ] **Phase 43: FingerprintJS Removal** - Remove FingerprintJS package, application code, and database columns
- [ ] **Phase 44: Teacher Sidebar + Emoji Display** - Teacher name view toggle, student self-edit, emoji display throughout all session UI

## Phase Details

### Phase 39: Schema Migration + Data Foundation
**Goal**: The database can store emoji identity and last initial for every student participant, and a curated emoji pool module provides K-12-safe shortcodes for assignment
**Depends on**: Nothing (foundation for all v3.0 work)
**Requirements**: MIGR-01
**Success Criteria** (what must be TRUE):
  1. StudentParticipant table has nullable `emoji` (varchar 20) and `lastInitial` (varchar 2) columns with a compound index on (sessionId, firstName, lastInitial)
  2. Existing participants are unaffected -- all current data remains intact with null emoji and lastInitial values
  3. A curated emoji pool module exports a list of 20-30 K-12-safe emoji shortcodes with a `pickEmoji()` function that attempts session-uniqueness
  4. An `EmojiAvatar` component renders any shortcode as its visual emoji character consistently across browsers
**Plans**: 1 plan
Plans:
- [ ] 39-01-PLAN.md -- Schema migration + emoji pool module + EmojiAvatar component

### Phase 40: Server Actions + DAL
**Goal**: The backend can create participants with emoji and lastInitial, look up returning students by name+initial, and handle ambiguous matches -- enabling both new join and cross-device reclaim flows
**Depends on**: Phase 39 (requires emoji/lastInitial columns and emoji pool module)
**Requirements**: PERS-03, PERS-04, MIGR-03
**Success Criteria** (what must be TRUE):
  1. `createParticipant` action accepts lastInitial and auto-assigns an emoji shortcode from the pool
  2. A `lookupStudent` action finds returning students by firstName + lastInitial within a session, returning their fun name and emoji for confirmation
  3. When multiple participants match a name+initial query, the action returns all matches with fun names and emojis so the student can pick their identity
  4. The join flow server actions work identically for brand-new sessions and sessions with existing participants
**Plans**: 1 plan
Plans:
- [ ] 39-01-PLAN.md -- Schema migration + emoji pool module + EmojiAvatar component

### Phase 41: Join Wizard UI
**Goal**: Students entering a session see an instant fun name assignment followed by a guided 3-step wizard to enter their real name, pick an emoji, and see a welcome confirmation -- replacing the old single-input name form
**Depends on**: Phase 40 (wizard calls server actions for participant creation and lookup)
**Requirements**: JOIN-01, JOIN-02, JOIN-03
**Success Criteria** (what must be TRUE):
  1. Student enters a class code (or visits a direct link) and immediately sees their assigned fun name before any form input
  2. Student completes a 3-step wizard: first name (auto-focused input, green button appears on keystroke) then last initial (max 2 chars, animates in) then emoji picker (4x4 grid of 16 curated emojis)
  3. After completing the wizard, student sees a welcome screen showing their fun name + chosen emoji before entering the session
  4. Returning students who match by name+initial see a disambiguation screen with fun names and emojis to pick from (not auto-claimed)
**Plans**: 1 plan
Plans:
- [ ] 39-01-PLAN.md -- Schema migration + emoji pool module + EmojiAvatar component

### Phase 42: localStorage Persistence + Auto-Rejoin
**Goal**: Students returning on the same device skip the join wizard entirely -- localStorage remembers their identity across all sessions they have joined, and re-entering a class code auto-rejoins silently
**Depends on**: Phase 41 (persistence enhances the working wizard; wizard must function without persistence first)
**Requirements**: PERS-01, PERS-02
**Success Criteria** (what must be TRUE):
  1. Student who previously joined a session returns to the same class code on the same device and is auto-rejoined with zero clicks (no wizard shown)
  2. localStorage stores identities for all sessions the student has joined (not just the most recent), keyed by sessionId
  3. When localStorage is unavailable (ephemeral Chromebook mode, private browsing), the join wizard runs normally with no errors or warnings -- name-based server-side reclaim is the fallback
  4. Stored identities older than 30 days are automatically pruned from localStorage
**Plans**: 1 plan
Plans:
- [ ] 39-01-PLAN.md -- Schema migration + emoji pool module + EmojiAvatar component

### Phase 43: FingerprintJS Removal
**Goal**: All FingerprintJS code, dependencies, and database columns are removed from the codebase, reducing the client bundle by ~150KB and eliminating dead code across application, schema, and package layers
**Depends on**: Phase 42 (localStorage persistence fully replaces fingerprint-based identity; safe to remove after new system is working)
**Requirements**: CLEN-01, CLEN-02, CLEN-03
**Success Criteria** (what must be TRUE):
  1. The FingerprintJS npm package is uninstalled and no fingerprint-related imports exist anywhere in the codebase (verified by grep)
  2. All fingerprint-related application code (fingerprint.ts, use-device-identity.ts references, server action fingerprint parameters) is removed
  3. Device fingerprint database columns are dropped via a separate Prisma migration
  4. Client bundle size is reduced by approximately 150KB compared to pre-removal baseline
**Plans**: 1 plan
Plans:
- [ ] 39-01-PLAN.md -- Schema migration + emoji pool module + EmojiAvatar component

### Phase 44: Teacher Sidebar + Emoji Display
**Goal**: Teachers can toggle between fun name and real name views in the participation sidebar, edit student display names, and students can self-edit their name and emoji -- with emoji + fun name displayed consistently throughout all session UI
**Depends on**: Phase 41 (emoji data must exist on participants; display components need EmojiAvatar from Phase 39)
**Requirements**: JOIN-04, TCHR-01, TCHR-02, TCHR-03, TCHR-04, MIGR-02
**Success Criteria** (what must be TRUE):
  1. Teacher clicks a toggle in the participation sidebar to switch between fun name view (emoji + fun name) and real name view (first name + last initial) -- the toggle persists as a global default on the teacher profile
  2. Teacher can override the global name view default on a per-session basis without changing their global preference
  3. Teacher can click on any student in the sidebar and edit their display name
  4. Student sees a gear icon in the session header that opens an editor to change their display name and emoji
  5. Existing participants who rejoin without an emoji are prompted once to pick an emoji (one-time migration experience)
**Plans**: 1 plan
Plans:
- [ ] 39-01-PLAN.md -- Schema migration + emoji pool module + EmojiAvatar component

## Progress

**Execution Order:**
Phases execute in numeric order: 39 -> 40 -> 41 -> 42 -> 43 -> 44
Phases 39-41 are strictly sequential (schema -> actions -> UI). Phase 42 requires 41. Phase 43 requires 42. Phase 44 requires 41.

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
| 29. Pause/Resume & Go Live | v2.0 | 3/3 | Complete | 2026-03-01 |
| 30. Undo Round Advancement | v2.0 | 3/3 | Complete | 2026-03-01 |
| 31. Reopen Completed Activities | v2.0 | 2/2 | Complete | 2026-03-01 |
| 31.1 Activity Card Layout Fix | v2.0 | 3/3 | Complete | 2026-03-01 |
| 32. Settings Editing | v2.0 | 5/5 | Complete | 2026-03-01 |
| 33. Bracket Quick Create | v2.0 | 2/2 | Complete | 2026-03-02 |
| 34. Poll Quick Create & Image Polish | v2.0 | 3/3 | Complete | 2026-03-02 |
| 35. Real-Time Vote Indicators | v2.0 | 4/4 | Complete | 2026-03-02 |
| 36. Bug Fixes | v2.0 | 5/5 | Complete | 2026-03-02 |
| 37. User Profile & Admin Access | v2.0 | 3/3 | Complete | 2026-03-02 |
| 38. Email Verification | v2.0 | 3/3 | Complete | 2026-03-08 |
| 39. Schema Migration + Data Foundation | 1/1 | Complete    | 2026-03-08 | - |
| 40. Server Actions + DAL | v3.0 | 0/TBD | Not started | - |
| 41. Join Wizard UI | v3.0 | 0/TBD | Not started | - |
| 42. localStorage Persistence + Auto-Rejoin | v3.0 | 0/TBD | Not started | - |
| 43. FingerprintJS Removal | v3.0 | 0/TBD | Not started | - |
| 44. Teacher Sidebar + Emoji Display | v3.0 | 0/TBD | Not started | - |
