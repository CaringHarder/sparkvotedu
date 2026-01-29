import { SignUpForm } from '@/components/auth/signup-form'

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
    </div>
  )
}
