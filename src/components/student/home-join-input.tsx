'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function HomeJoinInput() {
  const [code, setCode] = useState('')
  const router = useRouter()

  const isValid = /^\d{6}$/.test(code)

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    router.push(`/join/${code}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        placeholder="Class code"
        value={code}
        onChange={handleCodeChange}
        className="flex-1 rounded-lg border-2 border-input bg-background px-4 py-3 text-center text-2xl font-bold tracking-[0.2em] outline-none transition-colors placeholder:text-base placeholder:font-normal placeholder:tracking-normal focus:border-ring"
      />
      <Button
        type="submit"
        size="lg"
        disabled={!isValid}
        className="px-6 text-lg"
      >
        Join
      </Button>
    </form>
  )
}
