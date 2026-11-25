import { useEffect, useRef, useState } from 'react'

// 눈물 쉼터: 어두운 화면, 잔잔한 소리, 곁에 있어 주는 말. 아무것도 저장하지 않는다.

const WORDS = [
  '여기선 울어도 괜찮아요.',
  '참지 않아도 돼요.',
  '눈물은 마음이 너무 꽉 찼을 때 흘러나오는 거예요.',
  '이유를 설명하지 않아도 괜찮아요.',
  '천천히, 울고 싶은 만큼 울어요.',
  '지금까지 정말 많이 버텼어요.',
  '아무도 재촉하지 않아요.',
  '나는 여기 그대로 있을게요.',
]
const WORD_MS = 9000

const SOUNDS = [
  { id: 'rain', label: '빗소리' },
  { id: 'waves', label: '파도' },
  { id: 'off', label: '조용히' },
]

// ---------- 소리: 파일 없이 Web Audio로 만든다 ----------
function noiseBuffer(ctx, brown) {
  const len = ctx.sampleRate * 4
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    if (brown) {
      last = (last + 0.02 * w) / 1.02
      d[i] = last * 3.5
    } else {
      d[i] = w
    }
  }
  return buf
}

function makeSound(ctx, id, out) {
  const src = ctx.createBufferSource()
  src.loop = true
  const nodes = [src]
  if (id === 'rain') {
    src.buffer = noiseBuffer(ctx, false)
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 500
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 4500
    const g = ctx.createGain()
    g.gain.value = 0.22
    src.connect(hp).connect(lp).connect(g).connect(out)
    nodes.push(hp, lp, g)
  } else {
    // 파도: 낮은 소리를 12초 주기로 밀려왔다 빠지게
    src.buffer = noiseBuffer(ctx, true)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 700
    const g = ctx.createGain()
    g.gain.value = 0.35
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 1 / 12
    const depth = ctx.createGain()
    depth.gain.value = 0.3
    lfo.connect(depth).connect(g.gain)
    lfo.start()
    src.connect(lp).connect(g).connect(out)
    nodes.push(lp, g, lfo, depth)
  }
  src.start()
  return () => nodes.forEach((n) => { try { n.stop?.() } catch { /* 이미 멈춤 */ } n.disconnect() })
}

function useAmbient(sound, volume) {
  const ctxRef = useRef(null)
  const master = useRef(null)
  const stop = useRef(null)

  useEffect(() => {
    if (sound === 'off') {
      if (master.current) master.current.gain.setTargetAtTime(0, ctxRef.current.currentTime, 0.4)
      const s = stop.current
      stop.current = null
      if (!s) return
      const t = setTimeout(s, 1500)
      // 다 꺼지기 전에 다른 소리를 고르면 이전 소리는 바로 멈춘다
      return () => {
        clearTimeout(t)
        s()
      }
    }
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    if (!ctxRef.current) {
      ctxRef.current = new AC()
      master.current = ctxRef.current.createGain()
      master.current.gain.value = 0
      master.current.connect(ctxRef.current.destination)
    }
    const ctx = ctxRef.current
    ctx.resume()
    stop.current?.()
    stop.current = makeSound(ctx, sound, master.current)
    master.current.gain.cancelScheduledValues(ctx.currentTime)
    master.current.gain.setTargetAtTime(volume, ctx.currentTime, 0.8) // 천천히 커지게
  }, [sound]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (master.current && sound !== 'off') master.current.gain.setTargetAtTime(volume, ctxRef.current.currentTime, 0.2)
  }, [volume, sound])

  // 쉼터를 나가면 소리를 완전히 끈다
  useEffect(() => () => {
    stop.current?.()
    ctxRef.current?.close()
  }, [])
}

// 우는 동안 화면이 꺼지지 않게 (지원하는 브라우저에서만)
function useWakeLock() {
  useEffect(() => {
    let lock = null
    const get = () => navigator.wakeLock?.request('screen').then((l) => { lock = l }).catch(() => {})
    const onVis = () => document.visibilityState === 'visible' && get()
    get()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      lock?.release().catch(() => {})
    }
  }, [])
}

