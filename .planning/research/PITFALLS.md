# Pitfalls Research

**Domain:** Teacher activity controls, quick-create, and UX polish for an existing 80K LOC classroom voting platform
**Researched:** 2026-02-28
**Confidence:** HIGH (all pitfalls grounded in codebase analysis of actual state machines, broadcast patterns, and data model)

---

## Critical Pitfalls

### Pitfall 1: Pause/Resume Desynchronizes Optimistic Vote State on Student Devices

**What goes wrong:**
When a teacher pauses voting on a matchup, students who have the `useVote` hook mounted with an in-flight optimistic vote see their UI in a corrupted state. The `useOptimistic` hook in `use-vote.ts` shows the optimistic selection immediately, but the server action `castVote` returns `{ error: 'Matchup is not open for voting' }` because the matchup status was changed to `paused` between the optimistic set and the server response. The `useOptimistic` hook reverts when the transition ends, but the error message ("Matchup is not open for voting") is confusing to students -- they see their vote disappear with a technical error, not a "voting paused" message.

Worse: if the student's client is on the HTTP polling fallback (school WiFi blocking WebSockets), the status change broadcast is not received until the next 3-second poll interval. During that 3-second window, students can continue voting optimistically, accumulating multiple confusing reverts.

**Why it happens:**
Pause/resume changes the server-side matchup status but the client has no mechanism to preemptively block vote submission. The `castVote` action checks `matchup.status !== 'voting'` (line 42 of `actions/vote.ts`) which will reject votes when status is `paused`, but the client-side `useVote` hook has no awareness of the matchup status -- it only knows about the vote itself.

**How to avoid:**
1. Broadcast a `voting_paused` event on the `bracket:{bracketId}` channel when the teacher pauses. The `useRealtimeBracket` hook already handles `bracket_update` events and refetches state -- add `voting_paused` and `voting_resumed` to the event type union in `broadcast.ts` (line 80-89).
2. In the student voting components (`MatchupVoteCard`, `SimpleVotingView`), disable the vote buttons when the matchup status is not `voting`. The realtime hook already provides matchup status in `matchups` state.
3. Return a distinct error from `castVote` when status is `paused` (not `voting`): `{ error: 'Voting is currently paused', code: 'PAUSED' }`. The client can then show a friendly "Voting is paused by your teacher" message instead of a technical error.
4. Do NOT try to buffer or queue votes during pause -- this creates expectation mismatch and race conditions on resume.

**Warning signs:**
- Students see "Matchup is not open for voting" immediately after clicking to vote.
- Vote appears briefly then disappears (optimistic revert) with no explanation.
- More reports on polling-fallback networks (school WiFi) because of the 3-second delay.
- The `castVote` action's status check does not distinguish between `pending`, `paused`, and `decided` statuses.

**Phase to address:** Pause/Resume activity controls phase -- must implement broadcast + client status check together, not separately.

---

### Pitfall 2: Undo Round Cascading Failure -- Clearing a Winner That Has Already Propagated Multiple Levels

**What goes wrong:**
The existing `undoMatchupAdvancement` function in `advancement.ts` (line 79-129) correctly checks if the *next* matchup has votes before allowing undo. But it only checks ONE level ahead. Consider this scenario in an 8-team bracket:

1. Teacher advances R1M1 winner (Alice) -> Alice placed in R2M1 entrant1
2. Teacher advances R1M2 winner (Bob) -> Bob placed in R2M1 entrant2
3. Teacher opens voting on R2M1, students vote, teacher advances R2M1 winner (Alice) -> Alice placed in R3M1 (final) entrant1
4. Teacher wants to undo R1M1 (they realize Alice should not have won R1)

The undo check looks at R2M1's vote count. R2M1 has votes AND a winner AND the winner has already propagated to R3M1. The current code blocks the undo because `voteCount > 0` on the next matchup. This is correct behavior.

BUT: if the teacher instead tries to undo R2M1 first (step 3), the code checks R3M1 (the final). If R3M1 has no votes yet (just entrants placed), the undo proceeds. It clears Alice from R3M1 entrant1 and resets R2M1 to `voting` status. Now the teacher undoes R1M1 -- but R2M1 still has Alice's old votes AND Bob is still in R2M1 entrant2 slot. If the teacher now replaces Alice with Charlie in R1 and advances Charlie, Charlie goes to R2M1 entrant1 -- but the old votes in R2M1 were for Alice vs Bob, not Charlie vs Bob. Those stale votes produce wrong results.

For double-elimination brackets, this is exponentially worse because the loser from a WB matchup was also placed in a specific LB position. Undoing the WB matchup must also clear the loser placement in the LB, which may have already had its own advancement chain.

