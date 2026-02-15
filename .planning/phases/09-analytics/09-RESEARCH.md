# Phase 9: Analytics - Research

**Researched:** 2026-02-15
**Domain:** Teacher analytics dashboard, CSV export, predictive scoring detail
**Confidence:** HIGH

## Summary

Phase 9 adds analytics views for teachers to understand participation and voting patterns across their brackets and polls, plus CSV export for Pro+ users and detailed predictive scoring breakdowns for Pro Plus users. The good news is that nearly all the data infrastructure already exists -- Vote, PollVote, Prediction, and the scoring engine are fully built. This phase is primarily about building **read-only aggregation queries** in the DAL layer and **UI components** to display the data, plus a **client-side CSV generation** flow using PapaParse (already installed).

The project does NOT use any chart library (no recharts, nivo, d3, etc.). Existing visualizations (poll bar chart, donut chart, prediction stats bars) are custom-built with Tailwind CSS and Motion (Framer Motion). This phase should follow the same pattern -- CSS-based bars and percentage displays rather than adding a chart library dependency.

**Primary recommendation:** Build analytics as a new `/analytics` route group in the dashboard with per-bracket and per-poll detail views. Aggregate data server-side via new DAL functions. Use PapaParse `unparse()` for client-side CSV generation with `Blob` + download link pattern. Gate CSV export behind `canAccess(tier, 'csvExport')` and predictive detail behind a Pro Plus check.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PapaParse | 5.5.3 | CSV generation via `Papa.unparse()` | Already installed with `@types/papaparse`; used for CSV import in bracket creation |
| Prisma | v7 | Aggregation queries (groupBy, count, etc.) | Existing DAL pattern; groupBy already used in vote.ts and poll.ts |
| Tailwind CSS | (project ver) | Data visualization bars, progress indicators | Matches existing bar-chart.tsx / donut-chart.tsx patterns |
| Motion | 12.29.x | Animated transitions for data reveal | Matches existing AnimatedBarChart component |
| Lucide React | 0.563.x | Analytics icons (BarChart3, Download, Users, etc.) | Project standard icon library |
| Radix UI | (project ver) | Dialog for export confirmation, dropdowns for filters | Already installed: dialog, dropdown-menu |

### Supporting (No New Installs Required)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | (project ver) | Validate server action inputs for analytics queries | Pattern from existing actions/*.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PapaParse unparse | Manual CSV string building | PapaParse handles escaping, quoting, special chars correctly; already a dependency |
| Custom CSS bars | Recharts / Chart.js | Adding a chart library would be inconsistent with existing poll visualizations; custom bars are simpler and lighter |
| Server-side CSV generation | Client-side with PapaParse | Client-side avoids server memory/timeout for large exports; Blob download is the standard pattern |

**Installation:**
```bash
# No new packages needed -- all dependencies are already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/(dashboard)/
    analytics/
      page.tsx                    # Analytics hub: list of brackets/polls with summary stats
    brackets/[bracketId]/
      analytics/
        page.tsx                  # Bracket-specific analytics (server component)
    polls/[pollId]/
      analytics/
        page.tsx                  # Poll-specific analytics (server component)
  lib/dal/
    analytics.ts                  # New DAL file: all analytics aggregation queries
  actions/
    analytics.ts                  # New server actions: CSV export data fetching
  components/
    analytics/
      participation-summary.tsx   # Reusable participation count + rate card
      vote-distribution.tsx       # Vote distribution bars (bracket matchups)
      poll-vote-distribution.tsx  # Vote distribution bars (poll options)
      csv-export-button.tsx       # Tier-gated CSV download button
      scoring-detail-table.tsx    # Predictive bracket per-student scoring breakdown
      analytics-nav.tsx           # Tab-like navigation between analytics views
```

### Pattern 1: DAL Aggregation Functions
**What:** Server-side aggregation using Prisma groupBy/count/aggregate
**When to use:** All analytics data fetching
**Example:**
```typescript
// Source: Existing pattern from src/lib/dal/vote.ts (getVoteCountsForMatchup)
export async function getBracketParticipation(bracketId: string) {
  // Count unique participants who voted in any matchup of this bracket
  const uniqueVoters = await prisma.vote.findMany({
    where: { matchup: { bracketId } },
    select: { participantId: true },
    distinct: ['participantId'],
  })

  // Count total votes across all matchups
  const totalVotes = await prisma.vote.count({
    where: { matchup: { bracketId } },
  })

  // Count total matchups (non-bye)
  const totalMatchups = await prisma.matchup.count({
    where: { bracketId, isBye: false },
  })

  return {
    uniqueParticipants: uniqueVoters.length,
    totalVotes,
    totalMatchups,
  }
}
```