const minutes = (ms) => {
  const m = Math.floor(ms / 60000)
  return m < 1 ? '방금 들어왔어요' : `함께 있은 지 ${m}분`
}

export default function Cry({ go }) {
  const [step, setStep] = useState('room') // room | check | after
  const [feel, setFeel] = useState(null)
  const [sound, setSound] = useState('off')
  const [volume, setVolume] = useState(0.6)
  const [word, setWord] = useState(0)
  const [since] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())

  useAmbient(step === 'room' ? sound : 'off', volume)
  useWakeLock()

  // 쉼터에 있는 동안 휴대폰 상단 막대도 어둡게
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    const before = meta?.content
    meta?.setAttribute('content', '#17152a')
    return () => before && meta.setAttribute('content', before)
  }, [])

  useEffect(() => {
    if (step !== 'room') return
    const t = setInterval(() => setWord((w) => (w + 1) % WORDS.length), WORD_MS)
    const c = setInterval(() => setNow(Date.now()), 15000)
    return () => {
      clearInterval(t)
      clearInterval(c)
    }
  }, [step])

  const leave = (to) => go(to)

  return (
    <div className="cry-room">
      <header className="cry-top">
        <button className="cry-ghost" onClick={() => leave('home')}>나가기</button>
        <h1 className="cry-title">눈물 쉼터</h1>
        <a className="cry-ghost" href="tel:109">위험할 땐 109</a>
      </header>

      {step === 'room' && (
        <main className="cry-center">
          <div className="cry-glow" aria-hidden="true" />
          <p key={word} className="cry-word" aria-live="polite">{WORDS[word]}</p>
          <small className="cry-time">{minutes(now - since)}</small>

          <div className="cry-controls">
            <div className="cry-sounds" role="radiogroup" aria-label="소리">
              {SOUNDS.map((s) => (
                <button key={s.id} role="radio" aria-checked={sound === s.id}
                  className={sound === s.id ? 'on' : ''} onClick={() => setSound(s.id)}>{s.label}</button>
              ))}
            </div>
            {sound !== 'off' && (
              <label className="cry-volume">
                <span>소리 크기</span>
                <input type="range" min="0.05" max="1" step="0.05" value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))} />
              </label>
            )}
            <button className="cry-done" onClick={() => setStep('check')}>조금 진정됐어요</button>
          </div>
        </main>
      )}

      {step === 'check' && (
        <main className="cry-center">
          <p className="cry-word">많이 힘들었죠.<br />지금은 좀 어때요?</p>
          <div className="cry-choices">
            {[
              ['better', '조금 나아졌어요'],
              ['same', '아직 힘들어요'],
              ['unsure', '잘 모르겠어요'],
            ].map(([id, label]) => (
              <button key={id} onClick={() => { setFeel(id); setStep('after') }}>{label}</button>
            ))}
          </div>
          <button className="cry-ghost" onClick={() => setStep('room')}>조금 더 있을래요</button>
        </main>
      )}

      {step === 'after' && (
        <main className="cry-center">
          <p className="cry-word">
            {feel === 'better' && <>울고 나니 조금 가벼워졌다니 다행이에요.<br />잘 견뎌 냈어요.</>}
            {feel === 'same' && <>아직 힘든 게 당연해요.<br />혼자 견디지 않아도 돼요.</>}
            {feel === 'unsure' && <>모르겠는 것도 괜찮아요.<br />마음은 천천히 정리돼요.</>}
          </p>
          <p className="cry-tip">물 한 잔 천천히 마시고, 어깨에 힘을 한 번 빼 보세요.</p>
          <div className="cry-choices">
            <button onClick={() => leave('chat')}>마음 대화로 이야기하기</button>
            <button onClick={() => leave('journal')}>오늘의 마음 기록하기</button>
            {feel === 'same' && <button onClick={() => leave('help')}>상담 연결 안내 보기</button>}
          </div>
          {feel === 'same' && (
            <p className="cry-sos">
              스스로를 해칠 것 같은 생각이 든다면 지금 바로 <a href="tel:109">109</a>에 전화해 주세요. 24시간 받아요.
            </p>
          )}
          <button className="cry-ghost" onClick={() => setStep('room')}>쉼터에 조금 더 있을래요</button>
        </main>
      )}
    </div>
  )
}
