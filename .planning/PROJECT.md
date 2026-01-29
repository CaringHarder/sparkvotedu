# SparkVotEDU

## What This Is

A web application that lets teachers create polls and tournament-style brackets for their classes, where students participate anonymously. Teachers manage brackets, advance winners (by vote or by choice), and watch results on a live dashboard. Students join via class code, get a random fun name, and vote — no account needed. The platform uses a freemium model (Free / Pro / Pro Plus) to gate bracket types, quantity limits, and advanced features. It also integrates with sports APIs to auto-generate real tournament brackets (March Madness, NCAA FBS, NBA, NHL, MLB playoffs) for classroom prediction competitions and curriculum tie-ins.

## Core Value

Teachers can instantly engage any classroom through voting — on any topic, in any format — and see participation happen in real time.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Anonymous student participation via class codes with device fingerprinting
- [ ] Random fun name generation for students (Kahoot-style)
- [ ] Teacher authentication (email/password, Google, Apple, Microsoft)
- [ ] Create and manage single-elimination brackets (4, 8, 16 teams)
- [ ] Create and manage double-elimination brackets
- [ ] Create and manage predictive brackets with leaderboard
- [ ] Create and manage round-robin brackets
- [ ] Standalone polls (simple and ranked)
- [ ] Winner advancement by student votes
- [ ] Winner advancement by teacher's choice
- [ ] Real-time live vote dashboard for teachers
- [ ] Auto-generate entrants from curated topics
- [ ] CSV upload for bracket/poll entrants
- [ ] Add multiple entrants manually
- [ ] Sports API integration for real tournament brackets
- [ ] Non-power-of-two brackets with auto-byes
- [ ] Live Event mode with timed rounds
- [ ] Analytics (basic overview through full export with CSV)
- [ ] Freemium subscription model (Free / Pro $12/mo / Pro Plus $20/mo)
- [ ] Feature gating by subscription tier
- [ ] Sleek, intuitive interface for both teachers and students
- [ ] Landing page with branding, pitch, and pricing

### Out of Scope

- Native mobile apps — web-first, responsive design handles mobile
- Real-time chat or messaging between students — not a communication tool
- LMS integration (Canvas, Google Classroom) — defer to future version
- Student accounts with passwords — anonymous-only by design
- Content moderation AI — manual teacher control for v1
- Multi-language / i18n — English only for v1

## Context

- **Existing product:** sparkvotedu.com is live with a vibe-coded implementation. This rebuild replaces it entirely with better code quality, UX, and architecture.
- **Existing assets:** Logo and landing page branding already established. Motto: "Ignite student voice through voting."
- **Deployment target:** sparkvotedu.com — replaces current site when ready.
- **Classroom environment:** Students often share the same laptop model (school-issued devices), so device fingerprinting must combine multiple signals (canvas fingerprint, WebGL, audio context, installed fonts, screen resolution, timezone, etc.) to differentiate users on identical hardware.
- **Sports brackets serve dual purpose:** Class prediction competitions (students compete on accuracy) AND educational engagement tools (teachers tie real sports events to curriculum).
- **Freemium model is validated:** Tier structure already designed and tested on current site.

## Constraints

- **Deployment**: Must deploy to sparkvotedu.com, replacing the current site
- **Branding**: Existing logo, landing page copy, and "Ignite student voice through voting" motto must carry forward
- **Pricing**: Free / Pro ($12/mo) / Pro Plus ($20/mo) tier structure is fixed
- **Privacy**: Students are anonymous — no PII collection, device fingerprinting for session continuity only
- **Feature parity**: Must match all features of the current sparkvotedu.com before replacing it
- **Tech stack**: Open — choose whatever fits the product best

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rebuild from scratch vs iterate | Current codebase has code quality, UX, and architecture issues from vibe coding | — Pending |
| Anonymous student identity via device fingerprinting | Students shouldn't need accounts; school devices share models so fingerprinting needs multiple signals | — Pending |
| Freemium over one-time purchase | Teachers upgrade as needs grow; aligns with SaaS education market | — Pending |
| Sports API provider | Need tournament bracket data for NCAA, NBA, NHL, MLB | — Pending (needs research) |
| Tech stack | Open to whatever fits best — needs research | — Pending |

---
*Last updated: 2026-01-28 after initialization*