### Pattern 2: Client-Side CSV Generation
**What:** Generate CSV on the client using PapaParse unparse + Blob download
**When to use:** CSV export feature (Pro and above)
**Example:**
```typescript
// Source: PapaParse docs -- Papa.unparse() converts JS objects to CSV string
import Papa from 'papaparse'

function downloadCSV(data: Record<string, unknown>[], filename: string) {
  const csv = Papa.unparse(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
```

### Pattern 3: Tier-Gated UI with Upgrade Prompt
**What:** Check feature access and show upgrade prompt for gated features
**When to use:** CSV export button (Pro+), predictive scoring detail (Pro Plus)
**Example:**
```typescript
// Source: Existing pattern from src/lib/gates/features.ts
import { canAccess } from '@/lib/gates/features'
import type { SubscriptionTier } from '@/lib/gates/tiers'

// In server component or server action:
const csvAccess = canAccess(teacher.subscriptionTier as SubscriptionTier, 'csvExport')
// Pass csvAccess.allowed to client component for conditional rendering

// In client component:
{csvAccess.allowed ? (
  <CSVExportButton data={analyticsData} />
) : (
  <UpgradePrompt feature="CSV Export" upgradeTarget={csvAccess.upgradeTarget} />
)}
```

### Pattern 4: Server Component Data Loading (Existing Pattern)
**What:** Fetch data in server component, serialize, pass to client
**When to use:** All analytics pages
**Example:**
```typescript
// Source: Existing pattern from src/app/(dashboard)/brackets/[bracketId]/page.tsx
export default async function BracketAnalyticsPage({
  params,
}: {
  params: Promise<{ bracketId: string }>
}) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) redirect('/login')

  const { bracketId } = await params
  const [bracket, participation, voteDistribution] = await Promise.all([
    getBracketWithDetails(bracketId, teacher.id),
    getBracketParticipation(bracketId),
    getBracketVoteDistribution(bracketId),
  ])

  if (!bracket) redirect('/brackets')

  return (
    <BracketAnalyticsView
      bracket={serialized}
      participation={participation}
      voteDistribution={voteDistribution}
      canExportCSV={canAccess(teacher.subscriptionTier as SubscriptionTier, 'csvExport').allowed}
    />
  )
}
```

### Anti-Patterns to Avoid
- **Fetching all votes client-side:** Never send raw vote records to the client for aggregation. Always aggregate server-side in DAL functions using Prisma groupBy/count.
- **Server-side CSV file generation:** Don't write CSV files to the server filesystem or use streaming responses. Use client-side Blob generation -- simpler, no server state, no cleanup needed.
- **Adding a chart library for simple bars:** The project uses custom CSS/Tailwind bars everywhere. Don't add recharts or chart.js for percentage bars that can be done with `width: ${pct}%`.
- **Querying without teacher ownership checks:** Always filter by teacherId in analytics queries to enforce data isolation.
- **Separate analytics database/cache:** The data volumes here (classroom scale, not enterprise) don't warrant caching layers. Direct Prisma queries are fine.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV string generation | Manual string concatenation with commas | `Papa.unparse(data)` | Handles quoting, escaping special characters, commas in values, newlines in values |
| Percentage calculation with edge cases | Custom math for percentages | Shared utility function with `Math.round((count / total) * 100)` guarded by `total > 0 ? ... : 0` | Division by zero is a common analytics bug |
| File download trigger | Manual anchor tag creation | Reusable `downloadCSV()` utility wrapping Blob + createObjectURL | Memory leak if URL not revoked; repetitive boilerplate |
| Feature gating for analytics tiers | Ad-hoc `if (tier === 'pro')` checks | Existing `canAccess(tier, 'csvExport')` system | Single source of truth; upgrade prompts built in |

**Key insight:** The hardest part of analytics is usually data modeling and aggregation queries, not the UI. This project already has excellent data models (Vote, PollVote, Prediction with proper foreign keys and indexes). The analytics phase is primarily query + UI work.

## Common Pitfalls

### Pitfall 1: N+1 Queries in Matchup Vote Distribution
**What goes wrong:** Fetching vote counts per matchup in a loop instead of batching
**Why it happens:** Natural to iterate matchups and call `getVoteCountsForMatchup()` for each
**How to avoid:** Build a single DAL function that fetches all vote distributions for a bracket in one query using `groupBy` with `matchupId` in the `by` clause
**Warning signs:** Slow analytics page load on brackets with many matchups

