'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Zap, List } from 'lucide-react'
import { PollForm } from '@/components/poll/poll-form'
import { PollWizard } from '@/components/poll/poll-wizard'
import {
  POLL_TEMPLATES,
  POLL_TEMPLATE_CATEGORIES,
  type PollTemplate,
} from '@/lib/poll/templates'

type CreationMode = 'quick' | 'wizard'

export default function CreatePollPage() {
  const [mode, setMode] = useState<CreationMode>('quick')
  const [selectedTemplate, setSelectedTemplate] = useState<PollTemplate | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  function handleTemplateSelect(template: PollTemplate) {
    setSelectedTemplate(template)
    // Auto-switch to quick create when selecting a template
    setMode('quick')
  }

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
        <h1 className="text-2xl font-bold">Create New Poll</h1>
        <p className="text-muted-foreground">
          Create a poll for your students to vote on.
        </p>
      </div>

      {/* Template browser */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Start from a template
        </h2>
        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {POLL_TEMPLATE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() =>
                setActiveCategory((prev) => (prev === cat ? null : cat))
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background hover:bg-accent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Template cards */}
        {activeCategory && (
          <div className="grid gap-2 sm:grid-cols-2">
            {POLL_TEMPLATES.filter((t) => t.category === activeCategory).map(
              (t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTemplateSelect(t)}
                  className={`rounded-lg border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5 ${
                    selectedTemplate?.id === t.id
                      ? 'border-primary bg-primary/5'
                      : ''
                  }`}
                >
                  <p className="text-sm font-medium">{t.question}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.options.length} options &middot;{' '}
                    <span className="capitalize">{t.pollType}</span>
                  </p>
                </button>
              )
            )}
          </div>
        )}
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

      {/* Creation form */}
      {mode === 'quick' ? (
        <PollForm
          key={selectedTemplate?.id ?? 'quick'}
          template={selectedTemplate}
        />
      ) : (
        <PollWizard
          key={selectedTemplate?.id ?? 'wizard'}
          template={selectedTemplate}
        />
      )}
    </div>
  )
}
