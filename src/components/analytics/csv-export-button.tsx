'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import Papa from 'papaparse'

interface CSVExportButtonProps {
  exportAction: () => Promise<
    { data: Record<string, unknown>[]; filename: string } | { error: string }
  >
  label?: string
}

/**
 * Tier-gated CSV download button.
 *
 * Calls a server action to fetch export data (with server-side tier check),
 * then generates CSV client-side using PapaParse and triggers download.
 */
export function CSVExportButton({
  exportAction,
  label = 'Export CSV',
}: CSVExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport() {
    setIsExporting(true)
    try {
      const result = await exportAction()

      if ('error' in result) {
        alert(result.error)
        return
      }

      const csv = Papa.unparse(result.data)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${result.filename.replace(/[^a-z0-9]/gi, '_')}_analytics.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to export data')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting}
      className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {isExporting ? 'Exporting...' : label}
    </button>
  )
}
