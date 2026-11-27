// 서버 시험: 진짜 OpenAI 대신 가짜 AI 서버를 띄워 마음 대화 API를 확인한다.
// 실행: npm test
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'

const asked = [] // 가짜 AI가 받은 요청
let fakeReply = { reply: '에고, 많이 지쳤구나.', risk: 'none' }
let fakeStatus = 200
let fakeError = null
const fakeAI = createServer((req, res) => {
  let body = ''
  req.on('data', (c) => { body += c })
  req.on('end', () => {
    asked.push(JSON.parse(body))
    res.setHeader('Content-Type', 'application/json')
    if (fakeStatus !== 200) {
      res.statusCode = fakeStatus
      return res.end(JSON.stringify(fakeError))
    }
    res.end(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(fakeReply) }] }] }))
  })
})

let app
let base
before(async () => {
  await new Promise((r) => fakeAI.listen(0, '127.0.0.1', r))
  Object.assign(process.env, {
    OPENAI_BASE_URL: `http://127.0.0.1:${fakeAI.address().port}/v1`,
    OPENAI_API_KEY: 'test-key',
    TRUST_PROXY: '1',
    DAILY_GUEST_LIMIT: '3',
  })
  const { handleChat, handleComfort } = await import('../server/chat.js')
  app = createServer((req, res) => (req.url === '/api/chat' ? handleChat(req, res) : handleComfort(req, res)))
  await new Promise((r) => app.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${app.address().port}`
})
after(() => {
  app?.close()
  fakeAI.close()
})

let ipCount = 0
const newIp = () => `10.0.0.${++ipCount}` // 시험마다 다른 사람처럼 (1분 요청 제한에 걸리지 않게)
const chat = (messages, { ip = newIp(), extra = {} } = {}) => fetch(base + '/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
  body: JSON.stringify({ messages, ...extra }),
}).then(async (r) => ({ status: r.status, body: await r.json() }))
const say = (text) => [{ role: 'user', text }]

describe('위기 표현 찾기', async () => {
  const { isCrisis } = await import('../server/chat.js')
  test('직접·돌려 말한 위험 표현을 찾는다', () => {
    for (const t of ['죽고 싶어', '다 그만하고 싶어요', '다 그만두고 싶어', '내일이 안 왔으면', '사라지고 싶다', '살아서 뭐 해']) {
      assert.ok(isCrisis(t), t)
    }
  })
  test('평범한 말은 위험으로 보지 않는다', () => {
    for (const t of ['오늘 회사에서 혼났어요', '칭찬받았어요!', '배고파 죽겠다는 건 아니고 그냥 피곤해', '회사 그만두고 싶어']) {
      assert.equal(isCrisis(t), false, t)
    }
  })
})

describe('마음 대화', () => {
  test('로그인 없이도 답을 받는다', async () => {
    const r = await chat(say('요즘 그냥 다 지쳐요'))
    assert.equal(r.status, 200)
    assert.equal(r.body.reply, '에고, 많이 지쳤구나.')
    assert.equal(r.body.crisis, false)
  })

  test('AI에게 친구 같은 반말 말투와 공감 지침을 보낸다', async () => {
    await chat(say('친구랑 싸웠어'))
    const { instructions, store } = asked.at(-1)
    assert.match(instructions, /반말/)
    assert.match(instructions, /위로가 먼저/)
    assert.match(instructions, /109/)
    assert.equal(store, false, '대화를 OpenAI에 저장하지 않는다')
  })

  test('위기 표현이 있으면 긴급 카드 신호와 위기 지침을 함께 보낸다', async () => {
    const r = await chat(say('다 그만두고 싶어'))
    assert.equal(r.status, 200)
    assert.equal(r.body.crisis, true)
    assert.match(asked.at(-1).instructions, /위기 상황/)
  })

  test('AI가 위험하다고 판단해도 긴급 카드 신호를 보낸다', async () => {
    fakeReply = { reply: '지금 안전한지 물어봐도 될까?', risk: 'crisis' }
    const r = await chat(say('요즘 너무 깜깜해'))
    fakeReply = { reply: '에고, 많이 지쳤구나.', risk: 'none' }
    assert.equal(r.body.crisis, true)
  })

  test('로그인하지 않은 사람의 기억(지난 이야기)은 쓰지 않는다', async () => {
    await chat(say('안녕'), { extra: { memory: { summaries: [{ text: '비밀 이야기', daysAgo: 1 }], moods: [] } } })
    assert.doesNotMatch(asked.at(-1).instructions, /비밀 이야기/)
  })

  test('너무 긴 메시지는 AI에게 보내지 않는다', async () => {
    const before = asked.length
    const r = await chat(say('가'.repeat(501)))
    assert.equal(r.body.error, 'too_long')
    assert.equal(asked.length, before)
  })

  test('마지막 말이 사용자 말이 아니면 거절한다', async () => {
    const r = await chat([{ role: 'assistant', text: '안녕' }])
    assert.equal(r.status, 400)
  })

  test('로그인하지 않은 사람은 하루 횟수를 넘으면 막고, 위기면 긴급 카드는 띄운다', async () => {
    const ip = newIp()
    for (let i = 0; i < 3; i++) assert.equal((await chat(say('안녕'), { ip })).status, 200)
    const over = await chat(say('죽고 싶어'), { ip })
    assert.equal(over.status, 429)
    assert.equal(over.body.error, 'daily_limit')
    assert.equal(over.body.crisis, true)
    assert.match(over.body.message, /로그인/)
  })
})

describe('OpenAI 하루 한도', () => {
  test('무료 등급의 하루 요청 수를 다 쓰면 내일 다시 오라고 알리고, 위기면 긴급 카드는 띄운다', async () => {
    fakeStatus = 429
    fakeError = { error: { type: 'requests', code: 'rate_limit_exceeded', message: 'Rate limit reached for gpt-6-luna on requests per day (RPD): Limit 50, Used 50.' } }
    const r = await chat(say('죽고 싶어'))
    fakeStatus = 200
    assert.equal(r.body.error, 'ai_daily')
    assert.match(r.body.message, /내일/)
    assert.equal(r.body.crisis, true)
  })
})

describe('다정한 말 (로그인 전용)', () => {
  test('로그인하지 않으면 AI 다정한 말을 만들지 않는다', async () => {
    const before = asked.length
    const r = await fetch(base + '/api/comfort', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': newIp() },
      body: JSON.stringify({ kind: 'home' }),
    })
    assert.ok(r.status >= 400)
    assert.equal(asked.length, before)
  })
})

describe('기억 안내문', async () => {
  const { memoryNote } = await import('../server/chat.js')
  test('요약과 감정을 담고, 이상한 값은 버린다', () => {
    const note = memoryNote({
      summaries: [{ text: '친구와 다툼', daysAgo: 2 }, { text: 123 }, null],
      moods: [{ emotion: 'tired', level: 4, daysAgo: 0 }, { emotion: 'hacker', level: 9 }],
    })
    assert.match(note, /친구와 다툼/)
    assert.match(note, /지쳤어요/)
    assert.doesNotMatch(note, /hacker/)
  })
  test('기억이 없으면 빈 문자열', () => {
    assert.equal(memoryNote(undefined), '')
    assert.equal(memoryNote({ summaries: [], moods: [] }), '')
  })
})
