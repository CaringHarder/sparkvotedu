'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, FileText, AlertTriangle, Loader2, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseEntrantCSV, type ParsedEntrant } from '@/lib/bracket/csv-parser'
import { processCSVImages } from '@/lib/utils/csv-image-upload'

interface CSVUploadProps {
  onEntrantsParsed: (entrants: Array<{ name: string; seed: number; logoUrl?: string }>) => void
  maxEntrants: number
  bracketId?: string | null
}

export function CSVUpload({ onEntrantsParsed, maxEntrants, bracketId }: CSVUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ParsedEntrant[] | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ completed: number; total: number } | null>(null)
  const [imageWarnings, setImageWarnings] = useState<Array<{ name: string; error: string }>>([])

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
        const parsed = await parseEntrantCSV(file)

        if (parsed.length === 0) {
          setError('No entrants found in the CSV file. Please check the format.')
          setIsLoading(false)
          return
        }

        if (parsed.length > maxEntrants) {
          setTruncated(true)
          setPreview(parsed.slice(0, maxEntrants))
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
        // Reset file input so the same file can be selected again
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    },
    [maxEntrants]
  )

  const handleConfirm = useCallback(async () => {
    if (!preview) return

    const hasImages = preview.some((e) => e.logoUrl)

    if (!hasImages) {
      onEntrantsParsed(preview)
      setPreview(null)
      setTruncated(false)
      return
    }

    setIsUploading(true)
    setUploadProgress(null)
    setImageWarnings([])

    const items = preview.map((e, i) => ({
      id: String(i),
      pendingImageUrl: e.logoUrl,
    }))

    const uploadEndpoint = `/api/brackets/${bracketId ?? 'draft'}/upload-url`

    const warnings: Array<{ name: string; error: string }> = []

    const imageMap = await processCSVImages(
      items,
      uploadEndpoint,
      (completed, total) => setUploadProgress({ completed, total }),
      (id, err) => {
        const idx = Number(id)
        warnings.push({ name: preview[idx].name, error: err })
      }
    )

    setImageWarnings(warnings)

    const enrichedEntrants = preview.map((e, i) => ({
      name: e.name,
      seed: e.seed,
      logoUrl: imageMap.get(String(i)) || undefined,
    }))

    setIsUploading(false)
    setUploadProgress(null)
    onEntrantsParsed(enrichedEntrants)
    setPreview(null)
    setTruncated(false)
  }, [preview, bracketId, onEntrantsParsed])

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
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Upload a CSV file with a &quot;name&quot; column. Optional &quot;logo&quot; column for image URLs. One entrant per row.
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
              {preview.length} entrant{preview.length !== 1 ? 's' : ''} found
            </span>
          </div>

          {truncated && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500 bg-amber-50 p-3 dark:bg-amber-950/20">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                CSV had more entries than the bracket size ({maxEntrants}). Only
                the first {maxEntrants} will be used.
              </p>
            </div>
          )}

          {preview.length < maxEntrants && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500 bg-amber-50 p-3 dark:bg-amber-950/20">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Only {preview.length} entrant{preview.length !== 1 ? 's' : ''}{' '}
                found, but {maxEntrants} are needed. You can add more manually
                after importing.
              </p>
            </div>
          )}

          {/* Preview list */}
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
            {preview.map((entrant, i) => (
              <div
                key={`${entrant.name}-${i}`}
                className="flex items-center gap-2 text-sm"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted font-mono text-xs">
                  {i + 1}
                </span>
                <span className="truncate">{entrant.name}</span>
                {entrant.logoUrl && (
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
                      {w.name}: {w.error}
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
                'Use These Entrants'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
