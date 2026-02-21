# Roadmap: SparkVotEDU

## Milestones

- **v1.0 MVP** -- Phases 1-11 (shipped 2026-02-16) | [Archive](milestones/v1.0-ROADMAP.md)
- **v1.1 Production Readiness & Deploy** -- Phases 14-18 (in progress)

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

### v1.1 Production Readiness & Deploy (In Progress)

**Milestone Goal:** Get SparkVotEDU production-ready and live on sparkvotedu.com -- configure external services, polish UX, add legal pages, build admin panel, and deploy.

- [x] **Phase 14: Service Configuration** - Configure external services for production (completed 2026-02-16)
- [x] **Phase 15: UX Polish** - Improve bracket placement UX and fix landing page issues (completed 2026-02-16)
- [x] **Phase 16: Legal Pages** - Add privacy policy and terms of service pages (completed 2026-02-16)
- [x] **Phase 17: Admin Panel** - Build admin dashboard for teacher management (completed 2026-02-17)
- [ ] **Phase 18: Production Deploy** - Deploy to sparkvotedu.com

## Phase Details

### Phase 14: Service Configuration
**Goal**: All external services are configured and functional for production use
**Depends on**: Nothing (first phase of v1.1)
**Requirements**: CONFIG-01, CONFIG-02, CONFIG-03
**Success Criteria** (what must be TRUE):
  1. Teacher can sign in with Google, Microsoft, and Apple OAuth on the production domain
  2. Poll image uploads succeed and images display correctly from Supabase Storage
  3. SportsDataIO cron sync job authenticates and runs successfully in Vercel production
**Plans**: 2 plans

Plans:
- [ ] 14-01-PLAN.md -- Prepare codebase for production: update env docs, cron schedule, image constraints, health endpoint
- [ ] 14-02-PLAN.md -- Configure external services (OAuth, Storage, Stripe, cron) and verify end-to-end

### Phase 15: UX Polish
**Goal**: Key UX improvements are live before public launch
**Depends on**: Nothing (independent of Phase 14)
**Requirements**: UX-01, UX-02, UX-03
**Success Criteria** (what must be TRUE):
  1. Visual bracket placement step fills the full page width instead of being constrained to a sidebar
  2. Students see a "Join Class" action in the landing page header (accessible without scrolling)
  3. Landing page logo displays at correct size and background colors render correctly across the page
**Plans**: 2 plans

Plans:
- [ ] 15-01-PLAN.md -- Move visual bracket placement to full-width creation step
- [ ] 15-02-PLAN.md -- Fix landing page header and styling issues

### Phase 16: Legal Pages
**Goal**: Required legal pages exist and are accessible before public launch
**Depends on**: Nothing (independent of other phases)
**Requirements**: LEGAL-01, LEGAL-02
**Success Criteria** (what must be TRUE):
  1. Navigating to /privacy displays a privacy policy page with content modeled from the current sparkvotedu.com
  2. Navigating to /terms displays a terms of service page with content modeled from the current sparkvotedu.com
  3. Both pages are linked from the site footer and accessible without authentication
**Plans**: 1 plan

Plans:
- [ ] 16-01-PLAN.md -- Create privacy policy and terms of service pages

### Phase 17: Admin Panel
**Goal**: Site owner can manage teachers, accounts, and subscriptions through a protected admin interface
**Depends on**: Phase 14 (needs auth working for admin access)
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06
**Success Criteria** (what must be TRUE):
  1. Admin user (identified by email allowlist or role flag) can access /admin dashboard; non-admin users are denied
  2. Admin can view a paginated list of all teachers showing name, email, plan tier, signup date, and usage stats
  3. Admin can click into a teacher detail page showing their brackets, sessions, and usage breakdown
  4. Admin can deactivate a teacher account (blocking login) and reactivate it (restoring access)
  5. Admin can override a teacher's subscription tier and create new teacher accounts with temporary passwords
**Plans**: 3 plans

Plans:
- [ ] 17-01-PLAN.md -- Admin role migration, auth DAL, proxy protection, admin layout shell, seed script
- [ ] 17-02-PLAN.md -- Teacher list with search/filters/pagination, stat bar, slide-out detail panel
- [ ] 17-03-PLAN.md -- Deactivate/reactivate, tier override, create teacher account with temp password

### Phase 18: Production Deploy
**Goal**: SparkVotEDU is live and accessible at sparkvotedu.com
**Depends on**: Phases 14, 15, 16, 17 (all prior phases must be complete)
**Requirements**: DEPLOY-01
**Success Criteria** (what must be TRUE):
  1. sparkvotedu.com loads the SparkVotEDU application (not the old site)
  2. All core flows work end-to-end on production: teacher signup/login, bracket creation, student join, voting, real-time updates
  3. Stripe checkout and subscription management work on the production domain
**Plans**: 1 plan

Plans:
- [ ] 18-01-PLAN.md -- Deploy to Vercel preview, verify health, cutover sparkvotedu.com domain

## Progress

**Execution Order:**
Phases 14, 15, 16 can run in parallel (no dependencies). Phase 17 depends on Phase 14. Phase 18 depends on all prior phases.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|---------------|--------|-----------|
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
| 14. Service Configuration | v1.1 | Complete    | 2026-02-16 | - |
| 15. UX Polish | v1.1 | Complete    | 2026-02-16 | - |
| 16. Legal Pages | v1.1 | Complete    | 2026-02-16 | - |
| 17. Admin Panel | v1.1 | Complete    | 2026-02-17 | - |
| 18. Production Deploy | v1.1 | 0/1 | Not started | - |
