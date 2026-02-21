# Phase 18: Production Deploy - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy SparkVotEDU to sparkvotedu.com on Vercel, replacing the existing live site. Ensure all production services are operational and core flows work end-to-end. No new features — this is purely deployment and verification.

</domain>

<decisions>
## Implementation Decisions

### Cutover strategy
- Replacing an existing live site at sparkvotedu.com (currently hosted on Vercel)
- Same Vercel account for both old and new projects — can reassign domain directly
- Quick swap is acceptable — a few minutes of downtime during cutover is fine
- Same Supabase database shared between old and new sites — data continuity is automatic
- Schema changes during deploy need care since both sites share the same database

### Production verification
- Deploy to Vercel preview URL first, verify key flows, then assign sparkvotedu.com
- Hit /api/health endpoint on preview to confirm all integrations (Supabase, Stripe, SportsDataIO) report healthy
- Stripe production webhook is already configured — no setup needed

### Environment & secrets
- All production environment variables (Supabase, Stripe, SportsDataIO, CRON_SECRET) are already configured in Vercel
- Supabase auth settings (redirect URLs, Google OAuth callback) already point to sparkvotedu.com
- Supabase project situation unclear (same or separate from dev) — investigate during implementation
- Database migration step: include if needed based on codebase analysis

### Rollback plan
- Use Vercel's built-in instant rollback to revert to previous deployment if something breaks
- Old Vercel project retention: Claude's discretion on how long to keep as fallback
- No data migration needed — both sites share the same Supabase database

### Claude's Discretion
- Verification approach — determine the right set of flows to test after deploy
- Database migration — determine if `prisma migrate deploy` or equivalent is needed
- Old project retention timeline — how long to keep the old Vercel project as fallback
- Supabase project setup — investigate whether dev and prod share a project or are separate

</decisions>

<specifics>
## Specific Ideas

- Both old and new sites use the same Supabase database, so user data carries over automatically
- Preview-first deployment lets us catch issues before touching the production domain
- Health endpoint already exists from Phase 14 — leverage it for automated verification

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-production-deploy*
*Context gathered: 2026-02-21*
