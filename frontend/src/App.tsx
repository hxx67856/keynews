import { FormEvent, useCallback, useEffect, useState } from 'react'
import {
  fetchExamples,
  searchKeyword,
  sendReportEmail,
  type SearchResult,
} from './api'

const TINT_CLASSES = ['tint-peach', 'tint-rose', 'tint-mint', 'tint-lavender', 'tint-sky', 'tint-yellow']

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
            키워드를 입력하면 최근 7일 이내 주요 이슈를 자동 수집하고,
            한 줄 요약과 핵심 내용을 정리해 드립니다.
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

            <article className="card-base report-ready">
              <p className="card-label">보고서 생성 완료</p>
              <p className="overview-text">「{result.keyword}」 이슈 보고서가 자동 생성되었습니다.</p>
              <div className="report-actions">
                <a className="btn-primary report-action-btn" href={result.report_url} target="_blank" rel="noopener noreferrer">
                  보고서 보기
                </a>
                <a className="btn-secondary report-action-btn" href={result.report_download_url} download>
                  HTML 다운로드
                </a>
              </div>
            </article>

            <article className="card-yellow-bold">
              <p className="card-label">세 줄 요약</p>
              <ol className="three-line-summary">
                {result.three_line_summary.map((line, i) => (
                  <li key={i} className="summary-line">{line}</li>
                ))}
              </ol>
            </article>

            <article className="card-base">
              <p className="card-label">핵심 개요</p>
              <p className="overview-text">{result.overview}</p>
            </article>

            <section>
              <h2 className="section-heading">
                주요 이슈 <span style={{ fontSize: 18, color: 'var(--steel)' }}>{result.highlights.length}건</span>
              </h2>
              <div className="highlight-list">
                {result.highlights.map((item, i) => (
                  <div key={item.rank} className={`highlight-item ${TINT_CLASSES[i % TINT_CLASSES.length]}`}>
                    <span className="badge-tag badge-tag-purple">#{item.rank}</span>
                    <h3>
                      <a className="title-link" href={item.url} target="_blank" rel="noopener noreferrer">
                        {item.title}
                      </a>
                    </h3>
                    <p>{item.key_point}</p>
                    <div className="source-tag">
                      <span className="source-date">{item.date_short}</span>
                      <a className="src-link" href={item.url} target="_blank" rel="noopener noreferrer">
                        {item.link_label}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <article className="card-base">
              <p className="card-label">출처 목록</p>
              <ol className="comparison-table">
                {result.sources.map((src) => (
                  <li key={src.index} className="comparison-row">
                    <span className="src-num">{src.index}</span>
                    <div className="src-body">
                      <span className="src-title">{src.title}</span>
                      <span className="src-ref">
                        {src.date_short}
                        <a className="src-link" href={src.url} target="_blank" rel="noopener noreferrer">
                          {src.link_label}
                        </a>
                      </span>
                      <a className="src-url" href={src.url} target="_blank" rel="noopener noreferrer">
                        {src.url_short}
                      </a>
                    </div>
                  </li>
                ))}
              </ol>
            </article>
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
