import Image from 'next/image'

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Subtle brand-blue accent line at top */}
      <div className="h-1 w-full bg-brand-blue" />

      <div className="mx-auto max-w-5xl px-4 py-4">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Image
            src="/logo-icon.png"
            alt="SparkVotEDU"
            width={24}
            height={24}
            className="h-6 w-6"
            priority
          />
          <span className="text-sm font-semibold tracking-tight text-muted-foreground">
            SparkVotEDU
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}
