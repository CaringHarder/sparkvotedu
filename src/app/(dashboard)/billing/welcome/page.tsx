import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { stripe } from '@/lib/stripe'
import { priceIdToTier } from '@/config/pricing'
import { PLANS, FREE_PLAN } from '@/config/pricing'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react'

/**
 * Post-checkout welcome/confirmation page.
 *
 * Reads the Checkout Session directly from Stripe using the session_id
 * query parameter. This avoids the webhook race condition where the
 * webhook may not have updated the Teacher record yet.
 */
export default async function BillingWelcomePage(props: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  const searchParams = await props.searchParams
  const sessionId = searchParams.session_id

  if (!sessionId) {
    redirect('/billing')
  }

  // Retrieve Checkout Session from Stripe directly (avoids webhook race)
  let checkoutSession
  try {
    checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })
  } catch {
    // Invalid session_id or Stripe API failure
    redirect('/billing')
  }

  // Determine the subscribed tier from the session's subscription
  const subscription = checkoutSession.subscription
  if (!subscription || typeof subscription === 'string') {
    // Subscription not expanded or not present -- redirect
    redirect('/billing')
  }

  const priceId = subscription.items.data[0]?.price.id
  const tier = priceId ? priceIdToTier(priceId) : null

  if (!tier) {
    redirect('/billing')
  }

  const plan = PLANS[tier]
  const isPaid = checkoutSession.payment_status === 'paid'

  if (!isPaid) {
    // Payment is still processing
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Processing your payment...
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your payment is being processed. Your new features will be available
          shortly.
        </p>
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg py-16">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome to {plan.name}!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your subscription is active. Here&apos;s what you just unlocked:
        </p>
      </div>

      <ul className="mt-8 space-y-3">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go to Dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/billing"
          className="inline-flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Manage Subscription
        </Link>
      </div>
    </div>
  )
}
