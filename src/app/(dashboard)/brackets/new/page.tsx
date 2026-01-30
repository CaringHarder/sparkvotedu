import { BracketForm } from '@/components/bracket/bracket-form'

export default function CreateBracketPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Bracket</h1>
        <p className="text-muted-foreground">
          Set up a new bracket for your class to vote on.
        </p>
      </div>

      <BracketForm />
    </div>
  )
}
