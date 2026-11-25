import { useEffect, useRef, useState } from 'react'
import { CHAT_MODES, EMOTIONS } from '../data.js'
import Icon from '../components/Icon.jsx'

let nextId = 1

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
  const [messages, setMessages] = useState(() => [{
    id: nextId++, from: 'bot',
    text: picked
      ? `'${picked.label}' 마음으로 와 주었군요. 어떤 일이 있었는지 편하게 들려주세요.`
      : '안녕하세요, 마음곁이에요. 오늘 어떤 이야기를 나누고 싶나요?',
  }])
  const count = useRef(0)
  const endRef = useRef(null)
  const timer = useRef(null)
  const inputRef = useRef(null)
  const busy = useRef(false)
  const started = messages.some((m) => m.from === 'me')

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, typing])

  useEffect(() => () => clearTimeout(timer.current), [])

  // 줄바꿈에 맞춰 입력창 높이 조절
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [text])

  const send = (raw = text) => {
    const value = raw.trim()
    if (!value || busy.current) return
    busy.current = true
    setMessages((m) => [...m, { id: nextId++, from: 'me', text: value }])
    setText('')
    setTyping(true)
    const replies = CHAT_MODES.find((m) => m.id === mode).replies
    const reply = replies[count.current++ % replies.length]
    timer.current = setTimeout(() => {
      setMessages((m) => [...m, { id: nextId++, from: 'bot', text: reply, sample: true }])
      setTyping(false)
      busy.current = false
      inputRef.current?.focus()
    }, 900)
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
        <button className="pill sos" onClick={() => go('help')}>위험할 땐 109</button>
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
        <p className="notice">UI 초안이에요. 아직 AI가 연결되지 않아 답변은 정해진 예시 문구로 나와요.</p>
        <div className="messages" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={'bubble-row ' + m.from}>
              {m.from === 'bot' && <span className="avatar">곁</span>}
              <div className="bubble">
                {m.text}
                {m.sample && <span className="sample-tag">예시 답변</span>}
              </div>
            </div>
          ))}
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

        <div className="composer">
          <textarea ref={inputRef} rows={1} value={text} placeholder="마음속 이야기를 적어 주세요"
            onChange={(e) => setText(e.target.value)} onKeyDown={onKey} aria-label="메시지 입력" />
          <button className="send" onClick={() => send()} disabled={!text.trim() || typing} aria-label="보내기">
            <Icon name="send" size={20} />
          </button>
        </div>
      </section>
    </div>
  )
}