**Why it happens:**
The undo logic was designed for single-level reversal (undo the most recent action). Multi-level undo in a tree structure requires traversing and cleaning up the entire downstream subtree, not just the immediate next matchup. The check for "next matchup has votes" prevents the immediate cascade but does not address stale data left from partial undo sequences.

**How to avoid:**
1. When undoing a matchup, also delete all votes for the next matchup (since entrants are changing, votes for the old matchup are invalid). Add to the `$transaction`: `await tx.vote.deleteMany({ where: { matchupId: matchup.nextMatchupId } })` and reset next matchup status to `pending`.
2. For double-elimination undo: if the undone matchup is in the winners bracket, also clear the loser's placement in the corresponding losers bracket matchup. Use `computeLoserPlacement` to find where the loser was placed and null that slot.
3. Consider implementing "deep undo" that recursively clears the downstream tree: undo matchup -> delete votes on next -> if next has a winner, recursively undo next too. Gate this behind a confirmation dialog: "This will also undo Round 2 Match 1 and delete 15 votes. Continue?"
4. At minimum, display a warning in the UI if undoing will invalidate votes in downstream matchups, even if you block the undo.

**Warning signs:**
- Teacher undoes a matchup, then the next round shows vote counts from the previous matchup pairing.
- In DE brackets, a loser remains in a LB matchup after the WB matchup that placed them there was undone.
- Vote totals in a matchup don't add up to the participant count because votes were cast for an entrant who is no longer in the matchup.
- The `undoMatchupAdvancement` function clears `winnerId` and the next matchup's entrant slot, but does not touch `Vote` records.

**Phase to address:** Undo/Reopen phase -- must handle vote cleanup and DE loser placement reversal as part of the core undo implementation, not as a follow-up fix.

---

### Pitfall 3: Settings Edit Corrupts In-Progress Bracket State -- Changing Size or Type After Votes Exist

**What goes wrong:**
The existing `updateBracketEntrants` action (line 179-210 of `actions/bracket.ts`) allows replacing all entrants in a `draft` bracket. But "settings editing" for an active bracket opens a much more dangerous surface area:

1. **Changing bracket size** on an active bracket (e.g., 8 to 16) would require regenerating the entire matchup structure. All existing votes, advancement state, and entrant-matchup relationships become invalid.
2. **Changing bracket type** (e.g., SE to DE) requires a completely different matchup graph (losers bracket, grand finals). Existing data cannot be migrated.
3. **Changing viewingMode, showVoteCounts, votingTimerSeconds** on an active bracket is safe -- these are display preferences that don't affect state.
4. **Changing roundRobinPacing** from `round_by_round` to `all_at_once` mid-tournament changes which matchups are votable, potentially stranding votes in unopened matchups.

The dangerous pattern: a developer implements settings editing with a single `prisma.bracket.update()` call that accepts all fields, including `size` and `bracketType`. Since the Prisma update call does not validate against the bracket's lifecycle state, a malformed request could change structural fields on an active bracket.

**Why it happens:**
Display settings and structural settings live on the same database model (`Bracket`). A single "update settings" form or action that exposes all fields makes it easy to accidentally allow structural changes. The `updateBracketVotingSettings` action (line 275-333 of `bracket-advance.ts`) already demonstrates the correct pattern -- it only accepts `viewingMode`, `showVoteCounts`, `showSeedNumbers`, and `votingTimerSeconds`.

**How to avoid:**
1. **Hard partition** settings into two categories with separate server actions:
   - **Display settings** (safe to change anytime): `viewingMode`, `showVoteCounts`, `showSeedNumbers`, `votingTimerSeconds`, `roundRobinStandingsMode`, bracket `name`, `description`
   - **Structural settings** (only changeable in `draft` status): `size`, `bracketType`, `roundRobinPacing`, `roundRobinVotingStyle`, `predictiveMode`, `predictiveResolutionMode`
2. Add a status check at the top of the structural settings action: `if (bracket.status !== 'draft') return { error: 'Cannot change bracket structure after activation' }`.
3. Use separate Zod schemas for each action -- do not create a single schema that accepts both display and structural fields.
4. In the UI, gray out structural settings and show "Cannot be changed after bracket is started" tooltip for active/completed brackets.
5. Broadcast display setting changes so student views update in real time (especially `showVoteCounts` toggle).

**Warning signs:**
- A single `updateBracketSettings` server action that accepts `size` or `bracketType` without a status check.
- The edit form shows all fields as editable regardless of bracket status.
- No Zod schema distinction between display and structural fields.
- Teacher changes `showVoteCounts` on a live bracket but students don't see the change until they refresh.

