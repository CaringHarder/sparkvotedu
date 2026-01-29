# Stack Research

**Domain:** EdTech classroom polling and tournament bracket web application
**Researched:** 2026-01-28
**Confidence:** MEDIUM (Next.js version verified via official docs; other versions from training data -- see individual confidence notes)

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Next.js | 16.1 | Full-stack React framework | Verified current stable (Dec 2025 release). App Router is mature. Turbopack is now the default bundler (stable in v16). React Compiler support built in. Cache Components and PPR enable optimal performance for mixed static/dynamic pages like landing + live dashboard. Deploys to Vercel with zero config. | HIGH (verified via nextjs.org/blog) |
| React | 19.2 | UI library | Ships with Next.js 16. View Transitions for smooth bracket animations. Server Components for data-heavy teacher dashboards. Suspense for streaming live data. | HIGH (verified via nextjs.org/blog as bundled with Next.js 16) |
| TypeScript | 5.x | Type safety | Next.js 16 scaffolds with TypeScript by default. Non-negotiable for a project with complex data models (brackets, tournaments, subscriptions). Prevents entire categories of bugs. | HIGH (verified via Next.js installation docs) |
| Tailwind CSS | 4.x | Styling | Next.js 16 scaffolds with Tailwind by default. Utility-first approach enables rapid UI development. Excellent for responsive design (critical: students on phones, teachers on desktops). | HIGH (verified via Next.js installation docs) |

### Database & Backend Services

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Supabase | latest | Database + Auth + Realtime | PostgreSQL under the hood (relational data fits brackets/polls perfectly). Built-in Realtime subscriptions (Broadcast + Presence + Postgres Changes) eliminates need for separate WebSocket server. Row Level Security for data isolation between teachers. Built-in auth with OAuth providers (Google, Apple, Microsoft). Edge Functions for serverless logic. Free tier is generous for development. | MEDIUM (features known from training data; exact current version not verified) |
| Prisma | 6.x | ORM / database toolkit | Type-safe database access with auto-generated TypeScript types from schema. Excellent migration system for iterative schema changes. Works seamlessly with Supabase's PostgreSQL. Schema-first approach makes bracket/poll data models explicit and version-controlled. | MEDIUM (v6 expected based on training data trajectory; verify at install time) |

**Why Supabase over alternatives:**

- **vs. Firebase:** Supabase uses PostgreSQL (relational), which is far better for bracket tournament data with complex relationships (matchups, rounds, seeds, advancement paths). Firebase's NoSQL would require denormalized nightmare schemas for bracket trees. Supabase also provides native SQL queries for complex analytics.
- **vs. PlanetScale:** PlanetScale is MySQL-based and does not include built-in realtime or auth. Would require adding Pusher/Ably for realtime and a separate auth service.
- **vs. Raw PostgreSQL + custom WebSocket:** Works but dramatically increases infrastructure complexity. Supabase gives you PostgreSQL + Realtime + Auth + Storage in one managed service. For a solo/small team EdTech app, this collapses your infrastructure burden.
- **vs. Convex/Neon:** Newer alternatives that lack the ecosystem maturity and provider breadth of Supabase.

### Authentication

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Supabase Auth | (bundled) | Teacher authentication | Built into Supabase. Supports email/password AND OAuth (Google, Apple, Microsoft) out of the box. No separate auth service needed. Handles JWT tokens, session management, refresh tokens. Row Level Security policies integrate directly with auth. | MEDIUM (provider support known from training; verify Apple/Microsoft provider availability at implementation) |
| Custom device fingerprinting | N/A | Anonymous student identity | Build custom using multiple browser signals (see Device Fingerprinting section below). Cannot use Supabase Auth for students since they have no accounts. | MEDIUM |

**Why Supabase Auth over alternatives:**

- **vs. Auth.js (NextAuth):** Auth.js is excellent standalone, but since we already chose Supabase for database + realtime, using Supabase Auth avoids managing a separate auth system. One fewer moving part. Auth.js would be the right choice if NOT using Supabase.
- **vs. Clerk:** Clerk has excellent DX but adds a paid service dependency ($25/mo+ for production) on top of Supabase. Redundant cost.
- **vs. Auth0/Okta:** Enterprise-oriented, expensive, overkill for an EdTech freemium product.

