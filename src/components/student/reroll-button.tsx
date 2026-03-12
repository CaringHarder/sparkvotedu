'use client'

import { useState } from 'react'
import { rerollName } from '@/actions/student'
import { Button } from '@/components/ui/button'

interface RerollButtonProps {
  participantId: string
  disabled: boolean
  onReroll: (newName: string) => void
}

export function RerollButton({
  participantId,
  disabled,
  onReroll,
}: RerollButtonProps) {
  const [loading, setLoading] = useState(false)
  const [used, setUsed] = useState(disabled)
  const [error, setError] = useState('')

  async function handleReroll() {
    if (used || loading) return

    setLoading(true)
    setError('')

    try {
      const result = await rerollName(participantId)

      if (result.error) {
        setError(result.error)
        if (result.error === 'You already used your reroll') {
          setUsed(true)
        }
      } else if (result.participant) {
        setUsed(true)
        onReroll(result.participant.funName)
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleReroll}
        disabled={used || loading}
        className="w-full justify-start text-sm"
      >
        {loading
          ? 'Rolling...'
          : used
            ? 'Name Change Used'
            : 'Change Fun Name'}
      </Button>
      {error && !used && (
        <p className="px-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
