# Phase 34: Poll Quick Create & Image Polish - Research

**Researched:** 2026-03-01
**Domain:** React form components, image upload infrastructure, UI template browsing
**Confidence:** HIGH

## Summary

Phase 34 transforms the poll creation experience in two coordinated ways: (1) simplifying Quick Create by hiding settings and poll type toggle, adding a flat template chip browser, and (2) polishing poll option image upload to match the bracket entrant visual pattern with square aspect ratios and dashed-border camera icons.

The codebase already has all necessary infrastructure -- the bracket side has a working Quick Create with chip-based topic browsing (`BracketQuickCreate`), a draft image upload pattern (`EntrantImageUpload` using `'draft'` as bracketId fallback), and the shared `ImageUploadModal` already supports `aspectRatio={1}` for square cropping. The poll side has all the API endpoints (`/api/polls/[pollId]/upload-url`), the `OptionImageUpload` component, and the `PollForm` component. The changes are largely structural refactoring -- moving UI elements, restricting visibility based on creation mode, and restyling the image upload component.

**Primary recommendation:** Follow the bracket Quick Create pattern exactly -- it was built in Phase 33 and serves as the direct reference implementation. The poll upload endpoint already exists and just needs to accept `'draft'` as a pollId (same as bracket). The template browser needs flattening from category tabs to a chip grid.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Poll creation page defaults to Step-by-Step tab (currently defaults to Quick Create)
- This matches bracket creation, which already defaults to Step-by-Step (set in Phase 33)
- Quick Create shows ONLY: question, description (optional), and options
- Poll type toggle (Simple/Ranked) is HIDDEN in Quick Create -- Quick Create always creates Simple polls
- Ranked polls require Step-by-Step wizard
- Settings section (Allow vote change, Show live results) is HIDDEN in Quick Create
- Quick Create defaults: `allowVoteChange: false`, `showLiveResults: false`
- Flat chip grid layout (like bracket topic chips) -- all templates shown as chips, NOT category-based tabs
- Template browser lives INSIDE Quick Create tab only (not above the mode toggle)
- Selected template stays visually highlighted after selection
- Template auto-fills question + options into the Quick Create form
- Remove the "From Template" button from the Step-by-Step wizard -- templates are a Quick Create feature only
- Poll option images enforce square (1:1) aspect ratio crop, matching bracket entrant images
- Image upload camera icon positioned on the LEFT -- after position badge, before text input (matching bracket entrant row layout exactly)
- Camera icon appears as a dashed-border square (same style as bracket entrants) visible immediately when an option is added -- not hidden behind an "Add Image" text button
- Layout order per option row: drag handle -> position badge -> camera icon -> text input -> remove button
- Enable image upload during poll creation (before pollId exists), matching bracket's "draft" pattern
- Image upload buttons visible in BOTH Quick Create and Step-by-Step modes
- Upload buttons visible on all options regardless of template pre-fill or manual entry

### Claude's Discretion
- Draft upload endpoint approach (matching bracket pattern or alternative)
- Loading skeleton design
- Error state handling

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x | App Router, server/client components | Project framework |
| React | 19.x | UI components | Project UI library |
| react-easy-crop | (installed) | Image cropping with aspect ratio enforcement | Already used in ImageUploadModal |
| Supabase Storage | (configured) | Signed URL uploads for images | Already used for bracket-images and poll-images buckets |
| nanoid | (installed) | Client-side unique IDs for options | Already used throughout |
| lucide-react | (installed) | Icons (Camera, GripVertical, X, Plus, Zap, List) | Already used throughout |
| zod | (installed) | Schema validation for server actions | Already used throughout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui components | (installed) | Button, Input, Label, Card, Badge, Dialog | Already used in all form components |

### Alternatives Considered
None -- all libraries are already installed and in use. No new dependencies required.

## Architecture Patterns

