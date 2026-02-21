---
status: resolved
trigger: "Poll image upload infrastructure exists but is completely non-functional because OptionImageUpload component is never imported or used in poll forms, and imageUrl is stripped from options payload in form submission"
created: 2026-02-16T00:00:00Z
updated: 2026-02-16T00:00:02Z
---

## Current Focus

hypothesis: CONFIRMED and FIXED - Three disconnection points prevented image upload from working
test: TypeScript compiles cleanly with zero errors
expecting: N/A - resolved
next_action: Archive session

## Symptoms

expected: Teachers can upload images for poll options during poll creation/editing, and students see those images when voting
actual: No image upload UI appears in poll forms. Even if it did, imageUrl is dropped from form submission payload.
errors: None - the feature just doesn't appear
reproduction: Go to /polls/new, create a poll - no image upload buttons visible on options
started: Never worked - component was built but never integrated into forms

## Eliminated

## Evidence

- timestamp: 2026-02-16T00:00:00Z
  checked: option-image-upload.tsx
  found: Complete, well-built upload component with signed URL flow. Requires pollId prop (only works after poll exists).
  implication: Component is ready to use. However, it needs a pollId which doesn't exist during poll CREATION. Images can only be added when editing an existing poll.

- timestamp: 2026-02-16T00:00:00Z
  checked: option-list.tsx (OptionItem interface + rendering)
  found: OptionItem interface already has optional imageUrl field. BUT the component renders no image upload UI - just text input, drag handle, position badge, and remove button.
  implication: OptionList needs to render OptionImageUpload for each option row when a pollId is available (edit mode).

- timestamp: 2026-02-16T00:00:00Z
  checked: poll-form.tsx lines 87-92 (handleSubmit payload)
  found: validOptions maps to only { text, position } - imageUrl is STRIPPED from the payload even though OptionItem has imageUrl field and existingPoll loads it (line 50).
  implication: Even if images were uploaded and stored on OptionItem, they'd be lost on submission.

- timestamp: 2026-02-16T00:00:00Z
  checked: poll-wizard.tsx lines 91-93 (handleSubmit payload)
  found: Same problem - validOptions = { text, position } only. imageUrl stripped.
  implication: Both forms have the same bug.

- timestamp: 2026-02-16T00:00:00Z
  checked: validation.ts pollOptionSchema
  found: Schema already accepts imageUrl: z.string().url().nullable().optional()
  implication: Server-side validation is READY. No changes needed.

- timestamp: 2026-02-16T00:00:00Z
  checked: poll.ts createPollDAL
  found: DAL accepts options with imageUrl and writes it to DB correctly.
  implication: DAL layer is READY. No changes needed.

- timestamp: 2026-02-16T00:00:00Z
  checked: simple-poll-vote.tsx and ranked-poll-vote.tsx
  found: Both already render option.imageUrl when present (image thumbnails in voting cards).
  implication: Student-side rendering is READY. No changes needed.

- timestamp: 2026-02-16T00:00:00Z
  checked: OptionImageUpload component requirements
  found: Requires pollId prop for signed URL upload. During poll CREATION, no pollId exists yet.
  implication: Image upload can only work in EDIT mode (existing polls). For new poll creation, images must be added after initial creation via edit flow. This is an acceptable UX constraint for v1.

- timestamp: 2026-02-16T00:00:01Z
  checked: updatePoll action and DAL
  found: Edit mode only updates poll-level fields (question, description, etc). No mechanism existed to update options (text, imageUrl, position) on an existing poll.
  implication: Even with image upload wired into the UI, the imageUrl changes would not persist. Needed new updatePollOptionsDAL and updatePollOptions server action.

## Resolution

root_cause: Four disconnection points prevented poll image upload from working: (1) OptionList component did not import or render OptionImageUpload, (2) poll-form.tsx stripped imageUrl from the options payload when creating polls, (3) poll-wizard.tsx stripped imageUrl from the options payload when creating polls, (4) No server action or DAL function existed to update options on an existing poll (edit mode only updated poll-level fields).

fix: |
  1. option-list.tsx: Added pollId prop, imported OptionImageUpload, added updateOptionImage/removeOptionImage callbacks, rendered OptionImageUpload per option row when pollId is provided (edit mode only)
  2. poll-form.tsx: Added imageUrl to validOptions payload, passed pollId to OptionList, imported and called new updatePollOptions action in edit path
  3. poll-wizard.tsx: Added imageUrl to validOptions payload
  4. poll.ts (DAL): Added updatePollOptionsDAL function for bulk updating option text/imageUrl/position
  5. poll.ts (actions): Added updatePollOptions server action with zod validation

verification: TypeScript compiles cleanly with zero errors (npx tsc --noEmit)

files_changed:
  - src/components/poll/option-list.tsx
  - src/components/poll/poll-form.tsx
  - src/components/poll/poll-wizard.tsx
  - src/lib/dal/poll.ts
  - src/actions/poll.ts
