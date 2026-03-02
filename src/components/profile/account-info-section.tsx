import { Badge } from '@/components/ui/badge'

interface AccountInfoSectionProps {
  email: string
  role: string
}

export function AccountInfoSection({ email, role }: AccountInfoSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Account Info</h3>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Email</p>
          <p className="mt-1 rounded-md border bg-muted/50 px-3 py-2 text-sm text-foreground">
            {email}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Email cannot be changed from this page
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">Role</p>
          <div className="mt-1">
            <Badge variant="secondary" className="capitalize">
              {role}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
