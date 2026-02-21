# SparkVotEDU

## What This Is

A web application that lets teachers create polls and tournament-style brackets for their classes, where students participate anonymously. Teachers manage brackets (single-elimination, double-elimination, round-robin, predictive), advance winners by vote or by choice, and watch results on a live dashboard. Students join via class code, get a random fun name, and vote — no account needed. The platform uses a freemium model (Free / Pro / Pro Plus) with Stripe billing to gate bracket types, quantity limits, and advanced features. It integrates with SportsDataIO to auto-generate real NCAA March Madness tournament brackets for classroom prediction competitions. Visual bracket placement lets teachers drag entrants into specific bracket positions during creation. An admin panel lets the site owner manage teachers, accounts, and subscriptions.

## Core Value

Teachers can instantly engage any classroom through voting — on any topic, in any format — and see participation happen in real time.

## Requirements

### Validated

- Anonymous student participation via class codes with device fingerprinting — v1.0
- Random fun name generation for students (Kahoot-style) — v1.0
- Teacher authentication (email/password, Google, Apple, Microsoft) — v1.0
- Create and manage single-elimination brackets (4, 8, 16 teams) — v1.0
- Create and manage double-elimination brackets — v1.0
- Create and manage predictive brackets with leaderboard — v1.0
- Create and manage round-robin brackets — v1.0
- Standalone polls (simple and ranked with Borda count) — v1.0
- Winner advancement by student votes — v1.0
- Winner advancement by teacher's choice — v1.0
- Real-time live vote dashboard for teachers — v1.0
- Auto-generate entrants from curated topics — v1.0
- CSV upload for bracket/poll entrants — v1.0
- Add multiple entrants manually — v1.0
- Sports API integration for real tournament brackets (NCAA March Madness) — v1.0
- Non-power-of-two brackets with auto-byes — v1.0
- Predictive auto-resolution mode (predictions as votes, progressive reveal) — v1.0
- Analytics (participation, vote distribution, CSV export, predictive scoring) — v1.0
- Freemium subscription model (Free / Pro $12/mo / Pro Plus $20/mo) — v1.0
- Feature gating by subscription tier (server-side enforcement) — v1.0
- Sleek, intuitive interface for both teachers and students — v1.0
- Landing page with branding, pitch, and pricing — v1.0
- Visual bracket placement (click-to-place seeding) — v1.0
- ✓ External service configuration (Google OAuth, Supabase Storage, health endpoint) — v1.1
- ✓ Full-width visual bracket placement in creation wizard — v1.1
- ✓ Join Class button in landing page header — v1.1
- ✓ Landing page logo and styling fixes — v1.1
- ✓ Privacy policy and terms of service pages — v1.1
- ✓ Admin panel with role-based access, teacher management, account actions — v1.1
- ✓ Production deployment at sparkvotedu.com — v1.1

### Active

<!-- No active milestone — use /gsd:new-milestone to start next -->

### Out of Scope

- Native mobile apps — web-first, responsive design handles mobile
- Real-time chat or messaging between students — not a communication tool
- LMS integration (Canvas, Google Classroom) — defer to future version
- Student accounts with passwords — anonymous-only by design
- Content moderation AI — manual teacher control
- Multi-language / i18n — English only
- AI-generated bracket content — unpredictable in K-12
- Public/shareable brackets — privacy concern, COPPA implications
- Gamification with persistent points — conflicts with anonymous design
- Collaborative bracket editing — one teacher per bracket
- Offline mode — real-time is core value
- Admin password reset for teachers — self-service forgot-password flow exists

## Context

**Current state:** v1.1 shipped 2026-02-21. Live at sparkvotedu.com. 45,280 LOC TypeScript across 570+ files.

**Tech stack:** Next.js 16 (App Router, Turbopack), Prisma v7, Supabase (auth + realtime + storage), Stripe (billing), SportsDataIO (sports data), Tailwind CSS v4, shadcn/ui, Framer Motion.

**Deployment:** sparkvotedu.com on Vercel. Health endpoint at /api/health monitors Supabase Auth, Supabase Storage, Stripe, SportsDataIO, and cron secret. Branded auth domain at api.sparkvotedu.com.

**Classroom environment:** Students share identical school-issued laptops. Device fingerprinting combines canvas, WebGL, audio context, fonts, screen, timezone for differentiation.

**Known items for future work:**
- Microsoft and Apple OAuth configured in code but held for launch (Google + email/password only)
- Poll image upload component exists but not yet wired into poll form UI
- Production Stripe webhook not yet configured
- Device fingerprinting collision rates on identical school hardware need real-world validation

## Constraints

- **Deployment**: sparkvotedu.com on Vercel (live)
- **Branding**: Existing logo, "Ignite student voice through voting" motto
- **Pricing**: Free / Pro ($12/mo) / Pro Plus ($20/mo) tier structure is fixed
- **Privacy**: Students are anonymous — no PII, device fingerprinting for session continuity only
- **Tech stack**: Next.js 16, Prisma v7, Supabase, Stripe, SportsDataIO

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rebuild from scratch vs iterate | Current codebase had quality/UX/architecture issues from vibe coding | ✓ Good — clean architecture, 45K LOC |
| Anonymous student identity via device fingerprinting | Students shouldn't need accounts; school devices share models | ✓ Good — FingerprintJS + localStorage UUID |
| Freemium over one-time purchase | Teachers upgrade as needs grow; aligns with SaaS education market | ✓ Good — 3-tier Stripe billing |
| SportsDataIO as sports provider | Best NCAA coverage, reasonable pricing, good documentation | ✓ Good — provider abstraction allows swap |
| Next.js 16 + Prisma v7 + Supabase | Modern stack, server components, real-time built in | ✓ Good — Turbopack fast dev, Supabase Realtime reliable |
| Click-to-place over drag-and-drop | @dnd-kit v0.3.0 had intermittent pointer sensor issues | ✓ Good — simpler, works on all devices |
| Predictive auto-resolution as third mode | Reduces teacher work for prediction-only brackets | ✓ Good — popular feature for sports brackets |
| Native overflow scroll over custom pan/zoom | Custom pointer-capture drag conflicted with button clicks | ✓ Good — eliminated all interaction conflicts |
| Google OAuth only for v1.1 launch | Microsoft/Apple need additional console config; Google covers 90%+ of edu | ✓ Good — unblocked launch |
| Supabase custom domain for branded OAuth | api.sparkvotedu.com looks professional in OAuth consent screen | ✓ Good — branded experience |
| String role column for admin | Enum would require migration for each new role | ✓ Good — future-proof extensibility |
| Amber accent for admin UI | Visual distinction from blue teacher dashboard | ✓ Good — clear UX separation |
| Double auth gate for admin | Proxy redirect + layout check for defense-in-depth | ✓ Good — no bypass possible |
| Type-to-confirm for destructive actions | Extra friction before deactivating teacher accounts | ✓ Good — prevents accidental deactivation |
| Lazy Stripe client initialization | Eager init crashed Vercel builds during static page generation | ✓ Good — Proxy-based, zero overhead |
| Same Vercel project domain reassignment | Quick swap with minimal downtime vs blue-green deployment | ✓ Good — seamless cutover |

---
*Last updated: 2026-02-21 after v1.1 milestone*
