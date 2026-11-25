import { useState } from 'react'
import {
  GoogleAuthProvider, createUserWithEmailAndPassword, sendEmailVerification,
  sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, signOut,
} from 'firebase/auth'
import { auth, authMessage, firebaseReady, useUser } from '../firebase.js'

export default function Account({ go }) {
  const user = useUser()
  const [tab, setTab] = useState('login') // login | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const run = async (fn) => {
    setBusy(true)
    setError('')
    setInfo('')
    try {
      await fn()
    } catch (e) {
      setError(authMessage(e))
    }
    setBusy(false)
  }

  const google = () => run(async () => {
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(auth, provider)
    } catch (e) {
      // 휴대폰 브라우저가 팝업을 막으면 페이지 이동 방식으로 다시 시도
      if (e.code === 'auth/popup-blocked') return signInWithRedirect(auth, provider)
      throw e
    }
  })

  const submit = (e) => {
    e.preventDefault()
    run(async () => {
      if (tab === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
        await sendEmailVerification(cred.user)
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      }
      setPassword('')
    })
  }

  const reset = () => run(async () => {
    if (!email.trim()) throw { code: 'auth/invalid-email' }
    await sendPasswordResetEmail(auth, email.trim())
    setInfo('비밀번호를 다시 정하는 메일을 보냈어요. 받은 메일함을 확인해 주세요.')
  })

  const resend = () => run(async () => {
    await sendEmailVerification(auth.currentUser)
    setInfo('인증 메일을 다시 보냈어요. 메일의 링크를 누른 뒤 "인증 확인"을 눌러 주세요.')
  })

  const recheck = () => run(async () => {
    await auth.currentUser.reload()
    await auth.currentUser.getIdToken(true) // 인증 상태를 서버 확인용 토큰에도 반영
    if (auth.currentUser.emailVerified) go('chat')
    else setInfo('아직 인증이 확인되지 않았어요. 메일의 링크를 눌렀는지 확인해 주세요.')
  })

  return (
    <div className="page account-page">
      <header className="page-head">
        <div>
          <h1>내 계정</h1>
          <p className="muted">로그인하면 허락된 계정으로 마음 대화를 쓸 수 있어요.</p>
        </div>
      </header>

      <section className="card account-card">
        {!firebaseReady && <p className="form-error">로그인 설정이 아직 끝나지 않았어요. (Firebase 설정값 필요)</p>}

        {firebaseReady && user === undefined && <p className="muted">로그인 상태를 확인하고 있어요…</p>}

        {firebaseReady && user && (
          <div className="account-info">
            <p>로그인한 계정</p>
            <strong>{user.email}</strong>
            {user.emailVerified ? (
              <button className="btn primary" onClick={() => go('chat')}>마음 대화로 가기</button>
            ) : (
              <>
                <p className="form-note">가입할 때 보낸 메일의 링크를 눌러 이메일 인증을 마쳐 주세요.</p>
                <div className="account-row">
                  <button className="btn primary" onClick={recheck} disabled={busy}>인증 확인</button>
                  <button className="btn soft" onClick={resend} disabled={busy}>인증 메일 다시 받기</button>
                </div>
              </>
            )}
            <button className="btn ghost" onClick={() => run(() => signOut(auth))} disabled={busy}>로그아웃</button>
          </div>
        )}

        {firebaseReady && user === null && (
          <>
            <button className="btn google" onClick={google} disabled={busy}>
              <span className="g-mark" aria-hidden="true">G</span> Google로 계속하기
            </button>

            <div className="divider"><span>또는 이메일로</span></div>

            <div className="seg" role="tablist" aria-label="로그인 또는 회원가입">
              <button role="tab" aria-selected={tab === 'login'} className={tab === 'login' ? 'active' : ''}
                onClick={() => { setTab('login'); setError(''); setInfo('') }}>로그인</button>
              <button role="tab" aria-selected={tab === 'signup'} className={tab === 'signup' ? 'active' : ''}
                onClick={() => { setTab('signup'); setError(''); setInfo('') }}>회원가입</button>
            </div>

            <form className="auth-form" onSubmit={submit}>
              <label>
                이메일
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email" required />
              </label>
              <label>
                비밀번호
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                  minLength={tab === 'signup' ? 6 : undefined} required />
              </label>
              {tab === 'signup' && <p className="form-note">비밀번호는 6자 이상이에요. 가입하면 인증 메일을 보내 드려요.</p>}
              <button className="btn primary" disabled={busy}>{tab === 'signup' ? '가입하기' : '로그인'}</button>
              {tab === 'login' && (
                <button type="button" className="link" onClick={reset} disabled={busy}>비밀번호를 잊었어요</button>
              )}
            </form>
          </>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}
        {info && <p className="form-info" role="status">{info}</p>}
      </section>
    </div>
  )
}
