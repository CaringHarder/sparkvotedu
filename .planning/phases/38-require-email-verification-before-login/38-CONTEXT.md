# Phase 38: Require Email Verification Before Login - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Email signup flow enforces verification before granting dashboard access. Teachers who sign up with email must click a verification link before they can log in. Google OAuth sign-in is unaffected (already verified by provider). Existing accounts are grandfathered in with a soft nudge to verify.

</domain>

<decisions>
## Implementation Decisions

### Blocking Screen UX
- Branded SparkVote-styled page with illustration/icon, verification message, resend button, and alternative sign-in options
- Show full email address: "We sent a verification link to teacher@school.edu"
- Resend button with 60-second cooldown timer (button disables with countdown to prevent spam)
- Include "Sign out" link AND "Sign in with Google instead" button on the blocking page
- Page should match existing SparkVote auth page styling

### Verification Link Behavior
- Clicking the link verifies AND auto-logs the teacher in — they land directly on the dashboard
- Link works from any device/browser (not restricted to signup session)
- Expired link: show "This link has expired" page with a button to resend a new verification email
- Already-verified re-click: silently redirect to dashboard (no error or redundant message)

### Existing User Handling
- Grandfather existing accounts — only NEW email signups require verification
- Grandfathered users see nothing different — completely invisible to them (no nudge banner)
- Admin-created accounts (Phase 37 temp password flow) skip email verification — admin vouches for the email
- Cutoff method for grandfathering: Claude's discretion based on Supabase auth schema

### Email Content & Branding
- Use Supabase's built-in email template with minor text customization (least effort)
- Subject line, sender name, and body tone: Claude's discretion — match SparkVote's existing messaging style

### Claude's Discretion
- Technical approach for determining grandfathered vs new accounts
- Email subject line, sender name, and body copy
- Exact verification link expiration duration
- Loading/transition states during verification flow
- Verification link expiration handling details

</decisions>

<specifics>
## Specific Ideas

- Blocking screen should feel branded, not like a generic error — this is a teacher's first impression post-signup
- Cooldown timer on resend prevents support burden from confused users clicking repeatedly
- Google sign-in as an alternative on the blocking page gives teachers an immediate workaround if email is slow

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 38-require-email-verification-before-login*
*Context gathered: 2026-03-02*
