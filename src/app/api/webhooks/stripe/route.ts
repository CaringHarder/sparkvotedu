import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { priceIdToTier } from '@/config/pricing'

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', (err as Error).message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error(`Error processing ${event.type}:`, err)
    // Still return 200 to prevent Stripe from retrying for application errors
    // The event was received and verified -- the processing error is ours to fix
  }

  return NextResponse.json({ received: true })
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const teacherId = session.metadata?.teacherId
  if (!teacherId) {
    console.error('No teacherId in checkout session metadata')
    return
  }

  const subscriptionId = session.subscription as string
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0].price.id
  const tier = priceIdToTier(priceId)

  // Stripe v20 (API 2026-01-28): current_period_end moved to subscription items
  const periodEnd = subscription.items.data[0].current_period_end

  try {
    await prisma.subscription.upsert({
      where: { teacherId },
      update: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        status: subscription.status,
        stripeCurrentPeriodEnd: new Date(periodEnd * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      create: {
        teacherId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        status: subscription.status,
        stripeCurrentPeriodEnd: new Date(periodEnd * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    })
  } catch (err) {
    console.error('Failed to upsert subscription on checkout:', err)
  }

  try {
    await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        subscriptionTier: tier,
        stripeCustomerId: session.customer as string,
      },
    })
  } catch (err) {
    console.error('Failed to update teacher tier on checkout:', err)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const teacherId = subscription.metadata?.teacherId
  if (!teacherId) {
    console.error('No teacherId in subscription metadata')
    return
  }

  const priceId = subscription.items.data[0].price.id
  const tier = priceIdToTier(priceId)
  const periodEnd = subscription.items.data[0].current_period_end

  try {
    await prisma.subscription.upsert({
      where: { teacherId },
      update: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        status: subscription.status,
        stripeCurrentPeriodEnd: new Date(periodEnd * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      create: {
        teacherId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        status: subscription.status,
        stripeCurrentPeriodEnd: new Date(periodEnd * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    })
  } catch (err) {
    console.error('Failed to upsert subscription on update:', err)
  }

  // Determine tier based on subscription status
  // past_due = grace period, teacher keeps paid access
  const effectiveTier =
    subscription.status === 'active' || subscription.status === 'past_due'
      ? tier
      : 'free'

  try {
    await prisma.teacher.update({
      where: { id: teacherId },
      data: { subscriptionTier: effectiveTier },
    })
  } catch (err) {
    console.error('Failed to update teacher tier on subscription update:', err)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const teacherId = subscription.metadata?.teacherId
  if (!teacherId) {
    console.error('No teacherId in subscription metadata')
    return
  }

  try {
    await prisma.subscription.update({
      where: { teacherId },
      data: { status: 'canceled' },
    })
  } catch (err) {
    console.error('Failed to update subscription status on delete:', err)
  }

  try {
    await prisma.teacher.update({
      where: { id: teacherId },
      data: { subscriptionTier: 'free' },
    })
  } catch (err) {
    console.error('Failed to downgrade teacher on subscription delete:', err)
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Stripe v20 (API 2026-01-28): subscription ID is on invoice.parent.subscription_details
  const subscriptionId =
    invoice.parent?.subscription_details?.subscription as string | null | undefined
  if (!subscriptionId) return

  try {
    const existing = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    })

    if (existing) {
      // Use invoice period_end to keep the subscription period fresh after renewals
      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
          stripeCurrentPeriodEnd: new Date(invoice.period_end * 1000),
        },
      })
    }
  } catch (err) {
    console.error('Failed to update period end on invoice paid:', err)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Log for observability -- do NOT downgrade the teacher here.
  // The subscription will enter 'past_due' status, and
  // customer.subscription.updated will handle the status change.
  // The 3-day grace period is managed by Stripe's dunning/retry settings.
  const subscriptionId =
    invoice.parent?.subscription_details?.subscription ?? 'unknown'
  console.warn(
    `Payment failed for invoice ${invoice.id}, subscription ${subscriptionId}`
  )
}
