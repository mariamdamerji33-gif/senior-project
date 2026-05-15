/** Escape a single CSV field (RFC-style; works with Excel when BOM is used). */
export function escapeCsvField(value: string): string {
  const s = String(value ?? '')
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Trigger download of a CSV file in the browser. */
export function downloadCsv(filename: string, header: string[], rows: string[][]): void {
  const lines = [header.map(escapeCsvField).join(','), ...rows.map((r) => r.map(escapeCsvField).join(','))]
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
