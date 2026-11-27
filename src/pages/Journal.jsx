import { useEffect, useState } from 'react'
import {
  addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc,
} from 'firebase/firestore'
import { EMOTIONS } from '../data.js'
import { db, useUser } from '../firebase.js'
import { journalReply } from '../comfort.js'
import { askComfort } from '../comfortAI.js'
import JournalReview from '../components/JournalReview.jsx'

const LEVELS = ['아주 약하게', '조금', '보통', '꽤', '아주 강하게']
const fmt = new Intl.DateTimeFormat('ko-KR', {
  month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
})

const SHOW = 120 // 불러오는 최근 기록 수 (30일 돌아보기에 넉넉하게, 하루 4번 기록해도 충분)

export default function Journal({ go }) {
  const user = useUser()
  const cloud = Boolean(user && db) // 로그인하면 계정에 저장, 아니면 이 화면에서만 잠시
  const [emotion, setEmotion] = useState(null)
  const [level, setLevel] = useState(3)
  const [note, setNote] = useState('')
  const [entries, setEntries] = useState([])
  const [reply, setReply] = useState(null) // 기록한 뒤 건네는 말 (다음 감정을 고를 때까지 남아 있음)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // 고치는 중인 기록 { id, emotion, level, note }

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
    const id = Date.now()
    setReply({ id, ...journalReply(entry.emotion, entry.level) })
    // 로그인했으면 메모까지 읽은 AI의 말로 바꾼다
    askComfort({ kind: 'journal', ...entry }).then((r) => {
      if (!r?.reply) return
      setReply((cur) => (cur?.id === id ? { ...cur, text: r.reply, ai: true, crisis: r.crisis, offer: cur.offer || r.crisis } : cur))
    })
    setEmotion(null)
    setLevel(3)
    setNote('')
  }

  // 기록 고치기: 감정·크기·메모만 바꾸고, 남긴 시간은 그대로 둔다
  const saveEdit = async () => {
    const { id, emotion: em, level: lv, note: nt } = editing
    const change = { emotion: em, level: lv, note: nt.trim() }
    setError('')
    if (!cloud) {
      setEntries((l) => l.map((x) => (x.id === id ? { ...x, ...change } : x)))
      return setEditing(null)
    }
    try {
      await updateDoc(doc(db, 'users', user.uid, 'journal', id), change)
      setEditing(null)
    } catch {
      setError('기록을 고치지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.')
    }
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
                aria-pressed={emotion === e.id} onClick={() => { setEmotion(e.id); setReply(null) }}>
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
          {reply && (
            <div className="journal-reply" role="status">
              <p key={reply.ai ? 'ai' : 'pre'} className="ai-swap">{reply.text}</p>
              {reply.crisis && (
                <p className="journal-sos">
                  혼자 견디기 힘들 만큼 아프다면 지금 <a href="tel:109">109</a>에 전화해 주세요. 24시간 언제든 받아요.
                </p>
              )}
              {reply.offer && (
                <div className="account-row">
                  <button className="btn soft small" onClick={() => go('cry')}>눈물 쉼터 가기</button>
                  <button className="btn soft small" onClick={() => go('chat')}>마음 대화 하기</button>
                </div>
              )}
            </div>
          )}
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
                if (editing?.id === en.id) {
                  return (
                    <li key={en.id} className="entry editing">
                      <div className="entry-edit">
                        <div className="emotion-grid compact mini" role="radiogroup" aria-label="감정 고르기">
                          {EMOTIONS.map((x) => (
                            <button key={x.id} role="radio" aria-checked={editing.emotion === x.id}
                              className={`emotion tone-${x.tone}` + (editing.emotion === x.id ? ' selected' : '')}
                              onClick={() => setEditing({ ...editing, emotion: x.id })}>
                              <span className="emoji">{x.emoji}</span>{x.label}
                            </button>
                          ))}
                        </div>
                        <div className="level-row" role="radiogroup" aria-label="감정의 크기">
                          {LEVELS.map((label, i) => (
                            <button key={label} role="radio" aria-checked={editing.level === i + 1}
                              className={'level' + (editing.level >= i + 1 ? ' on' : '')} onClick={() => setEditing({ ...editing, level: i + 1 })}>
                              <span className="dot" />
                              <small>{label}</small>
                            </button>
                          ))}
                        </div>
                        <textarea className="field" rows={3} maxLength={300} value={editing.note} aria-label="메모 고치기"
                          onChange={(ev) => setEditing({ ...editing, note: ev.target.value })} />
                        <div className="account-row">
                          <button className="btn primary small" onClick={saveEdit}>고친 대로 저장</button>
                          <button className="btn ghost small" onClick={() => setEditing(null)}>취소</button>
                        </div>
                      </div>
                    </li>
                  )
                }
                return (
                  <li key={en.id} className={`entry tone-${e.tone}`}>
                    <span className="emoji">{e.emoji}</span>
                    <div>
                      <strong>{e.label} · {LEVELS[en.level - 1]}</strong>
                      <small>{fmt.format(en.at)}</small>
                      {en.note && <p>{en.note}</p>}
                    </div>
                    <div className="entry-actions">
                      <button className="link" onClick={() => setEditing({ id: en.id, emotion: en.emotion, level: en.level, note: en.note || '' })}>
                        고치기
                      </button>
                      <button className="link" onClick={() => remove(en.id)}>
                        지우기
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {entries.length > 0 && <JournalReview entries={entries} partial={cloud && entries.length >= SHOW} />}
    </div>
  )
}
