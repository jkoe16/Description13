// 미리 써 둔 위로 문장 시험. 실행: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'

// 브라우저의 localStorage 흉내 (최근에 본 한 마디를 기억하는 곳)
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
}
const { DAILY_WORDS, nextWord, chatHello, moodHello, journalReply } = await import('../src/comfort.js')
const { EMOTIONS } = await import('../src/data.js')

test('오늘의 한 마디는 최근에 본 12개를 다시 고르지 않는다 (새로고침해도)', () => {
  const seen = []
  for (let i = 0; i < 40; i++) {
    const w = nextWord()
    assert.ok(DAILY_WORDS.includes(w))
    assert.ok(!seen.slice(-12).includes(w), `최근에 본 말이 또 나옴: ${w}`)
    seen.push(w)
  }
})

test('오늘의 한 마디에 같은 문장이 두 번 들어 있지 않다', () => {
  assert.equal(new Set(DAILY_WORDS).size, DAILY_WORDS.length)
})

test('대화 첫인사는 반말이고, 마음마다 준비되어 있다', () => {
  assert.equal(typeof chatHello(), 'string')
  for (const e of EMOTIONS) {
    const hello = moodHello(e.id)
    assert.ok(hello.length > 10, e.id)
    assert.doesNotMatch(hello, /(세요|해요|어요|에요)[.?!]?$/, `반말이 아님: ${hello}`)
  }
})

test('마음 기록 위로는 모든 감정에 있고, 힘든 마음을 크게 느끼면 도움받을 곳을 알린다', () => {
  for (const e of EMOTIONS) assert.ok(journalReply(e.id, 3).text, e.id)
  assert.equal(journalReply('sad', 5).offer, true)
  assert.equal(journalReply('happy', 5).offer, false)
})
