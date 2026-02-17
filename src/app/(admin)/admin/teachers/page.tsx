import { Suspense } from 'react'
import { getTeacherList } from '@/lib/dal/admin'
import { TeacherFilters } from '@/components/admin/teacher-filters'
import { TeacherListWrapper } from '@/components/admin/teacher-list-wrapper'
import { CreateTeacherDialog } from '@/components/admin/create-teacher-dialog'

interface AdminTeachersPageProps {
  searchParams: Promise<{
    search?: string
    tier?: string
    status?: string
    page?: string
  }>
}

export default async function AdminTeachersPage({
  searchParams,
}: AdminTeachersPageProps) {
  const params = await searchParams
  const page = params.page ? parseInt(params.page, 10) : 1
  const status =
    params.status === 'active' || params.status === 'inactive'
      ? params.status
      : undefined

  const teacherResult = await getTeacherList({
    search: params.search,
    tier: params.tier,
    status,
    page,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teachers</h1>
          <p className="text-muted-foreground">
            Manage teacher accounts, subscriptions, and access.
          </p>
        </div>
        <CreateTeacherDialog />
      </div>

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
