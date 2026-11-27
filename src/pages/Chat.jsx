import { useEffect, useRef, useState } from 'react'
import { collection, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { EMOTIONS } from '../data.js'
import Icon from '../components/Icon.jsx'
import { auth, db, useUser } from '../firebase.js'
import { chatHello } from '../comfort.js'
import { askComfort } from '../comfortAI.js'
import { memoryFor } from '../memory.js'
import CrisisCard from '../components/chat/CrisisCard.jsx'
import PastChats from '../components/chat/PastChats.jsx'
import useChatMemory from '../components/chat/useChatMemory.js'

let nextId = 1

const MAX_CHARS = 500 // 서버 제한과 같게 유지
const HISTORY = 10 // 서버로 보내는 최근 메시지 수

const AUTH_ERRORS = ['login', 'not_verified', 'auth_setup']
const SAVE_MAX = 200 // 대화 하나에 저장하는 최대 메시지 수 (보안 규칙과 같게)
const MODE = 'together' // 대화 방식은 하나로 합침. 저장 형식(보안 규칙)에 맞추려고 이름만 남겨 둔다

const greeting = (picked) => ({
  id: nextId++, from: 'bot',
  text: picked
    ? `'${picked.label}' 마음으로 와 주었군요. 어떤 일이 있었는지 편하게 들려주세요.`
    : chatHello(),
})

const STARTERS = [
  '오늘 있었던 일을 이야기하고 싶어요.',
  '요즘 마음이 복잡해요.',
  '누군가에게 위로받고 싶어요.',
  '그냥 편하게 이야기하고 싶어요.',
]

// 오래 쉬던 무료 서버가 깨어나는 동안 보여 주는 말. 기다림이 길어질수록 조금씩 바뀐다.
const SLOW_NOTES = [
  '천천히 읽고 있어요. 조금만 기다려 줘요.',
  '오래 쉬고 있던 서버를 깨우는 중이라 조금 늦어요. 그동안 숨을 한 번 길게 내쉬어 볼까요?',
  '거의 다 왔어요. 처음 한 번만 이렇게 늦고, 다음부터는 금방 답할게요.',
]

export default function Chat({ mood, go }) {
  const picked = EMOTIONS.find((e) => e.id === mood)
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const [slow, setSlow] = useState(0) // 답이 늦을 때 단계: 0 = 안 늦음, 1 = 5초, 2 = 15초, 3 = 30초 넘음
  const user = useUser()
  const [messages, setMessages] = useState(() => [greeting(picked)])
  const cloud = Boolean(user && db) // 로그인하면 대화를 계정에 저장 (users/{uid}/chats)
  const [showPast, setShowPast] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const chatId = useRef(null)
  const lastSaved = useRef('')
  const endRef = useRef(null)
  const request = useRef(null)
  const inputRef = useRef(null)
  const busy = useRef(false)
  const started = messages.some((m) => m.from === 'me')

  // AI가 나를 기억하기 (지난 대화 요약·최근 감정, 대화 요약 저장) → src/components/chat/useChatMemory.js
  const { memory, memoryLoad, summarize, forget, opened } = useChatMemory(user?.uid, chatId, messages)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, typing])

  // 로그인했으면 첫인사를 AI가 시간과 마음에 맞춰 건넨다 (아직 아무 말도 안 했을 때만 바꿈)
  const helloAsked = useRef(false)
  useEffect(() => {
    if (!user || helloAsked.current) return
    helloAsked.current = true
    Promise.resolve(memoryLoad.current).catch(() => null).then((m) => (
      askComfort({ kind: 'hello', emotion: mood || undefined, memory: memoryFor(m, null) || undefined })
    )).then((r) => {
      if (!r?.reply) return
      setMessages((m) => (m.length === 1 && m[0].from === 'bot' && !chatId.current
        ? [{ ...m[0], id: nextId++, text: r.reply }] : m))
    })
  }, [user, mood])

  // 화면을 떠나면 진행 중인 요청을 취소
  useEffect(() => () => request.current?.abort(), [])

  // 대화가 바뀔 때마다 계정에 저장 (오류·긴급 카드는 저장하지 않음)
  useEffect(() => {
    if (!cloud || !started) return
    const saved = messages.filter((m) => m.from === 'me' || m.from === 'bot')
      .slice(-SAVE_MAX).map((m) => ({ from: m.from, text: m.text }))
    const json = JSON.stringify(saved)
    if (json === lastSaved.current) return
    lastSaved.current = json
    if (!chatId.current) chatId.current = doc(collection(db, 'users', user.uid, 'chats')).id
    const title = (saved.find((m) => m.from === 'me')?.text || '대화').slice(0, 40)
    setDoc(doc(db, 'users', user.uid, 'chats', chatId.current), { title, mode: MODE, messages: saved, updatedAt: serverTimestamp() })
      .then(() => setSaveError(false), () => setSaveError(true))
  }, [messages, cloud, started, user?.uid])

  const reset = (list, id = null) => {
    summarize(messages, chatId.current, true) // 떠나는 대화를 기억해 둔다
    if (id) opened(id, list)
    request.current?.abort()
    busy.current = false
    setTyping(false)
    setSlow(0)
    chatId.current = id
    lastSaved.current = id ? JSON.stringify(list.map(({ from, text }) => ({ from, text }))) : ''
    setMessages(list)
    setShowPast(false)
    setSaveError(false)
  }

  const newChat = () => reset([greeting(null)])
  const openChat = (c) => reset((c.messages || []).map((m) => ({ id: nextId++, from: m.from, text: m.text })), c.id)
  const removeChat = (id) => {
    deleteDoc(doc(db, 'users', user.uid, 'chats', id)).catch(() => {})
    forget(id) // 그 대화의 AI 기억도 지운다
    if (chatId.current === id) newChat()
  }

  // 줄바꿈에 맞춰 입력창 높이 조절
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [text])

  const ask = async (list) => {
    busy.current = true
    setTyping(true)
    const history = list
      .filter((m) => m.from === 'me' || m.from === 'bot')
      .slice(-HISTORY)
      .map((m) => ({ role: m.from === 'me' ? 'user' : 'assistant', text: m.text }))
    const controller = new AbortController()
    request.current = controller
    const slowTimers = [5000, 15000, 30000].map((ms, i) => setTimeout(() => setSlow(i + 1), ms))
    const clearSlow = () => slowTimers.forEach(clearTimeout)
    let added = []
    try {
      const token = auth?.currentUser ? await auth.currentUser.getIdToken() : ''
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? 'Bearer ' + token : '' },
        body: JSON.stringify({ messages: history, memory: memoryFor(memory.current, chatId.current) || undefined }),
        signal: controller.signal,
      })
      const data = await r.json().catch(() => ({}))
      if (data.crisis) added.push({ id: nextId++, from: 'crisis' })
      added.push(r.ok && data.reply
        ? { id: nextId++, from: 'bot', text: data.reply }
        : { id: nextId++, from: 'error', text: data.message || '답변을 받지 못했어요. 다시 시도해 주세요.', needLogin: AUTH_ERRORS.includes(data.error), retry: !['too_long', 'no_key', 'daily_limit', ...AUTH_ERRORS].includes(data.error) })
    } catch (e) {
      if (e.name === 'AbortError') return clearSlow()
      added.push({ id: nextId++, from: 'error', text: '인터넷 연결을 확인하고 다시 시도해 주세요.', retry: true })
    }
    setMessages((m) => {
      // 긴급 연락처 카드는 최근에 이미 보여 줬다면 반복하지 않는다
      const recent = m.slice(-4).some((x) => x.from === 'crisis')
      return [...m, ...added.filter((x) => !(x.from === 'crisis' && recent))]
    })
    if (added.some((x) => x.from === 'bot')) summarize([...list, ...added], chatId.current)
    clearSlow()
    setSlow(0)
    setTyping(false)
    busy.current = false
    inputRef.current?.focus()
  }

  const send = (raw = text) => {
    const value = raw.trim()
    if (!value || busy.current || value.length > MAX_CHARS) return
    const next = [...messages.filter((m) => m.from !== 'error'), { id: nextId++, from: 'me', text: value }]
    setMessages(next)
    setText('')
    ask(next)
  }

  const retry = () => {
    if (busy.current) return
    const next = messages.filter((m) => m.from !== 'error')
    setMessages(next)
    ask(next)
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="page chat-page">
      <header className="page-head">
        <div>
          <h1>마음 대화</h1>
          <p className="muted">무슨 이야기든 편하게 들려주세요.</p>
        </div>
        <div className="head-actions">
          {cloud && <button className={'pill' + (showPast ? ' on' : '')} aria-expanded={showPast} onClick={() => setShowPast((v) => !v)}>지난 대화</button>}
          {started && <button className="pill" onClick={newChat}>새 대화</button>}
          <button className="pill" onClick={() => go('account')}>{user ? '내 계정' : '로그인'}</button>
          <button className="pill sos" onClick={() => go('help')}>위험할 땐 109</button>
        </div>
      </header>

      {showPast && cloud && (
        <PastChats uid={user.uid} currentId={chatId.current} onOpen={openChat} onRemove={removeChat} />
      )}

      <section className="chat card">
        <p className="notice">
          {cloud
            ? 'AI가 답해요. 전문 상담을 대신할 수 없어요. 대화는 내 계정에 저장되고 나만 볼 수 있어요.'
            : 'AI가 답해요. 전문 상담을 대신할 수 없어요. 로그인하지 않으면 대화가 저장되지 않고, 화면을 나가면 사라져요.'}
          {' '}<button className="link" onClick={() => go('account')}>개인정보 안내</button>
        </p>
        {saveError && <p className="form-error" role="alert">대화를 저장하지 못했어요. 인터넷 연결을 확인해 주세요.</p>}
        <div className="messages" aria-live="polite">
          {messages.map((m) => {
            if (m.from === 'crisis') {
              return <CrisisCard key={m.id} go={go} />
            }
            if (m.from === 'error') {
              return (
                <div key={m.id} className="bubble-row bot">
                  <span className="avatar">곁</span>
                  <div className="bubble error" role="alert">
                    {m.text}
                    {m.retry && <button className="btn soft small" onClick={retry}>다시 시도</button>}
                    {m.needLogin && <button className="btn soft small" onClick={() => go('account')}>내 계정 보기</button>}
                  </div>
                </div>
              )
            }
            return (
              <div key={m.id} className={'bubble-row ' + m.from}>
                {m.from === 'bot' && <span className="avatar">곁</span>}
                <div className="bubble">{m.text}</div>
              </div>
            )
          })}
          {!started && (
            <div className="starters">
              <p>이렇게 시작해 볼 수도 있어요</p>
              <div className="starter-list">
                {STARTERS.map((s) => (
                  <button key={s} className="starter" onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {typing && (
            <div className="bubble-row bot">
              <span className="avatar">곁</span>
              <div className="bubble typing"><i /><i /><i /></div>
              {slow > 0 && <small className="slow-note" aria-live="polite">{SLOW_NOTES[slow - 1]}</small>}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="composer">
          <textarea ref={inputRef} rows={1} value={text} placeholder="마음속 이야기를 적어 주세요"
            maxLength={MAX_CHARS} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} aria-label="메시지 입력" />
          <button className="send" onClick={() => send()} disabled={!text.trim() || typing} aria-label="보내기">
            <Icon name="send" size={20} />
          </button>
        </div>
        {text.length > MAX_CHARS - 100 && (
          <p className="char-count">{text.length}/{MAX_CHARS}</p>
        )}
      </section>
    </div>
  )
}