**Phase to address:** Settings editing phase -- define the partition first, then build the UI and action.

---

### Pitfall 4: Quick-Create Skips Session Assignment -- Bracket/Poll Created Without a Session Cannot Receive Student Votes

**What goes wrong:**
The existing creation flow for brackets requires two steps: create the bracket, then assign it to a session via `assignBracketToSession`. Students can only vote on activities that belong to their session (the activity list API filters by `sessionId`). A "quick create" flow that streamlines creation could easily skip session assignment, creating a bracket that:
1. Does not appear in any student's activity grid (filtered out by missing `sessionId`).
2. Cannot receive votes because students are participants in a session, and the activity has no session link.
3. Shows no error -- the bracket exists and the teacher can view it, but students never see it.

The teacher then activates the bracket, shares the class code, and waits. Students join and see nothing. The teacher sees zero votes and assumes the system is broken.

**Why it happens:**
The multi-step creation wizard has an explicit "Select Session" step. Quick-create by definition removes steps. If session assignment is treated as an optional step that can be deferred, the most common use case (teacher wants students to vote right now) is broken by default.

**How to avoid:**
1. Quick-create must require session selection as a mandatory field, not an optional step. The simplest approach: if the teacher has exactly one active session, auto-assign. If they have multiple, show a session picker as part of the quick-create form (not as a separate step).
2. Validate at activation time: when `updateBracketStatus` transitions from `draft` to `active`, check if `sessionId` is set. If not, return `{ error: 'Assign this bracket to a class session before activating' }`.
3. Show a prominent warning badge on the bracket detail page if `sessionId` is null: "Not assigned to a session -- students cannot participate."
4. For quick-create, consider auto-creating a new session if none exists, with a generated code.

**Warning signs:**
- Quick-create form has no session field or makes it optional.
- Brackets created via quick-create have `sessionId: null` in the database.
- Teacher activates a bracket but zero students see it in their activity grid.
- The `useRealtimeActivities` hook returns an empty array even though the bracket is active.

**Phase to address:** Quick-create phase -- session assignment must be part of the creation flow, not a separate step.

---

### Pitfall 5: Real-Time Vote Indicators Create N+1 Query Storm -- Per-Student Tracking at Broadcast Frequency

**What goes wrong:**
Adding per-student vote indicators ("who has voted / who hasn't") to the teacher's live dashboard requires knowing which specific participants have voted on each matchup. The naive approach queries voter participant IDs on every vote broadcast:

```
30 students x 4 open matchups x 1 vote broadcast/second = 120 queries/second
```

The existing `getVoterParticipantIds` function (loaded in the live page server component, line 77-78 of `brackets/[bracketId]/live/page.tsx`) runs once at page load. But if vote indicator updates are triggered by every `vote_update` broadcast event, each update requires re-fetching voter IDs for all active matchups.

The `useRealtimeBracket` hook batches vote count updates every 2 seconds, but vote indicators need to show "StudentX just voted" in near-real-time for the teacher's awareness. If each indicator update triggers a full refetch from the API, the server handles `participantCount * activeMatchupCount / batchInterval` queries per batch.

**Why it happens:**
Vote counts are aggregated (one row per matchup: `groupBy entrantId, count`). Vote indicators are disaggregated (one query per matchup to get participant IDs who voted). The existing architecture broadcasts aggregate counts but not disaggregate participant info.

**How to avoid:**
1. **Include voter info in the broadcast payload**, not just counts. Modify `broadcastVoteUpdate` to include the participant ID who just voted: `payload: { matchupId, voteCounts, totalVotes, voterId: participantId }`. The client accumulates voter IDs locally without re-fetching.
2. **Maintain voter state client-side**: In `useRealtimeBracket`, add a `voterIds` state similar to `voteCounts`. When a `vote_update` arrives with a `voterId`, append it to the set for that matchup. On full refetch (structural change), replace with server data.
3. **Do NOT query voter IDs on every vote count update**. The initial load in the server component already provides the starting set. Subsequent additions come from broadcast payloads.
4. **Cap the indicator UI**: Show "15 of 30 voted" (count) not a full list of 30 avatar indicators. The count comes from `totalVotes` which is already broadcast. Only show individual indicators in the participation sidebar, not inline on every matchup card.
5. If full per-student tracking is needed: use the existing `initialVoterIds` from the server component as the base, and append new voter IDs from broadcast events. Do not re-fetch the full list unless a structural change (undo, reopen) occurs.

