export interface ImageUploadResult {
  publicUrl: string | null
  error?: string
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function extFromType(contentType: string): string {
  switch (contentType) {
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    default:
      return 'jpg'
  }
}

/**
 * Download an external image URL and re-upload it to Supabase Storage
 * via a signed URL endpoint.
 *
 * Never throws -- always returns a result object with publicUrl or error.
 */
export async function downloadAndReuploadImage(
  externalUrl: string,
  uploadEndpoint: string
): Promise<ImageUploadResult> {
  try {
    const response = await fetch(externalUrl)
    if (!response.ok) {
      return {
        publicUrl: null,
        error: `Failed to download image: ${response.status} ${response.statusText}`,
      }
    }

    const blob = await response.blob()
    if (!blob.type.startsWith('image/')) {
      return {
        publicUrl: null,
        error: `Downloaded file is not an image: ${blob.type}`,
      }
    }

    const contentType = ALLOWED_TYPES.includes(blob.type)
      ? blob.type
      : 'image/jpeg'
    const ext = extFromType(contentType)
    const fileName = `csv-import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const uploadRes = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, contentType }),
    })

    if (!uploadRes.ok) {
      return {
        publicUrl: null,
        error: `Failed to get upload URL: ${uploadRes.status}`,
      }
    }

    const { signedUrl, publicUrl } = (await uploadRes.json()) as {
      signedUrl: string
      publicUrl: string
    }

    const putRes = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: blob,
    })

    if (!putRes.ok) {
      return {
        publicUrl: null,
        error: `Failed to upload image: ${putRes.status}`,
      }
    }

    return { publicUrl }
  } catch (err) {
    return {
      publicUrl: null,
      error: err instanceof Error ? err.message : 'Unknown error during image upload',
    }
  }
}

interface ProcessableItem {
  id: string
  pendingImageUrl?: string
}

/**
 * Process CSV image URLs sequentially: download each external image and
 * re-upload to Supabase Storage. Sequential to avoid rate limits.
 *
 * Returns a Map of item id -> publicUrl for successful uploads.
 */
export async function processCSVImages(
  items: ProcessableItem[],
  uploadEndpoint: string,
  onProgress?: (completed: number, total: number) => void,
  onWarning?: (id: string, error: string) => void
): Promise<Map<string, string>> {
  const pending = items.filter((item) => item.pendingImageUrl)
  const results = new Map<string, string>()

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i]
    const result = await downloadAndReuploadImage(
      item.pendingImageUrl!,
      uploadEndpoint
    )

    if (result.publicUrl) {
      results.set(item.id, result.publicUrl)
    } else if (result.error) {
      onWarning?.(item.id, result.error)
    }

    onProgress?.(i + 1, pending.length)
  }

  return results
}
