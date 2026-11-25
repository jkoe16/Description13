// 마음곁 대화 API: POST /api/chat
// - OpenAI 키는 서버 환경변수(OPENAI_API_KEY)에서만 읽는다.
// - 대화 내용은 저장하지 않고, 로그에도 남기지 않는다(상태 코드와 오류 종류만 기록).
// - Firebase로 로그인하고 ALLOWED_EMAILS에 있는 계정만 쓸 수 있다(키 사용 보호).
import { checkUser, projectId } from './auth.js'

const apiUrl = () => (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '') + '/responses'
const MAX_MESSAGE_CHARS = 500 // 사용자가 한 번에 보낼 수 있는 글자 수
const MAX_HISTORY = 10 // OpenAI로 보내는 최근 메시지 수
const MAX_BODY_BYTES = 32 * 1024
const MAX_OUTPUT_TOKENS = 500
const TIMEOUT_MS = 25_000
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 12 // IP당 1분에 허용하는 요청 수

const MODES = {
  listen: '대화 방식: 경청. 조언이나 해결책을 내놓지 말고, 들은 내용을 짧게 되짚어 주며 더 이야기하고 싶은 만큼 이어 가도록 열린 질문을 하나만 해요.',
  empathy: '대화 방식: 공감. 상대가 느끼는 감정에 이름을 붙여 주고, 그렇게 느끼는 것이 자연스럽다고 인정해 주세요. 해결책은 상대가 원할 때만 이야기해요.',
  think: '대화 방식: 함께 생각하기. 답을 정해 주지 말고, 상황을 작게 나누어 볼 수 있는 질문을 하나씩 건네며 상대가 스스로 정리하도록 도와요.',
  courage: '대화 방식: 용기 주기. 상대가 이미 해낸 것과 가진 힘을 구체적으로 짚어 주고, 원한다면 해 볼 수 있는 아주 작은 한 걸음을 부담 없이 제안해요. 과장된 응원은 피해요.',
}

const BASE_INSTRUCTIONS = `너는 '마음곁'이라는 웹 앱의 대화 상대야. 마음이 힘든 사람이 편하게 이야기하고 위로받을 수 있도록 곁에 있어 주는 역할이야.

말투와 길이
- 한국어 해요체로, 따뜻하고 자연스럽게 말해요.
- 보통 2~4문장으로 짧게 답해요. 목록, 제목, 이모지 남발은 쓰지 않아요.
- 질문은 한 번에 하나만 해요.

태도
- 상대의 감정을 판단하거나, 고치려 들거나, 가볍게 넘기지 않아요. "그래도 ~해야죠", "다들 그래요" 같은 말은 피해요.
- 훈계, 성급한 조언, 긍정 강요를 하지 않아요.
- 호흡 연습이나 상담을 권할 때는 하나의 선택지로만 가볍게 말하고, 강요하거나 매번 반복하지 않아요.
- 이름, 연락처, 주소 같은 개인정보를 묻지 않아요.

한계
- 정신질환을 진단하거나, 치료법·약물에 대해 조언하지 않아요. 그런 질문에는 전문가(정신건강의학과, 상담센터)와 이야기해 보도록 부드럽게 안내해요.
- 너는 AI이고 전문 상담사를 대신할 수 없어요. 그렇지 않은 척하지 않아요.

위기 상황 (가장 중요)
- 자해나 자살에 대한 생각·계획·수단, 다른 사람을 해칠 위험, 폭력·학대로 지금 위험한 상황이 보이면, 일반적인 위로로 끝내지 않아요.
- 먼저 털어놓아 준 것에 진심으로 고마워하고 그 고통을 인정해 주세요.
- 지금 안전한지 직접, 차분하게 물어요.
- 바로 도움받을 곳을 분명히 알려 주세요: 109(자살예방상담전화, 24시간), 112(경찰, 위험한 상황), 119(응급 상황). 그리고 지금 곁에 있는 믿을 수 있는 사람(가족, 친구, 선생님 등)에게 알리도록 권해요.
- 자해나 자살의 방법, 수단, 치사량 같은 정보는 어떤 이유로도 알려 주지 않아요.
- 비난하거나 겁주지 않고, 혼자가 아니라는 것을 전해요.`

