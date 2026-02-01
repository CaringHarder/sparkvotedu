import { prisma } from '@/lib/prisma'

/**
 * Get a teacher's subscription record.
 * Returns null if the teacher has no subscription (free tier).
 */
export async function getTeacherSubscription(teacherId: string) {
  return prisma.subscription.findUnique({
    where: { teacherId },
  })
}

/**
 * Get a teacher with their subscription record in a single query.
 * Useful for pages that need both teacher data and subscription state.
 */
export async function getTeacherWithSubscription(teacherId: string) {
  return prisma.teacher.findUnique({
    where: { id: teacherId },
    include: { subscription: true },
  })
}

/**
 * Look up a subscription by its Stripe subscription ID.
 * Used by webhook handlers to find the local record for a Stripe event.
 */
export async function getSubscriptionByStripeId(stripeSubscriptionId: string) {
  return prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
  })
}

/**
 * Get a comprehensive billing overview for a teacher.
 * Returns the teacher's tier, subscription record, and usage counts.
 *
 * Usage counts:
 * - liveBrackets: brackets with status='active'
 * - draftBrackets: brackets with status='draft'
 * - totalPolls: all polls owned by the teacher
 */
export async function getTeacherBillingOverview(teacherId: string) {
  const [teacher, liveBrackets, draftBrackets, totalPolls] = await Promise.all([
    prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { subscription: true },
    }),
    prisma.bracket.count({
      where: { teacherId, status: 'active' },
    }),
    prisma.bracket.count({
      where: { teacherId, status: 'draft' },
    }),
    prisma.poll.count({
      where: { teacherId },
    }),
  ])

  return {
    tier: (teacher?.subscriptionTier ?? 'free') as string,
    subscription: teacher?.subscription ?? null,
    usage: {
      liveBrackets,
      draftBrackets,
      totalPolls,
    },
  }
}
