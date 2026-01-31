---
phase: 05-polls
plan: 06
subsystem: navigation-activities-integration
tags: [sidebar-nav, activities-page, activities-api, image-upload, signed-url, compression, student-routing]
requires:
  - 05-03 (PollCard component, poll DAL, poll pages)
  - 05-04 (Student poll voting page, activity routing)
  - 03-07 (Bracket card and brackets page patterns)
  - 02-05 (Activity grid and realtime activities hook)
provides:
  - Unified sidebar navigation with Activities section containing Brackets and Polls sub-items
  - /activities page showing merged brackets and polls with status tabs and type filters
  - Extended activities API returning both brackets and polls for student session views
  - Client-side image compression utility (Canvas API, max 800px, JPEG 0.8)
  - Signed upload URL endpoint for poll option images via Supabase Storage
  - OptionImageUpload component with compress -> upload -> preview flow
affects:
  - Future phases using sidebar navigation (layout is updated)
  - Student session views (activity grid now shows polls alongside brackets)
  - Poll option editing (OptionImageUpload available for option-list integration)
tech-stack:
  added: []
  patterns:
    - "Unified sidebar nav with parent section (Activities) and always-visible indented sub-items (Brackets, Polls)"
    - "Server component fetches both brackets and polls, merges into unified ActivityItem array sorted by updatedAt"
    - "Client-side ActivitiesList with status tabs (All/Active/Draft/Closed) and type filters (All/Brackets/Polls)"
    - "Canvas API image compression: createImageBitmap + canvas.toBlob for JPEG output"
    - "Signed upload URL flow: server generates URL -> client uploads directly to Supabase Storage"
key-files:
  created:
    - src/app/(dashboard)/activities/page.tsx
    - src/app/(dashboard)/activities/activities-list.tsx
    - src/lib/utils/image-compress.ts
    - src/app/api/polls/[pollId]/upload-url/route.ts
    - src/components/poll/option-image-upload.tsx
  modified:
    - src/components/dashboard/sidebar-nav.tsx
    - src/app/api/sessions/[sessionId]/activities/route.ts
key-decisions:
  - "Activities section with always-visible sub-items rather than collapsible accordion for simple UX"
  - "Existing bracket routes (/brackets, /brackets/[id]) kept intact -- no route changes"
  - "Student routing for polls already handled by ActivityGrid from Phase 2/4 -- no changes needed"
  - "Image compression to max 800px JPEG at 0.8 quality (RESEARCH.md recommendation)"
  - "Signed upload URL pattern bypasses Next.js server action body limits for images"
duration: ~3.1m
completed: 2026-01-31
---

# Phase 5 Plan 6: Navigation, Activities Integration, and Image Upload Summary

**Unified sidebar navigation with Activities section, merged brackets/polls activities page with status and type filtering, extended activities API for student sessions, and client-side image compression with Supabase Storage signed upload URL flow.**

## Performance

- **Duration:** ~3.1 minutes
- **Start:** 2026-01-31T22:33:52Z
- **End:** 2026-01-31T22:36:56Z
- **Tasks:** 2/2 completed
- **Type checks:** Zero new errors introduced

## Accomplishments

