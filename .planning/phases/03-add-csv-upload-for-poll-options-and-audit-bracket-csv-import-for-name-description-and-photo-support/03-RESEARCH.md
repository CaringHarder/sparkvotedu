# Phase 3: Add CSV Upload for Poll Options & Audit Bracket CSV Import - Research

**Researched:** 2026-03-24
**Domain:** CSV parsing, file upload, Supabase Storage image handling
**Confidence:** HIGH

## Summary

This phase adds CSV upload for poll options (new feature) and extends the existing bracket CSV parser to support image URLs. The codebase already has a mature CSV upload pattern in the bracket domain: `parseEntrantCSV()` + `CSVUpload` component + preview-then-confirm UX. The poll CSV feature mirrors this exactly. The bracket enhancement is a small parser extension.

The image-from-CSV workflow is the only novel piece: CSV rows contain external image URLs that must be downloaded, re-uploaded to Supabase Storage via the existing signed-URL pipeline, and stored as the option/entrant image. This is a client-side fetch-then-upload flow reusing the existing `/api/polls/[pollId]/upload-url` and `/api/brackets/[bracketId]/upload-url` endpoints.

**Primary recommendation:** Clone the bracket CSV pattern for polls. Build a shared `downloadAndReuploadImage()` utility for the image-from-URL pipeline. Keep the poll CSV component as a sibling to the bracket one, not a generic abstraction.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Poll CSV format: `text` column required, optional `image`/`imageUrl` column
- Flexible header aliases: accept 'option', 'text', 'name', or first column for text; accept 'image', 'imageUrl', 'photo', 'url' for image
- Image URLs from CSV downloaded and re-uploaded to Supabase Storage (matching current per-option image upload pattern via signed URL endpoint)
- Failed image download: import the option text successfully, show warning that image could not be loaded
- Bracket CSV: extend parser to support optional `logoUrl` column (accept 'image', 'logo', 'logoUrl', 'photo' aliases)
- Same download and re-upload to Supabase Storage pattern as poll CSV images
- Same failure handling: import entrant with name, skip failed image with warning
- Abbreviation column NOT added
- No description column (BracketEntrant has no description field)
- Poll CSV upload button placed in OptionList section alongside existing 'Add Option' button
- CSV import replaces all current options (not append) -- matches bracket CSV behavior
- Preview step before confirming: shows option text with small camera/image icon indicator for entries that have an image URL (no actual image download during preview)
- Duplicate option text: keep all duplicates as-is
- Max 32 poll options from CSV (same as manual OptionList limit), truncate with warning
- Empty rows silently skipped (papaparse skipEmptyLines)
- Options with empty text after trimming filtered out

### Claude's Discretion
- Exact button placement relative to 'Add Option' in OptionList
- Warning message wording for failed image downloads and truncation
- Whether to show image download progress during import confirmation
- Shared utility for image download and re-upload (reusable between poll and bracket CSV)
- Preview list styling details (scrollable area height, icon choice)

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| papaparse | ^5.5.3 | CSV parsing | Already used by bracket CSV parser |
| @types/papaparse | ^5.5.2 | TypeScript types | Already installed |
| nanoid | ^5.1.6 | Unique IDs for options | Already used by OptionList/PollForm |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | (installed) | Icons (Upload, Camera, FileText, AlertTriangle) | UI indicators |
| zod | (installed) | Schema validation | Upload URL API validation |

No new packages needed. Everything required is already in the project.

## Architecture Patterns

### Existing Code to Clone/Extend

```
src/
  lib/
    bracket/
      csv-parser.ts          # EXTEND: add logoUrl to ParsedEntrant, add image aliases
    poll/
      csv-parser.ts          # NEW: parsePollOptionCSV() following bracket pattern
    utils/
      csv-image-upload.ts    # NEW: shared downloadAndReuploadImage() utility
  components/
    bracket/
      csv-upload.tsx          # REFERENCE: clone pattern for poll version
    poll/
      option-list.tsx         # MODIFY: add CSV upload button
      poll-csv-upload.tsx     # NEW: PollCSVUpload component
      option-image-upload.tsx # REFERENCE: existing image upload pattern
```

### Pattern 1: CSV Parser (bracket pattern to follow)
**What:** papaparse with header aliasing and fallback to first column
**Existing code in `csv-parser.ts`:**
```typescript
Papa.parse<Record<string, string>>(file, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (h) => h.trim().toLowerCase(),
  complete(results) {
    const entrants = results.data
      .map((row, index) => ({
        name: (row['name'] || row['entrant'] || row['team'] || Object.values(row)[0] || '').trim(),
        seed: index + 1,
      }))
      .filter((e) => e.name.length > 0)
    resolve(entrants)
  },
})
```

