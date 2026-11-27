// AI가 나를 기억하기: 대화 요약은 users/{uid}/memory/{대화 id}에, 감정은 원래 있던 마음 기록에서 읽는다.
// 기억은 내 계정에만 저장되고, 대화를 보낼 때 AI에게 참고로 함께 보낸다(서버는 저장하지 않음).
import {
  collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc,
} from 'firebase/firestore'
import { db } from './firebase.js'
import { askComfort } from './comfortAI.js'

const SUMMARIES = 5 // AI에게 알려 주는 지난 대화 요약 수
const MOODS = 7 // AI에게 알려 주는 최근 마음 기록 수 (감정과 크기만, 메모는 보내지 않음)
const DAY = 24 * 60 * 60 * 1000

const daysAgo = (date) => {
  const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.max(0, Math.round((start(new Date()) - start(date)) / DAY))
}
const toDate = (v) => v?.toDate?.() || new Date()

const memoryCol = (uid) => collection(db, 'users', uid, 'memory')

// 내 계정에 저장된 기억 목록 (내 계정 화면에서 보여 줄 때도 씀)
export async function listMemory(uid, max = 50) {
  const snap = await getDocs(query(memoryCol(uid), orderBy('at', 'desc'), limit(max)))
  return snap.docs.map((d) => {
    const v = d.data({ serverTimestamps: 'estimate' })
    return { id: d.id, summary: v.summary, at: toDate(v.at) }
  })
}

// AI에게 보낼 기억. 지금 대화 자신의 요약은 빼고 보낸다(이미 대화 안에 있으니까).
// 읽지 못해도 대화는 그대로 되도록 실패하면 빈 기억을 돌려준다.
export async function loadMemory(uid) {
  const [summaries, moods] = await Promise.all([
    listMemory(uid, SUMMARIES + 1).catch(() => []),
    getDocs(query(collection(db, 'users', uid, 'journal'), orderBy('at', 'desc'), limit(MOODS)))
      .then((s) => s.docs.map((d) => {
        const v = d.data({ serverTimestamps: 'estimate' })
        return { emotion: v.emotion, level: v.level, daysAgo: daysAgo(toDate(v.at)) }
      }))
      .catch(() => []),
  ])
  return { summaries, moods }
}

export const memoryFor = (memory, chatId) => memory && {
  summaries: memory.summaries.filter((m) => m.id !== chatId).slice(0, SUMMARIES)
    .map((m) => ({ text: m.summary, daysAgo: daysAgo(m.at) })),
  moods: memory.moods,
}

// 대화를 AI가 짧게 요약해서 그 대화의 기억으로 저장한다. 실패하면 조용히 넘어간다(다음에 다시 시도됨).
// wanted: 요약을 기다리는 동안 그 대화를 지웠으면 false를 돌려주는 함수 (지운 대화의 기억이 되살아나지 않게)
export async function saveSummary(uid, chatId, messages, wanted = () => true) {
  // 서버 요청 크기 제한 안에 들도록 최근 메시지만, 길면 줄여서 보낸다 (서버도 같은 수만 봄)
  const recent = messages.slice(-16).map((m) => ({ role: m.role, text: m.text.slice(0, m.role === 'user' ? 500 : 300) }))
  const r = await askComfort({ kind: 'summary', messages: recent })
  if (!r?.summary || !wanted()) return false
  await setDoc(doc(memoryCol(uid), chatId), { summary: r.summary.slice(0, 300), at: serverTimestamp() })
  return true
}

export const deleteMemory = (uid, chatId) => deleteDoc(doc(memoryCol(uid), chatId))
