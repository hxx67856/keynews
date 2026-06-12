import { generateChatReply, isGeminiConfigured } from '../lib/gemini-chat.js';

const MODEL = 'gemini-2.5-flash-lite';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const isStatus = req.url?.includes('/status') || req.query?.status !== undefined;

  if (req.method === 'GET' && isStatus) {
    return res.status(200).json({ configured: isGeminiConfigured(), model: MODEL });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  try {
    const { messages = [], keyword, report_context: reportContext } = req.body || {};
    const reply = await generateChatReply(messages, keyword, reportContext);
    return res.status(200).json({ reply, model: MODEL });
  } catch (err) {
    const status = err.message.includes('GEMINI_API_KEY') ? 400 : 502;
    return res.status(status).json({ detail: err.message });
  }
}