**Warning signs:**
- Adding a fetch call inside the `vote_update` broadcast handler in `useRealtimeBracket`.
- API response times increasing on the `/api/brackets/{id}/state` endpoint during active voting.
- The live dashboard server component (which already queries `getVoterParticipantIds` for all matchups) running on every client-side refetch.
- Teacher dashboard becoming sluggish during peak voting with 30+ students.

**Phase to address:** Real-time vote indicators phase -- design the data flow (broadcast payload vs. API fetch) before building the UI.

---

### Pitfall 6: Reopen a Completed Bracket Without Resetting the Completion Broadcast -- Students See Stale Celebration

**What goes wrong:**
If "reopen" means transitioning a `completed` bracket back to `active` (e.g., teacher wants to redo the final round), the `bracketCompleted` state in `useRealtimeBracket` (line 61) is already `true` on every connected student's device. Setting the bracket status back to `active` in the database does not clear this client-side state. Students who are still on the bracket page see the celebration screen or "bracket complete" UI. If they refresh, they get the active state -- but the realtime hook will never "un-complete" because there is no `bracket_uncompleted` event type.

Additionally, `hasShownRevealRef.current` is already `true` from the previous completion. Even if the student receives a structural update and refetches, the ref guard permanently blocks any future celebration. When the bracket re-completes, no celebration fires.

**Why it happens:**
The `bracketCompleted` state in `useRealtimeBracket` is a one-way flag (false -> true, never true -> false). The hook was designed for a one-directional lifecycle: draft -> active -> completed. Reopening introduces a lifecycle reversal that the hook does not model.

**How to avoid:**
1. Add a `bracket_reopened` event type to `BracketUpdateType` in `broadcast.ts`. When the teacher reopens, broadcast this event.
2. In `useRealtimeBracket`, handle `bracket_reopened` by setting `setBracketCompleted(false)` and triggering a full state refetch.
3. In the student voting components, reset `hasShownRevealRef.current = false` when a `bracket_reopened` event is detected. This allows the celebration to fire again when the bracket re-completes.
4. Also reset `revealState` and `showCelebration` to their initial values on reopen.
5. Consider whether "reopen" should clear all votes in the final round or preserve them. If votes are preserved but the winner is cleared, the teacher can re-evaluate. If votes are cleared, students need to re-vote -- broadcast `voting_opened` so the student voting UI re-enables.

**Warning signs:**
- `BracketUpdateType` union does not include `bracket_reopened`.
- `useRealtimeBracket` has no handler for reversing `bracketCompleted`.
- Student sees "bracket complete" screen after teacher reopens the bracket.
- Second completion never triggers celebration because `hasShownRevealRef.current` is permanently `true`.
- Testing only covers "complete once" flow, never "complete -> reopen -> complete again".

**Phase to address:** Reopen activity phase -- must extend the broadcast type union and the realtime hook lifecycle model before implementing the UI.

---

### Pitfall 7: Quick-Create Bypasses Feature Gates -- Free-Tier Teacher Creates Pro-Only Bracket Type

**What goes wrong:**
The existing `createBracket` action (line 46-113 of `actions/bracket.ts`) performs multiple feature gate checks: total bracket limit, draft limit, bracket type gate, and entrant count gate. Quick-create introduces a new code path. If the quick-create action calls the DAL directly (bypassing the action layer) or creates a simplified action that omits the feature gate checks, a free-tier teacher could create a double-elimination or predictive bracket that should be gated to Pro/Pro Plus tiers.

**Why it happens:**
Quick-create is built as a "simpler path" which tempts developers to skip "boilerplate" validation steps. The feature gate checks look like boilerplate but enforce the business model.

**How to avoid:**
1. Quick-create must reuse the existing `createBracket` server action, not create a parallel one. Pass the same schema-validated input, just with defaults pre-filled.
2. If a dedicated quick-create action is needed for a streamlined schema, it MUST include the same feature gate block: `canCreateBracket`, `canCreateDraftBracket`, `canUseBracketType`, `canUseEntrantCount`.
3. Add integration tests that verify quick-create with a free-tier teacher rejects DE and predictive bracket types.
4. Consider having quick-create call `createBracket` internally rather than duplicating validation logic.

**Warning signs:**
- A new `quickCreateBracket` server action that imports from `@/lib/dal/bracket` directly instead of calling `createBracket`.
- No `canUseBracketType` call in the quick-create path.
- Quick-create form shows bracket type options that should be gated for the current tier.
- Free-tier teacher can create DE brackets through quick-create but not through the full wizard.

**Phase to address:** Quick-create phase -- reuse existing action or copy all gate checks.

---

