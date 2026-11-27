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
- '당신', '~할 자격이 있어요' 같은 번역투는 쓰지 않아요. 상대를 부를 때는 이름이나 호칭 없이 자연스럽게 말해요.
- '그 마음 알아요', '지금은 안전해요'처럼 내가 알 수 없는 것을 단정하지 않아요.
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

const RISK_NOTE = `답은 JSON으로만 해요. reply에는 상대에게 보낼 말을, risk에는 이번 대화의 위험도를 적어요.
- "crisis": 자해·자살 생각이나 계획, 죽고 싶다는 마음을 직접이든 돌려서든 내비침(예: "다 그만하고 싶어", "내일이 안 왔으면", "없어지고 싶어"), 다른 사람을 해칠 위험, 폭력·학대로 지금 위험한 상황.
- "concern": 아주 지치고 절망적이지만 위험 신호는 뚜렷하지 않음.
- "none": 그 밖의 경우.
애매하면 한 단계 높게 판단해요. risk가 "crisis"이면 reply는 위의 "위기 상황" 지침을 따라요.`

const RISK_FORMAT = {
  type: 'json_schema',
  name: 'maeumgyeot_reply',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      reply: { type: 'string' },
      risk: { type: 'string', enum: ['none', 'concern', 'crisis'] },
    },
    required: ['reply', 'risk'],
    additionalProperties: false,
  },
}

// 구조화된 답을 읽는다. 형식이 깨졌으면 글 전체를 답으로 쓰고 위험도는 모른다고 본다.
function parseReply(raw) {
  try {
    const j = JSON.parse(raw)
    if (typeof j.reply === 'string' && j.reply.trim()) return { reply: j.reply.trim(), risk: j.risk }
  } catch { /* 아래로 */ }
  return { reply: raw, risk: 'unknown' }
}

const CRISIS_NOTE = '이번 메시지에는 자해·자살 또는 위험 상황을 암시하는 표현이 있어요. 위의 "위기 상황" 지침을 반드시 따르고, 대화 방식보다 안전을 우선해요.'

