import { redirect } from 'next/navigation'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { prisma } from '@/lib/prisma'
import { BracketCreationPage } from '@/components/bracket/bracket-creation-page'

export default async function CreateBracketPage() {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) redirect('/login')

  const sessions = await prisma.classSession.findMany({
    where: { teacherId: teacher.id, status: 'active' },
    select: { id: true, code: true, name: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  const serializedSessions = sessions.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    createdAt: s.createdAt.toISOString(),
  }))

  return <BracketCreationPage sessions={serializedSessions} />
}