### Pattern 2: Poll CSV Parser (new, following bracket pattern)
**What:** Same papaparse pattern but for poll options with text + optional imageUrl
```typescript
// src/lib/poll/csv-parser.ts
export interface ParsedPollOption {
  text: string
  imageUrl?: string  // raw external URL from CSV, not yet re-uploaded
}

export function parsePollOptionCSV(file: File): Promise<ParsedPollOption[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete(results) {
        const options: ParsedPollOption[] = results.data
          .map((row) => ({
            text: (row['text'] || row['option'] || row['name'] || Object.values(row)[0] || '').trim(),
            imageUrl: (row['image'] || row['imageurl'] || row['photo'] || row['url'] || '').trim() || undefined,
          }))
          .filter((o) => o.text.length > 0)
        resolve(options)
      },
      error(err) {
        reject(new Error(`CSV parse error: ${err.message}`))
      },
    })
  })
}
```

### Pattern 3: Image Download and Re-upload Utility
**What:** Fetch external image URL, convert to blob, upload via signed URL to Supabase Storage
**When to use:** After CSV preview is confirmed and user clicks "Use These Options/Entrants"
```typescript
// src/lib/utils/csv-image-upload.ts
export interface ImageUploadResult {
  publicUrl: string | null
  error?: string
}

export async function downloadAndReuploadImage(
  externalUrl: string,
  uploadEndpoint: string
): Promise<ImageUploadResult> {
  try {
    // 1. Fetch external image
    const response = await fetch(externalUrl)
    if (!response.ok) throw new Error('Failed to download')
    const blob = await response.blob()
    if (!blob.type.startsWith('image/')) throw new Error('Not an image')

    // 2. Get signed upload URL
    const contentType = blob.type.match(/^image\/(jpeg|png|webp)$/) ? blob.type : 'image/jpeg'
    const fileName = `csv-import-${Date.now()}.${contentType.split('/')[1]}`
    const urlRes = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, contentType }),
    })
    if (!urlRes.ok) throw new Error('Failed to get upload URL')
    const { signedUrl, publicUrl } = await urlRes.json()

    // 3. Upload to Supabase Storage
    const uploadRes = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: blob,
    })
    if (!uploadRes.ok) throw new Error('Failed to upload')

    return { publicUrl }
  } catch (err) {
    return { publicUrl: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
```

### Pattern 4: CSV Upload Component (bracket component to clone)
**What:** File input + preview list + confirm/cancel buttons
**Key difference for polls:** Preview shows camera icon indicator for rows with image URLs
**Integration point:** `OptionList` component, placed below the existing "Add Option" button

### Pattern 5: Bracket CSV Parser Extension
**What:** Add optional `logoUrl` to `ParsedEntrant` interface and parse image column
```typescript
// Extend existing ParsedEntrant
export interface ParsedEntrant {
  name: string
  seed: number
  logoUrl?: string  // NEW: optional image URL from CSV
}

// In parser, add after name extraction:
logoUrl: (row['image'] || row['logo'] || row['logourl'] || row['photo'] || '').trim() || undefined,
```

### Anti-Patterns to Avoid
- **Do not download images during preview:** Preview is parse-only. Image download happens after user confirms. This keeps preview instant.
- **Do not block import on failed images:** Failed image download should never prevent the text option/entrant from being imported. Always succeed with text, warn about image failures.
- **Do not create a generic CSV upload component:** The bracket and poll CSV components have different props, callbacks, and display logic. Keep them as separate components that share the same UX pattern.
- **Do not skip the signed URL pipeline:** All images must go through the existing Supabase Storage signed URL upload flow. Never store external URLs directly in the database.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom parser | papaparse (already installed) | Header detection, encoding, edge cases |
| Signed URL upload | Custom S3 logic | Existing upload-url API routes | Already handles auth, path sanitization, bucket config |
| Image cropping | Canvas manipulation | react-easy-crop via ImageUploadModal | Already built and working |

**Key insight:** The entire upload pipeline (signed URL generation, Supabase Storage, public URL construction) already exists in both poll and bracket API routes. CSV image upload just needs to call these same endpoints programmatically instead of through the ImageUploadModal UI.

## Common Pitfalls

### Pitfall 1: CORS blocking external image downloads
**What goes wrong:** `fetch(externalUrl)` fails because the external server blocks cross-origin requests.
**Why it happens:** Many image hosts don't set CORS headers for arbitrary origins.
**How to avoid:** This is expected and acceptable. The error handling already accounts for it -- import the option text, skip the image, show a warning. Teachers can manually upload images after import.
**Warning signs:** Console CORS errors during CSV import with image URLs.

### Pitfall 2: Image content type mismatch
**What goes wrong:** External URL returns non-image content (HTML error page, redirect) that gets uploaded as an "image."
**Why it happens:** External URLs may be invalid, expired, or behind authentication.
**How to avoid:** Check `response.ok` and validate `blob.type.startsWith('image/')` before uploading. The utility function handles this.

### Pitfall 3: Race condition on poll creation with images
**What goes wrong:** During poll creation (not edit), `pollId` is not yet available for the upload URL endpoint.
**Why it happens:** Poll is created on form submit, but CSV images need upload endpoints during the form phase.
**How to avoid:** Use the existing `draft` fallback pattern already in `OptionImageUpload` (`pollId ?? 'draft'`). Images uploaded to `poll-options/{teacherId}/draft/` path work fine -- the URL is stored in the option regardless of path.