const CRISIS_NOTE = '이번 메시지에는 자해·자살 또는 위험 상황을 암시하는 표현이 있어요. 위의 "위기 상황" 지침을 반드시 따르고, 대화 방식보다 안전을 우선해요.'

// 위기 표현 감지 (AI 판단과 별도로 화면에 긴급 연락처를 띄우기 위한 보조 장치)
const CRISIS_PATTERNS = [
  /죽고\s*싶/, /죽어\s*버리/, /죽을\s*래/, /죽을\s*거/, /자살/, /자해/, /목숨을?\s*끊/, /목을?\s*매/,
  /뛰어\s*내리/, /투신/, /살고\s*싶지\s*않/, /사라지고\s*싶/, /없어지고\s*싶/,
  /(삶|인생|목숨|모든\s*걸|다)\s*을?\s*끝내고\s*싶/, /손목을?\s*(긋|그)/, /유서/,
  /약을?\s*(전부|많이|한꺼번에|몽땅)/, /살\s*이유가?\s*없/, /살아야\s*할\s*이유/,
  /죽이고\s*싶/, /때려\s*죽/, /폭행/, /학대/,
]
export const isCrisis = (text) => CRISIS_PATTERNS.some((re) => re.test(text))

const hits = new Map()
function rateLimited(ip) {
  const now = Date.now()
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS)
  if (list.length >= RATE_MAX) {
    hits.set(ip, list)
    return true
  }
  list.push(now)
  hits.set(ip, list)
  if (hits.size > 5000) hits.clear()
  return false
}

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    // 너무 크면 더 모으지 않고 끝까지 흘려보낸 뒤 413으로 응답한다 (연결을 끊으면 오류 안내가 전달되지 않음)
    req.on('data', (c) => {
      size += c.length
      if (size <= MAX_BODY_BYTES) chunks.push(c)
    })
    req.on('end', () => {
      if (size > MAX_BODY_BYTES) reject(Object.assign(new Error('too_large'), { status: 413 }))
      else resolve(Buffer.concat(chunks).toString('utf8'))
    })
    req.on('error', reject)
  })
}

function clean(messages) {
  if (!Array.isArray(messages)) return null
  const list = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
    .map((m) => ({ role: m.role, text: m.text.trim().slice(0, m.role === 'user' ? MAX_MESSAGE_CHARS : 1200) }))
    .filter((m) => m.text)
    .slice(-MAX_HISTORY)
  // 맥락은 사용자 메시지로 시작하지 않아도 되지만, 마지막은 반드시 사용자 메시지여야 한다
  if (!list.length || list[list.length - 1].role !== 'user') return null
  return list
}

function extractText(data) {
  return (data.output || [])
    .filter((item) => item.type === 'message')
    .flatMap((item) => item.content || [])
    .filter((part) => part.type === 'output_text')
    .map((part) => part.text)
    .join('')
    .trim()
}

const ERRORS = {
  login: [401, '마음 대화는 로그인한 뒤에 쓸 수 있어요.'],
  not_verified: [403, '이메일 인증을 마친 뒤에 쓸 수 있어요. 받은 메일함을 확인해 주세요.'],
  not_allowed: [403, '이 계정은 아직 마음 대화를 쓸 수 있도록 허락되지 않았어요.'],
  auth_setup: [503, '로그인 설정이 아직 끝나지 않았어요.'],
  auth_check: [503, '로그인을 확인하지 못했어요. 잠시 뒤에 다시 시도해 주세요.'],
  no_key: [503, 'AI 연결이 아직 설정되지 않았어요.'],
  bad_request: [400, '메시지를 다시 확인해 주세요.'],
  too_long: [400, `메시지는 ${MAX_MESSAGE_CHARS}자까지 보낼 수 있어요.`],
  too_large: [413, '보낸 내용이 너무 커요.'],
  rate_limited: [429, '잠시 천천히 이야기해 주세요. 1분 뒤에 다시 보내 주세요.'],
  auth: [502, 'AI 서비스 인증에 문제가 있어요. 관리자에게 알려 주세요.'],
  quota: [502, 'AI 서비스 사용 한도를 넘었어요. 잠시 뒤에 다시 시도해 주세요.'],
  busy: [503, 'AI가 지금 많이 바빠요. 잠시 뒤에 다시 시도해 주세요.'],
  timeout: [504, '답변이 늦어지고 있어요. 다시 시도해 주세요.'],
  upstream: [502, '답변을 받지 못했어요. 다시 시도해 주세요.'],
}

