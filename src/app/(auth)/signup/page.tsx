import { SignUpForm } from '@/components/auth/signup-form'
import { OAuthButtons } from '@/components/auth/oauth-buttons'
import { Separator } from '@/components/ui/separator'

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Create Account</h2>
        <p className="text-sm text-muted-foreground">
          Sign up to start creating brackets and polls for your classroom
        </p>
      </div>

      <SignUpForm />

      <div className="relative flex items-center gap-4 py-2">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground uppercase">or</span>
        <Separator className="flex-1" />
      </div>

      <OAuthButtons />
    </div>
  )
}
