import { redirect } from 'next/navigation'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { Card, CardContent } from '@/components/ui/card'
import { DisplayNameSection } from '@/components/profile/display-name-section'
import { PasswordChangeSection } from '@/components/profile/password-change-section'
import { AccountInfoSection } from '@/components/profile/account-info-section'

export const metadata = {
  title: 'Profile - SparkVotEDU',
}

export default async function ProfilePage() {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account settings
        </p>
      </div>

      <Card>
        <CardContent>
          <DisplayNameSection name={teacher.name ?? ''} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <PasswordChangeSection />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <AccountInfoSection email={teacher.email} role={teacher.role} />
        </CardContent>
      </Card>
    </div>
  )
}