function fail(res, code, extra = {}) {
  const [status, message] = ERRORS[code]
  send(res, status, { error: code, message, ...extra })
}

export async function handleChat(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return send(res, 405, { error: 'method', message: 'POST만 사용할 수 있어요.' })
  }

  // X-Forwarded-For는 위조할 수 있으므로 프록시 뒤에서 운영할 때(TRUST_PROXY=1)만 믿는다
  const forwarded = process.env.TRUST_PROXY === '1' && req.headers['x-forwarded-for']?.split(',')[0].trim()
  const ip = forwarded || req.socket.remoteAddress || 'unknown'
  if (rateLimited(ip)) return fail(res, 'rate_limited')
  if (!projectId()) return fail(res, 'auth_setup')
  try {
    const who = await checkUser(req)
    if (!who.ok) return fail(res, who.code)
  } catch {
    console.error('[chat] auth check failed')
    return fail(res, 'auth_check')
  }

  let payload
  try {
    payload = JSON.parse(await readBody(req))
  } catch (e) {
    return fail(res, e.status === 413 ? 'too_large' : 'bad_request')
  }

  const last = Array.isArray(payload?.messages) ? payload.messages.at(-1) : null
  if (last?.role === 'user' && typeof last.text === 'string' && last.text.trim().length > MAX_MESSAGE_CHARS) {
    return fail(res, 'too_long')
  }
  const history = clean(payload?.messages)
  if (!history) return fail(res, 'bad_request')
  const mode = MODES[payload.mode] ? payload.mode : 'listen'

  // 최근 사용자 메시지 3개에서 위기 표현 확인
  const crisis = history.filter((m) => m.role === 'user').slice(-3).some((m) => isCrisis(m.text))

  const key = process.env.OPENAI_API_KEY
  if (!key) return fail(res, 'no_key', { crisis })

  const instructions = [BASE_INSTRUCTIONS, MODES[mode], crisis ? CRISIS_NOTE : ''].filter(Boolean).join('\n\n')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const r = await fetch(apiUrl(), {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-6-luna',
        instructions,
        input: history.map((m) => ({ role: m.role, content: m.text })),
        max_output_tokens: MAX_OUTPUT_TOKENS,
        reasoning: { effort: process.env.OPENAI_REASONING_EFFORT || 'none' },
        text: { verbosity: 'low' },
        store: false,
      }),
    })

    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      const type = err?.error?.type || err?.error?.code || ''
      // 대화 내용은 기록하지 않고 상태와 오류 종류만 남긴다
      console.error(`[chat] OpenAI ${r.status} ${type}`)
      if (r.status === 401 || r.status === 403) return fail(res, 'auth', { crisis })
      if (r.status === 429) return fail(res, /quota|credit|spend|usage/.test(type) ? 'quota' : 'busy', { crisis })
      if (r.status >= 500) return fail(res, 'busy', { crisis })
      return fail(res, 'upstream', { crisis })
    }

    const data = await r.json()
    const reply = extractText(data)
    if (!reply) {
      console.error(`[chat] empty reply (${data.status || ''} ${data.incomplete_details?.reason || ''})`)
      return fail(res, 'upstream', { crisis })
    }
    return send(res, 200, { reply, crisis })
  } catch (e) {
    console.error(`[chat] ${e.name === 'AbortError' ? 'timeout' : 'network error'}`)
    return fail(res, e.name === 'AbortError' ? 'timeout' : 'upstream', { crisis })
  } finally {
    clearTimeout(timer)
  }
}
