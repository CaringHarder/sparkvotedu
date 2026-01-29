import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { redirect } from 'next/navigation'

export async function DashboardShell() {
  const teacher = await getAuthenticatedTeacher()

  if (!teacher) {
    redirect('/login')
  }

  const displayName = teacher.name || teacher.email

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome, {displayName}
        </h1>
        <p className="text-muted-foreground">
          Here is your teaching dashboard
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {teacher.subscriptionTier === 'free'
            ? 'Free'
            : teacher.subscriptionTier === 'pro'
              ? 'Pro'
              : 'Pro Plus'}
        </span>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <p>Your brackets and polls will appear here.</p>
      </div>
    </div>
  )
}
