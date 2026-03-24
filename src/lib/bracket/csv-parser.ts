import Papa from 'papaparse'

export interface ParsedEntrant {
  name: string
  seed: number
  logoUrl?: string
}

/**
 * Parse a CSV file into an array of entrant objects.
 * Accepts CSVs with headers: 'name', 'entrant', 'team', or uses the first column.
 * Automatically trims whitespace, skips empty rows, and assigns seed positions.
 */
export function parseEntrantCSV(file: File): Promise<ParsedEntrant[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete(results) {
        const entrants: ParsedEntrant[] = results.data
          .map((row, index) => ({
            name: (row['name'] || row['entrant'] || row['team'] || Object.values(row)[0] || '').trim(),
            seed: index + 1,
            logoUrl: (row['image'] || row['logo'] || row['logourl'] || row['photo'] || '').trim() || undefined,
          }))
          .filter((e) => e.name.length > 0)
        resolve(entrants)
      },
      error(err) {
        reject(new Error(`CSV parse error: ${err.message}`))
      },
    })
  })
}
