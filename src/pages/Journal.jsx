import { useState } from 'react'
import { EMOTIONS } from '../data.js'

const LEVELS = ['아주 약하게', '조금', '보통', '꽤', '아주 강하게']
const fmt = new Intl.DateTimeFormat('ko-KR', {
  month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
})

export default function Journal() {
  const [emotion, setEmotion] = useState(null)
  const [level, setLevel] = useState(3)
  const [note, setNote] = useState('')
  const [entries, setEntries] = useState([])
  const [saved, setSaved] = useState(false)

  const save = () => {
    if (!emotion) return
    setEntries((list) => [{ id: Date.now(), emotion, level, note: note.trim(), at: new Date() }, ...list])
    setEmotion(null)
    setLevel(3)
    setNote('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>마음 기록</h1>
          <p className="muted">오늘의 마음을 가볍게 남겨 두어요.</p>
        </div>
      </header>

      <div className="two-col">
        <section className="card">
          <h2>어떤 감정이 드나요?</h2>
          <div className="emotion-grid compact">
            {EMOTIONS.map((e) => (
              <button key={e.id} className={`emotion tone-${e.tone}` + (emotion === e.id ? ' selected' : '')}
                aria-pressed={emotion === e.id} onClick={() => setEmotion(e.id)}>
                <span className="emoji">{e.emoji}</span>
                {e.label}
              </button>
            ))}
          </div>

          <h3>얼마나 크게 느껴지나요?</h3>
          <div className="level-row" role="radiogroup" aria-label="감정의 크기">
            {LEVELS.map((label, i) => (
              <button key={label} role="radio" aria-checked={level === i + 1}
                className={'level' + (level >= i + 1 ? ' on' : '')} onClick={() => setLevel(i + 1)}>
                <span className="dot" />
                <small>{label}</small>
              </button>
            ))}
          </div>

          <h3>한 줄 메모 <span className="muted">(선택)</span></h3>
          <textarea className="field" rows={4} maxLength={300} value={note}
            onChange={(e) => setNote(e.target.value)} placeholder="무슨 일이 있었는지, 지금 어떤 생각이 드는지 적어 보세요." />
          <div className="row-between">
            <small className="muted">{note.length}/300</small>
            <button className="btn primary" onClick={save} disabled={!emotion}>기록하기</button>
          </div>
          {saved && <p className="toast" role="status">마음을 기록했어요. 잘했어요.</p>}
        </section>

        <section className="card">
          <h2>이번에 남긴 기록</h2>
          <p className="notice">UI 초안이라 저장 기능이 없어요. 기록은 이 화면에만 잠시 보이고, 새로고침하면 사라져요.</p>
          {entries.length === 0 ? (
            <div className="empty">
              <span className="emoji">📖</span>
              <p>아직 남긴 기록이 없어요.<br />첫 마음을 기록해 보세요.</p>
            </div>
          ) : (
            <ul className="entries">
              {entries.map((en) => {
                const e = EMOTIONS.find((x) => x.id === en.emotion)
                return (
                  <li key={en.id} className={`entry tone-${e.tone}`}>
                    <span className="emoji">{e.emoji}</span>
                    <div>
                      <strong>{e.label} · {LEVELS[en.level - 1]}</strong>
                      <small>{fmt.format(en.at)}</small>
                      {en.note && <p>{en.note}</p>}
                    </div>
                    <button className="link" onClick={() => setEntries((l) => l.filter((x) => x.id !== en.id))}>
                      지우기
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
