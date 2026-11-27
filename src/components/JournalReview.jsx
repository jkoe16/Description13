import { useState } from 'react'
import { EMOTIONS } from '../data.js'

// 마음 기록 돌아보기: 최근 7일·30일 동안 어떤 마음이 많았는지 조용히 보여 준다.
// 감정은 이모지와 이름으로 구분하고(색만으로 구분하지 않음), 막대는 한 가지 색으로 개수만 보여 준다.
const RANGES = [
  { days: 7, label: '최근 7일' },
  { days: 30, label: '최근 30일' },
]
const HEAVY = ['tired', 'sad', 'anxious', 'angry', 'lonely'] // 힘든 마음
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const dayLabel = new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })
const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'narrow' })

export function review(entries, days, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1))
  const inRange = entries.filter((e) => e.at >= start)
  // 날마다 가장 크게 느낀 마음 하나 (같으면 나중 기록)
  const byDay = new Map()
  for (const e of inRange) {
    const k = dayKey(e.at)
    const cur = byDay.get(k)
    if (!cur || e.level > cur.level || (e.level === cur.level && e.at > cur.at)) byDay.set(k, e)
  }
  const cells = Array.from({ length: days }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    return { date: d, entry: byDay.get(dayKey(d)) || null }
  })
  const counts = EMOTIONS.map((e) => ({ ...e, count: inRange.filter((x) => x.emotion === e.id).length }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count)
  const heavyDays = cells.filter((c) => c.entry && HEAVY.includes(c.entry.emotion)).length
  return { cells, counts, total: inRange.length, recordedDays: byDay.size, heavyDays }
}

function message({ total, recordedDays, counts, heavyDays }, days) {
  if (!total) return null
  const tops = counts.filter((c) => c.count === counts[0].count).slice(0, 2).map((c) => `'${c.label}'`)
  const span = days === 7 ? '이번 주였네요' : '이번 달이었네요'
  const first = `${days}일 중 ${recordedDays}일 마음을 남겼어요. ${tops.join('와 ')}가 가장 많았어요(${counts[0].count}번${tops.length > 1 ? '씩' : ''}).`
  if (heavyDays >= Math.max(2, Math.ceil(recordedDays / 2))) {
    return `${first} 힘든 마음이 자주 찾아온 ${span}. 그래도 그 마음을 놓치지 않고 적어 둔 것만으로 충분히 애썼어요.`
  }
  return `${first} 기록하는 것만으로도 내 마음을 잘 돌보고 있는 거예요.`
}

export default function JournalReview({ entries, partial }) {
  const [days, setDays] = useState(7)
  const r = review(entries, days)
  const max = Math.max(1, ...r.counts.map((c) => c.count))

  return (
    <section className="card journal-review" aria-label="마음 돌아보기">
      <div className="row-between">
        <h2>마음 돌아보기</h2>
        <div className="seg small" role="radiogroup" aria-label="기간">
          {RANGES.map((x) => (
            <button key={x.days} role="radio" aria-checked={days === x.days} className={days === x.days ? 'active' : ''}
              onClick={() => setDays(x.days)}>{x.label}</button>
          ))}
        </div>
      </div>

      {r.total === 0 ? (
        <p className="muted">{days}일 동안 남긴 기록이 아직 없어요. 하루에 한 번, 가볍게 남겨 보세요.</p>
      ) : (
        <>
          <p className="review-message">{message(r, days)}</p>

          <ol className={'day-strip' + (days > 7 ? ' month' : '')} aria-label="날마다 가장 크게 느낀 마음">
            {r.cells.map(({ date, entry }) => {
              const e = entry && EMOTIONS.find((x) => x.id === entry.emotion)
              const text = `${dayLabel.format(date)}: ${e ? e.label : '기록 없음'}`
              return (
                <li key={date.getTime()} className={e ? `has tone-${e.tone}` : 'none'} title={text} aria-label={text}>
                  <span className="emoji" aria-hidden="true">{e ? e.emoji : ''}</span>
                  {days === 7 && <small aria-hidden="true">{weekday.format(date)}</small>}
                </li>
              )
            })}
          </ol>

          <ul className="mood-bars" aria-label="마음별 기록 수">
            {r.counts.map((c) => (
              <li key={c.id} title={`${c.label} ${c.count}번`}>
                <span className="mood-name"><span aria-hidden="true">{c.emoji}</span> {c.label}</span>
                <span className="bar-track" aria-hidden="true"><span className="bar" style={{ width: `${(c.count / max) * 100}%` }} /></span>
                <span className="bar-count">{c.count}번</span>
              </li>
            ))}
          </ul>
          {partial && <p className="muted small-note">최근 기록 {entries.length}개까지만 모아 보여 줘요.</p>}
        </>
      )}
    </section>
  )
}
