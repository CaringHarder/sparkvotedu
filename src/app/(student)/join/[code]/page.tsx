import Image from 'next/image'
import { JoinForm } from '@/components/student/join-form'
import { NameEntryForm } from '@/components/student/name-entry-form'
import { findSessionByCode } from '@/lib/dal/class-session'

export default async function NameEntryPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const isValidCode = /^\d{6}$/.test(code)

  // Invalid code format -- show error with fallback JoinForm
  if (!isValidCode) {
    return (
      <div className="flex flex-col items-center gap-8 pt-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo-icon.png"
            alt="SparkVotEDU"
            width={48}
            height={48}
            className="h-12 w-12"
            priority
          />
          <h1 className="text-3xl font-bold tracking-tight">Join a Session</h1>
        </div>

        <div className="w-full max-w-sm">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
            <p className="text-sm font-medium text-destructive">
              Invalid class code. Please check the code and try again.
            </p>
          </div>
          <div className="mt-4">
            <JoinForm />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Ask your teacher for the class code
        </p>
      </div>
    )
  }

  // Validate session exists server-side
  const session = await findSessionByCode(code)

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-8 pt-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo-icon.png"
            alt="SparkVotEDU"
            width={48}
            height={48}
            className="h-12 w-12"
            priority
          />
          <h1 className="text-3xl font-bold tracking-tight">Join a Session</h1>
        </div>

        <div className="w-full max-w-sm">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
            <p className="text-sm font-medium text-destructive">
              No session found with that code. It may have expired.
            </p>
          </div>
          <div className="mt-4">
            <JoinForm />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Ask your teacher for the class code
        </p>
      </div>
    )
  }

  // Check for archived session -- block student access
  if (session.archivedAt) {
    return (
      <div className="flex flex-col items-center gap-8 pt-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo-icon.png"
            alt="SparkVotEDU"
            width={48}
            height={48}
            className="h-12 w-12"
            priority
          />
          <h1 className="text-3xl font-bold tracking-tight">Join a Session</h1>
        </div>
        <div className="w-full max-w-sm">
          <div className="rounded-lg border border-muted bg-muted/30 p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              This session is no longer available.
            </p>
          </div>
          <div className="mt-4">
            <JoinForm />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Ask your teacher for the class code
        </p>
      </div>
    )
  }

  const sessionInfo = {
    id: session.id,
    name: session.name,
    teacherName: session.teacher.name,
    status: session.status,
  }

  return (
    <div className="flex flex-col items-center gap-8 pt-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image
          src="/logo-icon.png"
          alt="SparkVotEDU"
          width={48}
          height={48}
          className="h-12 w-12"
          priority
        />
        <h1 className="text-3xl font-bold tracking-tight">Enter your name</h1>
      </div>

      <div className="w-full max-w-sm">
        <NameEntryForm code={code} sessionInfo={sessionInfo} />
      </div>
    </div>
  )
}
