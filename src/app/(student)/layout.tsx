export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-4">
        <div className="mb-6 text-center">
          <span className="text-sm font-semibold tracking-tight text-muted-foreground">
            SparkVotEDU
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}
