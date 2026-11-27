// 마음 대화의 'AI가 나를 기억하기' 부분 (Chat.jsx에서 나눔).
// - 로그인하면 지난 대화 요약과 최근 마음 기록 감정을 불러와 두었다가, 대화를 보낼 때 함께 보낸다.
// - 사용자 메시지가 SUMMARY_EVERY개 늘 때마다, 그리고 대화를 떠날 때 요약을 저장한다.
import { useEffect, useRef } from 'react'
import { db } from '../../firebase.js'
import { deleteMemory, loadMemory, saveSummary } from '../../memory.js'

const SUMMARY_EVERY = 3 // 사용자 메시지가 이만큼 늘 때마다 대화 요약(AI 기억)을 새로 만든다

// chatId: 지금 대화 id를 담은 ref, messages: 지금 화면의 메시지 목록
export default function useChatMemory(uid, chatId, messages) {
  const memory = useRef(null) // 불러온 기억
  const memoryLoad = useRef(null) // 기억을 불러오는 중인 Promise (첫인사가 기다림)
  const reload = () => { memoryLoad.current = loadMemory(uid).then((m) => (memory.current = m)) }

  useEffect(() => {
    memory.current = null
    memoryLoad.current = null
    if (uid && db) reload()
  }, [uid]) // eslint-disable-line react-hooks/exhaustive-deps

  // 대화 id마다 몇 번째 사용자 메시지까지 요약했는지 (Infinity = 지운 대화라 다시 요약하지 않음)
  const summarized = useRef({})
  const summarize = (list, id, force = false) => {
    if (!uid || !db || !id) return
    const msgs = list.filter((m) => m.from === 'me' || m.from === 'bot')
      .map((m) => ({ role: m.from === 'me' ? 'user' : 'assistant', text: m.text }))
    const count = msgs.filter((m) => m.role === 'user').length
    const done = summarized.current[id] || 0
    if (count < 2 || count <= done || (!force && count - done < SUMMARY_EVERY)) return
    summarized.current[id] = count
    const undo = () => { if (summarized.current[id] !== Infinity) summarized.current[id] = done }
    saveSummary(uid, id, msgs, () => summarized.current[id] !== Infinity).then((ok) => (ok ? reload() : undo()), undo)
  }

  // 지난 대화를 열었을 때: 이미 있는 메시지는 요약된 것으로 친다 (열기만 해도 다시 요약하지 않게)
  const opened = (id, list) => { summarized.current[id] ??= list.filter((x) => x.from === 'me').length }

  // 대화를 지웠을 때: 그 대화의 기억도 지운다
  const forget = (id) => {
    summarized.current[id] = Infinity
    deleteMemory(uid, id).then(reload, () => {})
  }

  // 화면을 떠나거나 앱을 뒤로 보낼 때도 그때까지의 대화를 요약해 둔다
  const latest = useRef({})
  latest.current = { messages, summarize }
  useEffect(() => {
    const leave = () => latest.current.summarize(latest.current.messages, chatId.current, true)
    const onHide = () => document.visibilityState === 'hidden' && leave()
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      leave()
    }
  }, [chatId])

  return { memory, memoryLoad, summarize, opened, forget }
}
