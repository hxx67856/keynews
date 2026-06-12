const $ = (sel) => document.querySelector(sel);

const keywordInput = $('#keyword-input');
const emailInput = $('#email-input');
const searchBtn = $('#search-btn');
const emailBtn = $('#email-btn');
const searchForm = $('#search-form');
const examplesEl = $('#examples');
const alertEl = $('#alert');
const loadingEl = $('#loading');
const resultsEl = $('#results');

const TINT_CLASSES = ['tint-peach', 'tint-rose', 'tint-mint', 'tint-lavender', 'tint-sky', 'tint-yellow'];

let currentKeyword = '';
let currentReportId = '';

function showAlert(message, type = 'error') {
  alertEl.textContent = message;
  alertEl.className = `alert alert-${type}`;
  alertEl.classList.remove('hidden');
}

function hideAlert() {
  alertEl.classList.add('hidden');
}

function setLoading(on) {
  loadingEl.classList.toggle('hidden', !on);
  searchBtn.disabled = on;
  emailBtn.disabled = on;
  searchBtn.textContent = on ? '보고서 생성 중...' : '이슈 검색';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function fetchExamples() {
  try {
    const res = await fetch('/api/examples');
    const data = await res.json();
    renderExamples(data.keywords);
  } catch {
    renderExamples([
      '인공지능 규제', '반도체 수출', '기후 변화',
      'K-콘텐츠', '전기차 배터리', '사이버 보안',
    ]);
  }
}

function renderExamples(keywords) {
  examplesEl.innerHTML = `
    <span class="examples-label">예시 키워드</span>
    ${keywords.map((kw) => `<button type="button" class="pill-tab" data-kw="${escapeHtml(kw)}">${escapeHtml(kw)}</button>`).join('')}
  `;
  examplesEl.querySelectorAll('.pill-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      keywordInput.value = btn.dataset.kw;
      doSearch(btn.dataset.kw);
    });
  });
}

function renderResults(data) {
  const highlights = data.highlights.map((item, i) => {
    const tint = TINT_CLASSES[i % TINT_CLASSES.length];
    return `
    <div class="highlight-item ${tint}">
      <span class="badge-tag badge-tag-purple">#${item.rank}</span>
      <h3><a class="title-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
      <p>${escapeHtml(item.key_point)}</p>
      <div class="source-tag">
        <span class="source-date">${escapeHtml(item.date_short)}</span>
        <a class="src-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.link_label)}</a>
      </div>
    </div>
  `;
  }).join('');

  const sources = data.sources.map((src) => `
    <li class="comparison-row">
      <span class="src-num">${src.index}</span>
      <div class="src-body">
        <span class="src-title">${escapeHtml(src.title)}</span>
        <span class="src-ref">
          ${escapeHtml(src.date_short)}
          <a class="src-link" href="${escapeHtml(src.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(src.link_label)}</a>
        </span>
        <a class="src-url" href="${escapeHtml(src.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(src.url_short)}</a>
      </div>
    </li>
  `).join('');

  const summaryLines = (data.three_line_summary || []).map(
    (line) => `<li class="summary-line">${escapeHtml(line)}</li>`
  ).join('') || '<li class="summary-line">요약을 생성하지 못했습니다. 다시 검색해 주세요.</li>';

  resultsEl.innerHTML = `
    <div class="meta-bar">
      <span class="badge-tag badge-tag-purple">키워드: ${escapeHtml(data.keyword)}</span>
      <span class="badge-tag badge-tag-green">수집 ${data.item_count}건</span>
      <span class="badge-tag badge-tag-orange">최근 ${data.period_days}일</span>
      <span class="badge-tag badge-tag-sky">${escapeHtml(data.generated_at)}</span>
    </div>

    <article class="card-base report-ready">
      <p class="card-label">보고서 생성 완료</p>
      <p class="overview-text">「${escapeHtml(data.keyword)}」 이슈 보고서가 자동 생성되었습니다.</p>
      <div class="report-actions">
        <a class="btn-primary report-action-btn" href="${escapeHtml(data.report_url)}" target="_blank" rel="noopener noreferrer">보고서 보기</a>
        <a class="btn-secondary report-action-btn" href="${escapeHtml(data.report_download_url)}" download>HTML 다운로드</a>
      </div>
    </article>

    <article class="card-yellow-bold">
      <p class="card-label">세 줄 요약</p>
      <ol class="three-line-summary">${summaryLines}</ol>
    </article>

    <article class="card-base">
      <p class="card-label">핵심 개요</p>
      <p class="overview-text">${escapeHtml(data.overview)}</p>
    </article>

    <section>
      <h2 class="section-heading">주요 이슈 <span style="font-size:18px;color:var(--steel)">${data.highlights.length}건</span></h2>
      <div class="highlight-list">${highlights || '<p class="overview-text">수집된 이슈가 없습니다.</p>'}</div>
    </section>

    <article class="card-base">
      <p class="card-label">출처 목록</p>
      <ol class="sources-list comparison-table">${sources || '<li class="comparison-row">출처 없음</li>'}</ol>
    </article>
  `;
  resultsEl.classList.remove('hidden');
}

async function doSearch(keyword) {
  const term = (keyword || keywordInput.value).trim();
  if (!term) {
    showAlert('키워드를 입력해 주세요.');
    return;
  }

  currentKeyword = term;
  keywordInput.value = term;
  hideAlert();
  resultsEl.classList.add('hidden');
  setLoading(true);

  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: term }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '검색에 실패했습니다.');
    currentReportId = data.report_id || '';
    renderResults(data);
    document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    showAlert(err.message);
  } finally {
    setLoading(false);
  }
}

async function doSendEmail() {
  const term = currentKeyword || keywordInput.value.trim();
  const email = emailInput.value.trim();

  if (!term) {
    showAlert('먼저 키워드를 검색해 주세요.');
    return;
  }
  if (!email) {
    showAlert('이메일 주소를 입력해 주세요.');
    return;
  }

  hideAlert();
  emailBtn.disabled = true;
  emailBtn.textContent = '발송 중...';

  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: term, email, report_id: currentReportId || null }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '이메일 발송에 실패했습니다.');
    showAlert(data.message, 'success');
  } catch (err) {
    showAlert(err.message);
  } finally {
    emailBtn.disabled = false;
    emailBtn.textContent = '이메일로 보고서 받기';
  }
}

searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  doSearch();
});

emailBtn.addEventListener('click', doSendEmail);

fetchExamples();
