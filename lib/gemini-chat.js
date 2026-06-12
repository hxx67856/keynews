/** Gemini 챗봇 (Node.js) */

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `당신은 'Issue Briefing' 서비스의 AI 어시스턴트입니다.
사용자가 키워드 기반 뉴스 이슈 수집, HTML 보고서, 이메일 발송, 서비스 사용법을 물어보면
한국어로 간결하고 정확하게 답변합니다.
모르는 내용은 지어내지 말고, 검색·보고서 생성을 권장하세요.`;

export function isGeminiConfigured() {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  return Boolean(key && !key.startsWith('your-'));
}

function buildSystemInstruction(keyword, reportContext) {
  const parts = [SYSTEM_PROMPT];
  if (keyword) parts.push(`현재 사용자가 검색한 키워드: ${keyword}`);
  if (reportContext) parts.push(`현재 생성된 보고서 요약:\n${reportContext}`);
  return parts.join('\n\n');
}

function toGeminiContents(messages) {
  const contents = messages.slice(-12).map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: (msg.content || '').trim() }],
  })).filter((c) => c.parts[0].text);

  if (!contents.length) throw new Error('메시지를 입력해 주세요.');
  if (contents[0].role === 'model') {
    contents.unshift({ role: 'user', parts: [{ text: '안녕하세요.' }] });
  }
  return contents;
}

export async function generateChatReply(messages, keyword, reportContext) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. Vercel 환경 변수에 추가하세요.');
  }

  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildSystemInstruction(keyword, reportContext) }] },
      contents: toGeminiContents(messages),
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Gemini API 오류 (${response.status}): ${detail}`);
  }

  const data = await response.json();
  try {
    return data.candidates[0].content.parts[0].text.trim();
  } catch {
    const block = data.promptFeedback?.blockReason;
    if (block) throw new Error(`Gemini 응답이 차단되었습니다: ${block}`);
    throw new Error('Gemini 응답을 해석할 수 없습니다.');
  }
}
