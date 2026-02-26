'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { SimplePollVote } from '@/components/student/simple-poll-vote'
import { RankedPollVote } from '@/components/student/ranked-poll-vote'
import { useRealtimePoll } from '@/hooks/use-realtime-poll'
import { createClient } from '@/lib/supabase/client'
import { PollReveal } from '@/components/poll/poll-reveal'
import { WinnerReveal } from '@/components/bracket/winner-reveal'
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
 * 5. Subscribes to real-time poll events via useRealtimePoll hook
 * 6. Shows PollReveal animation when teacher closes the poll live
 *
 * Handles edge cases: poll not found, not active, closed with results, no identity.
 */
export default function StudentPollVotingPage() {
  const params = useParams<{ sessionId: string; pollId: string }>()
  const sessionId = params.sessionId
  const pollId = params.pollId

  const [state, setState] = useState<PageState>({ type: 'loading' })
  const [showDeletionToast, setShowDeletionToast] = useState(false)
  const router = useRouter()

  // Redirect to session dashboard when poll is not found
  useEffect(() => {
    if (state.type === 'not-found') {
      router.push(`/session/${sessionId}`)
    }
  }, [state.type, sessionId, router])

  // Deletion detection: listen for activity_update broadcasts and check if poll still exists
  useEffect(() => {
    if (state.type === 'loading' || state.type === 'no-identity') return

    const supabase = createClient()
    const channel = supabase
      .channel(`activities:${sessionId}`)
      .on('broadcast', { event: 'activity_update' }, async () => {
        try {
          const res = await fetch(`/api/polls/${pollId}/state`)
          if (!res.ok) {
            setShowDeletionToast(true)
            setTimeout(() => {
              router.push(`/session/${sessionId}`)
            }, 2000)
          }
        } catch {
          // Network error -- ignore, don't redirect on connectivity issues
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, pollId, state.type, router])

  // Real-time subscription -- called unconditionally (React rules of hooks)
  const { pollStatus, voteCounts, bordaScores } = useRealtimePoll(pollId)

  // Reveal animation state
  const [showReveal, setShowReveal] = useState(false)
  const [showCountdown, setShowCountdown] = useState(false)
  const [closedDetected, setClosedDetected] = useState(false)
  const prevPollStatusRef = useRef(pollStatus)

  // Detect live active->closed transition: trigger countdown first, then reveal
  useEffect(() => {
    const prev = prevPollStatusRef.current
    prevPollStatusRef.current = pollStatus

    // Only trigger countdown when transitioning FROM a non-closed status TO closed
    // AND the student was actively viewing the poll (state is 'ready')
    if (
      pollStatus === 'closed' &&
      prev !== 'closed' &&
      prev !== 'draft' && // draft is the hook's initial state before first fetch
      state.type === 'ready'
    ) {
      setShowCountdown(true)
      setClosedDetected(true)
    }
  }, [pollStatus, state.type])

  // Chain countdown -> reveal
  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false)
    setShowReveal(true)
  }, [])

  // Compute winner text for reveal animation
  const winnerText = (() => {
    if (state.type !== 'ready') return 'Results are in!'
    const { poll } = state

    // Ranked poll: use top Borda score
    if (poll.pollType === 'ranked' && bordaScores && bordaScores.length > 0) {
      const topId = bordaScores[0].optionId
      const opt = poll.options.find((o) => o.id === topId)
      return opt?.text ?? 'Results are in!'
    }

    // Simple poll: highest vote count from real-time hook
    const counts = Object.keys(voteCounts).length > 0 ? voteCounts : {}
    let maxCount = 0
    let winnerId = ''
    for (const opt of poll.options) {
      const c = counts[opt.id] ?? 0
      if (c > maxCount) {
        maxCount = c
        winnerId = opt.id
      }
    }

    if (!winnerId) return 'Results are in!'
    const opt = poll.options.find((o) => o.id === winnerId)
    return opt?.text ?? 'Results are in!'
  })()

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

  // Deletion toast overlay (renders on top of any page state)
  const deletionToast = showDeletionToast ? (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg animate-in fade-in slide-in-from-bottom-4">
      Your teacher ended this activity &mdash; heading back!
    </div>
  ) : null

  // Loading state
  if (state.type === 'loading') {
    return (
      <>
        {deletionToast}
        <div className="flex items-center justify-center py-16">
          <div className="space-y-3 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading poll...</p>
          </div>
        </div>
      </>
    )
  }

  // No participant identity
  if (state.type === 'no-identity') {
    return (
      <>
        {deletionToast}
        <div className="flex items-center justify-center py-16">
          <div className="max-w-sm text-center">
            <p className="text-lg font-semibold">Session not found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              It looks like you haven&apos;t joined this session yet. Ask your
              teacher for the class code.
            </p>
          </div>
        </div>
      </>
    )
  }

  // Poll not found -- redirect to session dashboard (Phase 26 decision)
  if (state.type === 'not-found') {
    return null // Redirecting via useEffect
  }

  // Poll not active (draft, closed, or archived) -- loaded in this state on mount
  if (state.type === 'not-active') {
    const { status, poll } = state

    if (status === 'closed') {
      return (
        <>
          {deletionToast}
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
        </>
      )
    }

    return (
      <>
        {deletionToast}
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
      </>
    )
  }

  // Ready state: render appropriate voting component (or closed state after live transition)
  const { poll, participantId, existingVotes } = state

  // After reveal dismissed: show clean "poll closed" state (live transition, not initial load)
  if (closedDetected && !showReveal && !showCountdown) {
    return (
      <>
        {deletionToast}
        <div className="container mx-auto px-4 py-6">
          {backLink}
          <div className="flex flex-col items-center py-8">
            <h2 className="text-xl font-bold">{poll.question}</h2>
            <div className="mt-4 rounded-lg bg-muted/50 px-6 py-4 text-center">
              <p className="text-sm font-medium">This poll has been closed</p>
              <p className="mt-3 text-lg font-semibold text-primary">
                {winnerText}
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {deletionToast}
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
        {showCountdown && (
          <WinnerReveal
            entrant1Name="The votes are in"
            entrant2Name=""
            onComplete={handleCountdownComplete}
          />
        )}
        {showReveal && (
          <PollReveal
            winnerText={winnerText}
            onDismiss={() => setShowReveal(false)}
          />
        )}
      </div>
    </>
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
