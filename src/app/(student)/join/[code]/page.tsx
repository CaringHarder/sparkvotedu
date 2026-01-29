import { JoinForm } from '@/components/student/join-form'

export default async function DirectJoinPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const isValidCode = /^\d{6}$/.test(code)

  if (!isValidCode) {
    return (
      <div className="flex flex-col items-center gap-8 pt-12">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">SparkVotEDU</h1>
          <p className="text-sm text-muted-foreground">
            Ignite student voice through voting
          </p>
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

  return (
    <div className="flex flex-col items-center gap-8 pt-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">SparkVotEDU</h1>
        <p className="text-sm text-muted-foreground">
          Ignite student voice through voting
        </p>
      </div>

      <div className="w-full max-w-sm">
        <JoinForm initialCode={code} />
      </div>

      <p className="text-xs text-muted-foreground">
        Ask your teacher for the class code
      </p>
    </div>
  )
}
