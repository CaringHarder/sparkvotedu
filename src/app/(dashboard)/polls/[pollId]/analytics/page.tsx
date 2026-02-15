import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getPollByIdDAL } from '@/lib/dal/poll'
import {
  getPollParticipation,
  getPollVoteDistribution,
} from '@/lib/dal/analytics'
import { canAccess } from '@/lib/gates/features'
import { ParticipationSummary } from '@/components/analytics/participation-summary'
import { PollVoteDistribution } from '@/components/analytics/poll-vote-distribution'
import { CSVExportButton } from '@/components/analytics/csv-export-button'
import { UpgradePrompt } from '@/components/billing/upgrade-prompt'
import { getPollExportData } from '@/actions/analytics'
import type { SubscriptionTier } from '@/lib/gates/tiers'

export default async function PollAnalyticsPage({
  params,
}: {
  params: Promise<{ pollId: string }>
}) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  const { pollId } = await params

  const poll = await getPollByIdDAL(pollId)

  // Verify poll exists and teacher owns it
  if (!poll || poll.teacherId !== teacher.id) {
    redirect('/activities')
  }

  const tier = (teacher.subscriptionTier ?? 'free') as SubscriptionTier
  const csvAccess = canAccess(tier, 'csvExport')

  // Fetch analytics data in parallel
  const [participation, voteDistribution] = await Promise.all([
    getPollParticipation(pollId),
    getPollVoteDistribution(pollId, poll.pollType),
  ])

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div>
        <Link
          href={`/polls/${pollId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to poll
        </Link>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Analytics: {poll.question}</h1>
          <div className="flex items-center gap-2">
            {csvAccess.allowed ? (
              <CSVExportButton
                exportAction={() => getPollExportData(pollId)}
              />
            ) : (
              <UpgradePrompt
                currentTier={tier}
                requiredTier={csvAccess.upgradeTarget!}
                featureName="CSV Export"
                href="/billing"
              />
            )}
          </div>
        </div>
      </div>

      {/* Participation Summary */}
      <ParticipationSummary
        uniqueParticipants={participation.uniqueParticipants}
        totalVotes={participation.totalVotes}
        totalMatchups={0}
        sessionParticipantCount={participation.sessionParticipantCount}
        type="poll"
      />

      {/* Vote Distribution */}
      <PollVoteDistribution
        options={voteDistribution.options}
        totalVotes={voteDistribution.totalVotes}
        pollType={poll.pollType}
      />
    </div>
  )
}
