'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { SimplePollVote } from '@/components/student/simple-poll-vote'
import { RankedPollVote } from '@/components/student/ranked-poll-vote'
import type { PollWithOptions, PollOptionData } from '@/lib/poll/types'

/**
 * Poll state response from GET /api/polls/[pollId]/state
 */
interface PollStateResponse {
  id: string
  question: string
  status: string
  pollType: string
  allowVoteChange: boolean
  showLiveResults: boolean
  rankingDepth: number | null
  options: {
    id: string
    text: string
    imageUrl: string | null
    position: number
  }[]
  voteCounts: Record<string, number>
  totalVotes: number
  bordaScores?: { optionId: string; points: number }[]
}

type PageState =
  | { type: 'loading' }
  | { type: 'no-identity' }
  | { type: 'not-found' }
  | { type: 'not-active'; status: string; poll: PollWithOptions }
  | {
      type: 'ready'
      poll: PollWithOptions
      participantId: string
      existingVotes: { optionId: string; rank: number }[]
    }

/**
 * Student poll voting page.
 *
 * Client component that:
 * 1. Reads participant identity from localStorage (same pattern as bracket voting page from 04-04)
 * 2. Fetches poll data from GET /api/polls/[pollId]/state
 * 3. Fetches existing votes for vote restoration via query param ?pid=
 * 4. Routes to SimplePollVote or RankedPollVote based on poll type
 *
 * Handles edge cases: poll not found, not active, closed with results, no identity.
 */
export default function StudentPollVotingPage() {
  const params = useParams<{ sessionId: string; pollId: string }>()
  const sessionId = params.sessionId
  const pollId = params.pollId

  const [state, setState] = useState<PageState>({ type: 'loading' })

  useEffect(() => {
    async function loadPoll() {
      // Read participant identity from localStorage
      let participantId: string | null = null
      try {
        const stored = localStorage.getItem(
          `sparkvotedu_session_${sessionId}`
        )
        if (stored) {
          const data = JSON.parse(stored)
          participantId = data.participantId ?? null
        }
      } catch {
        // localStorage not available
      }

      if (!participantId) {
        setState({ type: 'no-identity' })
        return
      }

      try {
        // Fetch poll state
        const pollRes = await fetch(`/api/polls/${pollId}/state`)
        if (!pollRes.ok) {
          setState({ type: 'not-found' })
          return
        }

        const pollData: PollStateResponse = await pollRes.json()

        // Convert to PollWithOptions
        const poll = toPollWithOptions(pollData)

        // Handle non-active poll
        if (pollData.status !== 'active') {
          setState({ type: 'not-active', status: pollData.status, poll })
          return
        }

        // Fetch existing votes for this participant
        // We use the poll state endpoint and separately query for participant votes
        let existingVotes: { optionId: string; rank: number }[] = []
        try {
          const votesRes = await fetch(
            `/api/polls/${pollId}/state?pid=${encodeURIComponent(participantId)}`
          )
          if (votesRes.ok) {
            const votesData = await votesRes.json()
            // The state endpoint may include participant votes in future
            // For now, we rely on client-side tracking via the hook's existingVotes
            // The actual vote data will be detected by re-fetching state
            if (votesData.participantVotes) {
              existingVotes = votesData.participantVotes
            }
          }
        } catch {
          // Non-fatal -- proceed without vote restoration from server
        }

        setState({
          type: 'ready',
          poll,
          participantId,
          existingVotes,
        })
      } catch {
        setState({ type: 'not-found' })
      }
    }

    loadPoll()
  }, [sessionId, pollId])

  const backLink = (
    <Link
      href={`/session/${sessionId}`}
      className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path
          fillRule="evenodd"
          d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
          clipRule="evenodd"
        />
      </svg>
      Back to session
    </Link>
  )

  // Loading state
  if (state.type === 'loading') {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading poll...</p>
        </div>
      </div>
    )
  }

  // No participant identity
  if (state.type === 'no-identity') {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="max-w-sm text-center">
          <p className="text-lg font-semibold">Session not found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            It looks like you haven&apos;t joined this session yet. Ask your
            teacher for the class code.
          </p>
        </div>
      </div>
    )
  }

  // Poll not found
  if (state.type === 'not-found') {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="max-w-sm text-center">
          <p className="text-lg font-semibold">Poll not found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            This poll may have been removed or is not available.
          </p>
          <Link
            href={`/session/${sessionId}`}
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            Return to session
          </Link>
        </div>
      </div>
    )
  }

  // Poll not active (draft, closed, or archived)
  if (state.type === 'not-active') {
    const { status, poll } = state

    if (status === 'closed') {
      return (
        <div className="container mx-auto px-4 py-6">
          {backLink}
          <div className="flex flex-col items-center py-8">
            <h2 className="text-xl font-bold">{poll.question}</h2>
            <div className="mt-4 rounded-lg bg-muted/50 px-6 py-4 text-center">
              <p className="text-sm font-medium">This poll has been closed</p>
              {poll.showLiveResults && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Results are being reviewed by your teacher
                </p>
              )}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-6">
        {backLink}
        <div className="flex items-center justify-center py-16">
          <div className="max-w-sm text-center">
            <p className="text-lg font-semibold">This poll is not currently active</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {status === 'draft'
                ? 'Your teacher is still setting up this poll.'
                : 'This poll is no longer accepting responses.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Ready state: render appropriate voting component
  const { poll, participantId, existingVotes } = state

  return (
    <div className="container mx-auto px-4 py-6">
      {backLink}
      <div className="mx-auto max-w-xl">
        {poll.pollType === 'ranked' ? (
          <RankedPollVote
            poll={poll}
            participantId={participantId}
            existingVotes={existingVotes}
          />
        ) : (
          <SimplePollVote
            poll={poll}
            participantId={participantId}
            existingVotes={existingVotes}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Convert poll state API response to PollWithOptions type.
 */
function toPollWithOptions(data: PollStateResponse): PollWithOptions {
  const options: PollOptionData[] = data.options.map((o) => ({
    id: o.id,
    text: o.text,
    imageUrl: o.imageUrl,
    position: o.position,
    pollId: data.id,
  }))

  return {
    id: data.id,
    question: data.question,
    description: null,
    pollType: data.pollType as 'simple' | 'ranked',
    status: data.status as 'draft' | 'active' | 'closed' | 'archived',
    allowVoteChange: data.allowVoteChange,
    showLiveResults: data.showLiveResults,
    rankingDepth: data.rankingDepth,
    teacherId: '',
    sessionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    options,
  }
}
