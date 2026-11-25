import { useEffect, useRef, useState } from 'react'
import { CHAT_MODES, EMOTIONS } from '../data.js'
import Icon from '../components/Icon.jsx'
import { auth, useUser } from '../firebase.js'

let nextId = 1

const MAX_CHARS = 500 // 서버 제한과 같게 유지
const HISTORY = 10 // 서버로 보내는 최근 메시지 수

const AUTH_ERRORS = ['login', 'not_verified', 'not_allowed', 'auth_setup']

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

export default function Chat({ mood, go }) {
  const picked = EMOTIONS.find((e) => e.id === mood)
  const [mode, setMode] = useState('listen')
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const user = useUser()
  const [messages, setMessages] = useState(() => [{
    id: nextId++, from: 'bot',
    text: picked
      ? `'${picked.label}' 마음으로 와 주었군요. 어떤 일이 있었는지 편하게 들려주세요.`
      : '안녕하세요, 마음곁이에요. 오늘 어떤 이야기를 나누고 싶나요?',
  }])
  const endRef = useRef(null)
  const request = useRef(null)
  const inputRef = useRef(null)
  const busy = useRef(false)
  const started = messages.some((m) => m.from === 'me')

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, typing])

  // 화면을 떠나면 진행 중인 요청을 취소
  useEffect(() => () => request.current?.abort(), [])

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
      if (e.name === 'AbortError') return
      added.push({ id: nextId++, from: 'error', text: '인터넷 연결을 확인하고 다시 시도해 주세요.', retry: true })
    }
    setMessages((m) => {
      // 긴급 연락처 카드는 최근에 이미 보여 줬다면 반복하지 않는다
      const recent = m.slice(-4).some((x) => x.from === 'crisis')
      return [...m, ...added.filter((x) => !(x.from === 'crisis' && recent))]
    })
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

      <section className="chat card">
        <p className="notice">AI가 답해요. 전문 상담을 대신할 수 없고, 대화 내용은 저장하지 않아요.</p>
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
