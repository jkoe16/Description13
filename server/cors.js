// 화면을 다른 주소(정적 사이트)에서 열 때, 허락한 주소에서 온 API 요청만 받는다.
// ALLOWED_ORIGINS: 쉼표로 구분한 주소 목록 (예: https://maeumgyeot-app.onrender.com)
// 같은 주소에서 온 요청(Origin 머리글 없음)은 지금처럼 그대로 처리한다.

export const allowedOrigins = () =>
  (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean)

// 요청을 여기서 끝냈으면 true (미리 묻기 OPTIONS 요청). 아니면 false를 돌려주고 원래 처리를 이어 간다.
export function cors(req, res) {
  const origin = req.headers.origin
  const allowed = Boolean(origin) && allowedOrigins().includes(origin)
  res.setHeader('Vary', 'Origin')
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Max-Age', '86400')
  }
  if (req.method === 'OPTIONS') {
    res.statusCode = allowed ? 204 : 403
    res.end()
    return true
  }
  return false
}
