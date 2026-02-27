---
phase: quick-7
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/bracket/predictive-bracket.tsx
  - src/components/bracket/matchup-vote-card.tsx
  - src/components/student/simple-voting-view.tsx
  - src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx
autonomous: true
requirements: [IMG-SQUARE, SIMPLE-ENLARGE]
must_haves:
  truths:
    - "All entrant images in predictive brackets render as squares (rounded corners), not circles"
    - "Simple bracket matchup cards display entrant images when available"
    - "Simple bracket cards, images, and text are significantly larger to fill the screen for younger students"
  artifacts:
    - path: "src/components/bracket/predictive-bracket.tsx"
      provides: "Square entrant logos in predictive bracket simple mode"
      contains: "rounded-md"
    - path: "src/components/bracket/matchup-vote-card.tsx"
      provides: "Entrant images and enlarged layout for simple bracket voting"
      contains: "logoUrl"
    - path: "src/components/student/simple-voting-view.tsx"
      provides: "Wider container for simple bracket to use more screen"
    - path: "src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx"
      provides: "Wider container for RR simple voting to use more screen"
  key_links:
    - from: "src/components/bracket/matchup-vote-card.tsx"
      to: "MatchupData.entrant1.logoUrl"
      via: "conditional image rendering"
      pattern: "entrant.*logoUrl"
---

<objective>
Fix image shapes across bracket/poll components and enlarge simple bracket cards for younger students.

Purpose: Images in predictive brackets are rendering as circles (rounded-full) instead of squares. Simple bracket mode is designed for younger students but the matchup cards are small and don't show images. Since simple mode shows one matchup at a time, we should make full use of the screen with much larger cards, images, and text.

Output: Square images everywhere, enlarged simple bracket UI with visible entrant images.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/bracket/predictive-bracket.tsx
@src/components/bracket/matchup-vote-card.tsx
@src/components/student/simple-voting-view.tsx
@src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx
@src/lib/bracket/types.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix round images to square in predictive bracket</name>
  <files>src/components/bracket/predictive-bracket.tsx</files>
  <action>
In `src/components/bracket/predictive-bracket.tsx`, change all `rounded-full` on entrant logo `<img>` tags to `rounded-md` (square with slight corner radius). There are exactly 3 instances:

1. Line ~1251: `<img src={entrant1.logoUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />` -- change `rounded-full` to `rounded-md`
2. Line ~1276: `<img src={entrant2.logoUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />` -- change `rounded-full` to `rounded-md`
3. Line ~1314: `<img src={selectedEntrant.logoUrl} alt="" className="h-4 w-4 shrink-0 rounded-full object-cover" />` -- change `rounded-full` to `rounded-md`

Do NOT change any other `rounded-full` usage in this file (there are many on badges, status pills, etc. that should remain round).
  </action>
  <verify>Run `grep -n 'rounded-full.*object-cover\|object-cover.*rounded-full' src/components/bracket/predictive-bracket.tsx` -- should return 0 results. Run `grep -n 'rounded-md.*object-cover' src/components/bracket/predictive-bracket.tsx` -- should return 3 results.</verify>
  <done>All 3 entrant logo images in predictive-bracket.tsx use rounded-md instead of rounded-full, rendering as squares with rounded corners.</done>
</task>

<task type="auto">
  <name>Task 2: Enlarge simple bracket matchup cards and add entrant images</name>
  <files>src/components/bracket/matchup-vote-card.tsx, src/components/student/simple-voting-view.tsx, src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx</files>
  <action>
**Part A: Add images and enlarge MatchupVoteCard (matchup-vote-card.tsx)**

The MatchupVoteCard currently renders only text-based entrant buttons with no images. The `matchup` prop already includes `matchup.entrant1` and `matchup.entrant2` which have `logoUrl: string | null`. Add image support and increase sizing:

In `renderEntrantButton`:
1. Add entrant image rendering ABOVE the name text. When `entrant.logoUrl` exists, render a large square image:
   ```
   {entrant.logoUrl && (
     <div className="mb-2 h-28 w-28 sm:h-36 sm:w-36 overflow-hidden rounded-lg mx-auto">
       <img src={entrant.logoUrl} alt={entrant.name} className="h-full w-full object-cover" />
     </div>
   )}
   ```
   Use `rounded-lg` (NOT `rounded-full`) to keep images square.

