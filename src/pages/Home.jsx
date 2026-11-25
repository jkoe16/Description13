import { EMOTIONS } from '../data.js'
import { dailyWord, welcomeLine } from '../comfort.js'

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '깊은 밤이네요, 아직 깨어 있군요'
  if (h < 12) return '좋은 아침이에요'
  if (h < 18) return '오늘 오후는 어떤가요'
  return '오늘 하루도 수고했어요'
}

export default function Home({ mood, setMood, go }) {
  const picked = EMOTIONS.find((e) => e.id === mood)

  return (
    <div className="page home">
      <section className="hero card">
        <p className="eyebrow">{welcomeLine()}</p>
        <h1>{greeting()}.</h1>
        <p className="lead">여기서는 잘하지 않아도 괜찮아요. 지금 마음이 어떤지 살짝 알려 주세요.</p>
        <div className="daily-word">
          <small>오늘의 한 마디</small>
          <p>{dailyWord()}</p>
        </div>
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
          <small>울고 싶을 때, 불을 낮추고 잔잔한 소리 곁에서 마음껏 울어도 괜찮아요</small>
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
