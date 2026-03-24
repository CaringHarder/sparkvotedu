'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, FileText, AlertTriangle, Loader2, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parsePollOptionCSV, type ParsedPollOption } from '@/lib/poll/csv-parser'
import { processCSVImages } from '@/lib/utils/csv-image-upload'

interface PollCSVUploadProps {
  onImportComplete: (options: Array<{ text: string; imageUrl?: string }>) => void
  maxOptions: number
  pollId?: string
}

export function PollCSVUpload({ onImportComplete, maxOptions, pollId }: PollCSVUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ParsedPollOption[] | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ completed: number; total: number } | null>(null)
  const [imageWarnings, setImageWarnings] = useState<Array<{ text: string; error: string }>>([])

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setIsLoading(true)
      setError(null)
      setPreview(null)
      setTruncated(false)
      setImageWarnings([])

      try {
        const parsed = await parsePollOptionCSV(file)

        if (parsed.length === 0) {
          setError('No options found in the CSV file. Please check the format.')
          setIsLoading(false)
          return
        }

        if (parsed.length > maxOptions) {
          setTruncated(true)
          setPreview(parsed.slice(0, maxOptions))
        } else {
          setPreview(parsed)
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to parse CSV file. Please check the format.'
        )
      } finally {
        setIsLoading(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    },
    [maxOptions]
  )

  const handleConfirm = useCallback(async () => {
    if (!preview) return

    const hasImages = preview.some((p) => p.imageUrl)

    if (!hasImages) {
      onImportComplete(preview.map((p) => ({ text: p.text })))
      setPreview(null)
      setTruncated(false)
      return
    }

    setIsUploading(true)
    setUploadProgress(null)
    setImageWarnings([])

    const items = preview.map((p, i) => ({
      id: String(i),
      pendingImageUrl: p.imageUrl,
    }))

    const uploadEndpoint = `/api/polls/${pollId ?? 'draft'}/upload-url`

    const warnings: Array<{ text: string; error: string }> = []

    const imageMap = await processCSVImages(
      items,
      uploadEndpoint,
      (completed, total) => setUploadProgress({ completed, total }),
      (id, err) => {
        const idx = Number(id)
        warnings.push({ text: preview[idx].text, error: err })
      }
    )

    setImageWarnings(warnings)

    const finalOptions = preview.map((p, i) => ({
      text: p.text,
      imageUrl: imageMap.get(String(i)) || undefined,
    }))

    setIsUploading(false)
    setUploadProgress(null)
    onImportComplete(finalOptions)
    setPreview(null)
    setTruncated(false)
  }, [preview, pollId, onImportComplete])

  const handleCancel = useCallback(() => {
    setPreview(null)
    setTruncated(false)
    setError(null)
    setImageWarnings([])
    setIsUploading(false)
    setUploadProgress(null)
  }, [])

  return (
    <div className="space-y-3">
      {/* Upload button */}
      {!preview && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <Upload className="mr-1 h-4 w-4" />
                Upload CSV
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Upload a CSV with a &quot;text&quot; column. Optional &quot;image&quot; column for image URLs.
          </p>
        </>
      )}

      {/* Error display */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {preview.length} option{preview.length !== 1 ? 's' : ''} found
            </span>
          </div>

          {truncated && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500 bg-amber-50 p-3 dark:bg-amber-950/20">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                CSV had more than {maxOptions} options. Only the first {maxOptions} will be used.
              </p>
            </div>
          )}

          {/* Preview list */}
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
            {preview.map((option, i) => (
              <div
                key={`${option.text}-${i}`}
                className="flex items-center gap-2 text-sm"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted font-mono text-xs">
                  {i + 1}
                </span>
                <span className="truncate">{option.text}</span>
                {option.imageUrl && (
                  <Camera className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>

          {/* Image warnings */}
          {imageWarnings.length > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500 bg-amber-50 p-3 dark:bg-amber-950/20">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="text-sm text-amber-700 dark:text-amber-400">
                <p className="font-medium">Some images could not be uploaded:</p>
                <ul className="mt-1 list-disc pl-4">
                  {imageWarnings.map((w, i) => (
                    <li key={i}>
                      {w.text}: {w.error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Upload progress */}
          {isUploading && uploadProgress && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading images... {uploadProgress.completed}/{uploadProgress.total}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              className="flex-1"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Use These Options'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
