// AI에게 다정한 말을 부탁한다. 로그인하지 않았거나, 하루 횟수를 넘었거나, 실패하면 null을 돌려주고
// 화면은 미리 써 둔 문장을 그대로 쓴다.
import { auth } from './firebase.js'
import { api } from './api.js'

export async function askComfort(body) {
  const user = auth?.currentUser
  if (!user) return null
  try {
    const token = await user.getIdToken()
    const r = await fetch(api('/api/comfort'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ hour: new Date().getHours(), ...body }),
    })
    return r.ok ? await r.json() : null
  } catch {
    return null
  }
}

// 홈 인사·오늘의 한 마디는 하루에 한 번만 만든다 (이 기기에 저장)
const HOME_KEY = 'maeumgyeot-home-ai'
const today = () => new Date().toLocaleDateString('ko-KR')

export function cachedHome(uid) {
  try {
    const v = JSON.parse(localStorage.getItem(HOME_KEY))
    return v && v.date === today() && v.uid === uid ? v : null
  } catch {
    return null
  }
}

export function saveHome(uid, data) {
  try {
    localStorage.setItem(HOME_KEY, JSON.stringify({ date: today(), uid, greeting: data.greeting, word: data.word }))
  } catch { /* 저장 못 해도 괜찮음 */ }
}
