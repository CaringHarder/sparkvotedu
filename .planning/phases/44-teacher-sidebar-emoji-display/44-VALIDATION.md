---
phase: 44
slug: teacher-sidebar-emoji-display
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 44 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 44-01-01 | 01 | 1 | TCHR-01 | unit | `npx vitest run src/components/teacher/__tests__/name-view-toggle.test.ts -t "toggle"` | ❌ W0 | ⬜ pending |
| 44-01-02 | 01 | 1 | TCHR-02 | unit | `npx vitest run src/actions/__tests__/teacher-name-view.test.ts` | ❌ W0 | ⬜ pending |
| 44-01-03 | 01 | 1 | TCHR-03 | unit | `npx vitest run src/actions/__tests__/teacher-edit-student.test.ts` | ❌ W0 | ⬜ pending |
| 44-01-04 | 01 | 1 | JOIN-04 | manual-only | Visual inspection in browser | N/A | ⬜ pending |
| 44-01-05 | 01 | 1 | TCHR-04 | manual-only | Existing EditNameDialog already tested by usage | N/A | ⬜ pending |
| 44-01-06 | 01 | 1 | MIGR-02 | manual-only | Emoji migration prompt visual verification | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/teacher/__tests__/name-view-toggle.test.ts` — stubs for TCHR-01 toggle state
- [ ] `src/actions/__tests__/teacher-name-view.test.ts` — stubs for TCHR-02 global default persistence
- [ ] `src/actions/__tests__/teacher-edit-student.test.ts` — stubs for TCHR-03 server action auth + update

*MIGR-02, JOIN-04, and TCHR-04 are primarily visual/integration — manual verification is appropriate.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Emoji displays in session header, sidebar, all touchpoints | JOIN-04 | Visual rendering across multiple pages | Navigate bracket, poll, and session views; confirm emoji renders next to names |
| Student edit name via gear icon | TCHR-04 | Existing EditNameDialog already functional | Click gear icon in session header, change name, verify update |
| Emoji migration prompt for null-emoji participants | MIGR-02 | One-time interstitial UX flow | Rejoin session with null-emoji participant, verify prompt appears once |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
