export interface Highlight {
  rank: number
  title: string
  key_point: string
  source: string
  link_label: string
  url: string
  url_short: string
  published_display: string
  date_short: string
}

export interface Source {
  index: number
  title: string
  source: string
  link_label: string
  url: string
  url_short: string
  published_display: string
  date_short: string
}

export interface SearchResult {
  keyword: string
  period_days: number
  generated_at: string
  item_count: number
  three_line_summary: string[]
  overview: string
  highlights: Highlight[]
  sources: Source[]
}

export async function fetchExamples(): Promise<string[]> {
  const res = await fetch('/api/examples')
  if (!res.ok) throw new Error('예시 키워드를 불러오지 못했습니다.')
  const data = await res.json()
  return data.keywords
}

export async function searchKeyword(keyword: string): Promise<SearchResult> {
  const res = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail ?? '검색에 실패했습니다.')
  return data
}

export async function sendReportEmail(keyword: string, email: string): Promise<string> {
  const res = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, email }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail ?? '이메일 발송에 실패했습니다.')
  return data.message
}
