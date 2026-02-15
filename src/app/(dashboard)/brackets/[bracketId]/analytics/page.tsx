import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getBracketWithDetails } from '@/lib/dal/bracket'
import {
  getBracketParticipation,
  getBracketVoteDistribution,
  getPredictiveAnalytics,
} from '@/lib/dal/analytics'
import { ParticipationSummary } from '@/components/analytics/participation-summary'
import { VoteDistribution } from '@/components/analytics/vote-distribution'
import { PredictionLeaderboard } from '@/components/bracket/prediction-leaderboard'
import { UpgradePrompt } from '@/components/billing/upgrade-prompt'
import type { SubscriptionTier } from '@/lib/gates/tiers'

export default async function BracketAnalyticsPage({
  params,
}: {
  params: Promise<{ bracketId: string }>
}) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  const { bracketId } = await params

  const bracket = await getBracketWithDetails(bracketId, teacher.id)
  if (!bracket) {
    redirect('/brackets')
  }

  const isPredictive = bracket.bracketType === 'predictive'
  const tier = teacher.subscriptionTier as SubscriptionTier

  // Fetch analytics data in parallel
  const [participation, voteDistribution, predictiveData] = await Promise.all([
    getBracketParticipation(bracketId),
    getBracketVoteDistribution(bracketId),
    isPredictive ? getPredictiveAnalytics(bracketId) : Promise.resolve(null),
  ])

  // Calculate totalRounds for predictive leaderboard
  const effectiveSize = bracket.maxEntrants ?? bracket.size
  const totalRounds = Math.ceil(Math.log2(effectiveSize))

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div>
        <Link
          href={`/brackets/${bracketId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to bracket
        </Link>
        <h1 className="text-2xl font-bold">Analytics: {bracket.name}</h1>
      </div>

      {/* Participation Summary */}
      <ParticipationSummary
        uniqueParticipants={participation.uniqueParticipants}
        totalVotes={participation.totalVotes}
        totalMatchups={participation.totalMatchups}
        sessionParticipantCount={participation.sessionParticipantCount}
        type="bracket"
      />

      {/* Vote Distribution */}
      <VoteDistribution distribution={voteDistribution} />

      {/* Predictive Bracket: Leaderboard with per-round breakdown */}
      {isPredictive && predictiveData && (
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Prediction Scoring
          </h2>
          {tier === 'pro_plus' ? (
            <PredictionLeaderboard
              bracketId={bracketId}
              initialScores={predictiveData.scores}
              totalRounds={totalRounds}
              isTeacher={true}
            />
          ) : (
            <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
              <span>Predictive scoring detail requires Pro Plus.</span>
              <UpgradePrompt
                currentTier={tier}
                requiredTier="pro_plus"
                featureName="Predictive Scoring Detail"
                href="/billing"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
