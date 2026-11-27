import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'

const WORD_MS = 30000 // 오늘의 한 마디가 바뀌는 간격
import { EMOTIONS } from '../data.js'
import { awayHours, nextWord, welcomeLine } from '../comfort.js'
import { askComfort, cachedHome, saveHome } from '../comfortAI.js'
import { useUser } from '../firebase.js'

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '깊은 밤이네요, 아직 깨어 있군요'
  if (h < 12) return '좋은 아침이에요'
  if (h < 18) return '오늘 오후는 어떤가요'
  return '오늘 하루도 수고했어요'
}

export default function Home({ mood, setMood, go }) {
  const picked = EMOTIONS.find((e) => e.id === mood)
  const user = useUser()
  // 오늘의 한 마디: 열거나 새로고침할 때마다 새 말, 홈에 있는 동안 30초마다 바뀌고 누르면 바로 다음 말.
  // 맨 위 인사는 로그인했으면 AI가 만든 인사로 바꾼다 (하루에 한 번)
  const [words, setWords] = useState(() => ({ greeting: welcomeLine(), word: nextWord(), ai: false }))
  const [turn, setTurn] = useState(0) // 한 마디가 바뀔 때마다 늘어남 (부드럽게 나타나는 효과용)
  const showNext = () => {
    setWords((w) => ({ ...w, word: nextWord() }))
    setTurn((t) => t + 1)
  }
  // 오늘의 한 마디는 홈에 있는 동안 천천히 바뀐다. 누르면 바로 다음 말로.
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && showNext(), WORD_MS)
    return () => clearInterval(t)
  }, [turn])
  useEffect(() => {
    if (!user) return
    const hit = cachedHome(user.uid)
    if (hit) return setWords((w) => ({ ...w, greeting: hit.greeting, ai: true }))
    let alive = true
    askComfort({ kind: 'home', hoursAway: awayHours() }).then((r) => {
      if (!alive || !r?.greeting) return
      saveHome(user.uid, r)
      setWords((w) => ({ ...w, greeting: r.greeting, ai: true }))
    })
    return () => { alive = false }
  }, [user?.uid])

  return (
    <div className="page home">
      <section className="hero card">
        {/* 휴대폰에서는 아래 메뉴에 '내 계정'이 없어서, 홈 오른쪽 위에 둔다 */}
        <button className="pill home-account" onClick={() => go('account')}>
          <Icon name="user" size={16} />
          {user ? '내 계정' : '로그인'}
        </button>
        <p className="eyebrow" key={'g' + words.ai}>{words.greeting}</p>
        <h1>{greeting()}.</h1>
        <p className="lead">여기서는 잘하지 않아도 괜찮아요. 지금 마음이 어떤지 살짝 알려 주세요.</p>
        <button className="daily-word" onClick={showNext} title="누르면 다음 말을 보여 줘요">
          <small>오늘의 한 마디 <span className="word-hint">· 누르면 다음 말</span></small>
          <p key={'w' + turn} className="ai-swap">{words.word}</p>
        </button>
      </section>

      <section className="card">
        <h2>지금 마음은 어떤가요?</h2>
        <div className="emotion-grid">
          {EMOTIONS.map((e) => (
            <button key={e.id} className={`emotion tone-${e.tone}` + (mood === e.id ? ' selected' : '')}
              aria-pressed={mood === e.id} onClick={() => setMood(mood === e.id ? null : e.id)}>
              <span className="emoji">{e.emoji}</span>
              {e.label}
            </button>
          ))}
        </div>

        <div className={'comfort' + (picked ? ' show' : '')} aria-live="polite">
          {picked ? (
            <>
              <span className="emoji">{picked.emoji}</span>
              <p>{picked.comfort}</p>
            </>
          ) : (
            <p className="muted">마음을 고르면 작은 위로의 말을 건넬게요.</p>
          )}
        </div>

        <button className="btn primary wide" onClick={() => go('chat')}>
          {picked ? `'${picked.label}' 마음으로 대화 시작하기` : '마음 대화 시작하기'}
        </button>
      </section>

      <button className="cry-entry card" onClick={() => go('cry')}>
        <span className="cry-entry-dot" aria-hidden="true" />
        <span>
          <strong>눈물 쉼터</strong>
          <small>울고 싶을 때, 불을 낮추고 잔잔한 음악 곁에서 마음껏 울어도 괜찮아요</small>
        </span>
      </button>

      <section className="quick-grid">
        <button className="quick card tone-lavender" onClick={() => go('journal')}>
          <strong>마음 기록</strong>
          <span>오늘의 감정을 남겨요</span>
        </button>
        <button className="quick card tone-blue" onClick={() => go('rest')}>
          <strong>마음 휴식</strong>
          <span>함께 천천히 숨 쉬어요</span>
        </button>
        <button className="quick card tone-cream" onClick={() => go('help')}>
          <strong>도움받기</strong>
          <span>전문 상담 연결 안내</span>
        </button>
      </section>
    </div>
  )
}
