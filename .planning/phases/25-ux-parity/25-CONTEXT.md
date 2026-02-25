# Phase 25: UX Parity - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers see consistent UI controls and feedback across all interaction points — poll cards get the same context menu as bracket cards (with full action parity), and sign-out gives immediate visual feedback. Both card types end up with an identical unified menu.

</domain>

<decisions>
## Implementation Decisions

### Context Menu Actions
- Unified menu for BOTH poll and bracket cards — full parity between the two
- Menu actions (top to bottom): Rename, Edit, Share/Copy Link, Duplicate, Archive, Delete
- Go Live / End stays outside the menu as a separate card control
- Duplicate copies everything — question, options, settings, visual config (full clone)
- Archive behaves the same as brackets — moves to archived section, hidden from main dashboard
- Menu available in all card states (draft, live, completed, archived)
- Card body click still navigates into the poll/bracket; triple-dot is its own click target
- Rename = inline edit on the card; Edit = navigates to full edit page
- Each menu item has an icon next to the text (both brackets and polls)
- Claude audits what brackets currently have and unifies both to the same menu — may require modifying bracket card menu to match

### Delete Confirmation
- Always show a modal confirmation dialog for delete (regardless of state)
- Dialog includes impact warning ("Students will lose access") only if the poll/bracket is currently live
- Button text includes item type: "Delete Poll" / "Delete Bracket"
- No undo toast after confirmed delete — confirmation dialog is sufficient
- Archive happens immediately with no confirmation (it's reversible)

### Card Removal Animations
- Delete: card fades out
- Archive: card slides left
- Duplicate: new card appears with a brief highlight/pulse animation so teacher notices it
- No success toasts for any action — the animation is the feedback

### Sign-Out Feedback
- Button is in upper-right corner of header menu on all pages
- On click: button text changes to "Signing out..." and button becomes disabled + visually dimmed (opacity)
- Prevents double-click during processing
- After sign-out completes: immediate redirect to login/landing page, no intermediate confirmation screen

### Menu Trigger
- Triple-dot position matches brackets exactly (Claude checks codebase and mirrors)
- Icon style matches brackets (Claude checks codebase and mirrors)
- Always visible on the card (not hover-only) — discoverable on mobile and desktop
- Smart positioning for menu dropdown — auto-flips based on available space (Radix default behavior)

### Claude's Discretion
- Specific icon choices for each menu action (pencil for rename, trash for delete, etc.)
- Animation durations and easing curves
- Exact opacity value for disabled sign-out button
- How to handle the share/copy-link action (clipboard toast vs inline confirmation)
- Whether bracket card menu needs restructuring vs just adding missing items

</decisions>

<specifics>
## Specific Ideas

- Both card types should look and behave identically in their context menus — if brackets are missing any of the agreed actions (rename, edit, share), add them
- The order Rename > Edit > Share > Duplicate > Archive > Delete is intentional — common actions first, destructive last
- Teacher should never be confused about which card type they're interacting with — the menu is a consistent, reliable pattern across the entire dashboard

</specifics>

<deferred>
## Deferred Ideas

- **Pause/Hold state for brackets and polls** — New capability to temporarily pause a live bracket or poll, freezing student participation. Applies to both brackets and polls. User wants this as its own phase.

</deferred>

---

*Phase: 25-ux-parity*
*Context gathered: 2026-02-24*
