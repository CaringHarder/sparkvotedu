import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/polls/[pollId]/upload-url
 *
 * Generates a signed upload URL for a poll option image.
 * Requires teacher authentication.
 *
 * The client compresses the image, requests a signed URL here,
 * then uploads directly to Supabase Storage via PUT.
 *
 * NOTE: The 'poll-images' bucket must be created in Supabase Storage
 * (Dashboard > Storage > New Bucket). Set it to public if you want
 * images accessible without auth, or configure RLS policies.
 */

const uploadUrlSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().regex(/^image\/(jpeg|png|webp|gif)$/),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { pollId } = await params

  try {
    const body = await request.json()
    const parsed = uploadUrlSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { fileName, contentType } = parsed.data

    // Sanitize filename: remove path separators and special chars
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `poll-options/${teacher.id}/${pollId}/${Date.now()}-${safeName}`

    const supabase = createAdminClient()
    const { data, error } = await supabase.storage
      .from('poll-images')
      .createSignedUploadUrl(path)

    if (error) {
      console.error('Failed to create signed upload URL:', error)
      return NextResponse.json(
        { error: 'Failed to create upload URL' },
        { status: 500 }
      )
    }

    // Construct the public URL for the uploaded file
    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/poll-images/${path}`

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      publicUrl,
      contentType,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to process upload request' },
      { status: 500 }
    )
  }
}
