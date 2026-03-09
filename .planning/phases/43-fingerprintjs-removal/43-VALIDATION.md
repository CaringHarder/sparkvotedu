---
phase: 43
slug: fingerprintjs-removal
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 43 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run && npx next build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 43-01-01 | 01 | 1 | CLEN-01 | smoke | `grep -r "fingerprint" src/ --include="*.ts" --include="*.tsx"` | N/A | ⬜ pending |
| 43-01-02 | 01 | 1 | CLEN-01 | unit | `npx vitest run` | ✅ | ⬜ pending |
| 43-01-03 | 01 | 1 | CLEN-01 | smoke | `npx next build` | N/A | ⬜ pending |
| 43-01-04 | 01 | 1 | CLEN-02 | manual-only | Verify schema.prisma has no fingerprint field | N/A | ⬜ pending |
| 43-01-05 | 01 | 1 | CLEN-02 | manual-only | Check prisma/migrations/ directory | N/A | ⬜ pending |
| 43-01-06 | 01 | 1 | CLEN-03 | smoke | Compare `next build` output before and after | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The only test file affected (`student-lookup.test.ts`) needs a minor mock removal, not new tests.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fingerprint column removed from schema | CLEN-02 | Schema inspection | Verify `fingerprint` field absent from `prisma/schema.prisma` |
| Migration SQL file exists | CLEN-02 | File existence check | Confirm migration file in `prisma/migrations/` |
| Bundle size reduced ~150KB | CLEN-03 | Before/after comparison | Compare `next build` First Load JS sizes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