### Existing File Structure (Relevant Files)
```
src/
  app/(dashboard)/polls/new/page.tsx         # Poll creation page (mode toggle + forms)
  app/api/polls/[pollId]/upload-url/route.ts # Signed URL endpoint for poll images
  app/api/brackets/[bracketId]/upload-url/route.ts # Reference: bracket draft pattern
  components/poll/
    poll-form.tsx             # Quick Create form (currently has settings, poll type)
    poll-wizard.tsx           # Step-by-Step wizard (4 steps)
    option-list.tsx           # Drag-reorderable option rows
    option-image-upload.tsx   # Image upload for poll options
  components/bracket/
    bracket-creation-page.tsx # Reference: mode toggle defaulting to 'wizard'
    bracket-quick-create.tsx  # Reference: chip-based topic browsing
    entrant-list.tsx          # Reference: entrant row layout with camera icon
    entrant-image-upload.tsx  # Reference: dashed-border camera icon, 'draft' fallback
  components/shared/
    image-upload-modal.tsx    # Shared modal with aspectRatio prop
  lib/poll/
    templates.ts             # 18 templates across 5 categories
    types.ts                 # PollType, PollStatus type definitions
  lib/bracket/
    curated-topics.ts        # Reference: topic chip data structure
  actions/poll.ts            # Server actions for poll CRUD
  lib/utils/validation.ts    # Zod schemas for createPoll, pollOption
```

### Pattern 1: Default Tab to Step-by-Step (Bracket Reference)
**What:** Change initial state of mode toggle from `'quick'` to `'wizard'`
**When to use:** Poll creation page
**Current code** (needs change):
```typescript
// src/app/(dashboard)/polls/new/page.tsx line 17
const [mode, setMode] = useState<CreationMode>('quick')
// Change to:
const [mode, setMode] = useState<CreationMode>('wizard')
```
**Reference** (bracket-creation-page.tsx line 21):
```typescript
const [mode, setMode] = useState<CreationMode>('wizard')
```

### Pattern 2: Quick Create Form Simplification
**What:** PollForm currently renders poll type toggle, ranking depth, and settings section for non-edit mode. These must be hidden in Quick Create context, with hardcoded defaults.
**Current state:** PollForm has a single `existingPoll` prop to distinguish create vs. edit. No concept of "Quick Create mode" vs. "Step-by-Step mode."
**Implementation approach:**
- Add a `mode` prop to PollForm: `mode?: 'quick' | 'wizard' | 'edit'`
- When `mode === 'quick'`: hide poll type toggle (default 'simple'), hide settings section (default `allowVoteChange: false`, `showLiveResults: false`), hide ranking depth
- When `mode === 'edit'` (existingPoll present): show all fields as today
- This preserves backward compatibility for the edit use case

### Pattern 3: Template Chip Grid (Bracket Reference)
**What:** Flat chip grid showing all poll templates as selectable chips, replacing the current category-based tab browsing above the mode toggle.
**Reference pattern** (bracket-quick-create.tsx lines 97-131):
```typescript
<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
  {CURATED_TOPICS.map((topic) => {
    const isSelected = selectedTopic?.id === topic.id
    const colorClass = SUBJECT_COLORS[topic.subject] ?? '...'
    return (
      <button
        key={topic.id}
        type="button"
        onClick={() => setSelectedTopic((prev) => prev?.id === topic.id ? null : topic)}
        className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-colors ${
          isSelected
            ? 'border-primary ring-1 ring-primary'
            : 'border-transparent hover:border-primary/30'
        }`}
      >
        <span className="text-sm font-medium">{topic.name}</span>
        <Badge variant="secondary" className={colorClass}>{topic.subject}</Badge>
      </button>
    )
  })}
</div>
```
**Adaptation for polls:** Show all 18 POLL_TEMPLATES as chips. Each chip shows the question text (truncated) and a category badge. Selected template is visually highlighted. Template auto-fills question + options fields.

### Pattern 4: Draft Image Upload (Bracket Reference)
**What:** Enable image upload before entity creation by using `'draft'` as the entity ID in the upload endpoint URL.
**Reference** (entrant-image-upload.tsx lines 35-36):
```typescript
const uploadBracketId = bracketId ?? 'draft'
const uploadEndpoint = `/api/brackets/${uploadBracketId}/upload-url`
```
**Poll adaptation:**
```typescript
const uploadPollId = pollId ?? 'draft'
const uploadEndpoint = `/api/polls/${uploadPollId}/upload-url`
```
**Server-side:** The poll upload-url route already accepts a `pollId` param. Currently it doesn't validate that the pollId is a real UUID -- the path in Supabase Storage just includes it. Using `'draft'` as the pollId will work with the existing endpoint because the route only uses `pollId` for the storage path, not for a database lookup.

### Pattern 5: Dashed-Border Camera Icon (Bracket Reference)
**What:** Replace the current "Add Image" text button with a dashed-border square camera icon.
**Current poll style** (option-image-upload.tsx lines 63-70):
```typescript
<button className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
  <Camera className="h-3.5 w-3.5" />
  Add Image
