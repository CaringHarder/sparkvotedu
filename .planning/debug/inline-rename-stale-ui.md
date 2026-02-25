---
status: diagnosed
trigger: "bracket and poll inline rename doesn't update the card title in the UI after saving"
created: 2026-02-25T00:00:00Z
updated: 2026-02-25T00:00:00Z
---

## Current Focus

hypothesis: CardList components initialize local state from props via useState(initialData) and never sync when server re-fetches new data after revalidation
test: Read card list components and trace data flow from server page -> CardList -> Card
expecting: CardList uses useState(brackets) with no useEffect sync, so router.refresh() fetches new server data but CardList ignores it
next_action: Confirmed -- report diagnosis

## Symptoms

expected: After inline rename, card title updates in the UI immediately
actual: Old name persists in the UI until full page refresh (F5)
errors: None -- rename succeeds server-side
reproduction: Rename any bracket or poll via inline rename; observe card still shows old name
started: Since CardList components were introduced with AnimatePresence

## Eliminated

(none -- root cause found on first hypothesis)

## Evidence

- timestamp: 2026-02-25T00:01:00Z
  checked: BracketCardList (bracket-card-list.tsx line 29)
  found: "const [items, setItems] = useState(brackets)" -- local state initialized from props, never synced
  implication: When router.refresh() causes Next.js to re-run the server component and pass new props, useState ignores subsequent prop changes (React behavior -- useState initial value is only used on mount)

- timestamp: 2026-02-25T00:01:00Z
  checked: PollCardList (poll-card-list.tsx line 23)
  found: "const [items, setItems] = useState(polls)" -- same pattern
  implication: Identical stale-state bug for polls

- timestamp: 2026-02-25T00:02:00Z
  checked: BracketCard handleRenameSave (bracket-card.tsx lines 83-98)
  found: After successful rename, calls router.refresh() which triggers server re-fetch, but parent CardList holds stale local state
  implication: router.refresh() correctly revalidates server data, but the client-side CardList never picks it up

- timestamp: 2026-02-25T00:02:00Z
  checked: PollCard handleRenameSave (poll-card.tsx lines 51-66)
  found: Same pattern -- router.refresh() after rename, but parent holds stale state
  implication: Same bug in both components

- timestamp: 2026-02-25T00:03:00Z
  checked: Server actions renameBracket (bracket.ts lines 311-340) and renamePoll (poll.ts lines 468-497)
  found: Both call revalidatePath correctly -- renameBracket revalidates /brackets and /dashboard; renamePoll revalidates /polls and /dashboard
  implication: Server-side revalidation is NOT the problem. The data IS refreshed server-side.

- timestamp: 2026-02-25T00:04:00Z
  checked: BracketCard title rendering (bracket-card.tsx line 155)
  found: Title renders {bracket.name} from the prop, NOT from renameValue local state
  implication: Even though renameValue holds the new name, the displayed title (when not in rename mode) comes from bracket.name which is the stale prop from the CardList's stale local state

- timestamp: 2026-02-25T00:04:00Z
  checked: PollCard title rendering (poll-card.tsx line 123)
  found: Title renders {poll.question} from the prop, NOT from renameValue
  implication: Same issue -- stale prop from parent overrides what the user typed

## Resolution

root_cause: BracketCardList and PollCardList initialize local state via useState(props) on mount and never sync with new props -- so when router.refresh() delivers fresh server data after rename, the CardList components ignore the updated props and continue rendering stale items.
fix: (not applied -- research only)
verification: (not applied -- research only)
files_changed: []
