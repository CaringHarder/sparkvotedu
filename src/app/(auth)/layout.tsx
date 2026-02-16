import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-blue/5 via-background to-brand-amber/5 px-4 dark:from-brand-blue/10 dark:via-background dark:to-brand-amber/10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo-icon.png"
            alt="SparkVotEDU"
            width={48}
            height={48}
            className="rounded-lg"
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              SparkVot<span className="text-brand-blue">EDU</span>
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Interactive brackets and polls for your classroom
            </p>
          </div>
        </div>
        <Card className="border-border/60 shadow-lg">
          <CardContent className="pt-6">{children}</CardContent>
        </Card>
      </div>
    </div>
  )
}
