# SparkVotEDU

## What This Is

A web application that lets teachers create polls and tournament-style brackets for their classes, where students participate anonymously. Teachers manage brackets (single-elimination, double-elimination, round-robin, predictive), advance winners by vote or by choice, and watch results on a live dashboard. Students join via class code, get a fun name + emoji identity instantly, then enter their first name and last initial in a guided wizard -- no account needed. Returning students auto-rejoin silently on the same device, or reclaim their identity by name on a different device. The platform uses a freemium model (Free / Pro / Pro Plus) with Stripe billing to gate bracket types, quantity limits, and advanced features. It integrates with SportsDataIO to auto-generate real NCAA March Madness tournament brackets for classroom prediction competitions. Visual bracket placement lets teachers click to place entrants into specific bracket positions during creation. An admin panel lets the site owner manage teachers, accounts, and subscriptions. Consistent context menus across all card types provide rename, duplicate, archive, and delete actions. Deleted activities disappear from student views in real time.

## Core Value

Teachers can instantly engage any classroom through voting -- on any topic, in any format -- and see participation happen in real time.

## Requirements

### Validated

- Anonymous student participation via class codes -- v1.0
- Random fun name generation for students (Kahoot-style) -- v1.0
- Teacher authentication (email/password, Google) -- v1.0
- Create and manage single-elimination brackets (4, 8, 16 teams) -- v1.0
- Create and manage double-elimination brackets -- v1.0
- Create and manage predictive brackets with leaderboard -- v1.0
- Create and manage round-robin brackets -- v1.0
- Standalone polls (simple and ranked with Borda count) -- v1.0
- Winner advancement by student votes -- v1.0
- Winner advancement by teacher's choice -- v1.0
- Real-time live vote dashboard for teachers -- v1.0
- Auto-generate entrants from curated topics -- v1.0
- CSV upload for bracket/poll entrants -- v1.0
- Add multiple entrants manually -- v1.0
- Sports API integration for real tournament brackets (NCAA March Madness) -- v1.0
- Non-power-of-two brackets with auto-byes -- v1.0
- Predictive auto-resolution mode (predictions as votes, progressive reveal) -- v1.0
- Analytics (participation, vote distribution, CSV export, predictive scoring) -- v1.0
- Freemium subscription model (Free / Pro $12/mo / Pro Plus $20/mo) -- v1.0
- Feature gating by subscription tier (server-side enforcement) -- v1.0
- Sleek, intuitive interface for both teachers and students -- v1.0
- Landing page with branding, pitch, and pricing -- v1.0
- Visual bracket placement (click-to-place seeding) -- v1.0
- ✓ External service configuration (Google OAuth, Supabase Storage, health endpoint) -- v1.1
- ✓ Full-width visual bracket placement in creation wizard -- v1.1
- ✓ Join Class button in landing page header -- v1.1
- ✓ Landing page logo and styling fixes -- v1.1
- ✓ Privacy policy and terms of service pages -- v1.1
- ✓ Admin panel with role-based access, teacher management, account actions -- v1.1
- ✓ Production deployment at sparkvotedu.com -- v1.1
- ✓ Supabase RLS deny-all on all 12 public tables -- v1.2
- ✓ Name-based student identity (session code + first name, replaces device fingerprinting) -- v1.2
- ✓ Poll realtime bug fix (teacher dashboard reflects student votes in real-time) -- v1.2
- ✓ Presentation mode readability (high-contrast ranked poll cards for projectors) -- v1.2
- ✓ Session name display and inline editing on teacher dashboard -- v1.2
- ✓ Terminology unification ("Start"/"End"/"Active") -- v1.2
- ✓ Session archiving with recover and permanent delete -- v1.2
- ✓ Bracket & poll UX consistency (realtime broadcast, RR simple mode, unified celebrations, RR tiebreaker) -- v1.2
- ✓ Poll context menu with rename, duplicate, archive, delete matching bracket cards -- v1.3
- ✓ Sign-out button visual pending state -- v1.3
- ✓ Student dashboard dynamic activity removal on delete (real-time animated removal) -- v1.3
- ✓ SE bracket final round realtime vote updates -- v1.3
- ✓ RR all-at-once bracket completion fix (completes only after all rounds decided) -- v1.3
- ✓ Archive views for brackets and polls with recover and permanent delete -- v1.3
- ✓ Optimistic inline rename display (no stale name flash) -- v1.3

