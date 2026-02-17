'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { TeacherList } from './teacher-list'
import { TeacherDetailPanel } from './teacher-detail-panel'
import { getTeacherDetailAction } from '@/actions/admin'
import type { TeacherListItem, TeacherDetail } from '@/lib/dal/admin'

interface TeacherListWrapperProps {
  teachers: TeacherListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function TeacherListWrapper({
  teachers,
  total,
  page,
  pageSize,
  totalPages,
}: TeacherListWrapperProps) {
  const router = useRouter()
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(
    null
  )
  const [teacherDetail, setTeacherDetail] = useState<TeacherDetail | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSelectTeacher = useCallback(
    (teacherId: string) => {
      // Toggle: if clicking the same teacher, close the panel
      if (teacherId === selectedTeacherId) {
        setSelectedTeacherId(null)
        setTeacherDetail(null)
        return
      }

      setSelectedTeacherId(teacherId)
      startTransition(async () => {
        const detail = await getTeacherDetailAction(teacherId)
        setTeacherDetail(detail)
      })
    },
    [selectedTeacherId]
  )

  const handleClosePanel = useCallback(() => {
    setSelectedTeacherId(null)
    setTeacherDetail(null)
  }, [])

  // Re-fetch teacher detail after an action modifies it and refresh the page data
  const handleRefresh = useCallback(() => {
    if (selectedTeacherId) {
      startTransition(async () => {
        const detail = await getTeacherDetailAction(selectedTeacherId)
        setTeacherDetail(detail)
      })
    }
    router.refresh()
  }, [selectedTeacherId, router])

  return (
    <div className="relative">
      <TeacherList
        teachers={teachers}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        selectedTeacherId={selectedTeacherId}
        onSelectTeacher={handleSelectTeacher}
      />
      <TeacherDetailPanel
        teacher={isPending ? null : teacherDetail}
        open={selectedTeacherId !== null}
        onClose={handleClosePanel}
        onRefresh={handleRefresh}
      />
    </div>
  )
}
