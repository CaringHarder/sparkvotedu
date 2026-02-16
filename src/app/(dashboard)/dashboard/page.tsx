import { Suspense } from 'react'
import { DashboardShell } from '@/components/dashboard/shell'
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton'

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardShell />
    </Suspense>
  )
}
