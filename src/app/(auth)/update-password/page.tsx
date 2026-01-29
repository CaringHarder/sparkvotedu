import { UpdatePasswordForm } from '@/components/auth/update-password-form'

export default function UpdatePasswordPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Set New Password</h2>
        <p className="text-sm text-muted-foreground">
          Enter your new password below.
        </p>
      </div>

      <UpdatePasswordForm />
    </div>
  )
}
