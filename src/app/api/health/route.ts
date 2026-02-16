import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

type ServiceStatus = {
  status: 'ok' | 'error' | 'missing' | 'not_configured'
  detail?: string
}

type SiteUrlStatus = {
  value: string
}

type HealthResponse = {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    supabase_auth: ServiceStatus
    supabase_storage: ServiceStatus
    stripe: ServiceStatus
    sportsdata: ServiceStatus
    cron_secret: ServiceStatus
    site_url: SiteUrlStatus
  }
}

/**
 * GET /api/health
 *
 * Reports the configuration status of all external services.
 * Each service is checked independently so one failure does not
 * prevent checking others.
 *
 * Does not require authentication -- exposes status only, never secrets.
 */
export async function GET() {
  const services: HealthResponse['services'] = {
    supabase_auth: { status: 'error' },
    supabase_storage: { status: 'error' },
    stripe: { status: 'error' },
    sportsdata: { status: 'not_configured' },
    cron_secret: { status: 'not_configured' },
    site_url: { value: '' },
  }

  // 1. Supabase Auth
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      services.supabase_auth = {
        status: 'error',
        detail: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set',
      }
    } else {
      const supabase = createAdminClient()
      const { error } = await supabase.auth.admin.listUsers({ perPage: 1 })
      if (error) {
        services.supabase_auth = {
          status: 'error',
          detail: error.message,
        }
      } else {
        services.supabase_auth = {
          status: 'ok',
          detail: 'Connected and authenticated',
        }
      }
    }
  } catch (err) {
    services.supabase_auth = {
      status: 'error',
      detail: err instanceof Error ? err.message : 'Unknown error',
    }
  }

  // 2. Supabase Storage (poll-images bucket)
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      services.supabase_storage = {
        status: 'missing',
        detail: 'Supabase credentials not set',
      }
    } else {
      const supabase = createAdminClient()
      const { data, error } = await supabase.storage.getBucket('poll-images')
      if (error || !data) {
        services.supabase_storage = {
          status: 'missing',
          detail: 'poll-images bucket not found -- create it in Supabase Dashboard > Storage',
        }
      } else {
        services.supabase_storage = {
          status: 'ok',
          detail: `poll-images bucket exists (public: ${data.public})`,
        }
      }
    }
  } catch (err) {
    services.supabase_storage = {
      status: 'missing',
      detail: err instanceof Error ? err.message : 'Unknown error',
    }
  }

  // 3. Stripe
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!secretKey || !webhookSecret) {
      services.stripe = {
        status: 'error',
        detail: `Missing: ${[
          !secretKey && 'STRIPE_SECRET_KEY',
          !webhookSecret && 'STRIPE_WEBHOOK_SECRET',
        ]
          .filter(Boolean)
          .join(', ')}`,
      }
    } else {
      const account = await stripe.accounts.retrieve()
      services.stripe = {
        status: 'ok',
        detail: `Connected to account: ${account.id}`,
      }
    }
  } catch (err) {
    services.stripe = {
      status: 'error',
      detail: err instanceof Error ? err.message : 'Unknown error',
    }
  }

  // 4. SportsDataIO (env var check only -- no API call to conserve quota)
  try {
    const apiKey = process.env.SPORTSDATAIO_API_KEY
    if (!apiKey) {
      services.sportsdata = {
        status: 'not_configured',
        detail: 'SPORTSDATAIO_API_KEY not set',
      }
    } else {
      services.sportsdata = {
        status: 'ok',
        detail: 'API key configured (no connectivity test to conserve quota)',
      }
    }
  } catch {
    services.sportsdata = {
      status: 'not_configured',
      detail: 'Error checking env var',
    }
  }

  // 5. Cron Secret
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      services.cron_secret = {
        status: 'not_configured',
        detail: 'CRON_SECRET not set -- generate with: openssl rand -hex 32',
      }
    } else {
      services.cron_secret = {
        status: 'ok',
        detail: 'Configured',
      }
    }
  } catch {
    services.cron_secret = {
      status: 'not_configured',
      detail: 'Error checking env var',
    }
  }

  // 6. Site URL
  services.site_url = {
    value: process.env.NEXT_PUBLIC_SITE_URL ?? '(not set)',
  }

  // Determine overall status
  const criticalServices = [services.supabase_auth, services.stripe]
  const allServices = [
    services.supabase_auth,
    services.supabase_storage,
    services.stripe,
    services.sportsdata,
    services.cron_secret,
  ]

  const criticalFailing = criticalServices.some(
    (s) => s.status === 'error' || s.status === 'missing'
  )
  const anyFailing = allServices.some(
    (s) => s.status === 'error' || s.status === 'missing' || s.status === 'not_configured'
  )

  let overallStatus: HealthResponse['status'] = 'healthy'
  if (criticalFailing) {
    overallStatus = 'unhealthy'
  } else if (anyFailing) {
    overallStatus = 'degraded'
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services,
  }

  return NextResponse.json(response)
}