</button>
```
**Target bracket style** (entrant-image-upload.tsx lines 68-75):
```typescript
<button className="flex h-8 w-8 items-center justify-center rounded border border-dashed text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground">
  <Camera className="h-3.5 w-3.5" />
</button>
```

### Pattern 6: Option Row Layout Reorder
**What:** Change option row element order from [drag handle, position badge, text input, image upload, remove] to [drag handle, position badge, camera icon, text input, remove].
**Current order in option-list.tsx:** GripVertical -> position badge -> Input -> OptionImageUpload (only if pollId) -> X button
**Target order:** GripVertical -> position badge -> OptionImageUpload (always visible) -> Input -> X button

### Anti-Patterns to Avoid
- **Don't create separate Quick Create component:** PollForm already handles both create and edit. Adding a `mode` prop is cleaner than duplicating the component.
- **Don't validate pollId as UUID in upload route:** The bracket upload route allows any string as bracketId (including 'draft'). The poll route should follow the same pattern.
- **Don't remove template infrastructure from wizard entirely:** Only remove the "From Template" button in the wizard Step 2. Keep the `PollTemplate` type and data intact -- they're used by the Quick Create form.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image cropping | Custom canvas logic | react-easy-crop + getCroppedImageBlob | Already works, battle-tested |
| Signed upload URLs | Custom upload handler | Supabase Storage createSignedUploadUrl | Already configured, handles auth |
| Drag-and-drop reorder | Custom DnD library | HTML5 native (already in option-list.tsx) | Already works, no extra deps |
| Form validation | Manual checks | Zod schemas (createPollSchema, pollOptionSchema) | Already defined and tested |

**Key insight:** Every piece of infrastructure needed for this phase already exists in the codebase. This is a UI restructuring phase, not an infrastructure phase.

## Common Pitfalls

### Pitfall 1: Breaking Edit Mode When Modifying PollForm
**What goes wrong:** PollForm is used for both creation AND editing (via `existingPoll` prop in PollDetailView). Changes to hide settings could accidentally hide them in edit mode too.
**Why it happens:** PollForm serves dual purpose; changes to the creation path can leak into the edit path.
**How to avoid:** Gate all Quick Create simplifications behind a `mode` prop. The edit path in PollDetailView should pass `mode="edit"` (or implicitly detect edit from `existingPoll` presence).
**Warning signs:** After changes, load a poll detail page in draft mode and verify settings section still renders.

### Pitfall 2: Draft Image Uploads Accumulating Orphaned Files
**What goes wrong:** When using `'draft'` as pollId, uploaded images go to `poll-options/{teacherId}/draft/` in Supabase Storage. If the user uploads images but doesn't create the poll, these files become orphans.
**Why it happens:** No cleanup mechanism for draft uploads.
**How to avoid:** This is an accepted tradeoff (same as bracket). The bracket side has this same behavior and it works fine. Storage costs are minimal for small images. A cleanup cron could be added later.
**Warning signs:** Storage usage growing unexpectedly -- but this is unlikely to matter at current scale.

### Pitfall 3: Template Selection State Not Resetting
**What goes wrong:** Template stays selected when switching tabs between Quick Create and Step-by-Step, causing confusing pre-fills.
**Why it happens:** Template state lives in the parent page component and persists across tab switches.
**How to avoid:** Move template selection state inside the Quick Create form, OR clear it when switching to Step-by-Step mode. Since templates are now Quick Create-only, the state should live inside PollForm when in quick mode.
**Warning signs:** Switching to Step-by-Step after selecting a template shows template data.

### Pitfall 4: Camera Icon Position Affecting Drag Handle Clickability
**What goes wrong:** Adding the camera icon between position badge and text input could make the row too crowded on small screens, causing the drag handle to become hard to click.
**Why it happens:** The bracket entrant list rows have more horizontal space because there's no inline text input (just a name display).
**How to avoid:** Keep camera icon compact (h-8 w-8 matching bracket pattern). Test at mobile widths. The bracket entrant row works at these sizes.
**Warning signs:** At mobile width, option rows overflow or elements stack unexpectedly.

### Pitfall 5: Quick Create Default Values Differ from Current Defaults
**What goes wrong:** Quick Create currently defaults `allowVoteChange: true` (PollForm line 63). The new specification says Quick Create should default `allowVoteChange: false`. If someone expects the old behavior, polls created via Quick Create will silently have different settings.
**Why it happens:** Intentional UX decision -- Quick Create is opinionated, Step-by-Step gives control.
**How to avoid:** This is by design. Document clearly in code that Quick Create forces `allowVoteChange: false`, `showLiveResults: false`.
**Warning signs:** Teachers complaining about polls not allowing vote changes when created via Quick Create.

## Code Examples

### Example 1: PollForm with Mode Prop
```typescript
interface PollFormProps {
  template?: PollTemplate | null
  existingPoll?: { /* ... */ } | null
  /** Creation mode determines which fields are visible */
  mode?: 'quick' | 'edit'
}

