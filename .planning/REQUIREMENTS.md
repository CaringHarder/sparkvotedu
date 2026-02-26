# Requirements: SparkVotEDU

**Defined:** 2026-02-21
**Core Value:** Teachers can instantly engage any classroom through voting -- on any topic, in any format -- and see participation happen in real time.

## v1.3 Requirements

Requirements for v1.3 Bug Fixes & UX Parity. Each maps to roadmap phases.

### UX Parity

- [x] **UXP-01**: Poll cards have a triple-dot context menu with archive, duplicate, and delete actions matching the bracket card pattern
- [x] **UXP-02**: Teacher sign-out button shows a visual pending state (spinner/disabled) while sign-out is processing

### Bug Fixes

- [x] **FIX-01**: Round robin all-at-once brackets complete only after all rounds' matchups are decided, not after the first round
- [x] **FIX-02**: Single elimination bracket final round continues to show realtime vote updates on the teacher live dashboard
- [ ] **FIX-03**: Student dashboard dynamically removes deleted brackets and polls without requiring a page refresh

## v1.2 Requirements (Complete)

### Student Identity

- [x] **IDENT-01**: Student can join a session by entering session code and their first name (no device fingerprint required)
- [x] **IDENT-02**: First name matching is case-insensitive ("jake" and "Jake" are the same student)
- [x] **IDENT-03**: When a duplicate first name is detected, the second student is prompted to differentiate (e.g., add last initial)
- [x] **IDENT-04**: Student is assigned a random fun name for display after joining (Kahoot-style anonymity preserved)
- [x] **IDENT-05**: Student can rejoin a session from any device using their first name
- [x] **IDENT-06**: Student's name is editable after joining (in case of typo or preference change)

### Security

- [x] **SEC-01**: All 12 public Supabase tables have RLS enabled with deny-all policy
- [x] **SEC-02**: Prisma server-side operations continue to function after RLS enablement (bypass verified)
- [x] **SEC-03**: Direct PostgREST/Supabase client access returns no data for unauthenticated requests

### Bug Fixes (v1.2)

- [x] **FIX-v12-01**: Teacher dashboard updates in real-time when students submit poll choices
- [x] **FIX-v12-02**: Poll activation broadcasts to the poll channel (not just the activity channel)

### UX Polish

- [x] **UX-01**: Presentation mode ranked poll cards have readable text contrast on all items (light and dark backgrounds)
- [x] **UX-02**: Session selection dropdowns show session name (not session number/code)
- [x] **UX-03**: Session name is editable from the teacher dashboard
- [x] **UX-04**: "Activate" and "Go Live" terminology is unified to a single clear term across all bracket types and polls

### Bracket & Poll UX Consistency (v1.2)

- [x] **BPUX-01**: Bracket and prediction activation broadcasts to student dashboard (auto-shows without refresh)
- [x] **BPUX-02**: Round robin simple mode uses full-sized MatchupVoteCard presentation
- [x] **BPUX-03**: All bracket types and polls use unified 3-2-1 countdown celebration
- [x] **BPUX-04**: RR tiebreaker shows co-champions instead of arbitrary single winner

### Session Management (v1.2)

- [x] **SESS-01**: Teachers can archive sessions
- [x] **SESS-02**: Teachers can recover archived sessions
- [x] **SESS-03**: Teachers can permanently delete archived sessions

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
| UXP-01 | Phase 25 | Complete |
| UXP-02 | Phase 25 | Complete |
| FIX-01 | Phase 28 | Complete |
| FIX-02 | Phase 27 | Complete |
| FIX-03 | Phase 26 | Pending |

**Coverage:**
- v1.3 requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0

---
*Requirements defined: 2026-02-21*
*Last updated: 2026-02-24 after v1.3 roadmap creation*