### Pitfall 2: CSV Export with Unescaped Data
**What goes wrong:** Entrant names or poll options containing commas, quotes, or newlines breaking CSV format
**Why it happens:** Building CSV strings manually instead of using a proper library
**How to avoid:** Always use `Papa.unparse()` -- it handles all CSV edge cases correctly
**Warning signs:** Corrupted CSV files when data contains special characters

### Pitfall 3: Memory Bloat on Large Exports
**What goes wrong:** Loading all vote records into memory for CSV export
**Why it happens:** Fetching raw votes instead of pre-aggregated data
**How to avoid:** Aggregate on the server (DAL layer returns summary data), then generate CSV on the client from the summary. For a classroom app, data volumes are small (max hundreds of students), so this is not a critical risk, but good hygiene.
**Warning signs:** Slow export or browser tab crash

### Pitfall 4: Forgetting Round-Robin and Predictive Bracket Types
**What goes wrong:** Analytics only work for single-elimination brackets
**Why it happens:** Bracket types have different data shapes (round-robin uses roundRobinRound, predictive has Prediction model instead of Vote)
**How to avoid:** Design DAL functions to handle all bracket types. Consider a switch/dispatch pattern:
- Single elimination / double elimination: aggregate Vote records
- Round robin: aggregate Vote records, include standings
- Predictive: aggregate Prediction records, include scoring via `scoreBracketPredictions()`
**Warning signs:** Empty analytics for round-robin or predictive brackets

### Pitfall 5: Tier Gate Race Condition on CSV Export
**What goes wrong:** User downgrades subscription mid-session, still exports CSV
**Why it happens:** Checking tier on page load but not re-checking when export is triggered
**How to avoid:** Re-check tier in the server action that fetches export data, not just in the UI
**Warning signs:** Free-tier users successfully exporting CSV

### Pitfall 6: Confusing Participation vs. Votes vs. Unique Voters
**What goes wrong:** Displaying misleading numbers -- e.g., showing "total votes" when user expects "unique participants"
**Why it happens:** Different metrics for different bracket types
**How to avoid:** Clearly define and label metrics:
- **Unique Participants**: Count of distinct participantId values who cast at least one vote/prediction
- **Total Votes**: Sum of all vote records (a student votes once per matchup, so total = sum across matchups)
- **Participation Rate**: unique participants / total session participants (from StudentParticipant count)
**Warning signs:** Numbers that seem impossibly high or low

## Code Examples

Verified patterns from the existing codebase:

### Aggregation: Bracket Vote Distribution (All Matchups)
```typescript
// Pattern from: src/lib/dal/vote.ts (getVoteCountsForMatchup)
// Extended to batch all matchups in one query
export async function getBracketVoteDistribution(bracketId: string) {
  const groups = await prisma.vote.groupBy({
    by: ['matchupId', 'entrantId'],
    where: { matchup: { bracketId } },
    _count: { id: true },
  })

  // Build nested map: matchupId -> entrantId -> count
  const distribution: Record<string, Record<string, number>> = {}
  for (const g of groups) {
    if (!distribution[g.matchupId]) distribution[g.matchupId] = {}
    distribution[g.matchupId][g.entrantId] = g._count.id
  }
  return distribution
}
```

### Aggregation: Poll Vote Summary
```typescript
// Pattern from: src/lib/dal/poll.ts (getSimplePollVoteCounts)
// Extended with unique voter count
export async function getPollAnalytics(pollId: string) {
  const [voteCounts, uniqueVoters, totalVotes] = await Promise.all([
    getSimplePollVoteCounts(pollId),
    prisma.pollVote.findMany({
      where: { pollId },
      select: { participantId: true },
      distinct: ['participantId'],
    }),
    prisma.pollVote.count({ where: { pollId, rank: 1 } }),
  ])

  return {
    voteCounts,
    uniqueParticipants: uniqueVoters.length,
    totalVotes,
  }
}
```

