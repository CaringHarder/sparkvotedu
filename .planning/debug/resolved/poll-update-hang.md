---
status: diagnosed
trigger: "Poll update button hangs in Updating state"
created: 2026-01-31T12:00:00Z
updated: 2026-01-31T12:00:00Z
---

## Current Focus

hypothesis: setIsSubmitting(false) is never called on the successful update path
test: Trace all code paths that set isSubmitting back to false
expecting: Missing reset on success path for update (but not create, since create navigates away)
next_action: N/A -- root cause confirmed

## Symptoms

expected: Teacher clicks "Update Poll", button shows spinner briefly, then poll updates and button returns to normal
actual: Button shows "Updating..." with spinner and stays stuck indefinitely. The poll IS updated in the database (action succeeds), but the UI never recovers.
errors: No errors displayed. No console errors. The action completes successfully.
reproduction: 1) Open a draft poll detail page. 2) Edit any field (question, description, etc). 3) Click "Update Poll". 4) Button shows "Updating..." forever.
started: Since poll edit feature was implemented (always broken in edit mode)

## Eliminated

(none -- root cause found on first hypothesis)

## Evidence

- timestamp: 2026-01-31T12:00:00Z
  checked: src/components/poll/poll-form.tsx handleSubmit function (lines 81-154)
  found: |
    The update (isEditing) path at lines 94-113 has this structure:
      1. setIsSubmitting(true) at line 84
      2. Call updatePoll server action at line 97
      3. If error: setError + setIsSubmitting(false) + return (lines 107-111)
      4. If success: router.refresh() (line 113) -- NO setIsSubmitting(false)
    The catch block at line 138-141 only handles thrown exceptions, not the normal success path.
  implication: On successful update, isSubmitting is never set back to false. The button stays disabled with spinner forever.

- timestamp: 2026-01-31T12:00:00Z
  checked: Comparison with create path (lines 114-137)
  found: |
    The create path has the same pattern -- no setIsSubmitting(false) on success.
    BUT create calls router.push(`/polls/${result.poll.id}`) which navigates to a
    new page, unmounting PollForm entirely. The stuck state is never observed.
    Update calls router.refresh() which re-fetches server components but preserves
    client component state (useState is retained across refresh when component
    identity is stable).
  implication: The bug only manifests in edit mode because router.refresh() does not unmount the component.

- timestamp: 2026-01-31T12:00:00Z
  checked: src/actions/poll.ts updatePoll function (lines 96-121)
  found: |
    The server action works correctly. It:
      1. Authenticates teacher
      2. Validates with Zod
      3. Calls updatePollDAL(pollId, teacherId, data)
      4. If DAL returns null: returns { error: 'Poll not found' }
      5. If DAL succeeds: revalidatePath + returns { success: true }
      6. If exception: returns { error: 'Failed to update poll' }
    All paths return a value. No hangs or infinite awaits in the action layer.
  implication: The server action is not the problem. It returns { success: true } correctly.

- timestamp: 2026-01-31T12:00:00Z
  checked: src/lib/dal/poll.ts updatePollDAL function (lines 115-140)
  found: |
    DAL correctly finds poll by id+teacherId, returns null if not found,
    otherwise calls prisma.poll.update and returns the updated poll.
    No issues here.
  implication: DAL layer is not the problem.

- timestamp: 2026-01-31T12:00:00Z
  checked: React behavior with router.refresh() and useState
  found: |
    router.refresh() in Next.js App Router re-fetches the server component tree
    and merges new data, but does NOT unmount or reset client component state.
    PollForm is rendered at a stable position in the tree:
      page.tsx (server) -> PollDetailView (client) -> PollForm (client)
    Since the component identity is preserved (same key, same position),
    React keeps all useState values intact across the refresh.
    Therefore isSubmitting=true persists after router.refresh() completes.
  implication: router.refresh() is the wrong mechanism to "complete" the update flow, or setIsSubmitting(false) must be called explicitly after it.

- timestamp: 2026-01-31T12:00:00Z
  checked: All three locations where setIsSubmitting(false) is called
  found: |
    Line 109: update error path only
    Line 130: create error path only
    Line 140: catch (exception) path only
    Zero calls on the update success path.
  implication: Definitive confirmation -- no code path resets isSubmitting on successful update.

## Resolution

root_cause: |
  In src/components/poll/poll-form.tsx, the handleSubmit function's update
  (isEditing) success path never calls setIsSubmitting(false).

  Line 84 sets isSubmitting to true. On successful update (lines 112-113),
  the code calls router.refresh() and then the function ends -- but
  setIsSubmitting(false) is never called. Since router.refresh() preserves
  client component state (it re-fetches server components without unmounting
  client components), the button remains stuck in the "Updating..." spinner
  state indefinitely.

  The create path has the same omission but is masked because router.push()
  navigates to a different page, unmounting PollForm entirely.

  The server action (src/actions/poll.ts updatePoll) and DAL
  (src/lib/dal/poll.ts updatePollDAL) both work correctly. The poll IS
  updated in the database. The bug is purely a client-side state management
  issue in the form component.

fix: (not applied -- diagnosis only)
verification: (not applied -- diagnosis only)

files_involved:
  - src/components/poll/poll-form.tsx (line 113): Missing setIsSubmitting(false) after router.refresh() on the update success path

suggested_fix_direction: |
  Add setIsSubmitting(false) after router.refresh() on line 113 of
  poll-form.tsx. This should go after the router.refresh() call since the
  refresh is not awaitable in a meaningful way (it triggers a background
  re-fetch). The simplest fix is a single line addition. Alternatively,
  restructure to use a try/finally pattern so setIsSubmitting(false)
  is always called regardless of which path executes.

  Secondary note: The create success path (line 134-136) also never calls
  setIsSubmitting(false), but this is benign because router.push()
  navigates away. Still, adding it would be defensive.
