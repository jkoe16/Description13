import { useState } from 'react'
import { AGENCIES, EMERGENCY } from '../data.js'
import Icon from '../components/Icon.jsx'

export default function Help() {
  const [copied, setCopied] = useState(null)

  const copy = async (number) => {
    try {
      await navigator.clipboard.writeText(number)
      setCopied(number)
      setTimeout(() => setCopied(null), 1800)
    } catch {
      setCopied('fail')
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>도움받기</h1>
          <p className="muted">혼자 견디기 어려울 때, 도움을 청하는 것도 용기예요.</p>
        </div>
      </header>

      <section className="card urgent">
        <h2>지금 위험하다고 느껴진다면</h2>
        <p>스스로를 해칠 것 같거나 위험한 상황이라면 바로 전화해 주세요. 모두 국번 없이 걸 수 있어요.</p>
        <div className="sos-grid">
          {EMERGENCY.map((e) => (
            <div key={e.number} className={`sos-card tone-${e.tone}`}>
              <span className="sos-number">{e.number}</span>
              <strong>{e.name}</strong>
              <small>{e.desc}</small>
              <a className="btn primary" href={`tel:${e.number}`}>
                <Icon name="phone" size={18} /> 전화하기
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>상담기관 안내</h2>
        <ul className="agency-list">
          {AGENCIES.map((a) => (
            <li key={a.number}>
              <div>
                <strong>{a.name}</strong>
                <small>{a.desc}</small>
              </div>
              <span className="agency-number">{a.number}</span>
              <div className="agency-actions">
                <button className="btn soft small" onClick={() => copy(a.number)}>
                  {copied === a.number ? '복사됨' : '번호 복사'}
                </button>
                <a className="btn primary small" href={`tel:${a.number.replace(/-/g, '')}`}>전화</a>
              </div>
            </li>
          ))}
          <li>
            <div>
              <strong>가까운 정신건강복지센터</strong>
              <small>시·군·구마다 있는 공공 상담기관이에요. 지역 보건소에 문의해 주세요.</small>
            </div>
          </li>
        </ul>
        {copied === 'fail' && <p className="toast" role="status">복사하지 못했어요. 번호를 직접 눌러 주세요.</p>}
        <p className="notice">운영 시간과 상담 방식은 바뀔 수 있어요. 자세한 내용은 각 기관 안내를 확인해 주세요.</p>
      </section>
    </div>
  )
}
