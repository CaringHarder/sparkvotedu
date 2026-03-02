import { VerifyEmailCard } from '@/components/auth/verify-email-card'

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; expired?: string }>
}) {
  const { email, expired } = await searchParams
  const isExpired = expired === 'true'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">
          {isExpired ? 'Link Expired' : 'Check Your Email'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isExpired
            ? 'This verification link has expired.'
            : 'We sent you a verification link to confirm your email address.'}
        </p>
      </div>

      <VerifyEmailCard email={email ?? null} expired={isExpired} />
    </div>
  )
}
