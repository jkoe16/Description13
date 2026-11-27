import { OPERATOR, PRIVACY, TERMS, UPDATED } from '../policy.js'

// 개인정보처리방침·이용약관 화면 (#/privacy, #/terms). 내용은 src/policy.js
export default function Policy({ kind, go }) {
  const privacy = kind === 'privacy'
  const sections = privacy ? PRIVACY() : TERMS()
  return (
    <div className="page policy-page">
      <header className="page-head">
        <div>
          <h1>{privacy ? '개인정보처리방침' : '이용약관'}</h1>
          <p className="muted">시행일 {UPDATED}</p>
        </div>
        <div className="head-actions">
          <button className="pill" onClick={() => go(privacy ? 'terms' : 'privacy')}>{privacy ? '이용약관 보기' : '개인정보처리방침 보기'}</button>
          <button className="pill" onClick={() => go('account')}>내 계정</button>
        </div>
      </header>
      <section className="card policy">
        {sections.map(([title, paras]) => (
          <div key={title}>
            <h2>{title}</h2>
            {paras.map((p) => <p key={p}>{p}</p>)}
          </div>
        ))}
        {OPERATOR.email && (
          <a className="btn soft" href={`mailto:${OPERATOR.email}`}>문의 메일 보내기</a>
        )}
      </section>
    </div>
  )
}
