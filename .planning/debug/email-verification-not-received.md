---
status: verifying
trigger: "Teacher sign up says email notification sent, but no email arrives in inbox or junk folder."
created: 2026-02-23T00:00:00Z
updated: 2026-02-23T00:02:00Z
---

## Current Focus

hypothesis: CONFIRMED - Supabase built-in email service does not send to external addresses without custom SMTP
test: code fix applied (emailRedirectTo added); dashboard SMTP config required from user
expecting: once Resend SMTP is configured in Supabase dashboard, signup emails will be delivered
next_action: CHECKPOINT - user must configure Resend SMTP in Supabase dashboard, then test signup

## Symptoms

expected: A verification/confirmation email should arrive after teacher signup to verify the account
actual: The app says the email was sent, but no email arrives in inbox or junk/spam folder
errors: No visible errors - the app reports success
reproduction: Teacher signs up on production (Vercel), sees "email sent" message, checks inbox and junk - nothing arrives
started: Not sure if it ever worked - first time testing this flow
additional: Testing with a personal Apple/iCloud email address on the production Vercel deployment

## Eliminated

- hypothesis: Bug in signup form or server action code
  evidence: Code at src/actions/auth.ts correctly calls supabase.auth.signUp() and returns success only on non-error. The Supabase API itself returns success (no error) even when it silently drops the email.
  timestamp: 2026-02-23T00:00:30Z

- hypothesis: Missing auth callback route
  evidence: src/app/auth/callback/route.ts exists and handles code exchange correctly
  timestamp: 2026-02-23T00:00:30Z

- hypothesis: Custom email service misconfigured
  evidence: No email service is configured at all - no Resend, SendGrid, SMTP, or any other email provider found in env vars or code
  timestamp: 2026-02-23T00:00:45Z

## Evidence

- timestamp: 2026-02-23T00:00:15Z
  checked: .env.example and .env.local for email service configuration
  found: No email service API keys exist (no RESEND_API_KEY, SENDGRID_API_KEY, SMTP settings). Only Supabase, Stripe, and SportsDataIO keys present.
  implication: App relies entirely on Supabase's built-in email service

- timestamp: 2026-02-23T00:00:20Z
  checked: src/actions/auth.ts signUp function
  found: Uses supabase.auth.signUp() with no emailRedirectTo option. Returns hardcoded success message "Check your email for a confirmation link." when no error from Supabase API.
  implication: The signUp call delegates email sending to Supabase's built-in service. Missing emailRedirectTo is a secondary issue (now fixed).

- timestamp: 2026-02-23T00:00:25Z
  checked: Entire codebase for any email sending libraries or SMTP configuration
  found: Zero results for resend, sendgrid, smtp, nodemailer, mailgun, postmark
  implication: No custom email service has ever been configured for this project

- timestamp: 2026-02-23T00:00:40Z
  checked: Supabase documentation on built-in email service
  found: "Unless you configure a custom SMTP server for your project, Supabase Auth will refuse to deliver messages to addresses that are not part of the project's team." Built-in service is rate-limited to 2-3 emails per hour and ONLY sends to project team member addresses.
  implication: ROOT CAUSE - The built-in email service silently drops emails to external addresses. The iCloud address is not a project team member, so no email is ever sent despite the API returning success.

- timestamp: 2026-02-23T00:01:30Z
  checked: Applied code fix and ran type-check
  found: Added emailRedirectTo to signUp options (src/actions/auth.ts line 35). TypeScript compiles cleanly with no errors.
  implication: Code-side fix is ready. Dashboard configuration still required.

## Resolution

root_cause: Supabase's built-in email service only delivers to addresses that are project team members. No custom SMTP provider (Resend, SendGrid, etc.) is configured for this Supabase project. The supabase.auth.signUp() API returns success even when the email is silently dropped, causing the UI to show "Check your email" while nothing is actually sent. Additionally, the signUp call was missing emailRedirectTo, which would cause confirmation links to redirect incorrectly even once email delivery is working.
fix: Two-part fix. (1) CODE: Added emailRedirectTo to signUp options pointing to /auth/callback. Updated .env.example with SMTP setup instructions. (2) DASHBOARD (manual): Must configure custom SMTP in Supabase Dashboard using Resend or similar provider.
verification: Pending - requires dashboard SMTP configuration then manual signup test
files_changed:
  - src/actions/auth.ts (added emailRedirectTo to signUp options)
  - .env.example (added SMTP setup documentation)
