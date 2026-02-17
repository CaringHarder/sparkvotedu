'use client'

import { useState } from 'react'
import { Camera, X } from 'lucide-react'
import { ImageUploadModal } from '@/components/shared/image-upload-modal'

interface EntrantImageUploadProps {
  /** Bracket ID used to scope the upload URL endpoint */
  bracketId: string | null
  /** Called with the public URL after successful upload */
  onImageUrl: (url: string) => void
  /** Existing image URL to show as preview */
  existingImageUrl?: string | null
  /** Called when user removes the image */
  onRemove?: () => void
}

/**
 * Image upload component for bracket entrants.
 *
 * Opens a modal with drag-and-drop, URL paste, and cropping (square aspect).
 * Preview/remove UI stays inline. Props interface unchanged from original.
 */
export function EntrantImageUpload({
  bracketId,
  onImageUrl,
  existingImageUrl,
  onRemove,
}: EntrantImageUploadProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    existingImageUrl ?? null
  )

  const uploadBracketId = bracketId ?? 'draft'
  const uploadEndpoint = `/api/brackets/${uploadBracketId}/upload-url`

  function handleImageUrl(url: string) {
    setPreviewUrl(url)
    onImageUrl(url)
  }

  function handleRemove() {
    setPreviewUrl(null)
    onRemove?.()
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Preview or upload button */}
      {previewUrl ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Entrant image"
            className="h-8 w-8 rounded border object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm transition-opacity hover:opacity-80"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded border border-dashed text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          title="Add image"
        >
          <Camera className="h-3.5 w-3.5" />
        </button>
      )}

      <ImageUploadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onImageUrl={handleImageUrl}
        uploadEndpoint={uploadEndpoint}
        aspectRatio={1}
        title="Upload Entrant Logo"
      />
    </div>
  )
}
