import Stripe from 'stripe'

let _stripe: Stripe | null = null

/**
 * Lazily initialize Stripe client.
 * Avoids crashing during Next.js static page generation when
 * STRIPE_SECRET_KEY is not yet available in the build environment.
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(key, { typescript: true })
  }
  return _stripe
}

/**
 * @deprecated Use getStripe() instead. Kept for backward compatibility
 * with existing imports. Lazily proxied to avoid build-time crashes.
 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver)
  },
})