- ✓ Pause/resume any bracket or poll with playful student-facing overlay -- v2.0
- ✓ Undo round advancement across all bracket types (SE, DE, RR, Predictive) -- v2.0
- ✓ Reopen completed brackets and polls for additional voting -- v2.0
- ✓ Edit bracket/poll display settings live with real-time student sync -- v2.0
- ✓ Quick Create for brackets (topic chips, count picker) and polls (template chips) -- v2.0
- ✓ Real-time student vote indicators (green dots) in participation sidebar -- v2.0
- ✓ Poll image options preview matching bracket style -- v2.0
- ✓ "View Live" → "Go Live" terminology -- v2.0
- ✓ Bug fixes: ghost poll options, 2-option centering, duplicate name flow -- v2.0
- ✓ User profile page with password change and admin sidebar link -- v2.0
- ✓ Email verification enforcement before dashboard access -- v2.0
- ✓ Safari OAuth compatibility (requestIdleCallback polyfill) -- v2.0

### Active

## Current Milestone: v3.0 Student Join Overhaul + Cleanup

**Goal:** Redesign the student join experience to be instant (fun name + emoji first, real name second) with seamless same-device auto-rejoin and cross-device identity reclaim, plus clean up legacy fingerprinting code.

**Target features:**
- Zero-friction student join (fun name + emoji assigned instantly, 3-step name wizard)
- Same-device auto-rejoin via localStorage (zero clicks)
- Cross-device identity reclaim via name matching
- Teacher sidebar toggle (fun name view vs real name view, global default + per-session override)
- Student self-edit (gear icon to change name/emoji)
- Teacher can edit student display names from sidebar
- Existing participant migration (auto-assign fun names, prompt for emoji on rejoin)
- FingerprintJS removal and tech debt cleanup

### Future

- Permanent teacher account deletion from admin panel (identified during v2.0 UAT)

### Out of Scope

- Native mobile apps -- web-first, responsive design handles mobile
- Real-time chat or messaging between students -- not a communication tool
- LMS integration (Canvas, Google Classroom) -- defer to future version
- Student accounts with passwords/email -- first-name-only identity preserves anonymity
- Content moderation AI -- manual teacher control
- Multi-language / i18n -- English only
- AI-generated bracket content -- unpredictable in K-12
- Public/shareable brackets -- privacy concern, COPPA implications
- Gamification with persistent points -- conflicts with anonymous design
- Collaborative bracket editing -- one teacher per bracket
- Offline mode -- real-time is core value
- Admin password reset for teachers -- self-service forgot-password flow exists
- Device fingerprinting improvements -- fundamentally broken on identical school hardware; replaced by name-based identity in v1.2, evolving to fun name + emoji in v3.0
- Student accounts with passwords/email -- fun name + emoji identity preserves anonymity

## Context

**Current state:** v2.0 shipped 2026-03-08. Live at sparkvotedu.com. 55,141 LOC TypeScript. 38 phases completed across 5 milestones (v1.0-v2.0).

**Tech stack:** Next.js 16 (App Router, Turbopack), Prisma v7, Supabase (auth + realtime + storage), Stripe (billing), SportsDataIO (sports data), Tailwind CSS v4, shadcn/ui, Framer Motion.

**Deployment:** sparkvotedu.com on Vercel. Health endpoint at /api/health monitors Supabase Auth, Supabase Storage, Stripe, SportsDataIO, and cron secret. Branded auth domain at api.sparkvotedu.com.

**Classroom testing:** Name-based student identity (v1.2) works but has friction -- name collisions in school-wide sessions, 4-click rejoin flow, typo issues. v3.0 redesigns identity around fun name + emoji as primary key.

