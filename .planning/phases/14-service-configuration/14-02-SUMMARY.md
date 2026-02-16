---
phase: 14-service-configuration
plan: 02
subsystem: infra
tags: [oauth, supabase, stripe, vercel, deployment, custom-domain]

# Dependency graph
requires:
  - phase: 14-01
    provides: env documentation, health endpoint, image constraints
provides:
  - OAuth callback with teacher profile sync (name, avatar)
  - All external services configured and verified on production
  - Supabase custom domain (api.sparkvotedu.com)
  - Vercel project linked with Git auto-deploy
  - Production deployment live at sparkvotedu.com
affects: [15-ux-polish, 16-legal-pages, 17-admin-panel, 18-production-deploy]

# Tech tracking
tech-stack:
  added: []
  patterns: [oauth-profile-sync, custom-domain]

key-files:
  modified:
    - src/app/auth/callback/route.ts
    - src/components/auth/oauth-buttons.tsx
    - src/actions/billing.ts
    - package.json

key-decisions:
  - "Microsoft and Apple OAuth on hold -- Google + email/password only for launch"
  - "Supabase custom domain at api.sparkvotedu.com for branded OAuth consent screen"
  - "GoDaddy proxy warning accepted -- non-blocking, site functional"
  - "Poll image upload UI not wired into form -- deferred to Phase 15 UX"
  - "Stripe production webhook creation deferred -- can be done when needed"

patterns-established:
  - "OAuth profile sync: extract name/avatar from provider metadata, upsert Teacher record, never block redirect on failure"

# Metrics
duration: 90min
completed: 2026-02-16
---

# Phase 14 Plan 02: External Service Configuration Summary

**OAuth callback profile sync, external service dashboard configuration, Vercel deployment, and Supabase custom domain setup**

## Performance

- **Duration:** ~90 min (interactive walkthrough with user)
- **Completed:** 2026-02-16
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 4

## Accomplishments
- Enhanced OAuth callback to sync teacher name and avatar from provider metadata via prisma.teacher.upsert
- Configured Google OAuth in Google Cloud Console and Supabase Auth
- Created Supabase Storage poll-images bucket (public, 5MB, JPG/PNG/WebP)
- Set up Supabase custom domain at api.sparkvotedu.com for branded OAuth
- Created Vercel project, linked Git repo (CaringHarder/sparkvotedu), configured auto-deploy
- Added all 13+ production env vars to Vercel
- Connected sparkvotedu.com domain with DNS (GoDaddy)
- Fixed pre-existing TypeScript error in billing actions (createPortalSession form action type)
- Fixed Vercel build: added prisma generate to build script, committed missing bracket-mini-map component
- Removed Microsoft and Apple OAuth buttons (providers on hold)
- Verified all services healthy via /api/health endpoint on production
- Google OAuth sign-in verified working end-to-end on sparkvotedu.com

## Task Commits

1. **Task 1: OAuth callback profile sync** - `04bb743` (feat)
2. **Build fix: billing TS error** - `6923968` (fix)
3. **Build fix: prisma generate + bracket-mini-map** - `845dc97` (fix)
4. **Remove Microsoft/Apple OAuth buttons** - `2439df7` (fix)

## Deviations from Plan

### Intentional Changes

**1. Microsoft and Apple OAuth skipped**
- **Reason:** User decision to launch with Google + email/password only
- **Impact:** Removed OAuth buttons from UI. Providers can be re-enabled later.

**2. Supabase custom domain added (not in original plan)**
- **Reason:** Google OAuth consent screen showed ugly Supabase URL
- **Impact:** Better UX, branded auth experience at api.sparkvotedu.com

**3. Stripe production webhook deferred**
- **Reason:** User couldn't find test webhook button in Stripe Dashboard
- **Impact:** Webhook can be configured when production subscriptions are needed

**4. Poll image upload UI gap discovered**
- **Reason:** Component exists but isn't wired into poll creation form
- **Impact:** Deferred to Phase 15 UX Polish

### Auto-fixed Issues

**1. [Bug] TypeScript error in createPortalSession**
- **Issue:** Form action returned `{ error: string }` instead of `void`
- **Fix:** Changed error returns to redirects
- **Files:** src/actions/billing.ts

**2. [Bug] Vercel Git deploy missing prisma generate**
- **Issue:** CLI deploy included local generated files; Git deploy doesn't
- **Fix:** Added `prisma generate &&` to build script in package.json

**3. [Bug] bracket-mini-map.tsx not committed**
- **Issue:** Component was untracked, causing build failure on Git deploy
- **Fix:** Committed the file

## Issues Encountered
- GoDaddy "Proxy Detected" warning on Vercel -- cosmetic, doesn't block functionality
- GoDaddy Website Builder draft couldn't be disconnected from domain

## Self-Check: PASSED

All services verified healthy on production. Google OAuth working end-to-end.

---
*Phase: 14-service-configuration*
*Completed: 2026-02-16*
