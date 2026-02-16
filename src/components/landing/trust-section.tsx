import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShieldCheck, Mail, KeyRound, UserCheck } from 'lucide-react'

const verificationMethods = [
  {
    icon: Mail,
    title: 'Email Verification',
    description: 'Instant verification for .edu email addresses',
  },
  {
    icon: KeyRound,
    title: 'Invite Codes',
    description: 'School-wide or district-wide invite codes for quick approval',
  },
] as const

export function TrustSection() {
  return (
    <section className="w-full bg-muted/30">
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
        {/* Lock icon */}
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-amber/10">
          <ShieldCheck className="h-7 w-7 text-brand-amber" />
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Protected for students. Built for teachers.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Every SparkVotEDU teacher account is verified for safety. Student
          access stays secure while teachers run authentic classroom
          experiences.
        </p>

        {/* Verification methods */}
        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          {verificationMethods.map((method) => {
            const Icon = method.icon
            return (
              <div
                key={method.title}
                className="flex items-start gap-3 rounded-lg border border-border/40 bg-card p-5 text-left"
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-blue" />
                <div>
                  <p className="font-semibold text-foreground">{method.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {method.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Manual verification note */}
        <div className="mx-auto mt-4 max-w-2xl rounded-lg border border-border/40 bg-card p-5 text-left">
          <div className="flex items-start gap-3">
            <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-amber" />
            <div>
              <p className="font-semibold text-foreground">
                Manual Verification
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Don&apos;t have a .edu email? No problem! Our team manually
                verifies teachers to ensure a safe, authentic learning
                environment. Verification typically takes 24-48 hours for manual
                reviews.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10">
          <Button
            asChild
            size="lg"
            className="bg-brand-blue px-8 text-white hover:bg-brand-blue-dark"
          >
            <Link href="/signup">Start Free &amp; Get Verified</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