### Real-Time Communication

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Supabase Realtime | (bundled) | Live vote dashboard, real-time bracket updates | Supabase Realtime provides three channels: **Broadcast** (send messages to all connected clients -- perfect for live vote counts), **Presence** (track who is online -- shows active student count), **Postgres Changes** (subscribe to database changes -- auto-update brackets when votes are recorded). No separate WebSocket server needed. | MEDIUM (feature set known from training; exact API surface should be verified at implementation) |

**Why Supabase Realtime over alternatives:**

- **vs. Socket.IO:** Socket.IO requires running a separate server process. With Supabase Realtime, the realtime infrastructure is managed and scales automatically. Socket.IO is better for complex bidirectional protocols (gaming, collaborative editing), but our use case (broadcast vote counts, presence) is a perfect fit for Supabase's model.
- **vs. Pusher/Ably:** Third-party services with per-message pricing. Supabase Realtime is included in the Supabase plan. Eliminates a billing dependency.
- **vs. Server-Sent Events (SSE):** SSE is unidirectional (server to client only). Fine for vote dashboards, but doesn't handle presence tracking. Supabase Realtime handles both directions.

### Payments & Subscriptions

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Stripe | ^17.x | Subscription billing (Free/Pro/Pro Plus) | Industry standard for SaaS subscriptions. Stripe Billing handles recurring payments, plan changes, cancellations, proration. Customer Portal lets teachers manage their own subscription. Webhooks sync subscription status to database. Supports credit cards, Apple Pay, Google Pay. Free tier requires no payment method (just feature gate in code). | MEDIUM (v17.x from training data; verify at install) |
| @stripe/stripe-js | ^5.x | Client-side Stripe integration | Stripe Elements for secure card input. Checkout Sessions for hosted payment pages (reduces PCI scope). | MEDIUM (version from training data) |

