---
phase: 01-foundation-and-auth
plan: 01
subsystem: infra
tags: [nextjs, prisma, supabase, tailwind, shadcn, zod, typescript]

requires:
  - phase: none
    provides: first phase
provides:
  - Next.js 16 project with App Router, TypeScript, Tailwind CSS v4
  - Prisma v7 with Teacher model pushed to Supabase PostgreSQL
  - Supabase client utilities (server, browser, admin)
  - Zod validation schemas for auth forms
  - shadcn/ui components (button, card, input, label, separator)
affects: [01-02, 01-03, 01-04, 01-05, all-future-phases]

tech-stack:
  added: [next@16, prisma@7, @supabase/supabase-js, @supabase/ssr, @prisma/adapter-pg, pg, zod, shadcn/ui, tw-animate-css]
  patterns: [prisma-singleton, supabase-ssr-cookie-pattern, zod-form-validation, esm-module-system]

key-files:
  created:
    - prisma.config.ts
    - prisma/schema.prisma
    - src/lib/prisma.ts
    - src/lib/supabase/server.ts
    - src/lib/supabase/client.ts
    - src/lib/supabase/admin.ts
    - src/lib/utils/validation.ts
    - src/types/database.ts
    - .env.local
    - .env.example
  modified:
    - package.json
    - tsconfig.json
    - .gitignore

key-decisions:
  - "Used prisma-client-js generator (not prisma-client) for Turbopack compatibility"
  - "dotenv.config({ path: '.env.local' }) in prisma.config.ts since dotenv/config only reads .env"
  - "Supabase SSR uses getAll/setAll cookie pattern (not individual get/set/remove)"
  - "ESM module system (type: module in package.json) for Prisma v7 compatibility"

patterns-established:
  - "Prisma singleton: globalThis caching in dev, fresh client in prod"
  - "Supabase server client: createServerClient with cookies().getAll()/setAll()"
  - "Supabase browser client: createBrowserClient from @supabase/ssr"
  - "Supabase admin client: createClient with service_role key, no session persistence"
  - "Zod validation: schemas export both validator and inferred TypeScript type"

duration: ~15min
completed: 2026-01-29
---

# Plan 01-01: Project Scaffolding Summary

**Next.js 16 with Prisma v7 connected to Supabase PostgreSQL, Teacher model pushed, and server/browser/admin Supabase clients ready**

## Performance

- **Tasks:** 2
- **Files created:** 14+
- **Completed:** 2026-01-29

## Accomplishments
- Next.js 16 scaffolded with App Router, TypeScript, Tailwind CSS v4, ESLint
- All Phase 1 dependencies installed (Supabase, Prisma v7, shadcn/ui, Zod)
- Prisma v7 configured with prisma.config.ts, PrismaPg driver adapter, Teacher model
- Teacher table created in Supabase PostgreSQL via `prisma db push`
- Supabase server/browser/admin client utilities with SSR cookie pattern
- Zod validation schemas for signup, signin, forgot-password, update-password
- shadcn/ui initialized with button, card, input, label, separator components
- `npm run build` succeeds

## Task Commits

1. **Task 1: Scaffold Next.js 16 project and install all Phase 1 dependencies** - `1d89a3e` (feat)
2. **Task 2: Configure Prisma v7, Teacher model, Supabase clients, validation** - `5b454bc` (feat)
3. **Fix: Load .env.local for Prisma config** - `b533a11` (fix)

## Files Created/Modified
- `package.json` - Project dependencies, ESM config ("type": "module")
- `prisma.config.ts` - Prisma v7 config loading DIRECT_URL from .env.local
- `prisma/schema.prisma` - Teacher model with all auth and billing fields
- `src/lib/prisma.ts` - Singleton PrismaClient with PrismaPg adapter
- `src/lib/supabase/server.ts` - Server-side Supabase client with cookie adapter
- `src/lib/supabase/client.ts` - Browser Supabase client
- `src/lib/supabase/admin.ts` - Service role client for admin operations
- `src/lib/utils/validation.ts` - Zod schemas for all auth forms
- `src/types/database.ts` - Re-exported Prisma Teacher type
- `src/components/ui/*` - shadcn/ui components (button, card, input, label, separator)
- `.env.local` - Real Supabase credentials
- `.env.example` - Documented env var template

## Decisions Made
- Used `dotenv.config({ path: '.env.local' })` instead of `import 'dotenv/config'` because the latter only reads `.env`, not `.env.local`
- Used `prisma-client-js` generator for Turbopack compatibility (not `prisma-client`)
- PrismaPg adapter uses DATABASE_URL (pooler), prisma.config.ts uses DIRECT_URL (direct) for migrations

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma config not reading .env.local**
- **Found during:** Task 2 (prisma db push)
- **Issue:** `import 'dotenv/config'` only loads `.env`, not `.env.local`. DIRECT_URL was undefined, falling back to localhost.
- **Fix:** Changed to `dotenv.config({ path: '.env.local' })` for explicit .env.local loading
- **Files modified:** prisma.config.ts
- **Verification:** `npx prisma db push` succeeds, teachers table created
- **Committed in:** b533a11

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix for database connectivity. No scope creep.

## Issues Encountered
- `npx prisma db push` initially failed with P1001 (can't reach localhost:5432) due to dotenv not loading .env.local. Fixed by switching to explicit path loading.

## User Setup Required
- Supabase project created and credentials configured in .env.local
- User changed dev server port to 3001 (NEXT_PUBLIC_SITE_URL updated accordingly)

## Next Phase Readiness
- Foundation complete: Next.js 16 running, Prisma connected, Supabase clients ready
- All Plan 01-02 through 01-05 dependencies satisfied
- Teacher table exists in database for auth DAL

---
*Plan: 01-01 (01-foundation-and-auth)*
*Completed: 2026-01-29*
