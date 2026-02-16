import { redirect } from 'next/navigation'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getBracketWithDetails } from '@/lib/dal/bracket'
import { BracketEditForm } from '@/components/bracket/bracket-edit-form'

export default async function BracketEditPage({
  params,
}: {
  params: Promise<{ bracketId: string }>
}) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  const { bracketId } = await params

  const bracket = await getBracketWithDetails(bracketId, teacher.id)

  // Redirect if bracket not found or not in draft status
  if (!bracket || bracket.status !== 'draft') {
    redirect(`/brackets/${bracketId}`)
  }

  // Serialize for client component
  const serialized = {
    id: bracket.id,
    name: bracket.name,
    size: bracket.size,
    bracketType: bracket.bracketType ?? 'single_elimination',
    entrants: bracket.entrants.map((e) => ({
      id: e.id,
      name: e.name,
      seedPosition: e.seedPosition,
      bracketId: e.bracketId,
    })),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Edit: {bracket.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Modify entrants for this draft bracket. Changes will regenerate the
          matchup structure.
        </p>
      </div>
      <BracketEditForm bracket={serialized} />
    </div>
  )
}
