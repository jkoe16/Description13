import { useEffect, useState } from 'react'
import { BREATHING } from '../data.js'

const START = { phase: 0, left: 0, cycles: 0 }

function scaleFor(phases, idx) {
  for (let i = 0; i < phases.length; i++) {
    const p = phases[(idx - i + phases.length) % phases.length]
    if (p.type === 'in') return 1
    if (p.type === 'out') return 0.58
  }
  return 0.75
}

export default function Rest() {
  const [patternId, setPatternId] = useState('box')
  const [running, setRunning] = useState(false)
  const [state, setState] = useState(START)
  const pattern = BREATHING.find((b) => b.id === patternId)
  const phases = pattern.phases

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      setState((s) => {
        if (s.left > 1) return { ...s, left: s.left - 1 }
        const next = (s.phase + 1) % phases.length
        return { phase: next, left: phases[next].sec, cycles: s.cycles + (next === 0 ? 1 : 0) }
      })
    }, 1000)
    return () => clearInterval(t)
  }, [running, phases])

  const start = () => {
    setState({ phase: 0, left: phases[0].sec, cycles: 0 })
    setRunning(true)
  }
  const stop = () => {
    setRunning(false)
    setState(START)
  }
  const choose = (id) => {
    setRunning(false)
    setState(START)
    setPatternId(id)
  }

  const current = phases[state.phase]
  const scale = running ? scaleFor(phases, state.phase) : 0.75

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>마음 휴식</h1>
          <p className="muted">원 안의 안내를 따라 천천히 숨 쉬어 보세요.</p>
        </div>
      </header>

      <div className="two-col rest">
        <section className="card breath-card">
          <div className="breath-stage">
            <div className="breath-halo" style={{ transform: `scale(${scale * 1.12})`, transitionDuration: `${running ? current.sec : 0.6}s` }} />
            <div className="breath-circle" style={{ transform: `scale(${scale})`, transitionDuration: `${running ? current.sec : 0.6}s` }}>
              {running ? (
                <>
                  <strong>{current.label}</strong>
                  <span className="count">{state.left}</span>
                </>
              ) : (
                <strong>준비되면<br />시작해요</strong>
              )}
            </div>
          </div>
          <p className="muted center">
            {running ? `${state.cycles}번째 호흡을 마쳤어요` : `${pattern.name} · ${pattern.summary}`}
          </p>
          <div className="row-center">
            {running
              ? <button className="btn soft" onClick={stop}>그만하기</button>
              : <button className="btn primary" onClick={start}>시작하기</button>}
          </div>
        </section>

        <section className="card">
          <h2>호흡 방법 고르기</h2>
          <div className="pattern-list">
            {BREATHING.map((b) => (
              <button key={b.id} className={'pattern' + (b.id === patternId ? ' active' : '')}
                aria-pressed={b.id === patternId} onClick={() => choose(b.id)}>
                <strong>{b.name}</strong>
                <span>{b.summary}</span>
                <small>{b.phases.map((p) => `${p.label} ${p.sec}초`).join(' → ')}</small>
              </button>
            ))}
          </div>
          <p className="notice">어지럽거나 숨이 답답해지면 바로 멈추고 평소처럼 숨 쉬어 주세요.</p>
        </section>
      </div>
    </div>
  )
}
