'use client'

import { useCallback, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { Camera, Link, Loader2, Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getCroppedImageBlob } from '@/lib/utils/image-crop'

interface ImageUploadModalProps {
  open: boolean
  onClose: () => void
  onImageUrl: (url: string) => void
  /** API endpoint that returns { signedUrl, publicUrl } */
  uploadEndpoint: string
  /** Aspect ratio for cropping (e.g. 1 for square). Undefined = free crop. */
  aspectRatio?: number
  title?: string
}

type Phase = 'idle' | 'cropping' | 'uploading'
type Tab = 'upload' | 'url'

export function ImageUploadModal({
  open,
  onClose,
  onImageUrl,
  uploadEndpoint,
  aspectRatio,
  title = 'Upload Image',
}: ImageUploadModalProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [activeTab, setActiveTab] = useState<Tab>('upload')
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCountRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  function reset() {
    setPhase('idle')
    setActiveTab('upload')
    setImageSrc(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedArea(null)
    setUrlInput('')
    setError(null)
    setIsDragging(false)
    dragCountRef.current = 0
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) handleClose()
  }

  function loadFileAsDataUrl(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, or WebP)')
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result as string)
      setPhase('cropping')
    }
    reader.readAsDataURL(file)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) loadFileAsDataUrl(file)
    // Reset so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragCountRef.current++
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragCountRef.current--
    if (dragCountRef.current === 0) setIsDragging(false)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCountRef.current = 0
    const file = e.dataTransfer.files?.[0]
    if (file) loadFileAsDataUrl(file)
  }

  function handleLoadUrl() {
    const url = urlInput.trim()
    if (!url) return
    setError(null)
    // Attempt to load the URL as an image
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setImageSrc(url)
      setPhase('cropping')
    }
    img.onerror = () => {
      setError('Could not load image. The URL may be invalid or blocked by CORS.')
    }
    img.src = url
  }

  function handleUrlKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleLoadUrl()
    }
  }

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels)
  }, [])

  function handleChangeImage() {
    setImageSrc(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedArea(null)
    setPhase('idle')
  }

  async function handleApplyAndUpload() {
    if (!imageSrc || !croppedArea) return

    setPhase('uploading')
    setError(null)

    try {
      // 1. Crop the image
      const croppedBlob = await getCroppedImageBlob(imageSrc, croppedArea)

      // 2. Get signed upload URL
      const fileName = `cropped-${Date.now()}.jpg`
      const urlRes = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          contentType: 'image/jpeg',
        }),
      })

      if (!urlRes.ok) {
        const data = await urlRes.json()
        throw new Error(data.error ?? 'Failed to get upload URL')
      }

      const { signedUrl, publicUrl } = await urlRes.json()

      // 3. Upload to storage
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: croppedBlob,
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload image')
      }

      // 4. Notify parent and close
      onImageUrl(publicUrl)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setPhase('cropping')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Error banner */}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Phase: Idle — tab selection + input */}
        {phase === 'idle' && (
          <div className="space-y-4">
            {/* Custom segmented control */}
            <div className="flex rounded-lg border bg-muted p-1">
              <button
                type="button"
                onClick={() => { setActiveTab('upload'); setError(null) }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                Upload
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('url'); setError(null) }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'url'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Link className="h-3.5 w-3.5" />
                Paste URL
              </button>
            </div>

            {activeTab === 'upload' && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50'
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Camera className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {isDragging ? 'Drop image here' : 'Drag & drop or click to browse'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      JPEG, PNG, or WebP
                    </p>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'url' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={handleUrlKeyDown}
                  />
                  <Button
                    type="button"
                    onClick={handleLoadUrl}
                    disabled={!urlInput.trim()}
                    size="sm"
                  >
                    Load
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste a direct link to an image. Some sites may block loading due to CORS.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Phase: Cropping */}
        {phase === 'cropping' && imageSrc && (
          <div className="space-y-4">
            <div className="relative h-64 w-full overflow-hidden rounded-lg bg-muted">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspectRatio}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            {/* Zoom slider */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
            </div>

            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleChangeImage}
              >
                Change Image
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApplyAndUpload}
              >
                Apply & Upload
              </Button>
            </div>
          </div>
        )}

        {/* Phase: Uploading */}
        {phase === 'uploading' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Cropping & uploading...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