export function PollForm({ template, existingPoll, mode = 'edit' }: PollFormProps) {
  const isQuickCreate = mode === 'quick'
  const isEditing = !!existingPoll

  // Quick Create forces simple poll type and restrictive defaults
  const [pollType, setPollType] = useState<PollType>(
    isQuickCreate ? 'simple' : (existingPoll?.pollType as PollType) ?? template?.pollType ?? 'simple'
  )
  const [allowVoteChange, setAllowVoteChange] = useState(
    isQuickCreate ? false : existingPoll?.allowVoteChange ?? true
  )
  const [showLiveResults, setShowLiveResults] = useState(
    isQuickCreate ? false : existingPoll?.showLiveResults ?? false
  )
  // ...

  return (
    <Card>
      {/* ... question, description ... */}

      {/* Poll Type Toggle -- hidden in Quick Create */}
      {!isQuickCreate && (
        <div className="space-y-2">
          <Label>Poll Type</Label>
          {/* ... toggle ... */}
        </div>
      )}

      {/* Options -- always visible, but camera icon always shown */}
      <OptionList
        options={options}
        onChange={setOptions}
        pollId={existingPoll?.id}  // null in create mode -> triggers draft pattern
        showImageUpload={true}     // New prop: always show camera icons
      />

      {/* Settings -- hidden in Quick Create */}
      {!isQuickCreate && (
        <div className="space-y-3 rounded-lg border p-3">
          {/* ... settings toggles ... */}
        </div>
      )}
    </Card>
  )
}
```

### Example 2: OptionImageUpload with Draft Pattern
```typescript
// Modified option-image-upload.tsx
interface OptionImageUploadProps {
  pollId?: string | null  // null during creation -> uses 'draft'
  onImageUrl: (url: string) => void
  existingImageUrl?: string | null
  onRemove?: () => void
}

