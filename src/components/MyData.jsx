import { useState } from 'react'
import { collection, getDocs, writeBatch } from 'firebase/firestore'
import { deleteUser, signOut } from 'firebase/auth'
import { auth, db } from '../firebase.js'

// 내 데이터 지우기와 개인정보 안내 (내 계정 화면 아래쪽)

async function wipe(uid, name) {
  const snap = await getDocs(collection(db, 'users', uid, name))
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db)
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
  return snap.size
}

const ACTIONS = {
  chats: { label: '마음 대화 전부 지우기', ask: '저장된 마음 대화를 모두 지울까요? 되돌릴 수 없어요.' },
  journal: { label: '마음 기록 전부 지우기', ask: '저장된 마음 기록을 모두 지울까요? 되돌릴 수 없어요.' },
  account: { label: '계정 삭제', ask: '대화와 기록을 모두 지우고 계정도 삭제할까요? 되돌릴 수 없어요.' },
}

export function PrivacyNote() {
  return (
    <section className="card privacy">
      <h2>개인정보 안내</h2>
      <ul>
        <li><b>마음 대화</b>와, 로그인했을 때 남긴 <b>마음 기록(감정·메모)</b>은 답장과 위로의 말을 만들기 위해 AI 서비스(OpenAI)로 보내져요. 마음곁은 OpenAI에 저장하지 말라고 요청하지만, OpenAI 정책에 따라 악용 방지를 위해 최대 30일 보관될 수 있어요.</li>
        <li>로그인하면 <b>마음 대화와 마음 기록</b>이 Google Firebase 서버의 내 계정 칸에 저장돼요. 다른 사용자는 볼 수 없어요.</li>
        <li>다만 앱을 운영하는 관리자는 Firebase 관리 화면에서 저장된 내용을 볼 수 <b>있어요</b>. 남기고 싶지 않은 대화는 마음 대화의 '지난 대화'에서 바로 지울 수 있어요.</li>
        <li>저장된 내용은 언제든 내 계정의 '내 데이터'에서 <b>전부 지울 수 있어요</b>. 계정을 삭제하면 대화·기록·계정이 모두 사라져요.</li>
        <li>마음곁은 AI가 답하는 앱이라 전문 상담을 대신할 수 없어요. 위험할 땐 <a href="tel:109">109</a>(24시간)에 전화해 주세요.</li>
      </ul>
    </section>
  )
}

export default function MyData() {
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')

  const run = async (kind) => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    setBusy(true)
    setError('')
    setInfo('')
    try {
      if (kind === 'chats') setInfo(`마음 대화 ${await wipe(uid, 'chats')}개를 지웠어요.`)
      if (kind === 'journal') setInfo(`마음 기록 ${await wipe(uid, 'journal')}개를 지웠어요.`)
      if (kind === 'account') {
        await wipe(uid, 'chats')
        await wipe(uid, 'journal')
        await deleteUser(auth.currentUser)
      }
    } catch (e) {
      if (e.code === 'auth/requires-recent-login') {
        // 대화·기록은 이미 지워졌고, 계정 삭제만 다시 로그인이 필요하다
        setError('대화와 기록은 지웠어요. 계정 삭제는 보안을 위해 다시 로그인한 뒤 한 번 더 눌러 주세요.')
        await signOut(auth).catch(() => {})
      } else {
        setError('지우지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.')
      }
    }
    setConfirm(null)
    setBusy(false)
  }

  return (
    <section className="card my-data">
      <h2>내 데이터</h2>
      <p className="muted">저장된 대화와 기록을 지울 수 있어요. 지우면 다른 기기에서도 사라져요.</p>
      <div className="data-actions">
        {Object.entries(ACTIONS).map(([kind, a]) => (
          <div key={kind} className={'data-row' + (kind === 'account' ? ' danger' : '')}>
            {confirm === kind ? (
              <>
                <p>{a.ask}</p>
                <div className="account-row">
                  <button className="btn danger-btn small" onClick={() => run(kind)} disabled={busy}>
                    {busy ? '지우는 중…' : '네, 지울게요'}
                  </button>
                  <button className="btn ghost small" onClick={() => setConfirm(null)} disabled={busy}>취소</button>
                </div>
              </>
            ) : (
              <button className="btn ghost small" onClick={() => { setConfirm(kind); setInfo(''); setError('') }} disabled={busy}>
                {a.label}
              </button>
            )}
          </div>
        ))}
      </div>
      {info && <p className="form-info" role="status">{info}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  )
}
