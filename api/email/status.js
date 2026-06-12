export default function handler(_req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({
    configured: false,
    message: 'Vercel 배포에서는 이메일 발송을 지원하지 않습니다. 로컬 FastAPI 서버를 사용하세요.',
  });
}