2. Change the entrant button layout from horizontal flex to vertical stack layout for the simple card view. Update the button className from `flex min-h-16 flex-1 items-center justify-center` to `flex min-h-20 flex-1 flex-col items-center justify-center` so image stacks above text.

3. Increase the entrant name text from `text-lg` to `text-2xl sm:text-3xl` to make it much more readable for younger students.

4. Increase overall card padding from `p-4` to `p-6`.

5. Increase the entrant button padding from `px-4 py-3` to `px-6 py-6` for larger tap targets.

6. Keep the `eslint-disable-next-line @next/next/no-img-element` comment above each `<img>` tag since this project uses S3 URLs not optimized with next/image.

**Part B: Widen the simple voting view container (simple-voting-view.tsx)**

In `SimpleVotingView`, the outer container is `max-w-md` which constrains the card to ~448px. For younger students with one matchup visible at a time, we should use more screen:

1. Change the outer `div` className on line ~181 from `mx-auto max-w-md px-2 py-4 sm:px-4 sm:py-6` to `mx-auto max-w-2xl px-4 py-4 sm:px-6 sm:py-6` (wider max-width, more padding).

2. Also widen the empty/waiting state container on line ~139 from `mx-auto max-w-md px-4 py-12 text-center` to `mx-auto max-w-2xl px-4 py-12 text-center`.

3. Increase the bracket name heading from `text-xl font-bold sm:text-2xl` to `text-2xl font-bold sm:text-3xl` (line ~184).

4. For the animated card containers (motion.div), remove the `max-w-md` constraint so they fill the wider container.

**Part C: Widen the RR simple voting container (page.tsx)**

In `RRSimpleVoting`, apply the same widening:

1. Change the outer `div` className on line ~936 from `mx-auto max-w-md` to `mx-auto max-w-2xl`.

2. Remove `max-w-md` from the confirmation card container on line ~954.

Note: The `MatchupVoteCard` component is also used in advanced/diagram views via the bracket page, but in those cases it is rendered within already-constrained containers. The enlarged sizing will nicely fill the simple mode containers. The `max-w-md` on the card itself (line ~148 of matchup-vote-card.tsx) should be changed to `max-w-2xl` to allow it to expand in the wider simple containers.
  </action>
  <verify>
1. Run `npx tsc --noEmit` to verify TypeScript compiles without errors.
2. Verify no `rounded-full` is used on any `<img>` tag in the modified files: `grep -rn 'rounded-full.*img\|img.*rounded-full' src/components/bracket/matchup-vote-card.tsx src/components/student/simple-voting-view.tsx` should return no results.
3. Verify entrant images are wired: `grep -n 'logoUrl' src/components/bracket/matchup-vote-card.tsx` should show logoUrl references.
4. Verify wider containers: `grep -n 'max-w-2xl' src/components/student/simple-voting-view.tsx` should show results.
  </verify>
  <done>
- MatchupVoteCard renders large square entrant images (h-28/h-36) when logoUrl is present
- Entrant name text is 2xl/3xl for readability by younger students
- Card padding and tap targets are significantly enlarged
- Simple voting view uses max-w-2xl container (672px vs 448px) to use more screen
- RR simple voting container is also widened to match
- All images use rounded-lg (square with rounded corners), never rounded-full
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no type errors
2. No `rounded-full` on any `<img>` or image element across modified files
3. Visual check: simple bracket shows one matchup with large cards, large images, and large text filling most of the screen width
4. Visual check: predictive bracket simple mode shows entrant logos as squares, not circles
5. Poll images were already square (rounded-md) -- no changes needed, confirmed by code inspection
</verification>

<success_criteria>
- All entrant images in brackets render as squares (rounded-md or rounded-lg), not circles
- Simple bracket matchup cards display entrant images prominently (28-36 unit size) when available
- Simple bracket card text is 2xl-3xl font size for younger students
- Simple bracket view uses wider container (max-w-2xl) to fill more of the screen
- No TypeScript compilation errors introduced
</success_criteria>

<output>
After completion, create `.planning/quick/7-fix-square-images-for-brackets-polls-and/7-SUMMARY.md`
</output>
