import { Trophy, Calendar, Eye, BookOpen, BarChart3, ListOrdered } from 'lucide-react'

// ---- Bracket metadata bar ----

const BRACKET_TYPE_LABELS: Record<string, string> = {
  double_elimination: 'Double Elim',
  round_robin: 'Round Robin',
  predictive: 'Predictive',
  sports: 'Sports',
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface BracketMetadataBarProps {
  bracketType: string
  status: string
  viewingMode: string
  roundRobinPacing?: string | null
  predictiveMode?: string | null
  sportGender?: string | null
  entrantCount: number
  sessionName?: string | null
  createdAt: string
}

export function BracketMetadataBar({
  bracketType,
  viewingMode,
  roundRobinPacing,
  predictiveMode,
  sportGender,
  entrantCount,
  sessionName,
  createdAt,
}: BracketMetadataBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {/* Bracket type badge */}
      {BRACKET_TYPE_LABELS[bracketType] && (
        <span
          className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${
            bracketType === 'sports'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
          }`}
        >
          {BRACKET_TYPE_LABELS[bracketType]}
        </span>
      )}

      {/* Sport gender */}
      {bracketType === 'sports' && sportGender && (
        <span className="whitespace-nowrap text-[10px] text-muted-foreground">
          {sportGender === 'mens' ? "Men's" : "Women's"}
        </span>
      )}

      {/* Viewing mode badge (single elimination only) */}
      {bracketType === 'single_elimination' && viewingMode && (
        <span
          className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${
            viewingMode === 'simple'
              ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          <Eye className="mr-0.5 inline h-2.5 w-2.5" />
          {viewingMode === 'simple' ? 'Simple' : 'Advanced'}
        </span>
      )}

      {/* Pacing badge (round robin only) */}
      {bracketType === 'round_robin' && (
        <span className="whitespace-nowrap rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
          {roundRobinPacing === 'all_at_once' ? 'All At Once' : 'Round by Round'}
        </span>
      )}

      {/* Prediction mode badge (predictive only) */}
      {bracketType === 'predictive' && (
        <span className="whitespace-nowrap rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
          {predictiveMode === 'predict_then_vote' ? 'Predict Then Vote' : 'Vote Only'}
        </span>
      )}

      {/* Entrant count */}
      <span className="flex items-center gap-1 text-muted-foreground">
        <Trophy className="h-3.5 w-3.5" />
        {entrantCount} entrants
      </span>

      {/* Created date */}
      <span className="flex items-center gap-1 text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        {formatDate(createdAt)}
      </span>

      {/* Session name badge */}
      {sessionName && (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          <BookOpen className="h-2.5 w-2.5" />
          {sessionName.length > 15
            ? sessionName.slice(0, 15) + '...'
            : sessionName}
        </span>
      )}
    </div>
  )
}

// ---- Poll metadata bar ----

interface PollMetadataBarProps {
  pollType: string
  sessionName?: string | null
  optionCount: number
  createdAt: string
}

export function PollMetadataBar({
  pollType,
  sessionName,
  optionCount,
  createdAt,
}: PollMetadataBarProps) {
  const typeConfig: Record<string, { label: string; className: string }> = {
    simple: { label: 'Simple', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
    ranked: { label: 'Ranked', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  }

  const config = typeConfig[pollType] ?? typeConfig.simple
  const TypeIcon = pollType === 'ranked' ? ListOrdered : BarChart3

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {/* Poll type badge */}
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.className}`}>
        <TypeIcon className="h-2.5 w-2.5" />
        {config.label}
      </span>

      {/* Option count */}
      <span className="text-muted-foreground">
        {optionCount} options
      </span>

      {/* Created date */}
      <span className="flex items-center gap-1 text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        {formatDate(createdAt)}
      </span>

      {/* Session name badge */}
      {sessionName && (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          <BookOpen className="h-2.5 w-2.5" />
          {sessionName.length > 15
            ? sessionName.slice(0, 15) + '...'
            : sessionName}
        </span>
      )}
    </div>
  )
}
