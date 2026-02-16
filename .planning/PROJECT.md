# SparkVotEDU

## What This Is

A web application that lets teachers create polls and tournament-style brackets for their classes, where students participate anonymously. Teachers manage brackets (single-elimination, double-elimination, round-robin, predictive), advance winners by vote or by choice, and watch results on a live dashboard. Students join via class code, get a random fun name, and vote — no account needed. The platform uses a freemium model (Free / Pro / Pro Plus) with Stripe billing to gate bracket types, quantity limits, and advanced features. It integrates with SportsDataIO to auto-generate real NCAA March Madness tournament brackets for classroom prediction competitions. Visual bracket placement lets teachers drag entrants into specific bracket positions during creation.

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

### Active

<!-- Current milestone: v1.1 Production Readiness & Deploy -->

- [ ] Configure OAuth providers (Google, Microsoft, Apple) in external consoles and Supabase
- [ ] Create poll-images bucket in Supabase Storage
- [ ] Configure production Stripe webhook URL for sparkvotedu.com
- [ ] Add CRON_SECRET to Vercel environment variables
- [ ] Move visual bracket placement to full-width creation step
- [ ] Deploy to sparkvotedu.com on Vercel

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

## Context

**Current state:** v1.0 MVP shipped 2026-02-16. 41,773 LOC TypeScript across 564 files.

**Tech stack:** Next.js 16 (App Router, Turbopack), Prisma v7, Supabase (auth + realtime + storage), Stripe (billing), SportsDataIO (sports data), Tailwind CSS v4, shadcn/ui, Framer Motion.

**Deployment target:** sparkvotedu.com — replaces current vibe-coded implementation.

**Classroom environment:** Students share identical school-issued laptops. Device fingerprinting combines canvas, WebGL, audio context, fonts, screen, timezone for differentiation.

**Known tech debt:**
- OAuth providers (Google, Microsoft, Apple) need external console configuration — code complete
- Production Stripe webhook needs configuration for sparkvotedu.com
- SportsDataIO API key and Vercel CRON_SECRET needed for production
- poll-images Supabase Storage bucket needs creation
- Visual bracket placement UX improvement: move to full-width creation step

## Constraints

- **Deployment**: Must deploy to sparkvotedu.com, replacing the current site
- **Branding**: Existing logo, "Ignite student voice through voting" motto
- **Pricing**: Free / Pro ($12/mo) / Pro Plus ($20/mo) tier structure is fixed
- **Privacy**: Students are anonymous — no PII, device fingerprinting for session continuity only
- **Tech stack**: Next.js 16, Prisma v7, Supabase, Stripe, SportsDataIO

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rebuild from scratch vs iterate | Current codebase had quality/UX/architecture issues from vibe coding | Good — clean architecture, 41K LOC |
| Anonymous student identity via device fingerprinting | Students shouldn't need accounts; school devices share models | Good — FingerprintJS + localStorage UUID |
| Freemium over one-time purchase | Teachers upgrade as needs grow; aligns with SaaS education market | Good — 3-tier Stripe billing |
| SportsDataIO as sports provider | Best NCAA coverage, reasonable pricing, good documentation | Good — provider abstraction allows swap |
| Next.js 16 + Prisma v7 + Supabase | Modern stack, server components, real-time built in | Good — Turbopack fast dev, Supabase Realtime reliable |
| Click-to-place over drag-and-drop | @dnd-kit v0.3.0 had intermittent pointer sensor issues | Good — simpler, works on all devices |
| Predictive auto-resolution as third mode | Reduces teacher work for prediction-only brackets | Good — popular feature for sports brackets |
| Native overflow scroll over custom pan/zoom | Custom pointer-capture drag conflicted with button clicks | Good — eliminated all interaction conflicts |

---
## Current Milestone: v1.1 Production Readiness & Deploy

**Goal:** Get SparkVotEDU production-ready and live on sparkvotedu.com — configure external services, polish UX, and deploy.

**Target features:**
- OAuth provider configuration (Google, Microsoft, Apple)
- Supabase Storage bucket for poll images
- Production Stripe webhook
- Vercel CRON_SECRET for SportsDataIO sync
- Visual bracket placement UX improvement (full-width creation step)
- Deployment to sparkvotedu.com

---
*Last updated: 2026-02-16 after v1.1 milestone started*
