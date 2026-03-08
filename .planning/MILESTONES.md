# Milestones

## v1.0 MVP (Shipped: 2026-02-16)

**Phases completed:** 13 phases, 102 plans, 59 tasks

**Key accomplishments:**
- Full classroom voting platform: teachers create brackets and polls, students join anonymously via class code with fun names, vote in real-time
- 4 bracket types: single-elimination, double-elimination, round-robin, and predictive with non-power-of-2 byes
- Predictive auto-resolution mode: student predictions auto-count as votes with progressive reveal and podium celebrations
- Sports integration: NCAA March Madness brackets imported from live SportsDataIO API for classroom prediction competitions
- Stripe billing: Free/Pro/Pro Plus tiers with server-side feature gating, checkout, and customer portal
- Analytics: participation metrics, vote distribution, CSV export, and predictive scoring breakdown
- Polished UX: branded landing page, responsive design, dark mode, visual bracket placement with click-to-place seeding

**Stats:** 447 commits (215 feat/fix), 564 files, 41,773 LOC TypeScript, 20 days (2026-01-28 to 2026-02-16)

---


## v1.1 Production Readiness & Deploy (Shipped: 2026-02-21)

**Phases completed:** 5 phases, 9 plans, 22 tasks

**Key accomplishments:**
- External service configuration: Google OAuth, Supabase Storage bucket, health endpoint at /api/health, branded auth domain at api.sparkvotedu.com
- UX polish: full-width visual bracket placement in creation wizard, Join Class button in landing header, corrected logo aspect ratio with hero gradient
- Legal compliance: privacy policy and terms of service pages in plain English, accessible without auth
- Admin panel: role-based access with double auth gate, teacher list with search/filters/pagination, detail panel, deactivate/reactivate accounts, tier override, create teacher with temp password
- Production deployment: sparkvotedu.com live on Vercel with all critical services healthy (Supabase Auth, Storage, Stripe), lazy Stripe initialization fix for build compatibility
- Stripe billing operational on production domain with checkout and subscription management

**Stats:** 38 commits, 45,280 LOC TypeScript (up from 41,773 at v1.0), 6 days (2026-02-16 to 2026-02-21)

---


## v1.2 Classroom Hardening (Shipped: 2026-02-24)

**Phases completed:** 6 phases, 20 plans

**Key accomplishments:**
- Security foundation: RLS deny-all policies on all 12 public Supabase tables with Prisma bypass verified
- Name-based student identity: session code + first name replaces broken device fingerprinting (case-insensitive, duplicate prompting, cross-device rejoin)
- Poll realtime fix: teacher dashboard reflects student votes in real-time via correct channel broadcasting
- UX polish: presentation mode readability, session name editing, unified Start/End terminology
- Session archiving: archive, recover, and permanently delete sessions
- Bracket & poll UX consistency: realtime broadcast on activation, RR simple mode cards, unified celebrations, co-champion tiebreaker

**Stats:** 20 plans, 80,750 LOC TypeScript, 4 days (2026-02-21 to 2026-02-24)

---


## v1.3 Bug Fixes & UX Parity (Shipped: 2026-02-26)

**Phases completed:** 4 phases, 11 plans

**Key accomplishments:**
- Poll context menu: triple-dot menu with rename, duplicate, archive, delete matching bracket card pattern
- Student activity removal: deleted brackets and polls disappear from student dashboards in real time with animated card removal
- SE final round realtime fix: cache-busting fetch + stale response guard + force-dynamic API route for live vote updates
- RR all-at-once completion fix: pacing-aware activation opens all matchups, bracket completes only after all rounds decided
- Archive views: browse, recover, and permanently delete archived brackets and polls
- Sign-out pending state: visual feedback (spinner/disabled) while sign-out processes

**Stats:** 68 commits (16 feat/fix), 29 files changed, +1,602/-287 lines, 80,750 LOC TypeScript, 2 days (2026-02-24 to 2026-02-26)

---


## v2.0 Teacher Power-Ups (Shipped: 2026-03-08)

**Phases completed:** 11 phases (29-38 + 31.1), 36 plans

**Key accomplishments:**
- Pause/resume any bracket or poll with playful student-facing overlay and instant toggle
- Undo round advancement across all 4 bracket types (SE, DE, RR, Predictive) with cascade handling
- Reopen completed brackets and polls for additional voting
- Edit bracket/poll display settings live (viewing mode, vote counts, seed numbers) with real-time student sync
- Quick Create for brackets (topic chips, count picker) and polls (template chips, simplified form)
- Real-time student vote indicators (green/blue/gray dots) in participation sidebar across all activity types
- Bug fixes: ghost poll options, 2-option centering, duplicate name flow, student live results
- User profile page with password change, admin sidebar link, forced temp password reset
- Email verification enforcement before dashboard access (Google OAuth bypass, branded verify page)
- Safari OAuth compatibility fix (requestIdleCallback polyfill)

**Stats:** 200 commits (93 feat/fix), 55,141 LOC TypeScript, 9 days (2026-02-28 to 2026-03-08)

---

