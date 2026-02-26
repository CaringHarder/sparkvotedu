---
status: diagnosed
trigger: "Inline rename on bracket and poll cards shows brief flash of old name after pressing Enter"
created: 2026-02-25T00:00:00Z
updated: 2026-02-25T00:00:00Z
---

## Current Focus

hypothesis: The input closes immediately (setIsRenaming(false)) reverting display to bracket.name/poll.question from props, which still holds the OLD value until router.refresh() completes and useEffect syncs new props
test: Trace the exact code path in handleRenameSave
expecting: Confirm that setIsRenaming(false) runs synchronously before the async server action completes
next_action: Document root cause and fix direction

## Symptoms

expected: After pressing Enter to confirm rename, the card should smoothly show the new name
actual: Old name flashes for ~1 second between input closing and new name appearing
errors: None (functional, purely visual)
reproduction: 1. Open bracket or poll list, 2. Right-click context menu -> Rename, 3. Type new name, 4. Press Enter, 5. Observe old name flash before new name appears
started: Since inline rename was implemented

## Eliminated

(none needed -- root cause identified on first hypothesis)

## Evidence

- timestamp: 2026-02-25T00:01:00Z
  checked: bracket-card.tsx handleRenameSave() lines 83-98
  found: |
    Line 84: setIsRenaming(false) -- runs SYNCHRONOUSLY, immediately hides input
    Line 85-88: early return if name unchanged
    Line 90-97: startTransition(async () => { await renameBracket(...); router.refresh() })
    The input disappears IMMEDIATELY. The h3 element on line 154 renders bracket.name (from PROPS).
    Props still hold the OLD name because router.refresh() hasn't completed yet.
  implication: There is a guaranteed window where isRenaming=false AND bracket.name still equals old value

- timestamp: 2026-02-25T00:02:00Z
  checked: poll-card.tsx handleRenameSave() lines 51-66
  found: |
    Identical pattern: setIsRenaming(false) on line 52, then startTransition with async renamePoll + router.refresh.
    The h3 on line 123 renders poll.question from props -- same stale prop problem.
  implication: Both components have the exact same bug with the exact same mechanism

- timestamp: 2026-02-25T00:03:00Z
  checked: bracket-card-list.tsx and poll-card-list.tsx useEffect prop sync
  found: |
    BracketCardList line 33-35: useEffect(() => { setItems(brackets) }, [brackets])
    PollCardList line 27-29: useEffect(() => { setItems(polls) }, [polls])
    These only fire AFTER router.refresh() completes, server re-renders, and new props arrive.
  implication: The list-level useEffect is not part of the problem -- it's the card-level prop reference that's stale

- timestamp: 2026-02-25T00:04:00Z
  checked: What renameValue state holds after setIsRenaming(false)
  found: |
    renameValue is set to the NEW name by the user typing in the input.
    After setIsRenaming(false), the input disappears, but renameValue still holds the correct new name.
    The h3 renders bracket.name (prop), NOT renameValue (local state).
  implication: The fix is trivial -- render renameValue instead of bracket.name/poll.question in the h3 when not renaming

## Resolution

root_cause: |
  handleRenameSave() calls setIsRenaming(false) synchronously before the async server action (renameBracket/renamePoll + router.refresh()) completes.
  When isRenaming becomes false, the component switches from the <input> to the <h3> element.
  The <h3> renders bracket.name / poll.question from PROPS, which still holds the OLD name.
  The new name only arrives after: server action completes -> router.refresh() triggers -> server re-renders page -> new props flow down -> useEffect syncs to local state.
  This creates a ~0.5-1s window where the old name is visible.

fix: (not applied -- research only)
verification: (not applied -- research only)
files_changed: []