// 위기 표현 감지 (AI 판단과 별도로 화면에 긴급 연락처를 띄우기 위한 보조 장치)
const CRISIS_PATTERNS = [
  /죽고\s*싶/, /죽어\s*버리/, /죽을\s*래/, /죽을\s*거/, /자살/, /자해/, /목숨을?\s*끊/, /목을?\s*매/,
  /뛰어\s*내리/, /투신/, /살고\s*싶지\s*않/, /사라지고\s*싶/, /없어지고\s*싶/,
  /(삶|인생|목숨|모든\s*걸|다)\s*을?\s*끝내고\s*싶/, /손목을?\s*(긋|그)/, /유서/,
  /약을?\s*(전부|많이|한꺼번에|몽땅)/, /살\s*이유가?\s*없/, /살아야\s*할\s*이유/,
  /죽이고\s*싶/, /때려\s*죽/, /폭행/, /학대/,
  // 돌려 말하는 표현
  /다\s*그만\s*하고\s*싶/, /그만\s*살고\s*싶/, /내일이\s*안\s*(왔으면|오면)/, /눈을?\s*(안|못)\s*떴으면/,
  /영원히\s*(잠들|자)고?\s*싶/, /(세상|이\s*세상)에서?\s*없어지/, /태어나지\s*(말|않)았/, /나\s*같은\s*건?\s*없는\s*게/,
  /다\s*끝내\s*버리/, /마지막\s*인사/, /모두에게\s*미안/, /짐이\s*되기\s*싫/, /살아서\s*뭐\s*해/, /사는\s*게\s*의미\s*없/,
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

// ---------- AI가 나를 기억하기 ----------
// 화면이 내 계정에서 읽은 지난 대화 요약과 최근 마음 기록 감정을 보내 주면, AI에게 참고로 알려 준다.
// 서버는 이것도 저장하지 않는다. 형식이 이상한 항목은 조용히 버린다.
const MAX_SUMMARIES = 5
const MAX_MOODS = 7
const ago = (d) => (d === 0 ? '오늘' : d === 1 ? '어제' : `${d}일 전`)
const dayCount = (d) => (Number.isInteger(d) && d >= 0 && d <= 3650 ? d : null)

export function memoryNote(memory) {
  if (!memory || typeof memory !== 'object') return ''
  const summaries = (Array.isArray(memory.summaries) ? memory.summaries : [])
    .filter((m) => m && typeof m.text === 'string' && m.text.trim() && dayCount(m.daysAgo) !== null)
    .slice(0, MAX_SUMMARIES)
    .map((m) => `- ${ago(m.daysAgo)} 대화: ${m.text.trim().slice(0, 300)}`)
  const moods = (Array.isArray(memory.moods) ? memory.moods : [])
    .filter((m) => m && EMOTION_LABELS[m.emotion] && Number.isInteger(m.level) && m.level >= 1 && m.level <= 5 && dayCount(m.daysAgo) !== null)
    .slice(0, MAX_MOODS)
    .map((m) => `${ago(m.daysAgo)} ${EMOTION_LABELS[m.emotion]}(${LEVEL_LABELS[m.level - 1]})`)
  if (!summaries.length && !moods.length) return ''
  return [
    '지난 이야기: 사용자가 이 앱에서 예전에 나눈 대화의 요약과 최근 마음 기록이에요.',
    '- 참고만 하고, 자연스러울 때만 가볍게 꺼내요. 매번 언급하거나 목록처럼 읊지 않아요. 지금 하는 이야기가 가장 우선이에요.',
    '- 기억이 틀렸다고 하면 바로 사과하고 지금 말해 준 것을 따라요.',
    summaries.length ? '지난 대화 요약:\n' + summaries.join('\n') : '',
    moods.length ? '최근 마음 기록: ' + moods.join(', ') : '',
  ].filter(Boolean).join('\n')
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

  const instructions = [BASE_INSTRUCTIONS, memoryNote(payload.memory), MODES[mode], crisis ? CRISIS_NOTE : '', RISK_NOTE].filter(Boolean).join('\n\n')
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
        text: { verbosity: 'low', format: RISK_FORMAT },
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
    const { reply, risk } = parseReply(extractText(data))
    if (!reply) {
      console.error(`[chat] empty reply (${data.status || ''} ${data.incomplete_details?.reason || ''})`)
      return fail(res, 'upstream', { crisis })
    }
    // 단어 감지 또는 AI 판단 중 하나라도 위기면 화면에 긴급 연락처를 띄운다
    return send(res, 200, { reply, crisis: crisis || risk === 'crisis' })
  } catch (e) {
    console.error(`[chat] ${e.name === 'AbortError' ? 'timeout' : 'network error'}`)
    return fail(res, e.name === 'AbortError' ? 'timeout' : 'upstream', { crisis })
  } finally {
    clearTimeout(timer)
  }
}

// ---------- 다정한 말: POST /api/comfort ----------
// 홈 인사·오늘의 한 마디, 마음 기록 위로, 마음 대화 첫인사를 AI가 짧게 만든다.
// 허락한 계정만 쓸 수 있고, 실패하면 화면은 미리 써 둔 문장을 그대로 쓴다.
const EMOTION_LABELS = {
  calm: '평온해요', happy: '기뻐요', tired: '지쳤어요', sad: '슬퍼요',
  anxious: '불안해요', angry: '화가 나요', lonely: '외로워요', empty: '잘 모르겠어요',
}
const LEVEL_LABELS = ['아주 약하게', '조금', '보통', '꽤', '아주 강하게']
const SUMMARY_MESSAGES = 16 // 요약할 때 보는 최근 메시지 수 (요청 크기 제한 안에 들도록)
const obj = (props) => ({ type: 'object', properties: props, required: Object.keys(props), additionalProperties: false })
const str = { type: 'string' }

