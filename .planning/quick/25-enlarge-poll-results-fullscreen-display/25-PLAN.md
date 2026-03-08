---
phase: quick-25
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/poll/bar-chart.tsx
  - src/components/poll/donut-chart.tsx
  - src/components/poll/presentation-mode.tsx
  - src/components/poll/poll-results.tsx
autonomous: true
requirements: [QUICK-25]
must_haves:
  truths:
    - "Bar chart bars are visibly larger in presentation mode with readable text at projector distance"
    - "Donut chart fills more screen real estate in presentation mode"
    - "Presentation mode content uses full screen width instead of narrow max-w-5xl"
    - "Normal (non-presentation) views remain unchanged"
  artifacts:
    - path: "src/components/poll/bar-chart.tsx"
      provides: "Large variant bar chart for presentation"
      contains: "large"
    - path: "src/components/poll/donut-chart.tsx"
      provides: "Large variant donut chart for presentation"
      contains: "large"
    - path: "src/components/poll/presentation-mode.tsx"
      provides: "Wider content container"
      contains: "max-w-screen-2xl"
  key_links:
    - from: "src/components/poll/poll-results.tsx"
      to: "bar-chart.tsx, donut-chart.tsx"
      via: "large prop passed when presenting=true"
      pattern: "large="
---

<objective>
Enlarge poll results in fullscreen presentation mode so charts, bars, and text are readable on projectors at classroom distance.

Purpose: Teachers present poll results on projectors. Current charts are small (224px donut, 32px bars) with tiny text inside a narrow 1024px container, wasting most of a 1920px+ projector screen.

Output: Presentation mode uses near-full-width layout with larger charts and text. Normal poll views unchanged.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/poll/bar-chart.tsx
@src/components/poll/donut-chart.tsx
@src/components/poll/presentation-mode.tsx
@src/components/poll/poll-results.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add large prop to bar chart and donut chart</name>
  <files>src/components/poll/bar-chart.tsx, src/components/poll/donut-chart.tsx</files>
  <action>
Add an optional `large?: boolean` prop to both chart components. When `large` is true, scale up sizes for projector readability. Default behavior (large=false or undefined) must remain identical to current.

**bar-chart.tsx (BarChartProps):**
- Add `large?: boolean` to BarChartProps interface
- Accept `large` in component destructuring
- When `large`:
  - Bar container: change from `h-8` to `h-14` (56px bars)
  - Label text: change from `text-sm font-medium` to `text-2xl font-bold`
  - Vote count text: change from `text-sm` to `text-xl`
  - Count inside bar: change from `text-xs font-bold` to `text-lg font-bold`
  - Spacing: change from `space-y-3` to `space-y-5`
- Use ternary on `large` for each className, e.g. `large ? 'h-14' : 'h-8'`

**donut-chart.tsx (DonutChartProps):**
- Add `large?: boolean` to DonutChartProps interface
- Accept `large` in component destructuring
- When `large`:
  - SVG container: change from `h-48 w-48 md:h-56 md:w-56` to `h-80 w-80 md:h-96 md:w-96` (320-384px)
  - Center total text: change from `text-[22px]` to `text-[36px]`
  - Center "votes" text: change from `text-[10px]` to `text-[16px]`
  - Legend items: change from `text-xs` to `text-lg`
  - Legend dots: change from `h-2.5 w-2.5` to `h-4 w-4`
  - Legend gap: change from `gap-x-4 gap-y-1` to `gap-x-6 gap-y-2`
- Apply same changes to the "No votes yet" empty state SVG size
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Both charts accept `large` prop. Without it, render identically to before. With `large=true`, all sizes scale up for projector readability.</done>
</task>

<task type="auto">
  <name>Task 2: Widen presentation container and pass large prop from poll-results</name>
  <files>src/components/poll/presentation-mode.tsx, src/components/poll/poll-results.tsx</files>
  <action>
**presentation-mode.tsx:**
- Line 109: Change `max-w-5xl` to `max-w-screen-2xl` (1536px — uses nearly full width on 1920px screens while keeping slight margins)
- Increase content padding: change `p-6 md:p-10` to `p-6 md:p-12 lg:p-16`
- Increase title: change `text-3xl font-bold md:text-4xl` to `text-4xl font-bold md:text-5xl`

**poll-results.tsx:**
- In the presentation mode section (lines 269-275), pass `large` prop to both chart components:
  - `<AnimatedBarChart data={chartData} total={liveTotalVotes} large />`
  - `<DonutChart data={chartData} total={liveTotalVotes} large />`
- The normal (non-presentation) chart renders at lines 222-227 must NOT pass `large` — leave them unchanged
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Presentation mode uses wider container (max-w-screen-2xl), larger padding, and passes `large` to charts. Normal poll results view is unchanged.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. Dev server renders poll results at normal size on the live poll page
3. Clicking "Present" enters fullscreen with visibly larger charts, wider layout, and bigger text
</verification>

<success_criteria>
- Presentation mode content container is max-w-screen-2xl (was max-w-5xl)
- Bar chart bars are h-14 in presentation (was h-8), with text-2xl labels
- Donut chart is h-80/h-96 in presentation (was h-48/h-56), with text-lg legend
- Normal poll view is pixel-identical to before (no large prop passed)
- TypeScript compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/25-enlarge-poll-results-fullscreen-display/25-SUMMARY.md`
</output>
