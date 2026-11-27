// 위기 표현이 보일 때 대화 안에 띄우는 긴급 연락처 카드 (Chat.jsx에서 나눔)
const SOS = [
  { number: '109', label: '자살예방상담 (24시간)' },
  { number: '112', label: '경찰 · 위험한 상황' },
  { number: '119', label: '응급 상황' },
]

export default function CrisisCard({ go }) {
  return (
    <div className="crisis-card" role="alert">
      <strong>지금 많이 힘들다면, 혼자 견디지 않아도 돼요.</strong>
      <p>바로 전화할 수 있는 곳이에요. 곁에 있는 믿을 수 있는 사람에게도 지금 알려 주세요.</p>
      <div className="crisis-actions">
        {SOS.map((s) => (
          <a key={s.number} className="crisis-call" href={`tel:${s.number}`}>
            <b>{s.number}</b><small>{s.label}</small>
          </a>
        ))}
      </div>
      <button className="link" onClick={() => go('help')}>다른 상담기관 보기</button>
    </div>
  )
}
