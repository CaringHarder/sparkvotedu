import { redirect } from 'next/navigation'
import { WelcomeScreen } from '@/components/student/welcome-screen'

export default async function WelcomePage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>
  searchParams: Promise<{
    name?: string
    returning?: string
    teacher?: string
    participantId?: string
  }>
}) {
  const { sessionId } = await params
  const { name, returning, teacher } = await searchParams

  if (!name) {
    redirect('/join')
  }

  return (
    <WelcomeScreen
      funName={name}
      teacherName={teacher ?? null}
      returning={returning === 'true'}
      sessionId={sessionId}
    />
  )
}
