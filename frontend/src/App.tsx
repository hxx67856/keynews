import { FormEvent, useCallback, useEffect, useState } from 'react'
import {
  fetchExamples,
  searchKeyword,
  sendReportEmail,
  type SearchResult,
} from './api'

export default function App() {
  const [keyword, setKeyword] = useState('')
  const [email, setEmail] = useState('')
  const [examples, setExamples] = useState<string[]>([])
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchExamples()
      .then(setExamples)
      .catch(() =>
        setExamples([
          '인공지능 규제', '반도체 수출', '기후 변화',
          'K-콘텐츠', '전기차 배터리', '사이버 보안',
        ]),
      )
  }, [])

  const handleSearch = useCallback(async (searchTerm?: string) => {
    const term = (searchTerm ?? keyword).trim()
    if (!term) {
      setError('키워드를 입력해 주세요.')
      return
    }

    setKeyword(term)
    setLoading(true)
    setError(null)
    setSuccess(null)
    setResult(null)

    try {
      const data = await searchKeyword(term)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [keyword])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    handleSearch()
  }

  const onSendEmail = async () => {
    const term = keyword.trim()
    const addr = email.trim()
    if (!term) {
      setError('먼저 키워드를 검색해 주세요.')
      return
    }
    if (!addr) {
      setError('이메일 주소를 입력해 주세요.')
      return
    }

    setSending(true)
    setError(null)
    setSuccess(null)

    try {
      const msg = await sendReportEmail(term, addr, result?.report_id)
      setSuccess(msg)
    } catch (err) {
      setError(err instanceof Error ? err.message : '이메일 발송에 실패했습니다.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <nav className="top-nav">
        <div className="nav-inner">
          <a className="nav-logo" href="/">
            <span className="logo-mark">IB</span>
            <span className="logo-text">Issue Briefing</span>
          </a>
          <span className="nav-meta">최근 7일 · Google News RSS</span>
        </div>
      </nav>

      <header className="hero-band">
        <div className="hero-dots" aria-hidden="true">
          <span className="dot dot-pink" />
          <span className="dot dot-orange" />
          <span className="dot dot-teal" />
          <span className="dot dot-purple" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <div className="hero-inner">
          <span className="badge-purple">Issue Briefing</span>
          <h1 className="hero-title">키워드 이슈를<br />한눈에 파악하세요</h1>
          <p className="hero-subtitle">
            키워드를 입력하면 최근 7일 이내 주요 이슈를 자동 수집하고, HTML 보고서를 생성해 드립니다.
          </p>
        </div>

        <div className="workspace-mockup">
          <div className="mockup-toolbar">
            <span className="mockup-dot" />
            <span className="mockup-dot" />
            <span className="mockup-dot" />
            <span className="mockup-label">이슈 검색 · 보고서 생성</span>
          </div>
          <div className="mockup-body">
            <form onSubmit={onSubmit}>
              <div className="search-row">
                <input
                  className="text-input"
                  type="text"
                  placeholder="예: 인공지능 규제, 반도체 수출..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  aria-label="검색 키워드"
                />
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? '보고서 생성 중...' : '이슈 검색'}
                </button>
              </div>
            </form>

            <div className="examples">
              <span className="examples-label">예시 키워드</span>
              {examples.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  className="pill-tab"
                  onClick={() => handleSearch(ex)}
                >
                  {ex}
                </button>
              ))}
            </div>

            <div className="email-row">
              <input
                className="text-input"
                type="email"
                placeholder="보고서를 받을 이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="이메일 주소"
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={onSendEmail}
                disabled={sending || loading}
              >
                {sending ? '발송 중...' : '이메일로 보고서 받기'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {loading && (
          <div className="loading">
            <div className="spinner" />
            <p>최근 7일 뉴스를 수집하고 보고서를 생성하고 있습니다...</p>
          </div>
        )}

        {result && !loading && (
          <div className="results">
            <div className="meta-bar">
              <span className="badge-tag badge-tag-purple">키워드: {result.keyword}</span>
              <span className="badge-tag badge-tag-green">수집 {result.item_count}건</span>
              <span className="badge-tag badge-tag-orange">최근 {result.period_days}일</span>
              <span className="badge-tag badge-tag-sky">{result.generated_at}</span>
            </div>

            {result.report_url ? (
              <article className="card-base report-embed report-embed-main">
                <div className="report-embed-header">
                  <p className="card-label">이슈 브리핑 보고서</p>
                  <div className="report-embed-actions">
                    <a className="src-link" href={result.report_url} target="_blank" rel="noopener noreferrer">새 탭</a>
                    <a className="src-link" href={result.report_download_url} download>다운로드</a>
                  </div>
                </div>
                <iframe
                  className="report-frame"
                  src={result.report_url}
                  title={`${result.keyword} 이슈 보고서`}
                />
              </article>
            ) : (
              <div className="alert alert-error">보고서를 생성하지 못했습니다. 다시 검색해 주세요.</div>
            )}
          </div>
        )}
      </main>

      <footer className="footer-region">
        <p className="footer-brand">Issue Briefing</p>
        <p className="footer-note">
          Google News RSS 기반 · 수집 기간 최근 7일 · 출처는 각 기사 원문 링크로 확인할 수 있습니다
        </p>
      </footer>
    </>
  )
}
