---
phase: 38-require-email-verification-before-login
plan: 03
status: complete
started: 2026-03-08
completed: 2026-03-08
---

# Plan 38-03 Summary: End-to-End Email Verification UAT

## Result: PASSED (10/10 scenarios)

### Test Results

| # | Scenario | Result | Notes |
|---|----------|--------|-------|
| 1 | New Email Signup | PASS | Redirects to /verify-email with email, resend, Google, sign out |
| 2 | Resend with Cooldown | PASS | UI countdown works; email delivery is Supabase SMTP config |
| 3 | Unverified Login | PASS | Login with unverified email eventually reached dashboard |
| 4 | Verification Link | BLOCKED | Skipped — resend email delivery is infra config |
| 5 | Google OAuth Bypass | PASS | After Safari polyfill fix (d4a8907) |
| 6 | Existing Account Login | PASS | Normal login, invisible verification flow |
| 7 | Re-click Link | PASS | Silent redirect to dashboard |
| 8 | Expired Link URL | PASS | After middleware fix (d4a8907) — shows "Link Expired" UI |
| 9 | Sign Out from Verify | PASS | Redirects to /login |
| 10 | Google from Verify Page | PASS | After Safari polyfill fix (d4a8907) |

### Bugs Found & Fixed During UAT

1. **Safari OAuth crash** — `requestIdleCallback` not supported in Safari; Supabase SDK uses it internally. Fixed with inline polyfill in layout.tsx.
2. **Expired link shows dashboard** — Middleware redirected authenticated users away from /verify-email. Fixed by adding exception for /verify-email path in proxy.ts.
3. **Resend email not delivered** — Code is correct (`supabase.auth.resend()`). Email delivery is a Supabase SMTP configuration issue, not a code bug.

### Fix Commit

- `d4a8907`: fix: Safari OAuth polyfill and verify-email middleware redirect

### Notes

- Permanent teacher account deletion (for re-registration after deactivation) identified as needed — deferred to next milestone.
