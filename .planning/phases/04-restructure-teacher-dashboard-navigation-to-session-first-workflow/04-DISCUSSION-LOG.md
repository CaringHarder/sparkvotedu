# Phase 4: Restructure Teacher Dashboard Navigation to Session-First Workflow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 04-restructure-teacher-dashboard-navigation-to-session-first-workflow
**Areas discussed:** Navigation structure, Session detail layout, Orphan activities, Dashboard home page

---

## Navigation Structure

### Sidebar layout

| Option | Description | Selected |
|--------|-------------|----------|
| Sessions-only | Remove Activities entirely. Sidebar: Dashboard, Sessions, Archived, Analytics, Billing, Profile | ✓ |
| Sessions + Activities shortcut | Keep flat 'All Activities' link as secondary path | |
| Sessions with type sub-nav | Sessions as parent with Active/Archived sub-items | |

**User's choice:** Sessions-only
**Notes:** Clean removal of the entire Activities section.

### Top-level route handling

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to Sessions | Keep /brackets and /polls but redirect. Detail pages still work. | |
| Fully remove | Delete list pages entirely | |
| You decide | Claude picks | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion on redirect strategy.

### Activity creation location

| Option | Description | Selected |
|--------|-------------|----------|
| Inside session | Create from session detail. Session pre-selected. | ✓ |
| Top-level with session picker | Keep /brackets/new, add session dropdown | |
| You decide | Claude picks | |

**User's choice:** Inside session

### Mobile nav

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror desktop | Same items as new sidebar | ✓ |
| Session quick-switch | Active session shortcuts at top of drawer | |
| You decide | Claude picks | |

**User's choice:** Mirror desktop

### Session list ordering

| Option | Description | Selected |
|--------|-------------|----------|
| Active first, then recent | Active sessions at top by last activity, ended by recency | ✓ |
| Pure chronological | All sorted by creation date | |
| You decide | Claude picks | |

**User's choice:** Active first, then recent

### Archived sessions placement (revised)

| Option | Description | Selected |
|--------|-------------|----------|
| Tab/filter in Sessions page | Sessions page gets Active/Archived tabs | |
| Keep in sidebar | Archived as top-level sidebar item (original placement) | ✓ |

**User's choice:** Sidebar link (revised from earlier tab/filter decision after dashboard discussion clarified ended sessions shouldn't be on dashboard)

---

## Session Detail Layout

### Page structure

| Option | Description | Selected |
|--------|-------------|----------|
| Tabbed sections | Tabs: Brackets, Polls, Students | ✓ |
| Unified activity feed | Single scrollable list mixing brackets and polls | |
| Sections on one page | Brackets section, Polls section, Students section stacked | |

**User's choice:** Tabbed sections

### Session header

| Option | Description | Selected |
|--------|-------------|----------|
| Prominent code display | Large code + copy button, name, status, student count | ✓ |
| Compact header | Small code badge, minimal header | |
| You decide | Claude picks | |

**User's choice:** Prominent code display

### Default tab

| Option | Description | Selected |
|--------|-------------|----------|
| Brackets | Always default to Brackets tab | |
| Most recent activity | Smart default to tab with most recent item | ✓ |
| You decide | Claude picks | |

**User's choice:** Most recent activity

### Students tab content

| Option | Description | Selected |
|--------|-------------|----------|
| Full participant list | Complete table with fun name, real name, emoji, ban/unban | ✓ |
| Compact summary only | Just count + link to full page | |
| You decide | Claude picks | |

**User's choice:** Full participant list

### Card component reuse

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse existing cards | Same BracketCard/PollCard with context menus | ✓ |
| Simplified cards | Lighter-weight cards for session context | |
| You decide | Claude picks | |

**User's choice:** Reuse existing cards, BUT fix title truncation bug. Titles like "What is your favorite book (Week 1)?" vs "(Week 2)" were indistinguishable due to ellipsis truncation. Must show full titles.

---

## Orphan Activities

### Handling strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Force session assignment | All must belong to session. Orphans migrate to "General" session. | ✓ |
| Auto-create 'Unsorted' session | Similar but framed as 'Unsorted' | |
| Allow sessionless activities | Keep null sessionId, virtual "No Session" group | |

**User's choice:** Force session assignment

### Cross-session operations

| Option | Description | Selected |
|--------|-------------|----------|
| Move to session via context menu | Add 'Move to session...' to context menu | ✓ |
| No, locked to session | Once created, stays in session | |
| You decide | Claude picks | |

**User's choice:** Yes — add BOTH "Move to session" and "Duplicate to session" context menu options (user expanded beyond the presented options).

---

## Dashboard Home Page

### Overall layout

| Option | Description | Selected |
|--------|-------------|----------|
| Session-focused home | Welcome + plan/usage + all active session cards | |
| Redirect to /sessions | Eliminate dashboard, land on /sessions | |
| Keep current layout | Minimal changes, remove Activities references | |

**User's choice:** Initially selected session-focused home, then refined during follow-up discussion.

### Session presentation on dashboard

| Option | Description | Selected |
|--------|-------------|----------|
| Session cards | Grid of cards for visual overview | |
| Dropdown selector | Compact dropdown to pick and navigate to a session | ✓ |
| Both — cards + dropdown | Cards on dashboard, dropdown in header for quick-switch | |

**User's choice:** Dropdown selector
**Notes:** User specifically asked about dropdown vs cards. Preferred compact dropdown over taking up dashboard space with cards. Ended sessions should NOT appear on dashboard at all — they live in Archived.

---

## Claude's Discretion

- Top-level /brackets and /polls route handling (redirect vs remove)
- Tab URL structure for session detail
- Card title wrapping strategy for truncation fix
- Session dropdown component and positioning
- sessionId nullability enforcement (schema vs application level)

## Deferred Ideas

None — discussion stayed within phase scope