### Pitfall 8: Pause State Not Persisted -- Server Restart Loses Pause State, Votes Resume Silently

**What goes wrong:**
If pause is implemented by setting a server-side in-memory flag or by only broadcasting a client-side event without persisting the state, a server restart (Vercel redeploy, edge function cold start) resets the pause state. The matchup remains in `voting` status in the database. When the server comes back:
1. The `castVote` action's status check (`matchup.status !== 'voting'`) passes because the matchup is still `voting` in the DB.
2. Students can vote again even though the teacher thinks voting is paused.
3. The teacher's dashboard shows "paused" UI (from their local state) but votes are accumulating server-side.

**Why it happens:**
The existing matchup statuses are `pending`, `voting`, and `decided` (line 145 of the Prisma schema, `status String @default("pending")`). There is no `paused` status. Developers may implement pause as a client-side or in-memory concern rather than adding a new database status.

**How to avoid:**
1. Add `paused` as a valid matchup status in the database. This may not require a schema migration if the `status` field is a plain `String` (which it is -- line 145 of schema.prisma uses `String @default("pending")`).
2. Pause/resume transitions: `voting` -> `paused` (pause) and `paused` -> `voting` (resume). These are the only valid transitions for pause/resume.
3. Update the `castVote` status check: `if (matchup.status !== 'voting')` already handles this correctly because `paused` is not `voting`. The error message should be made specific: map `paused` status to a user-friendly error.
4. Add the status to the Zod validation schemas if matchup status is validated anywhere.
5. Broadcast the pause/resume event AND persist the status change in a single server action, atomically.

**Warning signs:**
- Pause implemented via a React state variable or an in-memory Map on the server.
- No database write when the teacher clicks "Pause."
- The `castVote` action does not reject votes for paused matchups after a server restart.
- Matchup status in the database does not change when pause is toggled.

**Phase to address:** Pause/Resume phase -- persistence must be the first implementation step, before broadcast or UI.

---

### Pitfall 9: Poll Quick-Create Defaults Cause "No Options" Validation Error

**What goes wrong:**
Polls require at least 2 options (enforced by `z.array(pollOptionSchema).min(2)` in `actions/poll.ts` line 43). Quick-create for polls needs to provide a way to enter options inline. If the quick-create form submits before the user enters options, or if it tries to create a poll with zero options and add them later, the server action rejects with "Invalid poll data."

Unlike brackets where entrants can be generated from curated topics, poll options are entirely user-defined. There is no "auto-generate" fallback for poll options.

**Why it happens:**
Quick-create prioritizes speed and minimal fields. Poll options are multi-input fields that resist simplification. Developers may defer option entry to an edit step, but the creation schema requires options at creation time.

**How to avoid:**
1. Quick-create for polls must include an inline option entry (minimum 2 fields, pre-populated with "Option 1" / "Option 2" placeholders).
2. Keep the existing `createPollWithOptionsSchema` validation -- do not relax the `.min(2)` constraint.
3. Consider a "Yes/No" quick-create template that pre-fills two options, and a "Custom" quick-create that requires the user to type at least 2 options.
4. The poll quick-create form should show add/remove option buttons with a minimum of 2 enforced in the UI, not just server-side.

**Warning signs:**
- Quick-create form has a poll option but no option entry fields.
- Poll creation fails on submit with "Invalid poll data" and the user sees no explanation.
- Quick-create tries to create a poll first and add options via `updatePollOptions` afterward.

**Phase to address:** Quick-create phase -- poll template must include inline options.

---

### Pitfall 10: Undo on Double-Elimination Does Not Reverse Loser Placement in Losers Bracket

**What goes wrong:**
The current `undoMatchupAdvancement` function (line 79-129 of `advancement.ts`) clears the winner from the current matchup and removes the propagated winner from the next matchup's entrant slot. But in double-elimination, advancing a WB matchup does TWO things: (1) places the winner in the next WB matchup, and (2) places the loser in a specific LB position via `computeLoserPlacement`. The undo function only reverses (1). The loser remains in the LB matchup.

