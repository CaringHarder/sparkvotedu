'use client'

import { useState, useEffect, useRef, useCallback, useTransition } from 'react'
import { updateBracketVotingSettings } from '@/actions/bracket-advance'

interface MatchupTimerProps {
  bracketId: string
  initialSeconds: number | null
  matchupId: string | null
  onTimerExpire: () => void
}

const PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
  { label: '1:30', seconds: 90 },
  { label: '2m', seconds: 120 },
  { label: '5m', seconds: 300 },
] as const

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function getTimerColor(remaining: number, total: number): string {
  if (total === 0) return 'text-foreground'
  const pct = remaining / total
  if (pct > 0.5) return 'text-green-600'
  if (pct > 0.25) return 'text-yellow-600'
  return 'text-red-600'
}

export function MatchupTimer({
  bracketId,
  initialSeconds,
  onTimerExpire,
}: MatchupTimerProps) {
  const [timerDuration, setTimerDuration] = useState<number | null>(initialSeconds)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [customSeconds, setCustomSeconds] = useState('')
  const [isPending, startTransition] = useTransition()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onTimerExpireRef = useRef(onTimerExpire)
  onTimerExpireRef.current = onTimerExpire

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // Timer countdown logic
  useEffect(() => {
    if (isRunning && remaining !== null && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev === null || prev <= 1) {
            // Timer expired
            if (intervalRef.current) clearInterval(intervalRef.current)
            setIsRunning(false)
            onTimerExpireRef.current()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, remaining])

  const startTimer = useCallback(
    (seconds: number) => {
      setTimerDuration(seconds)
      setRemaining(seconds)
      setIsRunning(true)
      setShowSetup(false)

      // Persist timer setting to bracket
      startTransition(async () => {
        await updateBracketVotingSettings({
          bracketId,
          votingTimerSeconds: seconds,
        })
      })
    },
    [bracketId]
  )

  const pauseTimer = () => {
    setIsRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const resumeTimer = () => {
    if (remaining !== null && remaining > 0) {
      setIsRunning(true)
    }
  }

  const cancelTimer = () => {
    setIsRunning(false)
    setRemaining(null)
    setTimerDuration(null)
    if (intervalRef.current) clearInterval(intervalRef.current)

    // Clear timer from bracket settings
    startTransition(async () => {
      await updateBracketVotingSettings({
        bracketId,
        votingTimerSeconds: null,
      })
    })
  }

  const handleCustomSubmit = () => {
    const parsed = parseInt(customSeconds, 10)
    if (!isNaN(parsed) && parsed > 0 && parsed <= 3600) {
      startTimer(parsed)
      setCustomSeconds('')
    }
  }

  // No active timer
  if (remaining === null && !showSetup) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">No timer</span>
        <button
          onClick={() => setShowSetup(true)}
          className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted/50"
        >
          Set Timer
        </button>
      </div>
    )
  }

  // Timer setup UI
  if (showSetup) {
    return (
      <div className="flex items-center gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.seconds}
            onClick={() => startTimer(preset.seconds)}
            disabled={isPending}
            className="rounded-md bg-muted px-2 py-1 text-xs font-medium hover:bg-muted/80 disabled:opacity-50"
          >
            {preset.label}
          </button>
        ))}
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={customSeconds}
            onChange={(e) => setCustomSeconds(e.target.value)}
            placeholder="sec"
            min={1}
            max={3600}
            className="w-14 rounded-md border px-1.5 py-1 text-xs"
          />
          <button
            onClick={handleCustomSubmit}
            disabled={isPending || !customSeconds}
            className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Go
          </button>
        </div>
        <button
          onClick={() => setShowSetup(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    )
  }

  // Active timer display
  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-lg font-mono font-bold ${getTimerColor(remaining ?? 0, timerDuration ?? 0)}`}
      >
        {formatTime(remaining ?? 0)}
      </span>

      {isRunning ? (
        <button
          onClick={pauseTimer}
          className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted/50"
        >
          Pause
        </button>
      ) : (
        <button
          onClick={resumeTimer}
          className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted/50"
        >
          Resume
        </button>
      )}

      <button
        onClick={cancelTimer}
        className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        Cancel
      </button>

      {remaining === 0 && (
        <span className="animate-pulse text-xs font-semibold text-red-600">
          Time&apos;s up!
        </span>
      )}
    </div>
  )
}
