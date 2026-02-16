'use client'

import { useRef, useState } from 'react'
import { Camera, X, Loader2 } from 'lucide-react'
import { compressImage } from '@/lib/utils/image-compress'

interface OptionImageUploadProps {
  pollId: string
  onImageUrl: (url: string) => void
  existingImageUrl?: string | null
  onRemove?: () => void
}

/**
 * Image upload component for poll options.
 *
 * Flow:
 * 1. User clicks "Add Image" button (triggers hidden file input)
 * 2. Client compresses image via Canvas API (max 1200px, JPEG 0.8)
 * 3. Fetches a signed upload URL from /api/polls/[pollId]/upload-url
 * 4. Uploads compressed file directly to Supabase Storage via PUT
 * 5. Calls onImageUrl with the public URL
 *
 * Used inside OptionList from 05-03 -- each option row can have
 * an optional image upload.
 */
export function OptionImageUpload({
  pollId,
  onImageUrl,
  existingImageUrl,
  onRemove,
}: OptionImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    existingImageUrl ?? null
  )

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setUploading(true)

    try {
      // 1. Compress image
      const compressed = await compressImage(file)

      // 2. Get signed upload URL
      const urlRes = await fetch(`/api/polls/${pollId}/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: compressed.name,
          contentType: compressed.type,
        }),
      })

      if (!urlRes.ok) {
        const data = await urlRes.json()
        throw new Error(data.error ?? 'Failed to get upload URL')
      }

      const { signedUrl, publicUrl } = await urlRes.json()

      // 3. Upload directly to Supabase Storage
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': compressed.type },
        body: compressed,
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload image')
      }

      // 4. Set preview and notify parent
      setPreviewUrl(publicUrl)
      onImageUrl(publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function handleRemove() {
    setPreviewUrl(null)
    setError(null)
    onRemove?.()
  }

  return (
    <div className="flex items-center gap-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Preview or upload button */}
      {previewUrl ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Option image"
            className="h-12 w-12 rounded-md border object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm transition-opacity hover:opacity-80"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Camera className="h-3.5 w-3.5" />
              Add Image
            </>
          )}
        </button>
      )}

      {/* Error message */}
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  )
}