export function OptionImageUpload({ pollId, onImageUrl, existingImageUrl, onRemove }: OptionImageUploadProps) {
  const uploadPollId = pollId ?? 'draft'
  const uploadEndpoint = `/api/polls/${uploadPollId}/upload-url`

  // ... rest same as current, but with dashed-border square style:
  return (
    <button
      type="button"
      onClick={() => setModalOpen(true)}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-dashed text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
      title="Add image"
    >
      <Camera className="h-3.5 w-3.5" />
    </button>
  )
}
```

### Example 3: Template Chip Grid for Polls
```typescript
// Inside PollForm (quick mode) or a sub-component
const CATEGORY_COLORS: Record<string, string> = {
  'Icebreakers': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Classroom Decisions': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Academic Debates': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Fun & Trivia': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'Feedback': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

<div className="space-y-2">
  <h2 className="text-sm font-medium text-muted-foreground">Start from a template</h2>
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
    {POLL_TEMPLATES.map((t) => {
      const isSelected = selectedTemplate?.id === t.id
      const colorClass = CATEGORY_COLORS[t.category] ?? 'bg-gray-100 text-gray-700 ...'
      return (
        <button
          key={t.id}
          type="button"
          onClick={() => handleTemplateSelect(isSelected ? null : t)}
          className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-colors ${
            isSelected
              ? 'border-primary ring-1 ring-primary'
              : 'border-transparent hover:border-primary/30'
          }`}
        >
          <span className="text-xs font-medium line-clamp-2">{t.question}</span>
          <Badge variant="secondary" className={colorClass}>{t.category}</Badge>
        </button>
      )
    })}
  </div>
</div>
```

### Example 4: Modified Option Row Layout
```typescript
// In option-list.tsx -- new element order
<div className="flex items-center gap-2 rounded-md border px-3 py-2">
  {/* 1. Drag handle */}
  {!disabled && <GripVertical className="h-4 w-4 shrink-0 cursor-grab" />}

  {/* 2. Position badge */}
  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted font-mono text-xs font-medium">
    {index + 1}
  </span>

  {/* 3. Camera icon (always visible, BEFORE text input) */}
  {!disabled && (
    <OptionImageUpload
      pollId={pollId}
      existingImageUrl={option.imageUrl ?? null}
      onImageUrl={(url) => updateOptionImage(option.id, url)}
      onRemove={() => removeOptionImage(option.id)}
    />
  )}

  {/* 4. Option text input */}
  <Input value={option.text} onChange={...} />

  {/* 5. Remove button */}
  {!disabled && <Button variant="ghost" ...><X /></Button>}
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Templates above mode toggle (category tabs) | Templates inside Quick Create (flat chips) | Phase 34 | Simpler browsing, matches bracket pattern |
| Image upload only in edit mode (requires pollId) | Draft upload during creation | Phase 34 | Enables images before poll exists |
| Free aspect ratio crop for poll images | Square (1:1) aspect ratio crop | Phase 34 | Consistent visual language with brackets |
| "Add Image" text button | Dashed-border camera icon square | Phase 34 | Matches bracket entrant visual style |
| Quick Create defaults to true for allowVoteChange | Quick Create defaults to false | Phase 34 | More opinionated quick path |

## Open Questions

1. **OptionList prop changes for always-showing image upload**
   - What we know: Currently `pollId` must be truthy for OptionImageUpload to render. Need to change this so camera icons always appear.
   - What's unclear: Whether to pass `pollId={null}` to trigger draft pattern, or add a separate boolean prop like `showImageUpload`.
   - Recommendation: Change `pollId` to be optional in OptionList and OptionImageUpload. When falsy, use `'draft'` fallback (same as bracket pattern). This is the simplest change.

2. **Template state management when inside Quick Create**
   - What we know: Currently template state is in the parent page. Templates are moving inside Quick Create tab.
   - What's unclear: Should PollForm manage its own template selection internally, or should the page still pass it as a prop?
   - Recommendation: Move template selection state inside PollForm when `mode='quick'`. PollForm imports POLL_TEMPLATES directly. The page no longer needs template state.

3. **18 templates as flat chips may be visually dense**
   - What we know: Bracket has 10 curated topics. Polls have 18 templates.
   - What's unclear: Whether 18 chips in a flat grid will feel overwhelming.
   - Recommendation: Use smaller chip styling (text-xs, line-clamp-2 for question text) and 4-column grid. The category badge on each chip provides visual grouping without needing tabs.

## Sources

### Primary (HIGH confidence)
- **Source code inspection** - All findings verified by reading actual source files:
  - `src/components/poll/poll-form.tsx` - Current Quick Create form structure
  - `src/components/poll/poll-wizard.tsx` - Current Step-by-Step wizard with template picker
  - `src/components/poll/option-list.tsx` - Option row layout and drag-drop
  - `src/components/poll/option-image-upload.tsx` - Current image upload (edit-only)
  - `src/components/bracket/bracket-creation-page.tsx` - Default tab pattern
  - `src/components/bracket/bracket-quick-create.tsx` - Chip grid topic browsing pattern
  - `src/components/bracket/entrant-list.tsx` - Entrant row layout with camera icon
  - `src/components/bracket/entrant-image-upload.tsx` - Draft upload pattern, dashed-border icon
  - `src/components/shared/image-upload-modal.tsx` - aspectRatio prop support
  - `src/app/api/polls/[pollId]/upload-url/route.ts` - Poll upload endpoint
  - `src/app/api/brackets/[bracketId]/upload-url/route.ts` - Bracket upload endpoint (reference)
  - `src/app/(dashboard)/polls/new/page.tsx` - Current creation page structure
  - `src/lib/poll/templates.ts` - 18 templates, 5 categories
  - `src/actions/poll.ts` - createPoll, updatePoll server actions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and in use; no new dependencies needed
- Architecture: HIGH - Every pattern has a working reference in the bracket side of the codebase
- Pitfalls: HIGH - Identified from direct code reading of dual-purpose components
- Code examples: HIGH - Derived from actual source code patterns in the repository

**Research date:** 2026-03-01
**Valid until:** 2026-03-31 (stable -- internal codebase patterns, no external API changes)
