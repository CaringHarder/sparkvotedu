# Roadmap: SparkVotEDU

## Milestones

- **v1.0 MVP** -- Phases 1-11 (shipped 2026-02-16) | [Archive](milestones/v1.0-ROADMAP.md)
- **v1.1 Production Readiness & Deploy** -- Phases 14-18 (shipped 2026-02-21) | [Archive](milestones/v1.1-ROADMAP.md)
- **v1.2 Classroom Hardening** -- Phases 19-24 (shipped 2026-02-24)
- **v1.3 Bug Fixes & UX Parity** -- Phases 25-28 (in progress)

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

<details>
<summary>v1.2 Classroom Hardening (Phases 19-24) -- SHIPPED 2026-02-24</summary>

- [x] Phase 19: Security & Schema Foundation (2/2 plans) -- completed 2026-02-21
- [x] Phase 20: Name-Based Student Identity (3/3 plans) -- completed 2026-02-21
- [x] Phase 21: Poll Realtime Bug Fix (3/3 plans) -- completed 2026-02-22
- [x] Phase 22: UX Polish (3/3 plans) -- completed 2026-02-22
- [x] Phase 23: Session Archiving (3/3 plans) -- completed 2026-02-23
- [x] Phase 24: Bracket & Poll UX Consistency (6/6 plans) -- completed 2026-02-24

</details>

### v1.3 Bug Fixes & UX Parity (In Progress)

**Milestone Goal:** Fix remaining bugs and UX gaps discovered during classroom testing -- realtime update issues, missing UI controls, and interaction feedback.

- [x] **Phase 25: UX Parity** - Poll context menu and sign-out button feedback to match established patterns -- completed 2026-02-26
- [x] **Phase 26: Student Activity Removal** - Deleted brackets and polls disappear from student dashboards in real time (completed 2026-02-26)
- [ ] **Phase 27: SE Final Round Realtime Fix** - Single elimination final round continues showing live vote updates
- [x] **Phase 28: RR All-at-Once Completion Fix** - Round robin all-at-once brackets complete only after all rounds are decided (completed 2026-02-26)

## Phase Details

### Phase 25: UX Parity
**Goal**: Teachers see consistent UI controls and feedback across all interaction points -- poll cards have the same context menu as bracket cards, and sign-out gives immediate visual feedback
**Depends on**: Phase 24
**Requirements**: UXP-01, UXP-02
**Success Criteria** (what must be TRUE):
  1. Poll cards on the teacher dashboard show a triple-dot menu with archive, duplicate, and delete actions matching the bracket card context menu
  2. Clicking the triple-dot menu on a poll card opens the menu without navigating into the poll
  3. Teacher clicks sign-out and immediately sees a disabled/pending state (spinner or text change) confirming the action is processing -- no ambiguity, no double-click possible
**Plans:** 5 plans

Plans:
- [x] 25-01-PLAN.md -- Backend infrastructure and shared UI components (DAL functions, server actions, CardContextMenu, DeleteConfirmDialog)
- [x] 25-02-PLAN.md -- Card integration with unified menu, animations, and sign-out pending state
- [x] 25-03-PLAN.md -- [gap closure] Fix stale UI after inline rename (useEffect prop sync)
- [x] 25-04-PLAN.md -- [gap closure] Archive views for brackets and polls with recover and permanent delete
- [x] 25-05-PLAN.md -- [gap closure] Optimistic rename display in bracket and poll card h3 elements

### Phase 26: Student Activity Removal
**Goal**: Students see an accurate, live view of available activities -- when a teacher deletes a bracket or poll, it disappears from the student dashboard without requiring a page refresh
**Depends on**: Phase 25 (poll context menu Delete action will immediately trigger this broadcast)
**Requirements**: FIX-03
**Success Criteria** (what must be TRUE):
  1. When a teacher deletes a bracket from the dashboard, it disappears from all connected students' activity grids within approximately 2 seconds
  2. When a teacher deletes a poll from the dashboard (via the new context menu), it disappears from all connected students' activity grids within approximately 2 seconds
  3. No Supabase channel subscription leaks are introduced -- every new channel subscription has a paired removeChannel in cleanup
**Plans:** 2/2 plans complete

Plans:
- [ ] 26-01-PLAN.md -- Broadcast wiring + animated card removal + reconnection resilience
- [ ] 26-02-PLAN.md -- Mid-activity deletion detection + toast redirect on bracket/poll pages

### Phase 27: SE & Predictive Realtime Vote Display Fix
**Goal**: Single elimination and predictive brackets maintain live vote count updates through all rounds -- teachers and students see votes update in real time, including the final round
**Depends on**: Phase 26
**Requirements**: FIX-02
**Success Criteria** (what must be TRUE):
  1. In a single elimination bracket, after advancing to the final round (e.g., championship matchup in an 8-team bracket), vote counts update in real time on the teacher live dashboard without manual refresh
  2. The student bracket view for the final round also reflects live vote count changes as they happen
  3. Predictive bracket vote counts display correctly on all rounds (not just some)
  4. Double elimination brackets verified to not have the same issue (fix if affected)
**Plans:** 1 plan

Plans:
- [ ] 27-01-PLAN.md -- Cache-busting fetch + stale response guard + force-dynamic API route fix

### Phase 28: RR All-at-Once Completion Fix
**Goal**: Round robin all-at-once brackets complete correctly -- the bracket only transitions to completed status after every matchup across all rounds has been decided, and celebration fires properly on both teacher and student views
**Depends on**: Phase 27 (SE investigation may reveal shared root causes in celebration chain)
**Requirements**: FIX-01
**Success Criteria** (what must be TRUE):
  1. An RR all-at-once bracket with multiple rounds does not show completion or celebration after only the first round is decided -- it remains active until all matchups across all rounds are decided
  2. When the final matchup of the final round is decided, the bracket transitions to completed and the celebration fires on both teacher and student views
  3. The celebration does not loop infinitely -- it fires once and dismisses cleanly (hasShownRevealRef guard present in RRLiveView)
  4. The calculateRoundRobinStandings function from Phase 24 continues to work correctly for champion determination (non-regression)
**Plans:** 2/2 plans complete

Plans:
- [ ] 28-01-PLAN.md -- Core bug fix: pacing-aware activation in DAL + celebration manual-dismiss-only
- [ ] 28-02-PLAN.md -- UI enhancements: round progress badge, post-celebration final standings, needsRoundsOpen fallback

## Progress

**Execution Order:**
Phases execute in numeric order: 25 -> 26 -> 27 -> 28

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
| 27. SE Final Round Realtime Fix | v1.3 | 0/1 | Not started | - |
| 28. RR All-at-Once Completion Fix | 2/2 | Complete   | 2026-02-26 | - |
