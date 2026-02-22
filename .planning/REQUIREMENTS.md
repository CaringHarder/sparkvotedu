# Requirements: SparkVotEDU

**Defined:** 2026-02-21
**Core Value:** Teachers can instantly engage any classroom through voting -- on any topic, in any format -- and see participation happen in real time.

## v1.2 Requirements

Requirements for v1.2 Classroom Hardening. Each maps to roadmap phases.

### Student Identity

- [ ] **IDENT-01**: Student can join a session by entering session code and their first name (no device fingerprint required)
- [ ] **IDENT-02**: First name matching is case-insensitive ("jake" and "Jake" are the same student)
- [ ] **IDENT-03**: When a duplicate first name is detected, the second student is prompted to differentiate (e.g., add last initial)
- [ ] **IDENT-04**: Student is assigned a random fun name for display after joining (Kahoot-style anonymity preserved)
- [ ] **IDENT-05**: Student can rejoin a session from any device using their first name
- [ ] **IDENT-06**: Student's name is editable after joining (in case of typo or preference change)

### Security

- [x] **SEC-01**: All 12 public Supabase tables have RLS enabled with deny-all policy
- [x] **SEC-02**: Prisma server-side operations continue to function after RLS enablement (bypass verified)
- [x] **SEC-03**: Direct PostgREST/Supabase client access returns no data for unauthenticated requests

### Bug Fixes

- [x] **FIX-01**: Teacher dashboard updates in real-time when students submit poll choices
- [ ] **FIX-02**: Poll activation broadcasts to the poll channel (not just the activity channel)

### UX Polish

- [ ] **UX-01**: Presentation mode ranked poll cards have readable text contrast on all items (light and dark backgrounds)
- [ ] **UX-02**: Session selection dropdowns show session name (not session number/code)
- [ ] **UX-03**: Session name is editable from the teacher dashboard
- [ ] **UX-04**: "Activate" and "Go Live" terminology is unified to a single clear term across all bracket types and polls

## Future Requirements

Deferred to future release.

### Cleanup

- **CLEAN-01**: Remove FingerprintJS package and related files after name-based identity is classroom-verified
- **CLEAN-02**: Remove device fingerprint columns from schema after migration period

### OAuth

- **OAUTH-01**: Enable Microsoft OAuth provider
- **OAUTH-02**: Enable Apple OAuth provider

## Out of Scope

| Feature | Reason |
|---------|--------|
| Student email/password accounts | First-name-only identity preserves anonymity |
| Per-row RLS policies (owner-based) | Prisma handles all data access via service role; deny-all sufficient |
| Device fingerprinting improvements | Fundamentally broken on identical school hardware; replaced by name-based identity |
| CITEXT PostgreSQL extension | Prisma `mode: 'insensitive'` handles case-insensitive matching natively |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| IDENT-01 | Phase 20 | Pending |
| IDENT-02 | Phase 20 | Pending |
| IDENT-03 | Phase 20 | Pending |
| IDENT-04 | Phase 20 | Pending |
| IDENT-05 | Phase 20 | Pending |
| IDENT-06 | Phase 20 | Pending |
| SEC-01 | Phase 19 | Complete |
| SEC-02 | Phase 19 | Complete |
| SEC-03 | Phase 19 | Complete |
| FIX-01 | Phase 21 | Complete |
| FIX-02 | Phase 21 | Pending |
| UX-01 | Phase 22 | Pending |
| UX-02 | Phase 22 | Pending |
| UX-03 | Phase 22 | Pending |
| UX-04 | Phase 22 | Pending |

**Coverage:**
- v1.2 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-02-21*
*Last updated: 2026-02-21 after roadmap creation*
