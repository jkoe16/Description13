// 다른 주소(정적 사이트)에서 여는 화면이 API를 부를 때의 허락 규칙 시험. 실행: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cors } from '../server/cors.js'

const APP = 'https://maeumgyeot-app.onrender.com'
const fakeRes = () => {
  const headers = {}
  return { headers, statusCode: 200, ended: false, setHeader: (k, v) => { headers[k.toLowerCase()] = v }, end() { this.ended = true } }
}
const run = (method, origin) => {
  const res = fakeRes()
  const done = cors({ method, headers: origin ? { origin } : {} }, res)
  return { res, done }
}

test('허락한 주소의 미리 묻기(OPTIONS)는 204로 답하고 허락 머리글을 붙인다', () => {
  process.env.ALLOWED_ORIGINS = `${APP}/, https://other.example`
  const { res, done } = run('OPTIONS', APP)
  assert.equal(done, true)
  assert.equal(res.statusCode, 204)
  assert.equal(res.headers['access-control-allow-origin'], APP)
  assert.match(res.headers['access-control-allow-headers'], /Authorization/)
})

test('허락한 주소의 POST는 머리글만 붙이고 원래 처리로 넘긴다', () => {
  process.env.ALLOWED_ORIGINS = APP
  const { res, done } = run('POST', APP)
  assert.equal(done, false)
  assert.equal(res.ended, false)
  assert.equal(res.headers['access-control-allow-origin'], APP)
})

test('허락하지 않은 주소에는 허락 머리글을 주지 않고, 미리 묻기는 403', () => {
  process.env.ALLOWED_ORIGINS = APP
  const post = run('POST', 'https://evil.example')
  assert.equal(post.done, false)
  assert.equal(post.res.headers['access-control-allow-origin'], undefined)
  const pre = run('OPTIONS', 'https://evil.example')
  assert.equal(pre.done, true)
  assert.equal(pre.res.statusCode, 403)
})

test('같은 주소에서 온 요청(Origin 없음)은 지금처럼 그대로 처리한다', () => {
  process.env.ALLOWED_ORIGINS = ''
  const { res, done } = run('POST', undefined)
  assert.equal(done, false)
  assert.equal(res.headers['access-control-allow-origin'], undefined)
})
