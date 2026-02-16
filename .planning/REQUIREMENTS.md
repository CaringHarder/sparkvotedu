# Requirements: SparkVotEDU

**Defined:** 2026-02-16
**Core Value:** Teachers can instantly engage any classroom through voting -- on any topic, in any format -- and see participation happen in real time.

## v1.1 Requirements

Requirements for v1.1 Production Readiness & Deploy. Each maps to roadmap phases.

### Service Configuration

- [ ] **CONFIG-01**: OAuth providers (Google, Microsoft, Apple) are configured and functional in production
- [ ] **CONFIG-02**: Poll-images Supabase Storage bucket is created and functional
- [ ] **CONFIG-03**: CRON_SECRET is configured in Vercel for cron job authentication

### UX Polish

- [ ] **UX-01**: Visual bracket placement uses a full-width creation step instead of sidebar
- [ ] **UX-02**: Student "Join Class" is moved to the landing page header
- [ ] **UX-03**: Landing page logo sizing and background color issues are fixed

### Legal Pages

- [ ] **LEGAL-01**: Privacy policy page available at /privacy (modeled from current sparkvotedu.com/privacy)
- [ ] **LEGAL-02**: Terms of service page available at /terms (modeled from current sparkvotedu.com/terms)

### Admin Panel

- [ ] **ADMIN-01**: Admin can access a protected admin dashboard via email allowlist or role flag
- [ ] **ADMIN-02**: Admin can view a list of all teachers with name, email, plan, signup date, and usage stats
- [ ] **ADMIN-03**: Admin can view a teacher's detail page showing their brackets, sessions, and usage
- [ ] **ADMIN-04**: Admin can deactivate or reactivate a teacher account
- [ ] **ADMIN-05**: Admin can manually override a teacher's subscription tier
- [ ] **ADMIN-06**: Admin can create a teacher account with a temporary password

### Deployment

- [ ] **DEPLOY-01**: Application is deployed and live on sparkvotedu.com via Vercel

## Future Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### LMS Integration

- **LMS-01**: Integration with Google Classroom for class roster import
- **LMS-02**: Integration with Canvas for assignment linking

### Notifications

- **NOTF-01**: Email notifications for bracket activity
- **NOTF-02**: In-app notification system

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Native mobile apps | Web-first, responsive design handles mobile |
| Real-time chat | Not a communication tool |
| Student accounts with passwords | Anonymous-only by design |
| AI-generated content | Unpredictable in K-12 |
| Public/shareable brackets | Privacy concerns, COPPA implications |
| Multi-language / i18n | English only for now |
| Admin password reset for teachers | Teachers already have self-service forgot-password flow |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONFIG-01 | Phase 14 | Pending |
| CONFIG-02 | Phase 14 | Pending |
| CONFIG-03 | Phase 14 | Pending |
| UX-01 | Phase 15 | Pending |
| UX-02 | Phase 15 | Pending |
| UX-03 | Phase 15 | Pending |
| LEGAL-01 | Phase 16 | Pending |
| LEGAL-02 | Phase 16 | Pending |
| ADMIN-01 | Phase 17 | Pending |
| ADMIN-02 | Phase 17 | Pending |
| ADMIN-03 | Phase 17 | Pending |
| ADMIN-04 | Phase 17 | Pending |
| ADMIN-05 | Phase 17 | Pending |
| ADMIN-06 | Phase 17 | Pending |
| DEPLOY-01 | Phase 18 | Pending |

**Coverage:**
- v1.1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-02-16*
*Last updated: 2026-02-16 after roadmap creation*
