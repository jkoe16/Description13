import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../../firebase.js'

// 마음 대화의 '지난 대화' 패널 (Chat.jsx에서 나눔). 패널이 열려 있을 때만 목록을 불러온다.
const LIST_MAX = 30 // 지난 대화 목록에 보여 줄 수
const when = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function PastChats({ uid, currentId, onOpen, onRemove }) {
  const [past, setPast] = useState(null) // null = 불러오는 중

  useEffect(() => {
    setPast(null)
    const q = query(collection(db, 'users', uid, 'chats'), orderBy('updatedAt', 'desc'), limit(LIST_MAX))
    return onSnapshot(q, (snap) => setPast(snap.docs.map((d) => {
      const v = d.data({ serverTimestamps: 'estimate' })
      return { id: d.id, ...v, updatedAt: v.updatedAt?.toDate() || new Date() }
    })), () => setPast([]))
  }, [uid])

  return (
    <section className="card past-chats" aria-label="지난 대화">
      <h2>지난 대화</h2>
      {past === null ? (
        <p className="muted">불러오고 있어요…</p>
      ) : past.length === 0 ? (
        <p className="muted">아직 저장된 대화가 없어요.</p>
      ) : (
        <ul>
          {past.map((c) => (
            <li key={c.id} className={currentId === c.id ? 'current' : ''}>
              <button className="past-open" onClick={() => onOpen(c)}>
                <strong>{c.title}</strong>
                <small>{when.format(c.updatedAt)} · 메시지 {c.messages?.length || 0}개</small>
              </button>
              <button className="link" onClick={() => onRemove(c.id)}>지우기</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