### CSV Export: Bracket Data
```typescript
// Client-side CSV generation using existing PapaParse
import Papa from 'papaparse'

interface BracketExportRow {
  matchup: string
  round: number
  entrant1: string
  entrant2: string
  winner: string
  entrant1Votes: number
  entrant2Votes: number
  totalVotes: number
}

function exportBracketCSV(rows: BracketExportRow[], bracketName: string) {
  const csv = Papa.unparse(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${bracketName.replace(/[^a-z0-9]/gi, '_')}_analytics.csv`
  link.click()
  URL.revokeObjectURL(url)
}
```

### Tier Gating: CSV Export Button
```typescript
// Pattern from: src/lib/gates/features.ts
// csvExport: free=false, pro=true, pro_plus=true
const access = canAccess(tier, 'csvExport')
// access.allowed: boolean
// access.reason: "csvExport requires pro plan"
// access.upgradeTarget: "pro"
```

### Predictive Scoring Detail (Existing Engine)
```typescript
// Source: src/lib/bracket/predictive.ts (scorePredictions)
// PredictionScore already contains per-round breakdown:
interface PredictionScore {
  participantId: string
  participantName: string
  totalPoints: number
  correctPicks: number
  totalPicks: number
  pointsByRound: Record<number, { correct: number; total: number; points: number }>
}
// scoreBracketPredictions() in src/lib/dal/prediction.ts returns PredictionScore[]
// The TeacherLeaderboard in prediction-leaderboard.tsx already shows expandable per-round breakdown
```

## Data Model Reference

### Key Models for Analytics

**Vote** (bracket matchup votes):
- `matchupId` -> `Matchup` (which has `bracketId`, `round`, `position`, `entrant1Id`, `entrant2Id`, `winnerId`)
- `participantId` -> `StudentParticipant` (has `funName`, `sessionId`)
- `entrantId` -> `BracketEntrant` (the choice)
- Unique constraint: `[matchupId, participantId]` (one vote per matchup per student)

**PollVote** (poll votes):
- `pollId` -> `Poll` (has `question`, `pollType`, `teacherId`)
- `participantId` -> `StudentParticipant`
- `optionId` -> `PollOption` (has `text`)
- `rank` -> Int (1 for simple polls, 1..N for ranked polls)
- Unique constraint: `[pollId, participantId, rank]`

**Prediction** (predictive bracket predictions):
- `bracketId`, `participantId`, `matchupId`, `predictedWinnerId`
- Unique constraint: `[bracketId, participantId, matchupId]`

### Existing DAL Functions to Reuse
| Function | File | Returns |
|----------|------|---------|
| `getVoteCountsForMatchup(matchupId)` | dal/vote.ts | `Record<entrantId, count>` |
| `getMatchupVoteSummary(matchupId)` | dal/vote.ts | `{ totalVotes, voteCounts }` |
| `getVoterParticipantIds(matchupId)` | dal/vote.ts | `string[]` of participantIds |
| `getSimplePollVoteCounts(pollId)` | dal/poll.ts | `Record<optionId, count>` |
| `getRankedPollVotes(pollId)` | dal/poll.ts | `{ votes, totalUniqueVoters }` |
| `scoreBracketPredictions(bracketId)` | dal/prediction.ts | `PredictionScore[]` with pointsByRound |
| `getAllMatchupPredictionStats(bracketId)` | dal/prediction.ts | Per-matchup prediction distribution |
| `getBracketWithDetails(bracketId, teacherId)` | dal/bracket.ts | Full bracket with entrants + matchups |
| `getPollByIdDAL(pollId)` | dal/poll.ts | Poll with options |

## Feature Gating Matrix

| Feature | Free | Pro | Pro Plus | Gate Key |
|---------|------|-----|----------|----------|
| View participation count | Yes | Yes | Yes | `basicAnalytics` (all true) |
| View vote distribution | Yes | Yes | Yes | `basicAnalytics` |
| CSV export | No | Yes | Yes | `csvExport` |
| Predictive scoring detail | N/A | N/A | Yes | Custom check: `tier === 'pro_plus'` |

Note: `basicAnalytics` is `true` for all tiers in TIER_LIMITS. The predictive scoring detail (ANLYT-04) is gated to Pro Plus because predictive brackets themselves are only available on Pro Plus. The gate should check `tier === 'pro_plus'` directly since there is no dedicated TIER_LIMITS key for this feature.

## CSV Export Data Shapes

### Bracket Export (Per-Matchup)
```
Round, Position, Entrant 1, Entrant 2, Winner, Entrant 1 Votes, Entrant 2 Votes, Total Votes
1, 1, "Team A", "Team B", "Team A", 15, 8, 23
1, 2, "Team C", "Team D", "Team D", 10, 12, 22
```

### Poll Export (Per-Option)
```
Option, Votes, Percentage
"Pizza", 15, 42%
"Tacos", 12, 33%
"Burgers", 9, 25%
```

### Predictive Bracket Export (Per-Student)
```
Rank, Student Name, Total Points, Correct Picks, Total Picks, Accuracy, R1 Points, R2 Points, R3 Points
1, "FunkyPanda", 12, 7, 7, 100%, 4, 4, 4
2, "CoolBear", 9, 6, 7, 86%, 3, 4, 2
```

## UI/UX Patterns

### Navigation Approach
The analytics views should be accessible from:
1. **Per-bracket detail page** -- add an "Analytics" tab or link on the existing bracket detail page
2. **Per-poll detail page** -- add an "Analytics" tab or link on the existing poll detail page
3. **Optional: Analytics hub** -- a central `/analytics` page listing all brackets/polls with summary stats

Recommendation: Start with per-bracket and per-poll analytics links (most natural teacher flow), add the hub page as a central entry point.

### Tab-Like Navigation (No Radix Tabs)
The project does NOT have `@radix-ui/react-tabs` installed. Tab-like UI is implemented with custom buttons and conditional rendering (see `region-bracket-view.tsx`). Follow this pattern rather than installing a new dependency.

### Visualization Components
Reuse the existing patterns:
- **Horizontal bar chart**: Follow `AnimatedBarChart` from `bar-chart.tsx` (CSS width + Motion animation)
- **Percentage bars**: Follow `MatchupPredictionStats` pattern from `prediction-leaderboard.tsx`
- **Summary cards**: Follow the `ui/card.tsx` component for stat cards (participation count, total votes, etc.)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-generated CSV files | Client-side Blob generation | Standard practice | No server file cleanup, no streaming complexity |
| Separate analytics service | In-app Prisma aggregation | N/A for this scale | Keeps architecture simple for classroom-scale data |
| Chart.js/D3 for all charts | Custom CSS/Tailwind bars | Project convention | Lighter bundle, consistent with existing components |

**Deprecated/outdated:**
- Nothing deprecated in the existing stack affects this phase.

## Open Questions

1. **Analytics Hub Page vs. Inline Only**
   - What we know: Success criteria focus on per-bracket and per-poll analytics views
   - What's unclear: Whether a central analytics hub page (`/analytics`) is needed or if per-activity analytics links suffice
   - Recommendation: Build per-bracket and per-poll analytics views first (plan 09-01/09-02). An analytics hub can be added as part of the dashboard UI plan (09-02) as a central entry point.

2. **Ranked Poll Analytics**
   - What we know: Ranked polls use Borda scoring; the `RankedLeaderboard` component and `bordaCalculation` already exist
   - What's unclear: What ranked poll analytics should show beyond simple vote counts (Borda scores by option, voter distribution across ranks?)
   - Recommendation: Show both the raw rank distribution AND Borda scores. The Borda calculation is already implemented (`src/lib/poll/borda.ts`).

3. **Historical Analytics vs. Live Analytics**
   - What we know: Analytics are for completed or in-progress brackets/polls
   - What's unclear: Whether analytics should update in real-time while a bracket/poll is live, or just show a static snapshot
   - Recommendation: Show static snapshot loaded on page visit (server component pattern). Real-time updates are already handled by the live dashboard during active sessions. Analytics is for review after the fact.

## Sources

### Primary (HIGH confidence)
- Project codebase: `src/lib/dal/vote.ts` -- existing vote aggregation patterns
- Project codebase: `src/lib/dal/poll.ts` -- existing poll vote aggregation
- Project codebase: `src/lib/dal/prediction.ts` -- existing prediction scoring with pointsByRound
- Project codebase: `src/lib/bracket/predictive.ts` -- pure scoring engine with round breakdown
- Project codebase: `src/lib/gates/tiers.ts` -- TIER_LIMITS with csvExport and basicAnalytics
- Project codebase: `src/lib/gates/features.ts` -- canAccess() gate function
- Project codebase: `src/lib/bracket/csv-parser.ts` -- PapaParse already used for CSV import
- Project codebase: `src/components/bracket/prediction-leaderboard.tsx` -- existing teacher leaderboard with per-round breakdown
- Project codebase: `src/components/poll/bar-chart.tsx` -- custom animated bar chart pattern
- PapaParse v5.5.3 installed with @types/papaparse -- `Papa.unparse()` confirmed available

### Secondary (MEDIUM confidence)
- PapaParse docs: `unparse()` accepts array of objects and returns CSV string with proper escaping

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use; no new dependencies
- Architecture: HIGH -- follows existing DAL/server-component/client-component patterns exactly
- Data model: HIGH -- all models, relations, indexes, and existing DAL functions thoroughly reviewed
- Pitfalls: HIGH -- based on concrete patterns observed in the codebase
- CSV export: HIGH -- PapaParse unparse confirmed in installed version, types available

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (stable -- no fast-moving dependencies)