1. **Sidebar Navigation Refactor (src/components/dashboard/sidebar-nav.tsx)** -- Replaced the flat nav list with a structured layout. Dashboard and Sessions remain as standard items. The new "Activities" section uses a Zap icon, links to /activities, and is active when on /activities, /brackets/*, or /polls/*. Sub-items for "Brackets" (Trophy icon) and "Polls" (BarChart3 icon) are always visible, indented with a left border and smaller text.

2. **Unified Activities Page (src/app/(dashboard)/activities/)** -- Server component page fetches both brackets (via getTeacherBrackets) and polls (via getPollsByTeacherDAL), merges into a unified array sorted by updatedAt descending. Client-side ActivitiesList component provides status tabs (All, Active, Draft, Closed) and type filters (All, Brackets Only, Polls Only). Each activity card shows a type badge (amber for brackets, indigo for polls), status badge, and relevant meta info.

3. **Extended Activities API (src/app/api/sessions/[sessionId]/activities/route.ts)** -- Added poll query alongside the existing bracket query. Polls in the session with status active or closed are fetched. Each poll is mapped to the Activity interface with hasVoted check via PollVote count per participant. Both arrays are merged and sorted with active activities first.

4. **Image Compression Utility (src/lib/utils/image-compress.ts)** -- Pure function using Canvas API: createImageBitmap for decoding, canvas for resize, toBlob for JPEG output. Default max 800px on longest side, quality 0.8. Closes ImageBitmap after use to free memory.

5. **Signed Upload URL Endpoint (src/app/api/polls/[pollId]/upload-url/route.ts)** -- POST endpoint requiring teacher auth. Validates fileName and contentType (image/jpeg|png|webp|gif) via Zod. Generates storage path with teacher ID, poll ID, and timestamp. Uses Supabase admin client createSignedUploadUrl. Returns signedUrl, token, path, and publicUrl.

6. **Option Image Upload Component (src/components/poll/option-image-upload.tsx)** -- Client component with hidden file input, compress-upload flow. Compresses via compressImage, fetches signed URL, uploads directly to Supabase Storage via PUT, shows preview thumbnail (48x48) with remove button. Loading spinner during upload, error display on failure.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Refactor navigation and create activities page | 5205b9b | src/components/dashboard/sidebar-nav.tsx, src/app/(dashboard)/activities/page.tsx, src/app/(dashboard)/activities/activities-list.tsx |
| 2 | Extend activities API and add image upload flow | 6fc052b | src/app/api/sessions/[sessionId]/activities/route.ts, src/lib/utils/image-compress.ts, src/app/api/polls/[pollId]/upload-url/route.ts, src/components/poll/option-image-upload.tsx |

## Files Created

- `src/app/(dashboard)/activities/page.tsx` -- Unified activities page (server component, fetches both brackets and polls)
- `src/app/(dashboard)/activities/activities-list.tsx` -- Client-side filtering and rendering of activity cards
- `src/lib/utils/image-compress.ts` -- Canvas-based image resize and JPEG compression
- `src/app/api/polls/[pollId]/upload-url/route.ts` -- POST endpoint for Supabase Storage signed upload URLs
- `src/components/poll/option-image-upload.tsx` -- Image upload component with compress, upload, preview flow

## Files Modified

- `src/components/dashboard/sidebar-nav.tsx` -- Replaced flat nav with Activities section + sub-items
- `src/app/api/sessions/[sessionId]/activities/route.ts` -- Added poll query and merged poll activities into response

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Always-visible sub-items (no accordion) | Keeps navigation simple and discoverable; only 2 sub-items |
| Keep existing /brackets and /polls routes intact | No regression risk; teacher bookmarks and back-button navigation preserved |
| No changes to student session page or activity card | ActivityGrid from Phase 2/4 already handles poll routing correctly |
| Max 800px, JPEG 0.8 for image compression | RESEARCH.md recommendation; good quality for thumbnails, under 200KB |
| Include pollId in storage path | Organizes images by poll for easier cleanup/management |
| Filename sanitization in upload URL endpoint | Security: prevents path traversal via malicious filenames |

## Deviations from Plan

### Auto-added Components

**1. [Rule 2 - Missing Critical] ActivitiesList client component**
- **Found during:** Task 1
- **Issue:** The activities page needs client-side filtering (status tabs, type filters) which requires a separate client component since the page is a server component
- **Fix:** Created activities-list.tsx as a client component that receives serialized items and handles filtering/rendering
- **Files created:** src/app/(dashboard)/activities/activities-list.tsx
- **Commit:** 5205b9b

### Confirmed No Changes Needed

**2. Student session page and activity card**
- **Found during:** Task 2 analysis
- **Issue:** Plan mentioned updating these files, but the existing ActivityGrid already routes both bracket and poll activities correctly (code verified at lines 34-38 and 70-75 of activity-grid.tsx)
- **Result:** No modifications needed -- existing code already handles poll routing

## Issues Encountered

None -- all files compiled cleanly, no type errors.

## Next Phase Readiness

- **Phase 5 complete:** All 6 plans executed. Polls have: schema, DAL, server actions, broadcast, feature gates, teacher UI (form + wizard + detail + templates), student voting UI (simple + ranked), and now unified navigation, activities integration, and image upload.
- **poll-images bucket:** Supabase Storage bucket must be created manually in the Supabase dashboard for image uploads to work. Comment added to upload-url endpoint.
- **OptionImageUpload integration:** Available for use in OptionList component (each option row can include an image upload button).
