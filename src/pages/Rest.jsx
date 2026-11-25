import { useEffect, useState } from 'react'
import { BREATHING } from '../data.js'

const TICK = 100
const IDLE_SCALE = 0.75
const SCALE = { in: 1, out: 0.58 }
const START = { phase: 0, ms: 0, cycles: 0 }

// 단계가 끝날 때의 원 크기 (멈추기는 직전 크기 유지)
function endScale(phases, idx) {
  for (let i = 0; i < phases.length; i++) {
    const p = phases[(idx - i + phases.length) % phases.length]
    if (p.type !== 'hold') return SCALE[p.type]
  }
  return IDLE_SCALE
}

function guideFor(phases, idx) {
  const p = phases[idx]
  if (p.type === 'in') return '코로 천천히, 배가 부풀도록 숨을 들이마셔요.'
  if (p.type === 'out') return '입으로 길고 부드럽게 숨을 내쉬어요.'
  const prev = phases[(idx - 1 + phases.length) % phases.length]
  return prev.type === 'out' ? '숨을 비운 채 잠시 편안히 머물러요.' : '숨을 편안하게 머금고 잠시 기다려요.'
}

export default function Rest() {
  const [patternId, setPatternId] = useState('box')
  const [status, setStatus] = useState('idle') // idle | running | paused
  const [state, setState] = useState(START)
  const pattern = BREATHING.find((b) => b.id === patternId)
  const phases = pattern.phases

  // 타이머는 running일 때 하나만 돌고, 상태가 바뀌거나 화면을 떠나면 정리된다
  useEffect(() => {
    if (status !== 'running') return
    const t = setInterval(() => {
      setState((s) => {
        if (s.ms > TICK) return { ...s, ms: s.ms - TICK }
        const next = (s.phase + 1) % phases.length
        return { phase: next, ms: phases[next].sec * 1000, cycles: s.cycles + (next === 0 ? 1 : 0) }
      })
    }, TICK)
    return () => clearInterval(t)
  }, [status, phases])

  const start = () => {
    setState({ phase: 0, ms: phases[0].sec * 1000, cycles: 0 })
    setStatus('running')
  }
  const end = () => {
    setStatus('idle')
    setState(START)
  }
  const choose = (id) => {
    end()
    setPatternId(id)
  }

  const active = status !== 'idle'
  const current = phases[state.phase]
  const first = state.phase === 0 && state.cycles === 0
  const s0 = !active ? IDLE_SCALE : first ? IDLE_SCALE : endScale(phases, state.phase - 1)
  const s1 = !active ? IDLE_SCALE : endScale(phases, state.phase)
  const seconds = Math.ceil(state.ms / 1000)

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
            <div key={active ? `${state.cycles}-${state.phase}` : 'idle'}
              className={'breath-scale' + (active ? ' animate' : '') + (status === 'paused' ? ' paused' : '')}
              style={{ '--s0': s0, '--s1': s1, '--dur': `${current.sec}s` }}>
              <div className="breath-halo" />
              <div className="breath-circle" />
            </div>
            <div className="breath-label">
              {active ? (
                <>
                  <strong>{status === 'paused' ? '일시정지' : current.label}</strong>
                  <span className="count" aria-label={`${seconds}초 남음`}>{seconds}</span>
                  <small>초 남음</small>
                </>
              ) : (
                <strong>준비되면<br />시작해요</strong>
              )}
            </div>
          </div>

          <p className="breath-guide" aria-live="polite">
            {status === 'idle' && `${pattern.name} · ${pattern.summary}`}
            {status === 'running' && guideFor(phases, state.phase)}
            {status === 'paused' && '잠시 멈췄어요. 준비되면 이어서 해요.'}
          </p>
          {active && (
            <p className="muted center breath-progress">
              {state.cycles + 1}번째 호흡 · {current.label} {state.phase + 1}/{phases.length}단계
            </p>
          )}

          <div className="row-center breath-controls">
            {status === 'idle' && <button className="btn primary" onClick={start}>시작하기</button>}
            {status === 'running' && <button className="btn soft" onClick={() => setStatus('paused')}>일시정지</button>}
            {status === 'paused' && <button className="btn primary" onClick={() => setStatus('running')}>다시 시작</button>}
            {active && <button className="btn ghost" onClick={end}>종료하기</button>}
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
          <p className="notice">
            어지럽거나 숨이 답답해지면 바로 <strong>종료하기</strong>를 누르고, 숫자는 잊은 채
            평소처럼 자연스럽게 숨 쉬어 주세요. 편안한 만큼만 해도 충분해요.
          </p>
        </section>
      </div>
    </div>
  )
}
