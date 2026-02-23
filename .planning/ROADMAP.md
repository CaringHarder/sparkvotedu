# Roadmap: SparkVotEDU

## Milestones

- **v1.0 MVP** -- Phases 1-11 (shipped 2026-02-16) | [Archive](milestones/v1.0-ROADMAP.md)
- **v1.1 Production Readiness & Deploy** -- Phases 14-18 (shipped 2026-02-21) | [Archive](milestones/v1.1-ROADMAP.md)
- **v1.2 Classroom Hardening** -- Phases 19-23 (completed 2026-02-23)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-11) -- SHIPPED 2026-02-16</summary>

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
<summary>v1.1 Production Readiness & Deploy (Phases 14-18) -- SHIPPED 2026-02-21</summary>

- [x] Phase 14: Service Configuration (2/2 plans) -- completed 2026-02-16
- [x] Phase 15: UX Polish (2/2 plans) -- completed 2026-02-16
- [x] Phase 16: Legal Pages (1/1 plans) -- completed 2026-02-16
- [x] Phase 17: Admin Panel (3/3 plans) -- completed 2026-02-17
- [x] Phase 18: Production Deploy (1/1 plans) -- completed 2026-02-21

</details>

### v1.2 Classroom Hardening (In Progress)

**Milestone Goal:** Fix real-world classroom issues discovered during first deployment -- replace failed device fingerprinting with name-based student identity, fix bugs, harden security, and polish UX.

- [x] **Phase 19: Security & Schema Foundation** - RLS on all 12 tables + additive schema migration for name-based identity (completed 2026-02-21)
- [x] **Phase 20: Name-Based Student Identity** - Students join with first name instead of device fingerprint (completed 2026-02-21)
- [x] **Phase 21: Poll Realtime Bug Fix** - Teacher poll dashboard updates in real-time when students vote (gap closure in progress) (completed 2026-02-22)
- [x] **Phase 22: UX Polish** - Presentation contrast, session naming, and terminology unification (completed 2026-02-22)
- [x] **Phase 23: Session Archiving** - Teachers can archive, recover, and permanently delete sessions (completed 2026-02-23)

## Phase Details

### Phase 19: Security & Schema Foundation
**Goal**: Supabase tables are locked down from direct client access, and the database schema is ready for the name-based identity overhaul
**Depends on**: Phase 18 (production deploy)
**Requirements**: SEC-01, SEC-02, SEC-03
**Success Criteria** (what must be TRUE):
  1. A curl request using the Supabase anon key against any of the 12 public tables returns an empty array (no data leaked)
  2. All existing application features (teacher dashboard, student voting, bracket advancement, polls) continue to function identically after RLS enablement
  3. The `student_participants` table has a `first_name` column and `device_id` is nullable, verified by Prisma schema and a successful migration
**Plans**: 2 plans

Plans:
- [ ] 19-01-PLAN.md -- Database migration: deny-all RLS on 12 tables, schema changes (first_name, device_id nullable), content data wipe
- [ ] 19-02-PLAN.md -- Name validation utility (profanity filter, emoji rejection, Unicode support) and upgrade banner for teacher dashboard

### Phase 20: Name-Based Student Identity
**Goal**: Students can join and rejoin any session using their first name, with graceful handling of duplicate names and preserved fun-name anonymity
**Depends on**: Phase 19 (schema must have `first_name` column)
**Requirements**: IDENT-01, IDENT-02, IDENT-03, IDENT-04, IDENT-05, IDENT-06
**Success Criteria** (what must be TRUE):
  1. A student can join a session by entering the session code and their first name (no device fingerprint prompt, no device-dependent behavior)
  2. A student who types their name in different casing (e.g., "jake" vs "Jake") is recognized as the same student, not created as a duplicate
  3. When a second student enters an already-taken first name, they see a disambiguation prompt and can differentiate themselves (e.g., add last initial)
  4. After joining, the student is assigned a random fun name for display (Kahoot-style anonymity preserved in polls and brackets)
  5. A student can rejoin from any device using their first name and can edit their name after joining
