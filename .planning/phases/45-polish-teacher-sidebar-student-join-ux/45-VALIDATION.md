---
phase: 45
slug: polish-teacher-sidebar-student-join-ux
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 45 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 45-01-01 | 01 | 1 | TCHR-02 | unit | `npx vitest run src/actions/__tests__/teacher-name-view.test.ts -t "setNameViewDefault"` | ❌ W0 | ⬜ pending |
| 45-01-02 | 01 | 1 | TCHR-02 | unit | `npx vitest run src/actions/__tests__/student-lookup.test.ts -t "firstName only"` | ❌ W0 | ⬜ pending |
| 45-01-03 | 01 | 1 | TCHR-02 | unit | `npx vitest run src/actions/__tests__/student-lookup.test.ts -t "lastInitial"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/actions/__tests__/teacher-name-view.test.ts` — stubs for TCHR-02 toggle persistence
- [ ] Extend `src/actions/__tests__/student-lookup.test.ts` — covers firstName-only lookup and lastInitial update

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar live refresh (new student slides in with pulse) | TCHR-02 | Real-time UI animation requires browser | Join as student, verify tile appears in teacher sidebar without refresh |
| Returning student disambiguation cards | TCHR-02 | Multi-step UI flow with visual elements | Enter first name with multiple matches, verify cards show emoji + fun name + last initial |
| Disconnect fade-out | TCHR-02 | Requires simulating network disconnect timing | Close student tab, wait 30-60s, verify fade-out on teacher sidebar |
| "Set as default" toast feedback | TCHR-02 | Toast display is visual-only | Click "Set as default", verify toast appears and auto-dismisses |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
