---
phase: 19-reduce-display-settings-vertical-space
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/shared/display-settings-section.tsx
  - src/components/shared/quick-settings-toggle.tsx
  - src/components/shared/locked-setting-indicator.tsx
autonomous: true
requirements: [QUICK-19]

must_haves:
  truths:
    - "Display settings section uses a single-row horizontal flow instead of vertical stacking"
    - "Locked indicators and toggle controls sit inline side-by-side when viewport width allows"
    - "All 4 usage sites (bracket live, poll live, bracket detail, poll detail) render compactly without code changes"
    - "Toggle switches remain fully functional after layout change"
  artifacts:
    - path: "src/components/shared/display-settings-section.tsx"
      provides: "Compact horizontal container layout"
      contains: "flex flex-wrap"
    - path: "src/components/shared/quick-settings-toggle.tsx"
      provides: "Inline-friendly toggle with visual separator"
      contains: "flex items-center"
    - path: "src/components/shared/locked-setting-indicator.tsx"
      provides: "Inline-friendly locked indicator"
      contains: "flex items-center"
  key_links:
    - from: "src/components/shared/display-settings-section.tsx"
      to: "All 4 usage sites"
      via: "children prop layout (flex-wrap container)"
      pattern: "flex flex-wrap"
    - from: "src/components/shared/quick-settings-toggle.tsx"
      to: "src/components/shared/display-settings-section.tsx"
      via: "Rendered as flex-wrap child"
      pattern: "QuickSettingsToggle"
---

<objective>
Compact the display settings sections on teacher live and detail pages by switching from vertical stacking to a horizontal inline flow layout.

Purpose: Reduce vertical space consumed by the display settings panel so more of the actual content (bracket diagram, poll results) is visible without scrolling.
Output: Three shared component files updated with compact horizontal layout that automatically applies to all 4 usage sites.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/shared/display-settings-section.tsx
@src/components/shared/quick-settings-toggle.tsx
@src/components/shared/locked-setting-indicator.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Compact DisplaySettingsSection container to horizontal flex-wrap layout</name>
  <files>src/components/shared/display-settings-section.tsx</files>
  <action>
Modify the DisplaySettingsSection component to use a compact horizontal layout:

1. Outer container: Change `p-3 space-y-2` to `px-3 py-2 space-y-1.5` (reduce vertical padding and gap between heading and children).

2. Children wrapper: Change `<div className="space-y-2">` to `<div className="flex flex-wrap items-center gap-x-4 gap-y-1">`. This makes children flow horizontally and wrap to new lines only when needed. The `gap-x-4` provides horizontal spacing between items, and `gap-y-1` provides minimal vertical spacing when items wrap.

3. Heading: Change `text-xs` to `text-[11px]` and reduce gap from `gap-1.5` to `gap-1` to make the heading slightly more compact. Keep the Settings icon, uppercase tracking, and muted foreground color.

Do NOT change the component interface or props. The layout change propagates to all 4 usage sites automatically since they pass children into this container.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/vibecoding/sparkvotedu && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>DisplaySettingsSection renders children in a horizontal flex-wrap flow with reduced padding, compacting vertical space by approximately 40-50%.</done>
</task>

<task type="auto">
  <name>Task 2: Update QuickSettingsToggle and LockedSettingIndicator for inline flow</name>
  <files>src/components/shared/quick-settings-toggle.tsx, src/components/shared/locked-setting-indicator.tsx</files>
  <action>
**QuickSettingsToggle changes:**

1. Add a subtle left border separator so inline items have visual distinction: wrap the existing label element in a container, or add a left border directly to the label. Specifically, add `border-l border-border/50 pl-4` to the label className to create a light vertical separator between items. The first item's separator will be handled via CSS: add `first:border-l-0 first:pl-0` -- however since these are direct children, use the approach of adding the classes `[&:not(:first-child)]:border-l [&:not(:first-child)]:border-border/50 [&:not(:first-child)]:pl-4` to each item. ACTUALLY, the simpler approach: since the parent uses `gap-x-4`, just leave the toggle as-is for spacing. Only add a minor visual separator.

Simpler approach -- just add a subtle visual divider using a pipe character or border. The cleanest method: add `border-l border-border/40 pl-4` to the label's className. The parent flex-wrap container handles the case where an item is first via gap, and the left border creates visual grouping. This looks good even when items wrap.

So change the label className from:
`"flex items-center gap-2"`
to:
`"flex items-center gap-2 border-l border-border/40 pl-4 first:border-l-0 first:pl-0"`

Wait -- `first:` pseudo won't work since these are React children, not CSS siblings. The parent is a flex container and these ARE siblings in the DOM. Tailwind's `first:` maps to `:first-child` which WILL work on DOM siblings. BUT -- in the bracket live page, the first children are `LockedSettingIndicator` components, not `QuickSettingsToggle`. So the `first:` selector won't trigger on QuickSettingsToggle items anyway since they're not the first child.

Better approach: Do NOT add separators to individual items. Instead, keep items clean and let the parent's `gap-x-4` handle spacing. The compact horizontal flow is sufficient visual improvement without separators. Keep it simple.

Final QuickSettingsToggle change: Keep the existing className `"flex items-center gap-2"` but add `whitespace-nowrap` to prevent the label text from wrapping mid-item. No other changes needed -- the component is already compact enough for inline flow.

So the label className becomes: `"flex items-center gap-2 whitespace-nowrap"`

Remove the `<div className="flex flex-col">` wrapper around the label text and description. Instead, render the label span inline. For the description prop: since descriptions would break the compact inline layout, render description as a title attribute on the label instead of visible text. This keeps the toggle compact while preserving the info.

Updated structure:
```tsx
<label className="flex items-center gap-2 whitespace-nowrap">
  {icon && <span className="h-4 w-4 shrink-0 text-muted-foreground">{icon}</span>}
  <span className="text-sm font-medium text-muted-foreground" title={description}>{label}</span>
  <Switch ... />
</label>
```

**LockedSettingIndicator changes:**

Add `whitespace-nowrap` to the outer div className to prevent wrapping mid-item.

Change from:
`"flex items-center gap-2 text-sm"`
to:
`"flex items-center gap-1.5 text-sm whitespace-nowrap"`

Also reduce the gap slightly from `gap-2` to `gap-1.5` to be more compact inline.

Do NOT change either component's interface or props.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/vibecoding/sparkvotedu && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Both components render as compact inline-friendly items: QuickSettingsToggle has no multi-line label wrapper and uses whitespace-nowrap; LockedSettingIndicator uses tighter gap and whitespace-nowrap. All 4 usage sites display settings horizontally with reduced vertical footprint.</done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors: `npx tsc --noEmit`
2. Dev server renders without runtime errors: `npm run dev` and visit bracket/poll pages
3. Visual check: Display settings section should show locked indicators and toggles flowing horizontally in a single or two rows instead of 4-5 stacked rows
4. Functional check: All toggle switches still work (click to toggle, state updates correctly)
</verification>

<success_criteria>
- Display settings panels on all 4 pages (bracket live, poll live, bracket detail, poll detail) use roughly 40-50% less vertical space
- Items flow horizontally and wrap naturally at narrow viewports
- No changes needed at any of the 4 usage sites -- layout is controlled entirely by the 3 shared components
- All toggles remain functional
- TypeScript compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/19-reduce-display-settings-vertical-space-o/19-SUMMARY.md`
</output>
