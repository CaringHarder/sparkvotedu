'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { updateSessionName } from '@/actions/class-session'

interface EditableSessionNameProps {
  sessionId: string
  value: string | null
  fallback: string
  className?: string
}

export function EditableSessionName({
  sessionId,
  value,
  fallback,
  className,
}: EditableSessionNameProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value ?? '')
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  function handleStartEdit() {
    setEditValue(value ?? '')
    setIsEditing(true)
  }

  function handleSave() {
    setIsEditing(false)
    const trimmed = editValue.trim()
    // Only save if value actually changed
    if (trimmed === (value ?? '')) return
    startTransition(async () => {
      const result = await updateSessionName(sessionId, editValue)
      if (!result.error) {
        router.refresh()
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditValue(value ?? '')
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isPending}
        placeholder={fallback}
        className={`rounded-md border bg-background px-2 py-1 font-bold focus:outline-none focus:ring-2 focus:ring-ring ${className ?? ''} ${isPending ? 'opacity-60' : ''}`}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={handleStartEdit}
      disabled={isPending}
      className={`group inline-flex items-center gap-2 rounded-md px-1 -mx-1 hover:bg-muted/50 transition-colors cursor-pointer ${isPending ? 'opacity-60' : ''}`}
    >
      <span className={className}>{value || fallback}</span>
      <Pencil className="h-4 w-4 opacity-0 group-hover:opacity-60 transition-opacity" />
    </button>
  )
}
