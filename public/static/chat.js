/**
 * Issue Briefing AI 챗봇 (Gemini 2.5 Flash Lite)
 */

(function () {
  const chatFab = document.getElementById('chat-fab');
  const chatPanel = document.getElementById('chat-panel');
  const chatClose = document.getElementById('chat-close');
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');
  const chatStatus = document.getElementById('chat-status');

  if (!chatFab || !chatPanel) return;

  let chatConfigured = false;
  let chatHistory = [];
  let isSending = false;

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatMessage(text) {
    return escapeHtml(text).replace(/\n/g, '<br />');
  }

  function appendMessage(role, content) {
    const el = document.createElement('div');
    el.className = `chat-msg chat-msg-${role}`;
    el.innerHTML = `<div class="chat-bubble">${formatMessage(content)}</div>`;
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function setSending(on) {
    isSending = on;
    chatSend.disabled = on || !chatConfigured;
    chatInput.disabled = on || !chatConfigured;
    chatSend.textContent = on ? '전송 중...' : '전송';
  }

  async function parseJsonResponse(res) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('챗봇 API 응답을 해석할 수 없습니다.');
    }
  }

  async function fetchChatStatus() {
    try {
      const res = await fetch('/api/chat/status');
      const data = await parseJsonResponse(res);
      chatConfigured = Boolean(data.configured);
      if (chatStatus) {
        chatStatus.textContent = chatConfigured
          ? `Gemini ${data.model || '2.5 Flash Lite'}`
          : 'GEMINI_API_KEY 미설정';
        chatStatus.classList.toggle('chat-status-off', !chatConfigured);
      }
      chatInput.disabled = !chatConfigured;
      chatSend.disabled = !chatConfigured;
    } catch {
      if (chatStatus) {
        chatStatus.textContent = '챗봇 상태 확인 실패';
        chatStatus.classList.add('chat-status-off');
      }
    }
  }

  function openPanel() {
    chatPanel.classList.add('chat-panel-open');
    chatPanel.setAttribute('aria-hidden', 'false');
    chatFab.setAttribute('aria-expanded', 'true');
    if (chatHistory.length === 0) {
      appendMessage(
        'bot',
        chatConfigured
          ? '안녕하세요! Issue Briefing AI입니다. 키워드 검색, 보고서 해석, 사용법을 물어보세요.'
          : '챗봇 API 키가 설정되지 않았습니다. Vercel 환경 변수 GEMINI_API_KEY를 추가하거나 backend/.env에 설정하세요.'
      );
    }
    chatInput.focus();
  }

  function closePanel() {
    chatPanel.classList.remove('chat-panel-open');
    chatPanel.setAttribute('aria-hidden', 'true');
    chatFab.setAttribute('aria-expanded', 'false');
  }

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || isSending || !chatConfigured) return;

    appendMessage('user', trimmed);
    chatHistory.push({ role: 'user', content: trimmed });
    chatInput.value = '';
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatHistory,
          keyword: window.issueBriefingKeyword || null,
          report_context: window.issueBriefingReportContext || null,
        }),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data.detail || '응답을 받지 못했습니다.');

      const reply = data.reply || '';
      chatHistory.push({ role: 'model', content: reply });
      appendMessage('bot', reply);
    } catch (err) {
      appendMessage('bot', `오류: ${err.message}`);
    } finally {
      setSending(false);
      chatInput.focus();
    }
  }

  chatFab.addEventListener('click', () => {
    if (chatPanel.classList.contains('chat-panel-open')) {
      closePanel();
    } else {
      openPanel();
    }
  });

  chatClose.addEventListener('click', closePanel);

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage(chatInput.value);
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatInput.value);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && chatPanel.classList.contains('chat-panel-open')) {
      closePanel();
    }
  });

  fetchChatStatus();
})();
