import { useEffect, useState } from 'react'
import {
  addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp,
} from 'firebase/firestore'
import { EMOTIONS } from '../data.js'
import { db, useUser } from '../firebase.js'

const LEVELS = ['아주 약하게', '조금', '보통', '꽤', '아주 강하게']
const fmt = new Intl.DateTimeFormat('ko-KR', {
  month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
})

const SHOW = 50 // 화면에 보여 줄 최근 기록 수

export default function Journal({ go }) {
  const user = useUser()
  const cloud = Boolean(user && db) // 로그인하면 계정에 저장, 아니면 이 화면에서만 잠시
  const [emotion, setEmotion] = useState(null)
  const [level, setLevel] = useState(3)
  const [note, setNote] = useState('')
  const [entries, setEntries] = useState([])
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 로그인한 계정의 기록을 실시간으로 불러온다 (users/{uid}/journal)
  useEffect(() => {
    setEntries([])
    setError('')
    if (!cloud) return
    setLoading(true)
    const q = query(collection(db, 'users', user.uid, 'journal'), orderBy('at', 'desc'), limit(SHOW))
    return onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => {
        const v = d.data({ serverTimestamps: 'estimate' })
        return { id: d.id, emotion: v.emotion, level: v.level, note: v.note, at: v.at?.toDate() || new Date() }
      }).filter((en) => EMOTIONS.some((e) => e.id === en.emotion)))
      setLoading(false)
    }, () => {
      setError('기록을 불러오지 못했어요. 잠시 뒤에 다시 열어 주세요.')
      setLoading(false)
    })
  }, [cloud, user?.uid])

  const save = async () => {
    if (!emotion) return
    const entry = { emotion, level, note: note.trim() }
    setError('')
    if (cloud) {
      try {
        await addDoc(collection(db, 'users', user.uid, 'journal'), { ...entry, at: serverTimestamp() })
      } catch {
        return setError('기록을 저장하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.')
      }
    } else {
      setEntries((list) => [{ id: String(Date.now()), ...entry, at: new Date() }, ...list])
    }
    setEmotion(null)
    setLevel(3)
    setNote('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  const remove = async (id) => {
    if (!cloud) return setEntries((l) => l.filter((x) => x.id !== id))
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'journal', id))
    } catch {
      setError('기록을 지우지 못했어요. 다시 시도해 주세요.')
    }
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
          {error && <p className="form-error" role="alert">{error}</p>}
        </section>

        <section className="card">
          <h2>{cloud ? '내 기록' : '이번에 남긴 기록'}</h2>
          {cloud ? (
            <p className="notice">내 계정에 저장돼요. 나만 볼 수 있고, 다른 기기에서 로그인해도 보여요.</p>
          ) : (
            <div className="login-prompt">
              <p>지금은 이 화면에만 잠시 보이고, 새로고침하면 사라져요. 로그인하면 기록이 계정에 저장돼요.</p>
              {user === null && <button className="btn primary small" onClick={() => go('account')}>로그인하기</button>}
            </div>
          )}
          {loading ? (
            <p className="muted journal-loading">기록을 불러오고 있어요…</p>
          ) : entries.length === 0 ? (
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
                    <button className="link" onClick={() => remove(en.id)}>
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
