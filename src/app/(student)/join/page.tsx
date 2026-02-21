import Image from 'next/image'
import { JoinForm } from '@/components/student/join-form'

export default function JoinPage() {
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
        <p className="text-sm text-muted-foreground">
          Enter your class code to get started
        </p>
      </div>

      <div className="w-full max-w-sm">
        <JoinForm />
      </div>

      <p className="text-xs text-muted-foreground">
        Ask your teacher for the class code
      </p>
    </div>
  )
}
