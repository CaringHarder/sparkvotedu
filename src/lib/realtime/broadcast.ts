/**
 * Server-side Supabase Broadcast via REST API.
 *
 * Uses raw HTTP fetch calls (not the Supabase client library) because
 * server actions are stateless with no persistent WebSocket connection.
 *
 * Broadcast failures are logged but never thrown -- broadcast is best-effort
 * and should not break the vote flow.
 */

interface BroadcastMessage {
  topic: string
  event: string
  payload: Record<string, unknown>
}

/**
 * Send a broadcast message to a Supabase Realtime channel via REST API.
 *
 * POST to /realtime/v1/api/broadcast with the service role key.
 * Errors are caught and logged -- never thrown to the caller.
 */
export async function broadcastMessage(message: BroadcastMessage): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[broadcast] Missing SUPABASE_URL or SERVICE_ROLE_KEY environment variables')
    return
  }

  try {
    const response = await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        messages: [message],
      }),
    })

    if (!response.ok) {
      console.error(
        `[broadcast] Failed to broadcast to ${message.topic}:${message.event}`,
        response.status,
        await response.text().catch(() => 'no body')
      )
    }
  } catch (error) {
    console.error(
      `[broadcast] Error broadcasting to ${message.topic}:${message.event}`,
      error
    )
  }
}

/**
 * Broadcast a vote update to a bracket channel.
 *
 * Sent after a vote is cast or updated. Subscribers receive the updated
 * vote counts and total for the specific matchup.
 */
export async function broadcastVoteUpdate(
  bracketId: string,
  matchupId: string,
  voteCounts: Record<string, number>,
  totalVotes: number
): Promise<void> {
  await broadcastMessage({
    topic: `bracket:${bracketId}`,
    event: 'vote_update',
    payload: { matchupId, voteCounts, totalVotes },
  })
}

// Bracket update event types
type BracketUpdateType =
  | 'winner_selected'
  | 'round_advanced'
  | 'matchup_opened'
  | 'bracket_completed'
  | 'voting_opened'

/**
 * Broadcast a bracket state change to a bracket channel.
 *
 * Used for lifecycle events: winner selection, round advancement,
 * matchup opening, bracket completion, and voting open.
 */
export async function broadcastBracketUpdate(
  bracketId: string,
  type: BracketUpdateType,
  payload: Record<string, unknown>
): Promise<void> {
  await broadcastMessage({
    topic: `bracket:${bracketId}`,
    event: 'bracket_update',
    payload: { type, ...payload },
  })
}

/**
 * Broadcast an activity update to a session channel.
 *
 * Triggers the existing useRealtimeActivities hook to refetch
 * the activity list (wiring Phase 2's scaffolded hook).
 * Payload is empty -- the hook re-fetches from the server.
 */
export async function broadcastActivityUpdate(
  sessionId: string
): Promise<void> {
  await broadcastMessage({
    topic: `activities:${sessionId}`,
    event: 'activity_update',
    payload: {},
  })
}