**Stripe implementation pattern for freemium:**
- Free tier: No Stripe interaction. Feature gating in code only.
- Pro / Pro Plus: Stripe Checkout for initial subscription. Stripe Customer Portal for management.
- Webhooks: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` sync tier status to `teachers` table.
- Store `stripe_customer_id` and `subscription_tier` on teacher record.

### Device Fingerprinting

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| @fingerprintjs/fingerprintjs | ^4.x | Browser fingerprint generation | Open-source library that generates a visitor identifier from browser attributes. Combines canvas fingerprint, WebGL renderer, audio context, screen resolution, timezone, language, platform, installed plugins. Free and open source (MIT license). The Pro version (paid) adds server-side identification but is unnecessary for our use case. | MEDIUM (v4.x from training data; OSS version capabilities known) |

**CRITICAL: School device challenge.**
This is the hardest technical problem in the project. School-issued devices often share:
- Same OS, browser, screen resolution
- Same installed fonts (managed by IT)
- Same WebGL renderer (same hardware)
- Same timezone

**Mitigation strategy (must implement):**
1. Use FingerprintJS as the base fingerprint
2. Layer additional signals:
   - `localStorage` token (persists across sessions on same browser profile)
   - `sessionStorage` for current session continuity
   - `IndexedDB` persistent token as backup
   - Canvas fingerprint with randomized seed (unique per first-visit)
3. Combine: `compositeId = hash(fingerprintJS_id + localStorage_token)`
4. If localStorage is cleared, fall back to creating a new identity (accept this limitation)
5. The `localStorage` token is the primary differentiator on identical hardware; the fingerprint prevents simple device-hopping

This approach means: On shared classroom Chromebooks where each student has their own Chrome profile, the localStorage token differentiates them. If students share a single Chrome profile (guest mode), differentiation is impossible and should fall back to "one vote per unique fingerprint" with a warning to the teacher.

### Sports Data API

| Technology | Pricing | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| ESPN API (unofficial) | Free | NCAA, NBA, NHL, MLB scores and brackets | Widely used unofficial API endpoints (`site.api.espn.com`). Covers all four target leagues. Free but undocumented and could break. Good for MVP. | LOW (no official documentation; community knowledge only) |
| SportsDataIO (official) | $25+/mo per sport | NCAA, NBA, NHL, MLB structured data | Official, documented API with structured tournament/bracket data. Expensive ($25/mo per sport = $100/mo for all four). Better for production reliability. | MEDIUM (known provider; pricing from training data may be outdated) |
| The Odds API | Free tier available | Sports scores, schedules | Has a free tier. May not have bracket/tournament-specific data structures. | LOW (limited knowledge of bracket-specific features) |
| API-Sports | $0-$30/mo | Multi-sport coverage | RapidAPI-based. Covers NBA, NHL, MLB. NCAA coverage may be limited. | LOW |

**Recommendation:** Start with ESPN unofficial API for MVP (free, covers all leagues). Plan migration path to SportsDataIO or Ball Don't Lie for production if ESPN endpoints prove unreliable. Abstract the sports data layer behind an interface so the provider can be swapped.

**Important note:** This area needs deeper research during the sports integration phase. The exact API that provides structured **bracket/tournament** data (not just scores) is the key differentiator. Most sports APIs focus on scores and schedules, not bracket advancement data. NCAA March Madness bracket data specifically is hard to find in structured form.

### UI Components & Design

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| shadcn/ui | latest | UI component library | Not a package -- it copies components into your project (full control). Built on Radix UI primitives (accessible). Tailwind-styled. Perfect for custom-branded EdTech product. Teacher dashboard components (tables, cards, dialogs) come ready-made. | MEDIUM (widely adopted; verify latest component availability at install) |
| Radix UI | latest | Accessible primitives | Powers shadcn/ui under the hood. Handles accessibility (ARIA, keyboard nav) automatically. Critical for educational software (accessibility compliance). | MEDIUM |
| Framer Motion | ^12.x | Animations | Bracket visualization animations (matchup reveals, winner advancement). Vote count animations. Smooth transitions between rounds. React-native animation library with great DX. | MEDIUM (v12.x estimated; verify at install) |
| Recharts | ^2.x | Data visualization | Teacher analytics charts (vote distribution, participation rates). Simple API, React-native. Good enough for bar/pie charts without D3 complexity. | MEDIUM |
| Lucide React | latest | Icons | Clean, consistent icon set. Used by shadcn/ui by default. MIT licensed. | MEDIUM |

### State Management & Data Fetching

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| TanStack Query (React Query) | ^5.x | Server state management | Handles caching, background refetching, optimistic updates for vote submissions. Pairs with Supabase queries. Eliminates manual loading/error state management. Deduplicates requests (30 students voting simultaneously). | MEDIUM (v5 known from training; verify at install) |
| Zustand | ^5.x | Client state management | Lightweight (less than 1KB). No boilerplate. Perfect for UI state (modal open/closed, active bracket view, selected round). Does NOT replace React Query for server state -- they complement each other. | MEDIUM (v5.x estimated; verify at install) |
| React Hook Form | ^7.x | Form handling | Teacher forms: create bracket, add entrants, configure poll settings. Validation with Zod schemas. Uncontrolled components for performance (important when many form fields). | MEDIUM |
| Zod | ^3.x | Schema validation | Runtime type validation for API inputs and form data. Generates TypeScript types. Single source of truth for data shape across client and server. | MEDIUM |

### Utility Libraries

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|------------|
| nanoid | ^5.x | ID generation | Short, URL-safe unique IDs for class codes, bracket IDs. Cryptographically strong. Smaller than UUID. | MEDIUM |
| date-fns | ^4.x | Date utilities | Lightweight date manipulation. Tree-shakeable (unlike Moment.js). For bracket round scheduling, analytics date ranges. | MEDIUM |
| unique-names-generator | ^4.x | Fun student names | Generates random "Adjective + Animal" names (e.g., "Brave Penguin"). Exactly what Kahoot-style anonymous naming needs. Configurable dictionaries. | MEDIUM |
| csv-parse | ^5.x | CSV parsing | Teacher CSV upload for bracket/poll entrants. Streaming parser for large files. | MEDIUM |

### Development Tools

| Tool | Purpose | Notes | Confidence |
|------|---------|-------|------------|
| ESLint | Code linting | Scaffolded by Next.js 16. Use `eslint-config-next`. | HIGH (verified) |
| Prettier | Code formatting | Consistent code style. Integrate with ESLint. | HIGH |
| Turbopack | Bundler | Default in Next.js 16 (stable). Replaces Webpack. Much faster HMR. | HIGH (verified) |
| Vitest | Unit/integration testing | Fast, Vite-compatible test runner. Better DX than Jest for modern projects. Native TypeScript support. | MEDIUM |
| Playwright | E2E testing | Cross-browser testing. Tests student join flow, voting, bracket advancement. Vercel integrates with Playwright. | MEDIUM |
| Husky + lint-staged | Git hooks | Pre-commit linting and formatting. Prevents broken code from being committed. | MEDIUM |

### Infrastructure & Deployment

| Technology | Purpose | Why Recommended | Confidence |
|------------|---------|-----------------|------------|
| Vercel | Hosting & deployment | Native Next.js platform. Zero-config deployment. Global CDN. Serverless functions. Preview deployments for PR review. Custom domain (sparkvotedu.com) support. Free tier sufficient for development; Pro ($20/mo) for production. | HIGH (verified via Vercel docs) |
| Supabase Cloud | Database & backend services | Managed PostgreSQL, Auth, Realtime, Storage. Free tier for development. Pro ($25/mo) for production with more connections and bandwidth. | MEDIUM |
| Vercel Analytics | Performance monitoring | Built-in Web Vitals tracking. One-line integration. | HIGH (verified via Vercel docs) |
| Resend or Postmark | Transactional email | Teacher account verification, password reset, subscription receipts. Resend has great DX. | LOW (needs evaluation at implementation) |

---

## Installation

```bash
# Scaffold Next.js project
npx create-next-app@latest sparkvotedu --yes
cd sparkvotedu