const COMFORT_TASKS = {
  home: {
    schema: obj({ greeting: str, word: str }),
    prompt: (p) => {
      const h = Number.isFinite(p.hoursAway) ? p.hoursAway : null
      const away = h === null ? '앱에 처음 왔어요.' : h > 168 ? '일주일 넘게 오랜만에 왔어요.' : h > 6 ? `${Math.round(h)}시간 만에 다시 왔어요.` : '조금 전에도 왔다가 또 왔어요.'
      return `지금은 ${p.hour}시예요. 사용자는 ${away}
greeting: 앱 첫 화면 맨 위에 작게 보일 인사 한 문장 (25자 이내, 반가움이 느껴지게).
word: '오늘의 한 마디'로 보여 줄 위로의 문장 한두 문장 (60자 이내). 뻔한 명언이나 따옴표 없이, 지친 사람에게 건네는 다정한 말로.`
    },
  },
  journal: {
    schema: obj({ reply: str, risk: { type: 'string', enum: ['none', 'concern', 'crisis'] } }),
    prompt: (p) => `사용자가 마음 기록을 남겼어요.
- 감정: ${EMOTION_LABELS[p.emotion]} (${LEVEL_LABELS[p.level - 1]})
- 메모: ${p.note ? `"${p.note}"` : '(없음)'}
reply: 기록을 남긴 사람에게 건네는 위로 2~3문장 (120자 이내). 메모가 있으면 그 내용을 구체적으로 짚어 주고, 감정을 인정해 줘요. 질문은 하지 않아요.
risk: 메모나 감정에서 자해·자살·위험 신호가 보이면 "crisis", 아주 절망적이면 "concern", 아니면 "none". 애매하면 한 단계 높게.`,
  },
  hello: {
    schema: obj({ reply: str }),
    prompt: (p) => `사용자가 마음 대화를 열었어요. 지금은 ${p.hour}시예요.${p.emotion ? ` 방금 고른 마음은 '${EMOTION_LABELS[p.emotion]}'이에요.` : ''}
${p.memory ? p.memory + '\n지난 이야기가 있으면, 자연스러울 때 그중 하나를 가볍게 이어서 물어봐도 돼요(부담 주지 않게). 없으면 그냥 인사해요.\n' : ''}reply: 대화를 여는 첫인사 1~2문장 (70자 이내). 시간과 마음에 어울리게, 편하게 이야기를 꺼낼 수 있도록 열린 질문 하나로 끝내요.`,
  },
  summary: {
    schema: obj({ summary: str }),
    prompt: (p) => `아래는 사용자와 마음곁이 나눈 대화예요. 다음에 다시 이야기할 때 마음곁이 기억해 두면 좋을 내용을 요약해요.
summary: 2~3문장, 150자 이내. 사용자가 겪은 일, 느낀 감정, 고민하거나 하려던 것 위주로 담담하게 적어요("~함", "~하는 중" 같은 짧은 말투).
이름·연락처·주소·학교·회사 이름 같은 개인정보는 빼요. 자해·자살 이야기가 있었다면 방법이나 자세한 내용 없이 "많이 힘든 마음을 털어놓음" 정도로만 적어요.

대화:
${p.transcript}`,
  },
}

