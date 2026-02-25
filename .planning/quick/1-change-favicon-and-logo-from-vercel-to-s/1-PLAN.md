---
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/favicon.ico
  - src/app/icon.png
  - src/app/apple-icon.png
  - src/app/layout.tsx
  - public/vercel.svg
  - public/next.svg
  - public/file.svg
  - public/globe.svg
  - public/window.svg
autonomous: true
requirements: [QUICK-FAVICON]

must_haves:
  truths:
    - "Browser tab shows SparkVote logo as favicon, not the Vercel triangle"
    - "No Vercel-branded files remain in the public/ directory"
    - "OpenGraph metadata includes SparkVote logo image"
  artifacts:
    - path: "src/app/icon.png"
      provides: "SparkVote favicon via Next.js icon convention"
    - path: "src/app/apple-icon.png"
      provides: "Apple touch icon for iOS home screen"
  key_links:
    - from: "src/app/icon.png"
      to: "browser favicon"
      via: "Next.js automatic icon detection from app directory"
      pattern: "icon\\.png"
---

<objective>
Replace the default Vercel/Next.js favicon with the SparkVote logo and remove all unused Vercel boilerplate assets from the public/ directory.

Purpose: The browser tab currently shows the Vercel triangle. It should show the SparkVote logo to match the brand identity throughout the site.
Output: SparkVote favicon in browser tabs, cleaned public/ directory, OG image metadata.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/layout.tsx
@public/logo-icon.png
@public/logo-icon-bordered.png
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace favicon with SparkVote logo and add apple-icon</name>
  <files>src/app/favicon.ico, src/app/icon.png, src/app/apple-icon.png</files>
  <action>
  The current favicon at src/app/favicon.ico is the default Vercel/Next.js triangle. Replace it with the SparkVote logo.

  Next.js App Router automatically serves files named `icon.png` and `apple-icon.png` in the app directory as favicon and apple touch icon respectively. This is the recommended approach (no manual metadata configuration needed).

  Steps:
  1. Delete the old `src/app/favicon.ico` (the Vercel triangle).
  2. Use the existing `public/logo-icon.png` (the SparkVote checkmark+spark logo, 1080x1080) as the source. Convert/resize it to create:
     - `src/app/icon.png` -- 32x32 PNG for the browser favicon. Use `sips` (macOS built-in) to resize: `sips -z 32 32 public/logo-icon.png --out src/app/icon.png`
     - `src/app/apple-icon.png` -- 180x180 PNG for Apple touch icon. Use: `sips -z 180 180 public/logo-icon.png --out src/app/apple-icon.png`
  3. Verify both files exist and are correctly sized with: `sips -g pixelWidth -g pixelHeight src/app/icon.png src/app/apple-icon.png`

  Note: Next.js automatically generates the `<link rel="icon">` and `<link rel="apple-touch-icon">` tags from these files. No changes to layout.tsx metadata are needed for favicon.
  </action>
  <verify>
  Run: `ls -la src/app/icon.png src/app/apple-icon.png && sips -g pixelWidth -g pixelHeight src/app/icon.png src/app/apple-icon.png`
  Confirm icon.png is 32x32, apple-icon.png is 180x180. Confirm src/app/favicon.ico no longer exists.
  </verify>
  <done>Browser tab shows SparkVote checkmark+spark logo instead of Vercel triangle. Apple touch icon works for iOS bookmarks.</done>
</task>

<task type="auto">
  <name>Task 2: Remove unused Vercel/Next.js boilerplate SVGs and add OG image metadata</name>
  <files>public/vercel.svg, public/next.svg, public/file.svg, public/globe.svg, public/window.svg, src/app/layout.tsx</files>
  <action>
  Two sub-tasks:

  A) Delete these 5 unused default Next.js boilerplate SVG files from public/ (confirmed no source files reference them):
  - public/vercel.svg (Vercel logo)
  - public/next.svg (Next.js logo)
  - public/file.svg (default template icon)
  - public/globe.svg (default template icon)
  - public/window.svg (default template icon)

  Use: `rm public/vercel.svg public/next.svg public/file.svg public/globe.svg public/window.svg`

  B) Add an OpenGraph image to the metadata in src/app/layout.tsx. The current metadata has an openGraph section but no image. Add the `images` field pointing to the logo-horizontal.png:

  In the `openGraph` object inside the `metadata` export, add:
  ```
  images: [
    {
      url: '/logo-horizontal.png',
      width: 1200,
      height: 630,
      alt: 'SparkVotEDU - Ignite Student Voice Through Voting',
    },
  ],
  ```

  Note: The `logo-horizontal.png` is already in public/ (1200px wide). This ensures link previews on social media show the SparkVote brand instead of a blank preview.
  </action>
  <verify>
  Run: `ls public/vercel.svg public/next.svg public/file.svg public/globe.svg public/window.svg 2>&1` -- should all show "No such file".
  Run: `grep -A4 'images' src/app/layout.tsx` -- should show the openGraph images config.
  Run: `npx next build 2>&1 | tail -5` -- build should succeed (or just `npx next lint` for faster check).
  </verify>
  <done>No Vercel or default Next.js boilerplate files remain in public/. Social media link previews show SparkVote branding via OG image.</done>
</task>

</tasks>

<verification>
1. `ls src/app/favicon.ico 2>&1` returns "No such file" (old Vercel favicon removed)
2. `ls src/app/icon.png src/app/apple-icon.png` both exist
3. `ls public/vercel.svg public/next.svg 2>&1` returns "No such file" (Vercel boilerplate removed)
4. `grep 'logo-horizontal' src/app/layout.tsx` shows OG image configured
5. Start dev server and check browser tab -- should show SparkVote logo
</verification>

<success_criteria>
- Browser favicon is the SparkVote checkmark+spark logo (blue rays, amber checkmark) at 32x32
- Apple touch icon exists at 180x180
- All 5 default Next.js SVGs removed from public/
- OpenGraph image metadata points to SparkVote horizontal logo
- Build/lint passes with no errors
</success_criteria>

<output>
After completion, create `.planning/quick/1-change-favicon-and-logo-from-vercel-to-s/1-SUMMARY.md`
</output>
