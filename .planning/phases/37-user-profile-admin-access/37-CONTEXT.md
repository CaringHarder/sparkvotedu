# Phase 37: User Profile & Admin Access - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers can manage their account from a profile page (edit display name, change password), view account info (email, role). Admins get a gear icon for quick admin panel access. Accounts created by admins with temporary passwords force an immediate password change on first login before accessing the dashboard.

</domain>

<decisions>
## Implementation Decisions

### Profile page layout
- Three sections: Display Name (editable), Password Change, Account Info (email + role, read-only)
- Email is read-only — shown for reference, not editable
- Save button per section — teacher can update name without touching password, and vice versa

### Password change flow
- Minimum length requirement only (8+ characters) — no complexity rules
- No "Forgot password?" link on profile page — that flow lives on the login page
- Inline or modal for password change fields — Claude's discretion based on save-per-section pattern

### Forced password reset
- Any password set by an admin during account creation is automatically treated as temporary — no checkbox needed
- Welcoming tone on reset screen: "Welcome to SparkVote! Set your password to get started."
- After setting new password, teacher lands directly on the dashboard — no re-login required
- Full-page vs modal presentation — Claude's discretion (must be non-dismissable)

### Admin access
- Gear icon in the upper corner near the sign out button — only visible to admin users
- Tooltip on hover: "Admin Panel"
- Clicking gear opens /admin in a new tab — teacher's dashboard stays open
- Non-admin users never see the gear icon

### Profile sidebar link
- Placement in sidebar — Claude's discretion based on existing layout

### Claude's Discretion
- Visual style of profile page (card sections vs clean form)
- Password change UX (inline fields vs modal dialog)
- Forced reset presentation (full-page takeover vs non-dismissable modal)
- Profile link placement in sidebar
- Post password-change behavior (stay logged in vs sign out — lean toward least disruptive)

</decisions>

<specifics>
## Specific Ideas

- Forced reset should feel like onboarding, not a security warning — welcoming tone
- Admin gear icon positioned near sign out for discoverability without cluttering sidebar nav
- Admin panel opens in new tab so teacher workflow isn't interrupted

</specifics>

<deferred>
## Deferred Ideas

- Email verification required before login — currently not enforced, user wants it required. New authentication flow capability — belongs in its own phase.
- Email editing from profile page — deliberately excluded (read-only for now)

</deferred>

---

*Phase: 37-user-profile-admin-access*
*Context gathered: 2026-03-02*
