# Requirements: SparkVotEDU v3.0

**Defined:** 2026-03-08
**Core Value:** Teachers can instantly engage any classroom through voting -- on any topic, in any format -- and see participation happen in real time.

## v3.0 Requirements

Requirements for the Student Join Overhaul + Cleanup milestone.

### Join Flow

- [ ] **JOIN-01**: Student joins session (via class code entry or direct link) and instantly receives a unique fun name
- [ ] **JOIN-02**: Student completes 3-step wizard: first name (auto-focused, green button on keystroke) → last initial (max 2 chars, animates in) → emoji picker (4x4 grid of 16 curated K-12-safe emojis)
- [ ] **JOIN-03**: Student sees welcome screen with their fun name + chosen emoji before entering session
- [ ] **JOIN-04**: Student's emoji + fun name display throughout the session (header, sidebar, voting UI, results)

### Persistence

- [ ] **PERS-01**: Same-device returning student auto-rejoins silently via localStorage (zero clicks beyond entering class code or visiting direct link)
- [ ] **PERS-02**: localStorage remembers all sessions the student has joined (not just the most recent)
- [x] **PERS-03**: Cross-device returning student can reclaim identity by typing first name + last initial
- [x] **PERS-04**: When cross-device name match is ambiguous, system shows fun names + emojis for student to pick from

### Teacher Controls

- [ ] **TCHR-01**: Teacher can toggle participation sidebar between fun name view and real name view
- [ ] **TCHR-02**: Toggle has a global default (saved to teacher profile) with per-session override
- [ ] **TCHR-03**: Teacher can edit any student's display name from the participation sidebar
- [ ] **TCHR-04**: Student can edit their own display name and emoji via gear icon in session header

### Migration

- [x] **MIGR-01**: Schema adds emoji and lastInitial columns to StudentParticipant (nullable, zero-downtime)
- [ ] **MIGR-02**: Existing participants get emoji prompt on next rejoin (one-time migration experience)
- [x] **MIGR-03**: New join flow works for both new and existing sessions seamlessly

### Cleanup

- [ ] **CLEN-01**: FingerprintJS package and all fingerprint-related application code removed
- [ ] **CLEN-02**: Device fingerprint database columns removed via separate migration
- [ ] **CLEN-03**: Bundle size reduced by removing unused fingerprinting dependencies (~150KB)

## Future Requirements

Deferred to v3.x or later.

### Enhanced Identity

- **IDEN-01**: Custom emoji set per teacher (teacher curates which emojis are available)
- **IDEN-02**: Student avatar drawing canvas (draw instead of pick emoji)
- **IDEN-03**: QR code auto-fill for mobile join (scan to join, no typing)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full emoji keyboard picker | 80KB+ libraries, age-inappropriate content, overwhelming for K-5 students |
| Account-based student identity | COPPA burden, kills "code and go" UX, adds massive friction |
| FingerprintJS or browser fingerprinting | Privacy concerns, unreliable on managed Chromebooks, already proven broken |
| Persistent cross-session student profiles | Creates de facto account system, FERPA/privacy concerns |
| Real-time localStorage sync across devices | Heavyweight infrastructure for rare case; manual reclaim is simpler |
| Custom free-text fun names | Inappropriate name risk, moderation burden, loses fairness of random assignment |
| BroadcastChannel multi-tab sync | Inconsistent browser support, unnecessary — localStorage is already tab-shared |
| Cookie-based identity fallback | Adds complexity; localStorage + name-matching covers all cases |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| JOIN-01 | Phase 41 | Pending |
| JOIN-02 | Phase 41 | Pending |
| JOIN-03 | Phase 41 | Pending |
| JOIN-04 | Phase 44 | Pending |
| PERS-01 | Phase 42 | Pending |
| PERS-02 | Phase 42 | Pending |
| PERS-03 | Phase 40 | Complete |
| PERS-04 | Phase 40 | Complete |
| TCHR-01 | Phase 44 | Pending |
| TCHR-02 | Phase 44 | Pending |
| TCHR-03 | Phase 44 | Pending |
| TCHR-04 | Phase 44 | Pending |
| MIGR-01 | Phase 39 | Complete |
| MIGR-02 | Phase 44 | Pending |
| MIGR-03 | Phase 40 | Complete |
| CLEN-01 | Phase 43 | Pending |
| CLEN-02 | Phase 43 | Pending |
| CLEN-03 | Phase 43 | Pending |

**Coverage:**
- v3.0 requirements: 18 total
- Mapped to phases: 18/18
- Unmapped: 0

---
*Requirements defined: 2026-03-08*
*Last updated: 2026-03-08 after roadmap creation*
