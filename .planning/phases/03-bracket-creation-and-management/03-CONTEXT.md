# Phase 3: Bracket Creation & Management - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers can create single-elimination brackets, populate them with entrants using multiple methods (manual, CSV, curated topics), edit entrants in draft mode, manage bracket lifecycle (draft/active/completed), and view all brackets on the dashboard. Students do not interact with brackets in this phase — voting and real-time updates are Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Bracket visual diagram
- **Two display modes, teacher-selectable per bracket:**
  - **Card-based view** (younger students): Playful & colorful — rounded corners, bright colors per round, fun shadows. Kahoot/Blooket energy.
  - **Classic bracket view** (older students): ESPN tournament style — dark background option, bold bracket lines, sports-broadcast energy.
- Matchup slots show: entrant name + optional image/icon. Teacher toggles seed numbers on/off.
- **Fit to viewport, no scrolling.** For large brackets (16 entrants), provide a quadrant navigator to focus on sections.
- Custom round names — teacher can rename rounds (e.g., "Sweet 16", "Elite 8") or use defaults ("Round 1", "Semifinals", "Finals").
- Champion/winner slot gets a trophy or crown icon with celebratory styling.

### Entrant input methods
- **Three input methods, freely mixable within one bracket:**
  - **Manual entry** — type entrant names directly
  - **CSV upload** — upload file, preview table with inline error highlighting (duplicates, blanks in yellow/red), teacher fixes before confirming
  - **Curated topic lists** — prebuilt fun + academic lists, plus teacher-saved custom lists
- **Entrant images:** All three methods support images via emoji picker, paste image URL, or file upload. CSV supports image URL column.
- **Curated topic lists:**
  - Robust library at launch: 15-25 prebuilt lists (mix of academic subjects and fun categories)
  - Emojis on prebuilt items where there's a natural fit (animals, food) — abstract concepts get none
  - Teacher can save custom lists for reuse across brackets
  - Custom lists are shareable by link — other teachers can import
- **Topic list selection UX:** Random subset button (pick size, get random entrants) PLUS drag-to-bracket for manual curation. Both options available.

### Creation wizard flow
- **Two creation paths:**
  - **Full wizard (4 steps):** Name → Settings (size, display style, round names) → Add Entrants → Review/Preview bracket
  - **Quick bracket:** Asks only bracket size (4/8/16), defaults everything else, skips straight to entrants. Fast setup.
- Final step offers both "Save as Draft" and "Save & Activate" buttons — teacher chooses.

### Dashboard bracket list
- **Card grid + table view with toggle** — teacher can switch between views, preference saved.
- **Quick actions (no need to open bracket):** Activate (draft→active), Complete (active→completed), Duplicate (clone bracket), Delete.
- **Default sort: status groups** — Active brackets first, then Drafts, then Completed. Most recent first within each group.
- **Filterable by class session** — teachers managing multiple classes can narrow the list.
- **Card content:** Bracket name, color-coded status badge, entrant count, creation date. Clean and minimal.

### Claude's Discretion
- Bracket diagram interactivity model (interactive diagram vs view + sidebar edit)
- Topic list browsing UX (category tabs, search, or hybrid)
- Loading states and error handling patterns
- Exact spacing, typography, and color choices within the style guides above
- Quick bracket auto-naming convention

</decisions>

<specifics>
## Specific Ideas

- Card view should feel like Kahoot/Blooket — playful, colorful, game-like energy for younger students
- Classic view should feel like ESPN March Madness brackets — sports-broadcast energy for older students
- Teacher controls which view each class/bracket uses, so they can tailor the experience to their audience
- "Quick bracket" concept: teachers who know what they want shouldn't be slowed down by a wizard
- Quick poll concept mentioned — deferred to Phase 5

</specifics>

<deferred>
## Deferred Ideas

- **Quick poll creation** — same concept as quick bracket but for polls. Belongs in Phase 5 (Polls).
- Voting on matchups, live results — Phase 4.
- Student-facing bracket view — Phase 4.

</deferred>

---

*Phase: 03-bracket-creation-and-management*
*Context gathered: 2026-01-29*
