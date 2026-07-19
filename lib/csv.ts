export interface CSVParseOptions {
  trimValues?: boolean
  skipEmptyRows?: boolean
}

export interface ParsedRow {
  username: string
  review: string
}

export class CSVError extends Error {
  constructor(
    message: string,
    public row?: number,
    public column?: string
  ) {
    super(message)
    this.name = 'CSVError'
  }
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

export function parseCSV(
  text: string,
  options: CSVParseOptions = { trimValues: true, skipEmptyRows: true }
): ParsedRow[] {
  const lines = text.trim().split('\n')
  if (lines.length === 0) return []

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase())
  const usernameIndex = headers.indexOf('username')
  const reviewIndex = headers.indexOf('review')

  if (reviewIndex === -1) {
    throw new CSVError('Missing required "review" column in CSV header')
  }

  const rows: ParsedRow[] = []

  for (let lineNum = 1; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum]

    if (options.skipEmptyRows && !line.trim()) {
      continue
    }

    try {
      const fields = parseCSVLine(line)

      let review = fields[reviewIndex] || ''
      if (options.trimValues) {
        review = review.trim()
      }

      if (!review && options.skipEmptyRows) {
        continue
      }

      const username =
        usernameIndex !== -1 && fields[usernameIndex]
          ? fields[usernameIndex].trim()
          : ''

      rows.push({ username, review })
    } catch (error) {
      throw new CSVError(
        `Failed to parse line ${lineNum}: ${(error as Error).message}`,
        lineNum,
        'review'
      )
    }
  }

  return rows
}

export function generateCSV(
  data: Array<{
    username?: string
    review: string
    sentiment: string
    confidence: number
  }>
): string {
  const headers = ['username', 'review', 'sentiment', 'confidence']

  const rows = data.map((item) => [
    escapeCSVValue(item.username || ''),
    escapeCSVValue(item.review),
    escapeCSVValue(item.sentiment),
    (item.confidence * 100).toFixed(2),
  ])

  return [headers, ...rows].map((row) => row.join(',')).join('\n')
}

function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function downloadCSV(
  data: Array<{
    username?: string
    review: string
    sentiment: string
    confidence: number
  }>,
  filename: string = 'sentiment_results.csv'
): void {
  const csv = generateCSV(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

export function validateCSVFile(file: File, maxSizeMB: number = 10): string | null {
  const maxSizeBytes = maxSizeMB * 1024 * 1024

  if (!file.type.includes('text') && !file.name.endsWith('.csv')) {
    return 'File must be a CSV file'
  }

  if (file.size > maxSizeBytes) {
    return `File is too large. Maximum size is ${maxSizeMB}MB`
  }

  return null
}
// Cache buster: Sat Jul 18 18:02:45 PDT 2026
