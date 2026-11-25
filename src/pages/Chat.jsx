import { useEffect, useRef, useState } from 'react'
import {
  collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc,
} from 'firebase/firestore'
import { CHAT_MODES, EMOTIONS } from '../data.js'
import Icon from '../components/Icon.jsx'
import { auth, db, useUser } from '../firebase.js'
import { chatHello } from '../comfort.js'
import { askComfort } from '../comfortAI.js'

let nextId = 1

const MAX_CHARS = 500 // 서버 제한과 같게 유지
const HISTORY = 10 // 서버로 보내는 최근 메시지 수

const AUTH_ERRORS = ['login', 'not_verified', 'not_allowed', 'auth_setup']
const SAVE_MAX = 200 // 대화 하나에 저장하는 최대 메시지 수 (보안 규칙과 같게)
const LIST_MAX = 30 // 지난 대화 목록에 보여 줄 수
const when = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

const greeting = (picked) => ({
  id: nextId++, from: 'bot',
  text: picked
    ? `'${picked.label}' 마음으로 와 주었군요. 어떤 일이 있었는지 편하게 들려주세요.`
    : chatHello(),
})

const SOS = [
  { number: '109', label: '자살예방상담 (24시간)' },
  { number: '112', label: '경찰 · 위험한 상황' },
  { number: '119', label: '응급 상황' },
]

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
  const [mode, setMode] = useState('listen')
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const [slow, setSlow] = useState(0) // 답이 늦을 때 단계: 0 = 안 늦음, 1 = 5초, 2 = 15초, 3 = 30초 넘음
  const user = useUser()
  const [messages, setMessages] = useState(() => [greeting(picked)])
  const cloud = Boolean(user && db) // 로그인하면 대화를 계정에 저장 (users/{uid}/chats)
  const [showPast, setShowPast] = useState(false)
  const [past, setPast] = useState(null) // null = 불러오는 중
  const [saveError, setSaveError] = useState(false)
  const chatId = useRef(null)
  const lastSaved = useRef('')
  const endRef = useRef(null)
  const request = useRef(null)
  const inputRef = useRef(null)
  const busy = useRef(false)
  const started = messages.some((m) => m.from === 'me')

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, typing])

  // 로그인했으면 첫인사를 AI가 시간과 마음에 맞춰 건넨다 (아직 아무 말도 안 했을 때만 바꿈)
  const helloAsked = useRef(false)
  useEffect(() => {
    if (!user || helloAsked.current) return
    helloAsked.current = true
    askComfort({ kind: 'hello', emotion: mood || undefined }).then((r) => {
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
    const json = JSON.stringify([mode, saved])
    if (json === lastSaved.current) return
    lastSaved.current = json
    if (!chatId.current) chatId.current = doc(collection(db, 'users', user.uid, 'chats')).id
    const title = (saved.find((m) => m.from === 'me')?.text || '대화').slice(0, 40)
    setDoc(doc(db, 'users', user.uid, 'chats', chatId.current), { title, mode, messages: saved, updatedAt: serverTimestamp() })
      .then(() => setSaveError(false), () => setSaveError(true))
  }, [messages, mode, cloud, started, user?.uid])

  // 지난 대화 목록 (패널을 열었을 때만 불러옴)
  useEffect(() => {
    if (!cloud || !showPast) return
    setPast(null)
    const q = query(collection(db, 'users', user.uid, 'chats'), orderBy('updatedAt', 'desc'), limit(LIST_MAX))
    return onSnapshot(q, (snap) => setPast(snap.docs.map((d) => {
      const v = d.data({ serverTimestamps: 'estimate' })
      return { id: d.id, ...v, updatedAt: v.updatedAt?.toDate() || new Date() }
    })), () => setPast([]))
  }, [cloud, showPast, user?.uid])

  const reset = (list, id = null, m = mode) => {
    request.current?.abort()
    busy.current = false
    setTyping(false)
    setSlow(0)
    chatId.current = id
    lastSaved.current = id ? JSON.stringify([m, list.map(({ from, text }) => ({ from, text }))]) : ''
    setMode(m)
    setMessages(list)
    setShowPast(false)
    setSaveError(false)
  }

  const newChat = () => reset([greeting(null)])
  const openChat = (c) => reset((c.messages || []).map((m) => ({ id: nextId++, from: m.from, text: m.text })), c.id,
    CHAT_MODES.some((x) => x.id === c.mode) ? c.mode : 'listen')
  const removeChat = (id) => {
    deleteDoc(doc(db, 'users', user.uid, 'chats', id)).catch(() => {})
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
        body: JSON.stringify({ mode, messages: history }),
        signal: controller.signal,
      })
      const data = await r.json().catch(() => ({}))
      if (data.crisis) added.push({ id: nextId++, from: 'crisis' })
      added.push(r.ok && data.reply
        ? { id: nextId++, from: 'bot', text: data.reply }
        : { id: nextId++, from: 'error', text: data.message || '답변을 받지 못했어요. 다시 시도해 주세요.', needLogin: AUTH_ERRORS.includes(data.error), retry: !['too_long', 'no_key', ...AUTH_ERRORS].includes(data.error) })
    } catch (e) {
      if (e.name === 'AbortError') return clearSlow()
      added.push({ id: nextId++, from: 'error', text: '인터넷 연결을 확인하고 다시 시도해 주세요.', retry: true })
    }
    setMessages((m) => {
      // 긴급 연락처 카드는 최근에 이미 보여 줬다면 반복하지 않는다
      const recent = m.slice(-4).some((x) => x.from === 'crisis')
      return [...m, ...added.filter((x) => !(x.from === 'crisis' && recent))]
    })
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
          <p className="muted">어떤 방식으로 곁에 있어 줄까요?</p>
        </div>
        <div className="head-actions">
          {cloud && <button className={'pill' + (showPast ? ' on' : '')} aria-expanded={showPast} onClick={() => setShowPast((v) => !v)}>지난 대화</button>}
          {cloud && started && <button className="pill" onClick={newChat}>새 대화</button>}
          <button className="pill" onClick={() => go('account')}>{user ? '내 계정' : '로그인'}</button>
          <button className="pill sos" onClick={() => go('help')}>위험할 땐 109</button>
        </div>
      </header>

      <div className="mode-row" role="radiogroup" aria-label="대화 방식">
        {CHAT_MODES.map((m) => (
          <button key={m.id} role="radio" aria-checked={mode === m.id}
            className={'mode' + (mode === m.id ? ' active' : '')} onClick={() => setMode(m.id)}>
            <strong>{m.label}</strong>
            <small>{m.desc}</small>
          </button>
        ))}
      </div>

      {showPast && cloud && (
        <section className="card past-chats" aria-label="지난 대화">
          <h2>지난 대화</h2>
          {past === null ? (
            <p className="muted">불러오고 있어요…</p>
          ) : past.length === 0 ? (
            <p className="muted">아직 저장된 대화가 없어요.</p>
          ) : (
            <ul>
              {past.map((c) => (
                <li key={c.id} className={chatId.current === c.id ? 'current' : ''}>
                  <button className="past-open" onClick={() => openChat(c)}>
                    <strong>{c.title}</strong>
                    <small>{when.format(c.updatedAt)} · 메시지 {c.messages?.length || 0}개</small>
                  </button>
                  <button className="link" onClick={() => removeChat(c.id)}>지우기</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="chat card">
        <p className="notice">
          {cloud
            ? 'AI가 답해요. 전문 상담을 대신할 수 없어요. 대화는 내 계정에 저장되고 나만 볼 수 있어요.'
            : 'AI가 답해요. 전문 상담을 대신할 수 없고, 대화 내용은 저장하지 않아요.'}
          {' '}<button className="link" onClick={() => go('account')}>개인정보 안내</button>
        </p>
        {saveError && <p className="form-error" role="alert">대화를 저장하지 못했어요. 인터넷 연결을 확인해 주세요.</p>}
        <div className="messages" aria-live="polite">
          {messages.map((m) => {
            if (m.from === 'crisis') {
              return (
                <div key={m.id} className="crisis-card" role="alert">
                  <strong>지금 많이 힘들다면, 혼자 견디지 않아도 돼요.</strong>
                  <p>바로 전화할 수 있는 곳이에요. 곁에 있는 믿을 수 있는 사람에게도 지금 알려 주세요.</p>
                  <div className="crisis-actions">
                    {SOS.map((s) => (
                      <a key={s.number} className="crisis-call" href={`tel:${s.number}`}>
                        <b>{s.number}</b><small>{s.label}</small>
                      </a>
                    ))}
                  </div>
                  <button className="link" onClick={() => go('help')}>다른 상담기관 보기</button>
                </div>
              )
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

        {user === null ? (
          <div className="login-prompt">
            <p>마음 대화는 로그인한 뒤에 쓸 수 있어요.</p>
            <button className="btn primary small" onClick={() => go('account')}>로그인하기</button>
          </div>
        ) : (
        <div className="composer">
          <textarea ref={inputRef} rows={1} value={text} placeholder="마음속 이야기를 적어 주세요"
            maxLength={MAX_CHARS} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} aria-label="메시지 입력" />
          <button className="send" onClick={() => send()} disabled={!text.trim() || typing || !user} aria-label="보내기">
            <Icon name="send" size={20} />
          </button>
        </div>
        )}
        {text.length > MAX_CHARS - 100 && (
          <p className="char-count">{text.length}/{MAX_CHARS}</p>
        )}
      </section>
    </div>
  )
}
