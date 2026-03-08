---
phase: quick-28
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/poll/bar-chart.tsx
autonomous: true
requirements: [QUICK-28]
must_haves:
  truths:
    - "Vote count badge is always visible regardless of bar width"
    - "Badge has high contrast (white/light bg with dark text) on all bar colors"
    - "Badge is noticeably larger than current text-xs in normal mode"
    - "Badge scales up appropriately in presentation/large mode"
  artifacts:
    - path: "src/components/poll/bar-chart.tsx"
      provides: "High-contrast vote count badge overlay on bar chart"
      contains: "rounded-full"
  key_links: []
---

<objective>
Replace the hard-to-read inline vote count text inside bar chart bars with a high-contrast circular badge that is always visible and significantly larger.

Purpose: Current white text on colored bars has poor contrast (especially amber, emerald), disappears on narrow bars (< 15% width), and is too small in normal mode (text-xs).
Output: Updated bar-chart.tsx with contrasting badge overlay.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/poll/bar-chart.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace inline count with high-contrast circular badge</name>
  <files>src/components/poll/bar-chart.tsx</files>
  <action>
In `src/components/poll/bar-chart.tsx`, replace the count display inside the bar (lines 94-101) with a high-contrast badge. The changes:

1. REMOVE the existing count span inside the motion.div bar fill (lines 95-100: the `widthPct > 15` conditional and its `text-white` span).

2. ADD a new badge element AFTER the motion.div (bar fill) but still INSIDE the relative container div (the `h-8`/`h-14` bar background). This badge should be:
   - Absolutely positioned, centered vertically (`top-1/2 -translate-y-1/2`)
   - Positioned at the right edge of the filled bar area using inline style: `left` set to `calc(${widthPct}% - ${offset})` where offset accounts for badge width. Use `right: auto` to avoid conflicts.
   - For simplicity, use a `style={{ left: \`min(calc(${widthPct}% - ${large ? '1.25rem' : '0.75rem'}), calc(100% - ${large ? '2.75rem' : '1.75rem'}))\` }}` to keep the badge within bounds.
   - Actually, the SIMPLEST clean approach: position the badge with `style={{ left: \`${widthPct}%\` }}` and use `-translate-x-full` (or partial translate) so it sits at the end of the bar. If `widthPct` is very small (< 5), position it just after the bar edge instead (no negative translate).

   Recommended implementation:
   ```tsx
   {/* Vote count badge */}
   <span
     className={`absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-full bg-white/90 shadow-sm font-bold text-gray-900 ${
       large ? 'h-10 w-10 text-xl' : 'h-7 w-7 text-sm'
     }`}
     style={{
       left: `${Math.max(widthPct, 2)}%`,
       transform: `translate(${widthPct > 8 ? '-80%' : '4px'}, -50%)`,
     }}
   >
     {d.count}
   </span>
   ```

   Key design decisions:
   - `bg-white/90` with `text-gray-900` provides high contrast on ALL bar colors
   - `shadow-sm` gives subtle depth separation from the bar
   - `rounded-full` makes it a circle
   - Normal mode: `h-7 w-7 text-sm` (much larger than current `text-xs`)
   - Large/presentation mode: `h-10 w-10 text-xl` (prominent and readable)
   - NO `widthPct > 15` gate -- badge is ALWAYS visible
   - When bar is very narrow (widthPct <= 8), badge sits just outside the bar edge
   - When bar is wider, badge overlaps the right end of the bar

3. Keep the `overflow-hidden` class on the bar background container? NO -- remove `overflow-hidden` from the bar container div (line 82) so the badge can extend past narrow bars. The bar fill itself is rounded-md and won't overflow visually since it uses absolute positioning with percentage width.

4. Verify the label row above (lines 70-78) still shows "X votes (Y%)" -- that stays unchanged. The badge shows just the raw count number for quick scanning.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit src/components/poll/bar-chart.tsx 2>&1 | head -20</automated>
  </verify>
  <done>
    - Vote count badge renders as a white circle with dark text on every bar
    - Badge is always visible (no width threshold gate)
    - Normal mode badge is h-7 w-7 text-sm (visibly larger than old text-xs)
    - Large mode badge is h-10 w-10 text-xl
    - Badge positions at bar edge, or just outside for very narrow bars
    - TypeScript compiles without errors
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes
- Visual check: bar chart shows circular white badges with dark count numbers on all bars
- Badges visible even on bars with very low vote counts (narrow bars)
- In presentation/large mode, badges scale up proportionally
</verification>

<success_criteria>
Vote count numbers on bar chart are always visible with high contrast via white circular badge overlay, sized appropriately for both normal and presentation modes.
</success_criteria>

<output>
After completion, create `.planning/quick/28-bar-chart-larger-vote-count-badge/28-SUMMARY.md`
</output>