### Pitfall 4: CSV header case sensitivity
**What goes wrong:** Teacher uses "Name" or "IMAGE" as headers, parser doesn't recognize them.
**Why it happens:** Header aliases are case-sensitive.
**How to avoid:** The `transformHeader: (h) => h.trim().toLowerCase()` papaparse option normalizes all headers to lowercase before alias matching. Already used in bracket parser.

### Pitfall 5: Large CSV with many image URLs
**What goes wrong:** Importing 32 options with image URLs causes 32 concurrent fetches + uploads, potentially overwhelming the browser or hitting rate limits.
**How to avoid:** Process image uploads sequentially or in small batches (e.g., 3-5 concurrent). Show progress indicator during the image upload phase.

## Code Examples

### Integration into OptionList
```typescript
// In option-list.tsx, add after the "Add Option" button:
<PollCSVUpload
  onOptionsParsed={handleCSVImport}
  maxOptions={maxOptions}
  pollId={pollId}
/>

// Handler in OptionList or PollForm:
function handleCSVImport(parsed: ParsedPollOption[]) {
  const newOptions = parsed.map(p => ({
    id: nanoid(),
    text: p.text,
    imageUrl: undefined,  // images not yet uploaded
    _pendingImageUrl: p.imageUrl,  // track for post-confirm upload
  }))
  onChange(newOptions)
}
```

### Bracket CSV Parser Extension
```typescript
// In csv-parser.ts, update the map:
.map((row, index) => ({
  name: (row['name'] || row['entrant'] || row['team'] || Object.values(row)[0] || '').trim(),
  seed: index + 1,
  logoUrl: (row['image'] || row['logo'] || row['logourl'] || row['photo'] || '').trim() || undefined,
}))
```

### Image Upload Flow (post-confirm)
```typescript
// After user confirms CSV import, process images:
async function processCSVImages(
  options: Array<{ id: string; text: string; pendingImageUrl?: string }>,
  uploadEndpoint: string,
  onProgress: (completed: number, total: number) => void,
  onWarning: (text: string, error: string) => void,
): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>()
  const withImages = options.filter(o => o.pendingImageUrl)
  let completed = 0

  for (const option of withImages) {
    const result = await downloadAndReuploadImage(option.pendingImageUrl!, uploadEndpoint)
    if (result.publicUrl) {
      imageMap.set(option.id, result.publicUrl)
    } else {
      onWarning(option.text, result.error ?? 'Unknown error')
    }
    completed++
    onProgress(completed, withImages.length)
  }

  return imageMap
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual entry only for poll options | CSV upload + manual | This phase | Faster poll creation for 10+ options |
| Bracket CSV: name only | Bracket CSV: name + optional logoUrl | This phase | Teachers can import branded brackets |

## Open Questions

1. **Image upload timing -- during confirm or after form submit?**
   - What we know: Preview should NOT download images. Images must go through Supabase Storage.
   - Options: (a) Upload images immediately when user clicks "Use These Options" in preview, then populate the form with uploaded URLs. (b) Store raw external URLs in form state, upload on form submit.
   - Recommendation: Option (a) -- upload on confirm click. This way the form state always has Supabase URLs, and the submit logic doesn't need to know about CSV imports. Show a loading state during image uploads with progress. This is Claude's discretion per CONTEXT.md.

2. **Bracket CSV image upload trigger**
   - What we know: Current `CSVUpload.onEntrantsParsed` only returns `{ name, seed }`. Adding `logoUrl` to the callback means the bracket-form needs to handle image uploads too.
   - Recommendation: Extend the callback to include `logoUrl?: string`, and add the same post-confirm image upload flow as polls. The bracket-form's `handleEntrantsFromCSV` callback processes images before setting entrant state.

## Sources

### Primary (HIGH confidence)
- `src/lib/bracket/csv-parser.ts` -- existing parser pattern, line-by-line reviewed
- `src/components/bracket/csv-upload.tsx` -- existing upload UI pattern, line-by-line reviewed
- `src/components/poll/option-list.tsx` -- integration target, line-by-line reviewed
- `src/components/poll/poll-form.tsx` -- form state management, line-by-line reviewed
- `src/components/shared/image-upload-modal.tsx` -- image upload pipeline, line-by-line reviewed
- `src/app/api/polls/[pollId]/upload-url/route.ts` -- signed URL generation, line-by-line reviewed
- `src/app/api/brackets/[bracketId]/upload-url/route.ts` -- signed URL generation, line-by-line reviewed
- `src/components/poll/option-image-upload.tsx` -- draft fallback pattern, line-by-line reviewed
- `src/components/bracket/entrant-list.tsx` -- entrant image pattern, line-by-line reviewed

### Secondary (MEDIUM confidence)
- papaparse v5.5.3 npm registry -- version confirmed via `npm view`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already installed and in use
- Architecture: HIGH -- cloning existing, well-understood patterns
- Pitfalls: HIGH -- based on direct code reading and known web platform limitations (CORS, fetch)

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable codebase patterns, no external API dependencies)
