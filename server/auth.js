// Firebase 로그인 토큰(ID 토큰) 확인: Node 내장 crypto만 사용한다.
// https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
import { createPublicKey, verify } from 'node:crypto'

const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
let certs = { keys: {}, expires: 0 }

async function getKeys() {
  if (Date.now() < certs.expires) return certs.keys
  const r = await fetch(CERTS_URL)
  if (!r.ok) throw new Error('certs')
  const maxAge = Number(/max-age=(\d+)/.exec(r.headers.get('cache-control') || '')?.[1]) || 3600
  certs = { keys: await r.json(), expires: Date.now() + maxAge * 1000 }
  return certs.keys
}

const b64json = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))

export const projectId = () => process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || ''

// 허락한 이메일 목록 (쉼표로 구분). 비어 있으면 아무도 마음 대화를 쓸 수 없다.
const allowed = () => (process.env.ALLOWED_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

// 결과: { ok: true, user } 또는 { ok: false, code: 'login' | 'not_verified' | 'not_allowed' }
export async function checkUser(req) {
  const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1]
  if (!token) return { ok: false, code: 'login' }
  const parts = token.split('.')
  if (parts.length !== 3) return { ok: false, code: 'login' }

  let header, claims
  try {
    header = b64json(parts[0])
    claims = b64json(parts[1])
  } catch {
    return { ok: false, code: 'login' }
  }

  const pid = projectId()
  const now = Math.floor(Date.now() / 1000)
  const keys = await getKeys()
  const pem = header.alg === 'RS256' && keys[header.kid]
  const valid = pem
    && verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), createPublicKey(pem), Buffer.from(parts[2], 'base64url'))
    && claims.aud === pid
    && claims.iss === `https://securetoken.google.com/${pid}`
    && typeof claims.sub === 'string' && claims.sub
    && claims.exp > now
    && claims.iat <= now + 300
  if (!valid) return { ok: false, code: 'login' }

  const email = String(claims.email || '').toLowerCase()
  // 이메일 인증을 안 한 계정은 남의 이메일로 가입했을 수도 있으므로 허락 목록과 비교하지 않는다
  if (!claims.email_verified) return { ok: false, code: 'not_verified' }
  if (!allowed().includes(email)) return { ok: false, code: 'not_allowed' }
  return { ok: true, user: { uid: claims.sub, email } }
}
