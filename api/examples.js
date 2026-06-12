const EXAMPLE_KEYWORDS = [
  '인공지능 규제',
  '반도체 수출',
  '기후 변화',
  'K-콘텐츠',
  '전기차 배터리',
  '사이버 보안',
];

export default function handler(_req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({ keywords: EXAMPLE_KEYWORDS });
}
