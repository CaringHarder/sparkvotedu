import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Sign In</h2>
        <p className="text-sm text-muted-foreground">
          Enter your email and password to access your account
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive">
          {error === 'auth_callback_failed'
            ? 'Authentication failed. Please try again.'
            : error}
        </p>
      )}

      <LoginForm />
    </div>
  )
}
