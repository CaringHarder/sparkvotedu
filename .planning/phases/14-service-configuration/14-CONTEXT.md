# Phase 14: Service Configuration - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Configure all external services for production use on sparkvotedu.com: OAuth providers (Google, Microsoft, Apple), Supabase Storage for image uploads, Stripe webhooks, SportsDataIO cron sync, and Vercel CRON_SECRET. This phase is about getting services connected and functional — not building new features.

</domain>

<decisions>
## Implementation Decisions

### OAuth Provider Configuration
- Request full profile data from all providers: email, name, and avatar
- All three providers (Google, Microsoft, Apple) must work at launch — none deferred
- Production callback URLs point to sparkvotedu.com
- User owns sparkvotedu.com domain and can configure DNS
- Google Cloud may already be set up; Microsoft Azure AD and Apple Developer need verification
- Apple Developer Program requires $99/year membership — user needs to verify/enroll
- Step-by-step setup guides needed for each provider in the plan

### Image Upload Rules (Polls)
- Max file size: 5 MB
- Allowed formats: JPG, PNG, WebP only (no GIFs)
- Auto-resize and compress on upload (max ~1200px dimensions)
- Public URLs (unguessable but accessible without auth)
- One image per poll option
- No storage limits by tier for now — unlimited for all teachers
- Teachers can delete images anytime, even on active polls

### Bracket Entry Images
- Images for each bracket entry/contestant (optional, never required)
- Same upload rules as polls: 5 MB, JPG/PNG/WebP, auto-resize+compress
- Small thumbnail displayed next to entry name in bracket slots
- Students see entry images when voting on matchups
- Sports brackets auto-fetch team logos from SportsDataIO API
- Crop tool on upload — teachers choose the framing
- Images deleted when bracket is deleted (auto-cleanup)
- Teachers can add/change images anytime, including on active brackets
- No content moderation/filtering at launch — trust teachers

### SportsDataIO Cron Sync
- Sync every 15 minutes for near-real-time scores
- NCAA men's and women's basketball only (what's already built)
- Season-aware: only sync during active seasons to save API calls
- API key already available
- Alert admin on consecutive failures: both email notification and admin dashboard
- Admin panel includes a manual "Sync Now" button for on-demand refresh
- Show "last updated" timestamp on sports data so teachers know freshness

### Stripe Webhook & Vercel CRON_SECRET
- Standard configuration — no special user decisions needed

### Failure Behavior
- Image upload failure: block with clear error message, let teacher save without image and add later
- Stripe checkout failure: "Payment processing is temporarily unavailable. Please try again in a few minutes."
- Stale sports data: show "last updated" timestamp
- Global status banner at top of page when any service has issues (like GitHub's status page)

### Claude's Discretion
- OAuth provider down: whether to suggest alternative providers or generic retry message
- Multi-provider account linking (same teacher, multiple OAuth providers)
- Staging/preview environment OAuth configuration
- Storage bucket organization (single bucket with folders vs separate buckets)
- Bracket entry images in visual bracket tree view (readability tradeoff)
- Consecutive failure threshold for admin email alerts
- Upload failure UX pattern (toast vs inline)

</decisions>

<specifics>
## Specific Ideas

- "Global status banner" inspired by GitHub's status page — top-of-page notification when services are degraded
- Crop tool on image upload for bracket entries so teachers control framing
- Manual "Sync Now" button in admin panel for on-demand sports data refresh
- Step-by-step guides needed for OAuth provider setup (user may not have all accounts ready)

</specifics>

<deferred>
## Deferred Ideas

- Image content moderation/filtering — revisit post-launch if needed
- Storage limits by subscription tier — future billing enhancement
- Additional sports beyond NCAA basketball — future expansion
- Bulk image upload for bracket entries — future UX improvement

</deferred>

---

*Phase: 14-service-configuration*
*Context gathered: 2026-02-16*