If the teacher then advances a different winner, a different loser should go to that LB position. But the slot is already occupied by the previous loser. The new loser either fails to place (if there is a uniqueness constraint) or overwrites silently (if there isn't), leaving the old loser orphaned in the bracket.

**Why it happens:**
The `undoMatchupAdvancement` function uses `getSlotForPosition` to determine which slot to clear in the next matchup. But it does not know about the losers bracket placement. The losers bracket placement logic lives in `advanceDoubleElimMatchup` (line 332-560 of `advancement.ts`), not in the undo function.

**How to avoid:**
1. Create a dedicated `undoDoubleElimMatchup` function that mirrors the advancement logic:
   - Clear winner and reset status (same as SE undo).
   - Clear winner propagation to next WB matchup (same as SE undo).
   - Determine where the loser was placed using `computeLoserPlacement` and clear that LB slot.
   - If the LB matchup that received the loser has already been advanced, block the undo (or cascade).
2. Route undo through bracket type detection, similar to `advanceMatchup` which routes to `advanceDoubleElimMatchup` for DE brackets.
3. Check for votes in the LB destination matchup before allowing WB undo -- if students already voted on the LB matchup that includes the loser, the undo cascades further.

**Warning signs:**
- After undoing a WB matchup, the loser is still visible in a LB matchup.
- Re-advancing with a different winner causes two entrants in the same LB slot.
- The `undoAdvancement` action in `bracket-advance.ts` does not check `bracket.bracketType` before calling `undoMatchupAdvancement`.
- No LB matchup queries in the undo transaction.

**Phase to address:** Undo/Reopen phase -- DE-aware undo must be implemented alongside SE undo, not deferred.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single `updateSettings` action accepting all bracket fields | One action to maintain | Structural changes on active brackets corrupt state silently | Never -- split into display vs. structural actions |
| Quick-create as a separate server action bypassing `createBracket` | Simpler schema, faster dev | Duplicated feature gate logic that drifts out of sync | Never -- call existing action or extract shared validation |
| Pause as client-side state only (no DB persistence) | No migration needed | Server restart/redeploy silently unpauses all matchups | Never -- must persist to DB |
| Undo that only reverses winner propagation without vote cleanup | Simpler transaction | Stale votes produce wrong results after re-advancement | Acceptable for MVP ONLY if undo also resets matchup to `pending` (not `voting`), requiring teacher to re-open voting |
| Vote indicators via full API refetch on each broadcast | No broadcast schema changes | N+1 query storm at 30 students; dashboard becomes sluggish | Never at broadcast frequency -- acceptable for initial page load only |
| Reopen without extending `BracketUpdateType` | Fewer broadcast changes | Students see stale completion state, celebrations never re-fire | Never -- the broadcast type union must be extended |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Broadcast for pause/resume | Broadcasting only a generic `bracket_update` with a payload flag | Add `voting_paused` and `voting_resumed` as explicit `BracketUpdateType` values so the realtime hook can react specifically |
| Prisma matchup status for pause | Adding a `paused` boolean column instead of a status value | Use the existing `status` string field -- add `paused` as a valid value alongside `pending`, `voting`, `decided` |
| `useVote` hook during pause | Trying to add pause awareness to `useVote` | Keep `useVote` unchanged -- disable the vote button at the component level based on matchup status from `useRealtimeBracket`, not inside the hook |
| Quick-create + session assignment | Making session assignment a separate step | Quick-create must include session selection or auto-assignment inline; a bracket without a session is invisible to students |
| Settings edit broadcast | Not broadcasting display setting changes | When teacher toggles `showVoteCounts` on a live bracket, broadcast a `settings_changed` event so student views update without refresh |
| Undo votes cleanup | Using `deleteMany` outside the transaction | All undo mutations (clear winner, clear next slot, delete votes, clear LB slot for DE) must be in the same `prisma.$transaction` call |
| Vote indicator broadcast payload | Adding `voterId` to broadcast but not updating `broadcastVoteUpdate` signature | Update both `broadcastVoteUpdate` in `broadcast.ts` AND the `vote_update` handler in `useRealtimeBracket` to expect the new field |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Per-student vote indicator re-fetch on every broadcast | Dashboard lag, API response times spike | Include voter ID in broadcast payload; accumulate client-side; full refetch only on structural changes | 20+ students, 3+ active matchups |
| Undo cascade checking every downstream matchup for votes | Undo takes 2-5 seconds on a 16-team bracket | Limit undo to one level; block if next matchup has been advanced; show clear error message | 16+ entrant brackets with 3+ completed rounds |
| Quick-create form re-rendering on each entrant input | Keystroke lag when typing entrant names | Use uncontrolled inputs or debounce; do not validate on every keystroke | 8+ entrants in the quick-create form |
| Pause/resume broadcasting to 30+ student channels simultaneously | Broadcast latency spikes; some students see pause 1-2 seconds late | Supabase broadcast is pub/sub -- one broadcast message, subscribers pull. Not a concern unless doing per-student broadcasts | Not a real concern with Supabase broadcast architecture |
| Settings edit broadcasting `showVoteCounts` toggle on every click | Multiple rapid broadcasts if teacher toggles back and forth | Debounce settings broadcast (500ms); only broadcast final value | Teacher clicking toggle rapidly |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Pause/resume without teacher ownership check | Any authenticated teacher could pause another teacher's bracket | Copy pattern from `advanceMatchup`: verify `bracket.teacherId === teacher.id` |
| Quick-create accepting bracket type without feature gate | Free-tier teacher creates Pro-only bracket types | Reuse `canUseBracketType` gate check from existing `createBracket` action |
| Settings edit without status validation | Student or script changes structural settings on an active bracket | Server-side check: `if (bracket.status !== 'draft' && hasStructuralChanges) reject` |
| Undo without re-validating bracket ownership per operation | Crafted request could undo advancement on another teacher's bracket | Existing `undoAdvancement` action already checks ownership -- maintain this pattern |
| Vote indicator exposing participant identity to other students | Students can see WHO voted for what | Only expose voter IDs to the teacher dashboard; student view shows aggregate counts only |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Pause button with no visual indicator on student devices | Students tap to vote, nothing happens, they think the app is broken | Show a prominent "Voting is paused" overlay on student voting cards; animate pause icon |
| Undo confirmation dialog that lists technical details | Teacher sees "Clear winnerId on matchup abc-123?" | Show human-readable confirmation: "Undo: Alice winning against Bob in Round 1 Match 1? This will delete 12 votes on the next matchup." |
| Quick-create form that requires too many fields | Teacher abandons quick-create and uses the full wizard, defeating the purpose | Maximum 4 fields: name, bracket type, entrants (textarea or preset), session. Everything else gets sensible defaults |
| Settings edit form that shows all settings for all bracket types | Teacher sees `roundRobinPacing` settings on an SE bracket | Conditionally show settings relevant to the current bracket type only |
| Reopen button available on a bracket with no session | Teacher reopens a bracket that has no students attached | Gray out reopen if `sessionId` is null; show tooltip "Assign to a session first" |
| Real-time vote indicators showing exact student names | Privacy concern in some classroom contexts | Show counts ("15/30 voted") by default; expand to names only when teacher clicks |

---

## "Looks Done But Isn't" Checklist

- [ ] **Pause persists to DB:** Clicking "Pause" changes `matchup.status` to `paused` in the database, not just in client state. Verify: restart the dev server, matchup is still paused.
- [ ] **Pause broadcasts to students:** `voting_paused` event is broadcast on `bracket:{bracketId}` channel AND student voting components disable vote buttons when status is `paused`.
- [ ] **Undo clears downstream votes:** After undoing R1M1, votes for R2M1 are deleted. Verify: query `Vote` table for `matchupId = R2M1.id` returns zero rows.
- [ ] **Undo in DE clears LB placement:** After undoing a WB matchup, the loser is no longer in the corresponding LB matchup slot. Verify: LB matchup has `null` in the slot that was previously filled.
- [ ] **Settings edit partitioned:** Structural settings (size, type, pacing) are rejected for non-draft brackets. Verify: `POST` with `{ bracketId, size: 16 }` on an active bracket returns error.
- [ ] **Settings change broadcasts:** Changing `showVoteCounts` on a live bracket causes student views to update without refresh. Verify: toggle on teacher dashboard, student view changes within 3 seconds.
- [ ] **Quick-create assigns session:** Bracket created via quick-create has a non-null `sessionId`. Verify: check DB row after quick-create.
- [ ] **Quick-create checks feature gates:** Free-tier teacher cannot quick-create a DE bracket. Verify: attempt returns error.
- [ ] **Vote indicators don't re-fetch:** Vote indicator updates come from broadcast payload, not API calls. Verify: no `/api/brackets/{id}/state` fetch on vote_update events in the network tab.
- [ ] **Reopen resets client state:** After teacher reopens a completed bracket, students on the page see the active voting UI, not the celebration screen. Verify: student is on bracket page, teacher reopens, student sees matchup cards.
- [ ] **Reopen resets reveal ref:** `hasShownRevealRef.current` is reset to `false` on reopen. Verify: bracket completes again, celebration fires.
- [ ] **Poll quick-create has options:** Poll quick-create form includes at least 2 option fields. Verify: submit with 0 options is impossible from the UI.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Pause not persisted -- votes accumulated during "paused" state | MEDIUM | Query votes created during the pause window (between pause timestamp and resume timestamp); delete them; recount vote totals; rebroadcast |
| Undo left stale votes in downstream matchup | LOW | Delete votes for the affected matchup via DAL; reset matchup status to `pending`; rebroadcast state |
| Settings edit changed structural field on active bracket | HIGH | If caught early: restore from backup or manually rebuild matchup structure. If not caught: data corruption requires bracket recreation |
| Quick-create without session -- teacher activated bracket, no students can see it | LOW | Assign session via `assignBracketToSession` action; broadcast `activity_update` to the session; students see the bracket immediately |
| Vote indicators causing query storm | LOW | Revert to count-only display; add voter ID to broadcast payload; redeploy |
| Reopen with stale celebration state | LOW | Add `bracket_reopened` event handler to `useRealtimeBracket`; deploy; students who refresh see correct state immediately |
| Quick-create bypassed feature gates | MEDIUM | Audit brackets created via quick-create; archive any that violate tier limits; add gate checks and deploy |
| DE undo left orphaned loser in LB | MEDIUM | Manually null the loser's entrant slot in the LB matchup via DB query; delete any votes on that LB matchup; broadcast state update |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Pause desync with optimistic votes | Pause/Resume | Teacher pauses; student sees "Voting Paused" overlay; vote buttons disabled; no optimistic vote possible |
| Undo cascading failure (stale votes) | Undo/Reopen | Undo R1M1; R2M1 vote count is zero; R2M1 status is `pending` or `voting` with no stale entrant |
| Undo in DE not clearing LB | Undo/Reopen | Undo WB R1M1 in a DE bracket; LB R1 slot that had the loser is now null |
| Settings edit structural on active | Settings Editing | Attempt to change bracket type on active bracket; server returns error; UI grays out structural fields |
| Settings edit display broadcast | Settings Editing | Toggle `showVoteCounts` on live bracket; student view updates within 3 seconds without refresh |
| Quick-create without session | Quick-Create | Every bracket created via quick-create has `sessionId` set; students see it in activity grid |
| Quick-create without gates | Quick-Create | Free-tier teacher quick-create with DE type; action returns tier-limit error |
| Poll quick-create no options | Quick-Create | Poll quick-create form enforces minimum 2 options in UI and server validation |
| Vote indicator query storm | Vote Indicators | Network tab shows zero API fetches on `vote_update` events; voter data arrives via broadcast |
| Pause not persisted to DB | Pause/Resume | Restart dev server; matchup still in `paused` status; votes rejected |
| Reopen stale celebration | Undo/Reopen | Teacher reopens completed bracket; student page shows active voting, not celebration |

---

## Sources

- Codebase: `src/actions/vote.ts` -- `castVote` status check at line 42 rejects non-`voting` matchups; no `paused`-specific handling
- Codebase: `src/lib/bracket/advancement.ts` -- `undoMatchupAdvancement` at line 79-129 only checks one level ahead; no LB cleanup for DE
- Codebase: `src/lib/bracket/advancement.ts` -- `advanceDoubleElimMatchup` at line 332-560 places losers via `computeLoserPlacement`; undo does not reverse this
- Codebase: `src/actions/bracket.ts` -- `createBracket` at line 46-113 performs all feature gate checks; quick-create must replicate
- Codebase: `src/actions/bracket-advance.ts` -- `updateBracketVotingSettings` at line 275-333 demonstrates correct display-only settings partition
- Codebase: `src/lib/realtime/broadcast.ts` -- `BracketUpdateType` union at line 80-89 does not include pause/resume/reopen events
- Codebase: `src/hooks/use-realtime-bracket.ts` -- `bracketCompleted` is a one-way flag at line 61; no reversal mechanism for reopen
- Codebase: `src/hooks/use-vote.ts` -- `useOptimistic` hook at line 24 has no matchup status awareness
- Codebase: `prisma/schema.prisma` -- Matchup `status` field is a plain `String` at line 145; accepts any value including `paused`
- Codebase: `src/app/(dashboard)/brackets/[bracketId]/live/page.tsx` -- `getVoterParticipantIds` at line 77 runs once at server render, not on every vote
- [Supabase Broadcast Docs](https://supabase.com/docs/guides/realtime/broadcast) -- broadcast is pub/sub, one message to channel, all subscribers receive
- [Supabase Realtime Concepts](https://supabase.com/docs/guides/realtime/concepts) -- message delivery is best-effort, not guaranteed
- [Wizard Design Pattern (UX Planet)](https://uxplanet.org/wizard-design-pattern-8c86e14f2a38) -- quick-create should be 4 fields max; avoid wizard anti-pattern of too many steps
- [WebSocket Architecture Best Practices (Ably)](https://ably.com/topic/websocket-architecture-best-practices) -- state must be persisted server-side, not in WebSocket connection state

---
*Pitfalls research for: SparkVotEDU v1.4 teacher controls, quick-create, and UX polish*
*Researched: 2026-02-28*