# Database & Auth
npm install @supabase/supabase-js @supabase/ssr

# ORM
npm install prisma @prisma/client
npx prisma init

# Payments
npm install stripe @stripe/stripe-js

# Device Fingerprinting
npm install @fingerprintjs/fingerprintjs

# UI Components (shadcn/ui - CLI-based installation)
npx shadcn@latest init
npx shadcn@latest add button card dialog input table tabs badge

# Animation & Visualization
npm install framer-motion recharts

# State Management & Data Fetching
npm install @tanstack/react-query zustand

# Forms & Validation
npm install react-hook-form @hookform/resolvers zod

# Utilities
npm install nanoid date-fns unique-names-generator csv-parse

# Icons
npm install lucide-react

# Dev dependencies
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom
npm install -D playwright @playwright/test
npm install -D husky lint-staged prettier
```

---

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| Framework | Next.js 16 | Remix / SvelteKit | Remix if you want nested routing without App Router opinions. SvelteKit if team knows Svelte. Neither has Next.js ecosystem breadth. |
| Database | Supabase (PostgreSQL) | PlanetScale (MySQL) | If you need horizontal MySQL scaling. Not relevant at our scale. |
| Database | Supabase (PostgreSQL) | Firebase (NoSQL) | If data is document-shaped. Bracket data is relational -- Firebase would be painful. |
| Auth | Supabase Auth | Auth.js (NextAuth) | If NOT using Supabase for database. Auth.js is the standard standalone Next.js auth solution. |
| Auth | Supabase Auth | Clerk | If you want drop-in UI components for auth. Adds $25+/mo cost. |
| Realtime | Supabase Realtime | Socket.IO | If you need complex bidirectional protocols (gaming, collaborative editing). Overkill for vote broadcasting. |
| Realtime | Supabase Realtime | Pusher / Ably | If you need enterprise SLA on realtime. Adds per-message billing complexity. |
| ORM | Prisma | Drizzle ORM | If you prefer SQL-like syntax over Prisma's query builder. Drizzle is lighter weight but less mature ecosystem. |
| State | Zustand | Redux Toolkit | If you have complex, deeply nested state with middleware needs. Overkill for this app. |
| State | Zustand | Jotai | If you prefer atomic state model. Good alternative; Zustand is simpler for our needs. |
| UI | shadcn/ui | Chakra UI / Mantine | If you want a fully packaged component library. shadcn/ui gives more control and is Tailwind-native. |
| Testing | Vitest | Jest | If you have existing Jest config. Vitest is faster and has native TS support. |
| Hosting | Vercel | Netlify / Railway | Netlify if you want more build config control. Railway for self-hosted database. Vercel is best for Next.js. |
| Payments | Stripe | LemonSqueezy | If you want simpler tax handling for digital products. LemonSqueezy is merchant of record. But Stripe has deeper subscription management APIs. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Firebase / Firestore | NoSQL is wrong data model for bracket tournaments (complex relational joins). Would require denormalization hell for bracket trees, matchup advancement paths, multi-round relationships. | Supabase (PostgreSQL) |
| Moment.js | Deprecated by its own maintainers. 300KB+ bundle size. Tree-shaking impossible. | date-fns (modular, <10KB used) |
| Create React App (CRA) | Officially deprecated. No SSR, no routing, no API routes. | Next.js 16 |
| Express.js (separate backend) | Unnecessary complexity. Next.js API routes + Supabase Edge Functions handle all server logic. Separate Express server doubles deployment surface. | Next.js Route Handlers + Supabase |
| Redux (standalone) | Massive boilerplate for simple state. SparkVotEDU's client state is not complex enough to justify Redux. | Zustand (simple) + React Query (server state) |
| Webpack | Replaced by Turbopack as default in Next.js 16. Slower HMR, larger config surface. | Turbopack (default, zero-config) |
| MongoDB / Mongoose | Same NoSQL problem as Firebase. Bracket tournaments need relational queries (JOINs, recursive CTEs for bracket trees). | PostgreSQL via Supabase + Prisma |
| Passport.js | Low-level auth middleware from the Express era. Requires manual session management. | Supabase Auth (managed) |
| Material UI (MUI) | Opinionated Google-style design. Heavy bundle. Does not integrate well with Tailwind. Hard to brand for EdTech product with its own identity. | shadcn/ui + Tailwind CSS |
| Custom WebSocket server | Operational burden: must deploy, monitor, scale separately from Next.js app. Connection management, reconnection logic, load balancing all become your problem. | Supabase Realtime (managed) |

---

## Stack Patterns by Variant

**If student device fingerprinting proves insufficient (shared Chrome profiles):**
- Add optional "session code" approach: teacher generates per-session 4-digit code, students enter their name + code
- Falls back to name-based identity instead of device-based
- Implement as fallback, not replacement

**If Supabase Realtime has latency issues at scale (100+ simultaneous voters):**
- Add Vercel Edge Config for caching vote counts
- Implement client-side optimistic updates with React Query
- Consider upgrading to Supabase Pro plan for higher connection limits
- Last resort: add Pusher as a dedicated broadcast layer

**If sports API is unreliable or discontinued:**
- Abstract sports data behind `SportsDataProvider` interface
- Implement adapter pattern so providers can be swapped
- Consider caching API responses in Supabase (sports data changes infrequently)
- Build manual bracket creation first, sports integration second

**If Prisma has performance issues with complex bracket queries:**
- Use Prisma for simple CRUD operations
- Use Supabase's `rpc()` for complex PostgreSQL functions (recursive CTEs for bracket trees)
- This hybrid approach is well-documented in the Prisma + Supabase ecosystem

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Next.js 16.1 | React 19.2 | React 19.2 ships with Next.js 16. Do NOT install React separately. |
| Next.js 16.1 | TypeScript 5.x | TypeScript scaffolded by default. Use bundled version. |
| Next.js 16.1 | Tailwind CSS 4.x | Scaffolded by default. New CSS-first configuration (no tailwind.config.js needed). |
| Prisma 6.x | @supabase/supabase-js | Prisma connects to Supabase's PostgreSQL via connection string. Use pooled connection (port 6543) for serverless. |
| @supabase/ssr | Next.js 16 | Supabase's SSR helper for Next.js App Router. Handles cookie-based auth in Server Components. |
| shadcn/ui | Tailwind CSS 4.x | shadcn/ui v2+ supports Tailwind v4. Verify at init time with `npx shadcn@latest init`. |
| TanStack Query 5 | React 19 | TanStack Query 5 supports React 19. Includes Suspense integration. |
| Stripe SDK | Next.js Route Handlers | Use Route Handlers (not API Routes from Pages Router) for webhook endpoints. |

---

## Cost Estimate (Monthly Production)

| Service | Tier | Cost | Notes |
|---------|------|------|-------|
| Vercel | Pro | $20/mo | Custom domain, more serverless invocations |
| Supabase | Pro | $25/mo | 8GB database, 500MB realtime, more connections |
| Stripe | Pay-as-you-go | 2.9% + 30c per transaction | No monthly fee. Revenue-positive at even 10 paying teachers. |
| Sports API | TBD | $0-100/mo | ESPN unofficial = free; SportsDataIO = $25/sport |
| Email (Resend) | Free tier | $0 | 100 emails/day free (sufficient for early growth) |
| Domain | Annual | ~$12/yr | sparkvotedu.com already owned |
| **Total** | | **$45-145/mo** | Before sports API decision |

**Break-even:** 4 Pro teachers ($48/mo) or 3 Pro Plus teachers ($60/mo) covers base infrastructure.

---

## Sources

- **Next.js 16.1 (HIGH confidence):** Verified via https://nextjs.org/blog -- confirmed v16.1 release December 18, 2025. Turbopack stable, React 19.2 support, Cache Components, React Compiler stable.
- **Next.js installation defaults (HIGH confidence):** Verified via https://nextjs.org/docs/getting-started/installation -- TypeScript, Tailwind CSS, ESLint, App Router, Turbopack all scaffolded by default with `--yes` flag.
- **Vercel deployment features (HIGH confidence):** Verified via https://vercel.com/docs/frameworks/nextjs -- ISR, SSR, streaming, image optimization, middleware all confirmed for Next.js on Vercel.
- **Supabase features (MEDIUM confidence):** Realtime (Broadcast, Presence, Postgres Changes), Auth with OAuth providers, PostgreSQL, Edge Functions -- known from training data. Exact current version not verified.
- **Prisma (MEDIUM confidence):** Version 6.x estimated from training data trajectory. Type-safe ORM with migration system -- well established. Verify version at install time.
- **Stripe (MEDIUM confidence):** SDK version ^17.x from training data. Subscription billing, Customer Portal, webhooks -- well-established API patterns. Verify version at install time.
- **FingerprintJS (MEDIUM confidence):** Open-source v4.x from training data. Browser fingerprinting capabilities known. Verify version at install time.
- **Sports APIs (LOW confidence):** ESPN unofficial API endpoints known from community usage. SportsDataIO pricing from training data (may be outdated). This area needs the deepest phase-specific research.
- **shadcn/ui, TanStack Query, Zustand, Framer Motion (MEDIUM confidence):** Well-known libraries from training data. Versions estimated. Verify at install time.

---

## Key Decisions Summary

| Decision | Choice | Confidence | Rationale |
|----------|--------|------------|-----------|
| Framework | Next.js 16.1 | HIGH | Verified latest stable. Best React framework. Native Vercel deployment. |
| Database + Backend | Supabase | MEDIUM | PostgreSQL for relational bracket data. Bundled Realtime + Auth eliminates 2 separate services. |
| ORM | Prisma | MEDIUM | Type-safe, migration system, works with Supabase PostgreSQL. |
| Auth | Supabase Auth | MEDIUM | Bundled with Supabase. OAuth providers for teachers. No extra service. |
| Realtime | Supabase Realtime | MEDIUM | Bundled with Supabase. Broadcast + Presence covers all use cases. |
| Payments | Stripe | MEDIUM | Industry standard SaaS subscriptions. No realistic alternative at this scale. |
| Fingerprinting | FingerprintJS (OSS) + localStorage | MEDIUM | Free, sufficient for base fingerprint. localStorage for school device differentiation. |
| Sports Data | ESPN (MVP) -> SportsDataIO (production) | LOW | ESPN free but unofficial. Needs phase-specific research. |
| UI | shadcn/ui + Tailwind | MEDIUM | Full control, accessible, Tailwind-native. |
| Hosting | Vercel | HIGH | Native Next.js platform. Verified feature support. |

---
*Stack research for: SparkVotEDU -- EdTech classroom polling and tournament bracket app*
*Researched: 2026-01-28*
