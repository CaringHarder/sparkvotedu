# Phase 44: Teacher Sidebar + Emoji Display - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers can toggle between fun name and real name views in the participation sidebar, edit student display names, and students see emoji + fun name displayed consistently throughout all session UI. Students can self-edit their display name (but NOT emoji). Existing participants who rejoin without an emoji are prompted once to pick one (one-time migration experience).

</domain>

<decisions>
## Implementation Decisions

### Name view toggle
- Default view: fun name view (emoji + fun name) -- matches v3.0 student-first identity design
- Toggle style: segmented control ("Fun" | "Real") in the sidebar header area
- Global default saved to teacher profile (requires new column on Teacher model)
- Per-session override: silent -- toggling in a session changes that session only, no prompt to save globally
- Fun name view tile: emoji + fun name inline (e.g., "🚀 Cosmic Tiger") with status dot
- Real name view tile: first name + last initial only (e.g., "Sarah T.") -- no emoji in real name view

### Teacher editing students
- Trigger: click on any student tile in the sidebar opens a small dialog/popover
- Edit scope: display name (first name) only -- teacher cannot change fun name or emoji
- Edit UI: compact popover with name pre-filled, save/cancel buttons (reuses EditNameDialog pattern)
- Real-time sync: student sees their updated name immediately via Supabase realtime

### Student self-edit
- NO "Change Emoji" option -- emoji is permanent once picked (memory anchor for younger students)
- Gear menu stays as-is: Edit Name, Reroll Fun Name, Recovery Code (3 items)
- Unlimited name edits via existing Edit Name dialog
- Migrated students without emoji get a one-time prompt to pick one (MIGR-02)

### Emoji display consistency
- Student session header: emoji before fun name inline (e.g., "🚀 Cosmic Tiger")
- Participation sidebar (fun name view): emoji + fun name inline per tile
- Everywhere student identity shows: emoji + fun name consistently (voting UI, results, leaderboard, predictions)
- Null emoji fallback: sparkles (✨) from existing EmojiAvatar component -- used consistently everywhere

### Claude's Discretion
- MIGR-02 prompt approach (interstitial screen vs in-session banner for existing students without emoji)
- Exact segmented control styling and placement within sidebar header
- How to handle status dots alongside emoji in fun name view tiles
- Teacher edit popover positioning and animation
- Which specific voting/results UI locations need emoji addition (audit all student-identity touchpoints)
- Schema approach for teacher name view preference column

</decisions>

<specifics>
## Specific Ideas

- "The point of the emoji was to give students a visual to remember (especially younger students). If they are allowed to change it, they might get confused as to which one they picked since they will remember more than one." -- Emoji is a permanent identity anchor, not a customizable avatar.
- Segmented control for name view toggle was preferred over icon button or labeled switch -- clearest indication of current mode.
- Silent per-session override avoids interrupting flow with "save as default?" prompts during live sessions.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EmojiAvatar` (src/components/student/emoji-avatar.tsx): Renders shortcode as emoji circle, sm/md/lg variants, sparkles fallback for null
- `EditNameDialog` (src/components/student/edit-name-dialog.tsx): Dialog with name input, validation, save/cancel -- pattern to reuse for teacher-side editing
- `ParticipationSidebar` (src/components/teacher/participation-sidebar.tsx): Current 2-column grid with status dots, funName + firstName subtitle
- `SessionHeader` (src/components/student/session-header.tsx): Gear dropdown with Edit Name, Reroll, Recovery Code
- `shortcodeToEmoji` (src/lib/student/emoji-pool.ts): Converts shortcode to visual emoji character

### Established Patterns
- Supabase Realtime for live updates (presence + broadcast channels already used for vote indicators)
- `class-variance-authority` for component variants (used in EmojiAvatar)
- Dialog/popover components from shadcn/ui
- Server actions pattern for data mutations (src/actions/student.ts)

### Integration Points
- Teacher model (prisma/schema.prisma): Needs new column for name view preference (e.g., `nameViewDefault`)
- ParticipationSidebar: Main component to modify for toggle + emoji display + click-to-edit
- SessionHeader: Add emoji display before fun name
- All student identity touchpoints in voting/results UI need emoji addition
- localStorage identity store may need emoji field awareness for migration prompt

</code_context>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 44-teacher-sidebar-emoji-display*
*Context gathered: 2026-03-09*
