import type { PollStatus } from '@/lib/poll/types'

const statusStyles: Record<PollStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  archived: 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400',
}

export function PollStatusBadge({ status }: { status: PollStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        statusStyles[status] ?? statusStyles.draft
      }`}
    >
      {status}
    </span>
  )
}
