'use server'

import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { stripe } from '@/lib/stripe'
import { PRICE_IDS } from '@/config/pricing'
import { redirect } from 'next/navigation'

/**
 * Create a Stripe Checkout Session for a subscription and redirect to Stripe.
 *
 * Flow: Auth check -> price validation -> Stripe session -> redirect
 *
 * Includes teacherId in both session and subscription metadata so webhook
 * handlers can link events back to the correct teacher record.
 */
export async function createCheckoutSession(priceId: string) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  // Validate priceId against known Stripe prices to prevent injection
  if (!PRICE_IDS.includes(priceId)) {
    return { error: 'Invalid price' }
  }

  let sessionUrl: string

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/billing/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
      customer: teacher.stripeCustomerId || undefined,
      customer_email: !teacher.stripeCustomerId ? teacher.email : undefined,
      metadata: {
        teacherId: teacher.id,
      },
      subscription_data: {
        metadata: {
          teacherId: teacher.id,
        },
      },
      allow_promotion_codes: true,
    })

    sessionUrl = session.url!
  } catch (err) {
    console.error('Failed to create checkout session:', err)
    return { error: 'Failed to create checkout session. Please try again.' }
  }

  // redirect() throws internally (Next.js pattern) -- must be outside try/catch
  redirect(sessionUrl)
}

/**
 * Create a Stripe Customer Portal session and redirect to Stripe.
 *
 * Flow: Auth check -> customer ID check -> Stripe portal session -> redirect
 *
 * The portal allows teachers to manage their subscription: upgrade, downgrade,
 * cancel, update payment method, and view invoices.
 */
export async function createPortalSession() {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  if (!teacher.stripeCustomerId) {
    redirect('/billing')
  }

  let portalUrl: string

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: teacher.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/billing`,
    })

    portalUrl = session.url
  } catch (err) {
    console.error('Failed to create portal session:', err)
    redirect('/billing')
  }

  // redirect() throws internally (Next.js pattern) -- must be outside try/catch
  redirect(portalUrl)
}
