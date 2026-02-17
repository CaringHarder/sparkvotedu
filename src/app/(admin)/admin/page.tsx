import { Suspense } from 'react'
import { getAdminStats, getTeacherList } from '@/lib/dal/admin'
import { StatBar } from '@/components/admin/stat-bar'
import { TeacherFilters } from '@/components/admin/teacher-filters'
import { TeacherListWrapper } from '@/components/admin/teacher-list-wrapper'

interface AdminOverviewPageProps {
  searchParams: Promise<{
    search?: string
    tier?: string
    status?: string
    page?: string
  }>
}

export default async function AdminOverviewPage({
  searchParams,
}: AdminOverviewPageProps) {
  const params = await searchParams
  const page = params.page ? parseInt(params.page, 10) : 1
  const status =
    params.status === 'active' || params.status === 'inactive'
      ? params.status
      : undefined

  const [stats, teacherResult] = await Promise.all([
    getAdminStats(),
    getTeacherList({
      search: params.search,
      tier: params.tier,
      status,
      page,
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground">
          Platform statistics and teacher management.
        </p>
      </div>

      <StatBar stats={stats} />

      <div className="space-y-4">
        <Suspense fallback={null}>
          <TeacherFilters />
        </Suspense>
        <TeacherListWrapper
          teachers={teacherResult.teachers}
          total={teacherResult.total}
          page={teacherResult.page}
          pageSize={teacherResult.pageSize}
          totalPages={teacherResult.totalPages}
        />
      </div>
    </div>
  )
}
