/** Poll type: simple (pick one) or ranked (order preferences) */
export type PollType = 'simple' | 'ranked'

/** Poll lifecycle status */
export type PollStatus = 'draft' | 'active' | 'closed' | 'archived'

/** Core poll data matching Prisma Poll model */
export interface PollData {
  id: string
  question: string
  description: string | null
  pollType: PollType
  status: PollStatus
  allowVoteChange: boolean
  showLiveResults: boolean
  rankingDepth: number | null
  teacherId: string
  sessionId: string | null
  createdAt: Date
  updatedAt: Date
}

/** Poll option data matching Prisma PollOption model */
export interface PollOptionData {
  id: string
  text: string
  imageUrl: string | null
  position: number
  pollId: string
}

/** Poll vote data matching Prisma PollVote model */
export interface PollVoteData {
  id: string
  pollId: string
  participantId: string
  optionId: string
  rank: number
}

/** Full poll with options for display */
export interface PollWithOptions extends PollData {
  options: PollOptionData[]
}

/** Poll with options and vote counts for results */
export interface PollWithResults extends PollWithOptions {
  voteCounts: Record<string, number>
  totalVotes: number
}