**Plans**: 3 plans

Plans:
- [ ] 20-01-PLAN.md -- Server-side foundation: types, DAL functions (findParticipantsByFirstName, findSessionByCode), and server actions (joinSessionByName, claimIdentity, updateParticipantName)
- [ ] 20-02-PLAN.md -- Student join flow UI: two-step code+name entry, name disambiguation ("Is this you?"), updated welcome screen
- [ ] 20-03-PLAN.md -- Teacher dashboard name mappings ("Fun Name (Real Name)"), student name-edit dialog, session layout updates

### Phase 21: Poll Realtime Bug Fix
**Goal**: Teacher poll live dashboard reflects student votes in real-time without stale data
**Depends on**: Phase 19 (RLS must be verified so realtime subscriptions are confirmed working)
**Requirements**: FIX-01, FIX-02
**Success Criteria** (what must be TRUE):
  1. When a student submits a poll vote, the teacher's live dashboard updates within 2 seconds without manual refresh
  2. When a teacher activates a poll, the poll channel receives the activation broadcast (not just the activity channel), and any student or teacher client subscribed to that poll sees the status change
**Plans**: 3 plans

Plans:
- [x] 21-01-PLAN.md -- Server-side bug fixes: dual-channel broadcast on poll activation/close/archive (FIX-02), dynamic participantCount in poll state API and useRealtimePoll hook (FIX-01 foundation)
- [x] 21-02-PLAN.md -- Teacher dashboard UI: dynamic participation indicator, leading-option bar chart styling, smooth vote count transitions, enhanced connection status indicator
- [ ] 21-03-PLAN.md -- Gap closure: broadcast participant-join events and subscribe useRealtimePoll to update participation denominator dynamically

### Phase 22: UX Polish
**Goal**: Classroom presentation is readable on projectors, sessions are identifiable by name, and activation terminology is consistent across the product
**Depends on**: Phase 19 (no schema dependency, but phases execute sequentially)
**Requirements**: UX-01, UX-02, UX-03, UX-04
**Success Criteria** (what must be TRUE):
  1. Ranked poll presentation mode shows all medal cards (gold, silver, bronze, and remaining items) with clearly readable text contrast, verifiable on a projector or low-brightness display
  2. Session selection dropdowns throughout the teacher dashboard display the session name (e.g., "Period 3 History") instead of session number or code, with a sensible fallback for unnamed sessions
  3. A teacher can edit the session name directly from the dashboard without navigating away
  4. All activation buttons and status badges across brackets and polls use a single consistent term ("Start" / "Active") instead of mixed "Activate" / "Go Live" terminology
**Plans**: 3 plans

Plans:
- [ ] 22-01-PLAN.md -- Projector-optimized presentation results: PresentationResults component with high-contrast medal cards, large text, dark background
- [ ] 22-02-PLAN.md -- Session name editing: updateSessionName DAL/action, EditableSessionName component, click-to-edit on session detail, fallback format with date
- [ ] 22-03-PLAN.md -- Terminology unification + session name dropdowns: "Start"/"End" replaces "Activate"/"Go Live", session dropdowns show names, dashboard badge update

## Progress

**Execution Order:**
Phases execute in numeric order: 19 -> 20 -> 21 -> 22 -> 23

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
| 23. Session Archiving | v1.2 | Complete    | 2026-02-23 | 2026-02-23 |

### Phase 23: Session Archiving
**Goal**: Teachers can archive, recover, and permanently delete sessions -- includes archivedAt schema migration, archive/unarchive actions, archived sessions tab/filter, permanent delete with cascade, and session list filtering to hide archived by default
**Depends on**: Phase 22
**Plans**: 3 plans

Plans:
- [ ] 23-01-PLAN.md -- Schema migration (archivedAt), DAL functions (archive/unarchive/delete/list), server actions, session list filtering
- [ ] 23-02-PLAN.md -- Session card three-dot context menu, archive confirmation dialog, sessions page integration
- [ ] 23-03-PLAN.md -- Archived sessions page with search/recover/delete, sidebar nav link, student join code block
