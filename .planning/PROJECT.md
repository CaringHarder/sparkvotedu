# SparkVotEDU

## What This Is

A web application that lets teachers create polls and tournament-style brackets for their classes, where students participate with fun name + emoji identities. Teachers manage brackets (single-elimination, double-elimination, round-robin, predictive), advance winners by vote or by choice, and watch results on a live dashboard. Students join via class code, instantly receive a fun name, then complete a 3-step wizard (first name, last initial, emoji pick) -- no account needed. Returning students auto-rejoin silently on the same device via localStorage, or reclaim their identity by name on a different device. Teachers toggle between fun name and real name views in the participation sidebar, with a global default that persists to their profile. The platform uses a freemium model (Free / Pro / Pro Plus) with Stripe billing to gate bracket types, quantity limits, and advanced features. It integrates with SportsDataIO to auto-generate real NCAA March Madness tournament brackets for classroom prediction competitions. Visual bracket placement lets teachers click to place entrants into specific bracket positions during creation. An admin panel lets the site owner manage teachers, accounts, and subscriptions. Consistent context menus across all card types provide rename, duplicate, archive, and delete actions. Deleted activities disappear from student views in real time.

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

- ✓ Zero-friction student join: fun name + emoji assigned instantly, 3-step wizard (first name, last initial, emoji) -- v3.0
- ✓ Same-device auto-rejoin via localStorage (zero clicks, 90-day TTL, all sessions remembered) -- v3.0
- ✓ Cross-device identity reclaim via first name + last initial matching with disambiguation -- v3.0
- ✓ Teacher sidebar toggle: fun name view vs real name view with global default + per-session override -- v3.0
- ✓ Student self-edit: gear icon to change display name from session header -- v3.0
- ✓ Teacher can edit student display names and last initial from sidebar -- v3.0
- ✓ Existing participant emoji migration: sentinel detection, one-time emoji pick prompt on rejoin -- v3.0
- ✓ FingerprintJS complete removal: package, code, and database columns cleaned up (~150KB bundle reduction) -- v3.0

### Active

- ✓ Session-first dashboard navigation (sidebar simplification, session workspace tabs, context menu actions, dropdown selector, gap closure for mobile nav/confirmation/prominence) -- v4.0

### Future

- Permanent teacher account deletion from admin panel (identified during v2.0 UAT)
- Custom emoji set per teacher (teacher curates available emojis)
- QR code auto-fill for mobile join (scan to join, no typing)

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
- Device fingerprinting -- fundamentally broken on identical school hardware; replaced by fun name + emoji identity in v3.0, FingerprintJS fully removed
- Student accounts with passwords/email -- fun name + emoji identity preserves anonymity

## Context

**Current state:** Phase 04 complete (2026-04-09). Live at sparkvotedu.com. ~90K LOC TypeScript. Teacher dashboard restructured to session-first workflow with tabbed workspace, context menu actions, and dropdown session navigation.

**Tech stack:** Next.js 16 (App Router, Turbopack), Prisma v7, Supabase (auth + realtime + storage), Stripe (billing), SportsDataIO (sports data), Tailwind CSS v4, shadcn/ui, Framer Motion.

**Deployment:** sparkvotedu.com on Vercel. Health endpoint at /api/health monitors Supabase Auth, Supabase Storage, Stripe, SportsDataIO, and cron secret. Branded auth domain at api.sparkvotedu.com.

**Student identity:** Fun name + emoji identity system (v3.0). Students get instant fun name assignment, complete 3-step wizard (first name, last initial, emoji picker). localStorage auto-rejoin on same device. Cross-device reclaim via name matching. FingerprintJS fully removed.

**Known items for future work:**
- Microsoft and Apple OAuth configured in code but held (Google + email/password only)

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

| Fun name + emoji as primary identity | Name-based join had friction: collisions, 4-click rejoin, typos. Fun name is unique, real name is metadata | ✓ Good -- instant identity, no collisions |
| 3-step name wizard (first name → last initial → emoji) | Removes typing barrier from initial join while still collecting teacher-useful info | ✓ Good -- smooth guided flow |
| localStorage auto-rejoin (all sessions) | Same-device return should be zero-click; remember all sessions not just latest | ✓ Good -- 90-day TTL, 50-entry cap |
| Cross-device reclaim via name match | Staff/adults may switch devices; name + initial narrows to unique participant | ✓ Good -- firstName-only lookup with confirmation |
| Emoji stored as shortcodes (not Unicode) | Cross-platform rendering consistency on school devices | ✓ Good -- shortcodeToEmoji lookup works everywhere |
| Sentinel emoji migration | Pre-existing participants need emoji without re-joining | ✓ Good -- one-time interstitial prompt |
| FingerprintJS complete removal | Dead code, ~150KB bundle bloat, privacy concerns | ✓ Good -- clean codebase |

---
| Session-first dashboard navigation | Teachers need session context before activity context; sidebar was cluttered | ✓ Good -- 3-item sidebar, tabbed workspace, context menu actions |

---
*Last updated: 2026-04-09 after Phase 04 completion*
