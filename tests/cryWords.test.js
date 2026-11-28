// 눈물 쉼터 말 순서 시험. 실행: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { WORD_GROUPS, WORDS, wordOrder } from '../src/cryWords.js'

test('눈물 쉼터 말은 겹치지 않는다', () => {
  assert.equal(new Set(WORDS).size, WORDS.length)
})

test('순서를 섞어도 모든 말이 한 번씩 나오고, 첫 마디는 늘 같다', () => {
  for (let i = 0; i < 50; i++) {
    const order = wordOrder()
    assert.equal(order.length, WORDS.length)
    assert.deepEqual([...order].sort(), [...WORDS].sort())
    assert.equal(order[0], '괜찮아. 여기선 울어도 돼.')
  }
})

test('섞어도 허락 → 알아주기 → 곁에 있기 → 다독임 흐름은 지킨다', () => {
  const order = wordOrder()
  let at = 0
  for (const group of WORD_GROUPS) {
    assert.deepEqual([...order.slice(at, at + group.length)].sort(), [...group].sort())
    at += group.length
  }
})

test('들를 때마다 순서가 달라질 수 있다', () => {
  const seen = new Set(Array.from({ length: 20 }, () => wordOrder().join('|')))
  assert.ok(seen.size > 1)
})