**Known items for future work:**
- Microsoft and Apple OAuth configured in code but held (Google + email/password only)
- FingerprintJS package and device fingerprint columns still in codebase (targeted for v3.0 cleanup)

## Constraints

- **Deployment**: sparkvotedu.com on Vercel (live)
- **Branding**: Existing logo, "Ignite student voice through voting" motto
- **Pricing**: Free / Pro ($12/mo) / Pro Plus ($20/mo) tier structure is fixed
- **Privacy**: Students are anonymous -- first name + last initial only (no email/password), fun name + emoji for unique identity
- **Tech stack**: Next.js 16, Prisma v7, Supabase, Stripe, SportsDataIO

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rebuild from scratch vs iterate | Current codebase had quality/UX/architecture issues from vibe coding | ✓ Good -- clean architecture, 80K LOC |
| Anonymous student identity via device fingerprinting | Students shouldn't need accounts; school devices share models | ✓ Resolved -- replaced with name-based identity in v1.2 |
| Name-based student identity (session code + first name) | Device fingerprinting failed on identical Chromebooks (24 students -> 6 fingerprints) | ✓ Good -- simple, works on shared hardware |
| Freemium over one-time purchase | Teachers upgrade as needs grow; aligns with SaaS education market | ✓ Good -- 3-tier Stripe billing |
| SportsDataIO as sports provider | Best NCAA coverage, reasonable pricing, good documentation | ✓ Good -- provider abstraction allows swap |
| Next.js 16 + Prisma v7 + Supabase | Modern stack, server components, real-time built in | ✓ Good -- Turbopack fast dev, Supabase Realtime reliable |
| Click-to-place over drag-and-drop | @dnd-kit v0.3.0 had intermittent pointer sensor issues | ✓ Good -- simpler, works on all devices |
| Predictive auto-resolution as third mode | Reduces teacher work for prediction-only brackets | ✓ Good -- popular feature for sports brackets |
| Native overflow scroll over custom pan/zoom | Custom pointer-capture drag conflicted with button clicks | ✓ Good -- eliminated all interaction conflicts |
| Google OAuth only for launch | Microsoft/Apple need additional console config; Google covers 90%+ of edu | ✓ Good -- unblocked launch |
| Supabase custom domain for branded OAuth | api.sparkvotedu.com looks professional in OAuth consent screen | ✓ Good -- branded experience |
| String role column for admin | Enum would require migration for each new role | ✓ Good -- future-proof extensibility |
| Double auth gate for admin | Proxy redirect + layout check for defense-in-depth | ✓ Good -- no bypass possible |
| Lazy Stripe client initialization | Eager init crashed Vercel builds during static page generation | ✓ Good -- Proxy-based, zero overhead |
| RLS deny-all over per-row policies | Prisma handles all data access via service role | ✓ Good -- simple, effective security layer |
| useEffect prop sync for card state | Client components with useState(serverProp) need useEffect sync after router.refresh() | ✓ Good -- consistent pattern across bracket/poll cards |
| AnimatePresence popLayout for card animations | Clean exit animations for delete (fade) and archive (slide-left) without layout jump | ✓ Good -- smooth UX |
| Manual-dismiss CelebrationScreen | Auto-dismiss timer caused premature dismissal and loop issues | ✓ Good -- user controls when to proceed |
| Cache-bust + sequence guard for realtime fetch | Next.js framework caching and stale responses broke SE final round updates | ✓ Good -- belt-and-suspenders approach |
| Default roundRobinPacing to round_by_round when null | Existing brackets without pacing set behave as before | ✓ Good -- backward compatible |

| Fun name + emoji as primary identity | Name-based join had friction: collisions, 4-click rejoin, typos. Fun name is unique, real name is metadata | — Pending |
| 3-step name wizard (first name → last initial → emoji) | Removes typing barrier from initial join while still collecting teacher-useful info | — Pending |
| localStorage auto-rejoin (all sessions) | Same-device return should be zero-click; remember all sessions not just latest | — Pending |
| Cross-device reclaim via name match | Staff/adults may switch devices; name + initial narrows to unique participant | — Pending |

---
*Last updated: 2026-03-08 after v3.0 milestone started*
