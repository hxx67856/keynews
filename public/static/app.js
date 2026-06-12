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
const emailHintEl = $('#email-hint');

let currentKeyword = '';
let currentReportId = '';
let currentReportContext = '';
let emailConfigured = false;

window.issueBriefingKeyword = '';
window.issueBriefingReportContext = '';

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

async function fetchEmailStatus() {
  try {
    const res = await fetch('/api/email/status');
    const data = await res.json();
    emailConfigured = Boolean(data.configured);
    if (!emailHintEl) return;
    if (emailConfigured) {
      emailHintEl.classList.add('hidden');
      emailBtn.disabled = false;
    } else {
      emailHintEl.textContent = data.message || 'SMTP 설정이 필요합니다. backend/.env 파일을 확인하세요.';
      emailHintEl.classList.remove('hidden');
    }
  } catch {
    if (emailHintEl) {
      emailHintEl.textContent = '이메일 설정 상태를 확인하지 못했습니다.';
      emailHintEl.classList.remove('hidden');
    }
  }
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
  if (!data.report_url) {
    resultsEl.innerHTML = `
      <div class="alert alert-error">보고서를 생성하지 못했습니다. 다시 검색해 주세요.</div>
    `;
    resultsEl.classList.remove('hidden');
    return;
  }

  resultsEl.innerHTML = `
    <div class="meta-bar">
      <span class="badge-tag badge-tag-purple">키워드: ${escapeHtml(data.keyword)}</span>
      <span class="badge-tag badge-tag-green">수집 ${data.item_count}건</span>
      <span class="badge-tag badge-tag-orange">최근 ${data.period_days}일</span>
      <span class="badge-tag badge-tag-sky">${escapeHtml(data.generated_at)}</span>
    </div>

    <article class="card-base report-embed report-embed-main">
      <div class="report-embed-header">
        <p class="card-label">이슈 브리핑 보고서</p>
        <div class="report-embed-actions">
          <a class="src-link" href="${escapeHtml(data.report_url)}" target="_blank" rel="noopener noreferrer">새 탭</a>
          <a class="src-link" href="${escapeHtml(data.report_download_url)}" download>다운로드</a>
        </div>
      </div>
      <iframe
        class="report-frame"
        src="${escapeHtml(data.report_url)}"
        title="${escapeHtml(data.keyword)} 이슈 보고서"
      ></iframe>
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
    const contextParts = [];
    if (Array.isArray(data.three_line_summary) && data.three_line_summary.length) {
      contextParts.push(data.three_line_summary.join('\n'));
    }
    if (data.overview) {
      contextParts.push(data.overview);
    }
    currentReportContext = contextParts.join('\n\n');
    window.issueBriefingKeyword = currentKeyword;
    window.issueBriefingReportContext = currentReportContext;
    renderResults(data);
    document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    showAlert(err.message);
  } finally {
    setLoading(false);
  }
}

async function doSendEmail() {
  if (!emailConfigured) {
    showAlert('이메일 발송이 설정되지 않았습니다. backend/.env에 SMTP 정보를 입력하고 서버를 재시작하세요.');
    return;
  }

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
fetchEmailStatus();
