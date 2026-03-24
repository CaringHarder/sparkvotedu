import Papa from 'papaparse'

export interface ParsedPollOption {
  text: string
  imageUrl?: string
}

/**
 * Parse a CSV file into an array of poll option objects.
 * Accepts CSVs with headers: 'text', 'option', 'name', or uses the first column.
 * Image column aliases: 'image', 'imageurl', 'photo', 'url'.
 * Automatically trims whitespace, skips empty rows.
 */
export function parsePollOptionCSV(file: File): Promise<ParsedPollOption[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete(results) {
        const options: ParsedPollOption[] = results.data
          .map((row) => {
            const text = (
              row['text'] ||
              row['option'] ||
              row['name'] ||
              Object.values(row)[0] ||
              ''
            ).trim()

            const rawImage = (
              row['image'] ||
              row['imageurl'] ||
              row['photo'] ||
              row['url'] ||
              ''
            ).trim()

            return {
              text,
              imageUrl: rawImage || undefined,
            }
          })
          .filter((o) => o.text.length > 0)

        resolve(options)
      },
      error(err) {
        reject(new Error(`CSV parse error: ${err.message}`))
      },
    })
  })
}