function comfortInput(kind, p) {
  const hour = Number.isInteger(p?.hour) && p.hour >= 0 && p.hour < 24 ? p.hour : new Date().getHours()
  if (kind === 'home') return { hour, hoursAway: typeof p.hoursAway === 'number' && p.hoursAway >= 0 ? Math.min(p.hoursAway, 24 * 365) : null }
  if (kind === 'hello') return { hour, emotion: EMOTION_LABELS[p?.emotion] ? p.emotion : null, memory: memoryNote(p?.memory) }
  if (kind === 'summary') {
    // 요약할 만큼 이야기가 있어야 한다 (사용자 메시지 2개 이상)
    const list = (Array.isArray(p?.messages) ? p.messages : [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string' && m.text.trim())
      .slice(-SUMMARY_MESSAGES)
    if (list.filter((m) => m.role === 'user').length < 2) return null
    const transcript = list.map((m) => `${m.role === 'user' ? '사용자' : '마음곁'}: ${m.text.trim().slice(0, m.role === 'user' ? MAX_MESSAGE_CHARS : 300)}`).join('\n')
    return { transcript }
  }
  if (kind === 'journal') {
    if (!EMOTION_LABELS[p?.emotion] || !Number.isInteger(p?.level) || p.level < 1 || p.level > 5) return null
    return { emotion: p.emotion, level: p.level, note: typeof p.note === 'string' ? p.note.trim().slice(0, 300) : '' }
  }
  return null
}

export async function handleComfort(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return send(res, 405, { error: 'method', message: 'POST만 사용할 수 있어요.' })
  }
  const forwarded = process.env.TRUST_PROXY === '1' && req.headers['x-forwarded-for']?.split(',')[0].trim()
  const ip = forwarded || req.socket.remoteAddress || 'unknown'
  if (rateLimited(ip)) return fail(res, 'rate_limited')
  if (!projectId()) return fail(res, 'auth_setup')
  try {
    const who = await checkUser(req)
    if (!who.ok) return fail(res, who.code)
  } catch {
    return fail(res, 'auth_check')
  }

  let payload
  try {
    payload = JSON.parse(await readBody(req))
  } catch (e) {
    return fail(res, e.status === 413 ? 'too_large' : 'bad_request')
  }
  const task = COMFORT_TASKS[payload?.kind]
  const input = task && comfortInput(payload.kind, payload)
  if (!input) return fail(res, 'bad_request')
  const key = process.env.OPENAI_API_KEY
  if (!key) return fail(res, 'no_key')

  // 메모에 위기 표현이 있으면 AI 판단과 상관없이 위기로 본다
  const crisis = payload.kind === 'journal' && isCrisis(input.note)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  try {
    const r = await fetch(apiUrl(), {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-6-luna',
        instructions: [BASE_INSTRUCTIONS, crisis ? CRISIS_NOTE : '', '이번에는 대화가 아니라 앱 화면에 보여 줄 짧은 말을 만들어요. JSON으로만 답해요.'].filter(Boolean).join('\n\n'),
        input: [{ role: 'user', content: task.prompt(input) }],
        max_output_tokens: 300,
        reasoning: { effort: process.env.OPENAI_REASONING_EFFORT || 'none' },
        text: { verbosity: 'low', format: { type: 'json_schema', name: `comfort_${payload.kind}`, strict: true, schema: task.schema } },
        store: false,
      }),
    })
    if (!r.ok) {
      console.error(`[comfort] OpenAI ${r.status}`)
      return fail(res, r.status === 429 ? 'busy' : 'upstream', { crisis })
    }
    const out = JSON.parse(extractText(await r.json()))
    const pick = (s, n) => (typeof s === 'string' ? s.trim().slice(0, n) : '')
    if (payload.kind === 'home') {
      const greeting = pick(out.greeting, 40), word = pick(out.word, 100)
      return greeting && word ? send(res, 200, { greeting, word }) : fail(res, 'upstream')
    }
    if (payload.kind === 'summary') {
      const summary = pick(out.summary, 300)
      return summary ? send(res, 200, { summary }) : fail(res, 'upstream')
    }
    const reply = pick(out.reply, 200)
    if (!reply) return fail(res, 'upstream', { crisis })
    return send(res, 200, { reply, crisis: crisis || out.risk === 'crisis' })
  } catch (e) {
    console.error(`[comfort] ${e.name === 'AbortError' ? 'timeout' : 'error'}`)
    return fail(res, e.name === 'AbortError' ? 'timeout' : 'upstream', { crisis })
  } finally {
    clearTimeout(timer)
  }
}
