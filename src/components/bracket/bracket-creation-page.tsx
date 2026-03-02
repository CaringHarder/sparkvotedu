'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Zap, List } from 'lucide-react'
import { BracketForm } from '@/components/bracket/bracket-form'
import { BracketQuickCreate } from '@/components/bracket/bracket-quick-create'

type CreationMode = 'quick' | 'wizard'

interface BracketCreationPageProps {
  sessions: Array<{
    id: string
    code: string
    name: string | null
    createdAt: string
  }>
}

export function BracketCreationPage({ sessions }: BracketCreationPageProps) {
  const [mode, setMode] = useState<CreationMode>('wizard')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/activities"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Activities
        </Link>
        <h1 className="text-2xl font-bold">Create Bracket</h1>
        <p className="text-muted-foreground">
          Set up a new bracket for your class to vote on.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => setMode('quick')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === 'quick'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Zap className="h-4 w-4" />
          Quick Create
        </button>
        <button
          type="button"
          onClick={() => setMode('wizard')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === 'wizard'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <List className="h-4 w-4" />
          Step-by-Step
        </button>
      </div>

      {/* Creation content */}
      {mode === 'quick' ? (
        <BracketQuickCreate sessions={sessions} />
      ) : (
        <BracketForm />
      )}
    </div>
  )
}
