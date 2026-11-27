import { useEffect, useRef, useState } from 'react'
import { barColor } from '../theme.js'
import { makeSound } from '../ambient.js'

// 눈물 쉼터: 어두운 화면, 잔잔한 소리, 곁에 있어 주는 말. 아무것도 저장하지 않는다.

// 처음엔 울어도 된다고 허락하고, 참아 온 마음을 알아주고, 곁에 있다고 말하는 순서로 천천히 흐른다.
export const WORDS = [
  '괜찮아. 여기선 울어도 돼.',
  '숨 한 번 크게 쉬어 봐. 이제 아무도 안 봐.',
  '오늘 하루, 괜찮은 척하느라 정말 고생 많았어.',
  '"괜찮아?" 오늘 누가 물어봐 줬어? 내가 물어볼게. 정말 괜찮아?',
  '안 괜찮아도 돼. 그 말 하고 싶어서 여기 온 거잖아.',
  '다들 너한테 기대기만 하고, 정작 너는 기댈 데가 없었지.',
  '힘들다고 하면 짐이 될까 봐, 혼자 꾹꾹 삼켰지.',
  '웃으면서 "난 괜찮아" 했던 날들… 사실 하나도 안 괜찮았잖아.',
  '열심히 했는데 아무도 몰라줘서, 많이 서러웠지.',
  '그 서러움, 오늘은 여기 다 내려놓고 가.',
  '울어도 아무것도 무너지지 않아. 조금 가벼워질 뿐이야.',
  '약해서 우는 게 아니야. 너무 오래 혼자 강했던 거야.',
  '참지 마. 소리 내서 울어도 괜찮아.',
  '어린 시절의 너한테도 말해 주고 싶어. 넌 잘못한 거 하나도 없었어.',
  '누가 뭐래도, 넌 사랑받아도 되는 사람이야.',
  '오늘까지 버텨 준 거, 그거 정말 대단한 거야.',
  '나 여기 있어. 다 울 때까지 아무 데도 안 가.',
  '숨이 차면 천천히… 들이쉬고, 내쉬고. 그리고 또 울어도 돼.',
  '넌 네가 생각하는 것보다 훨씬 소중해.',
  '아무도 몰라줘도, 오늘 애쓴 너를 내가 꼭 안아 줄게.',
  '고생했어. 정말, 정말 고생했어.',
  '다 울고 나면 따뜻한 물 한 잔 마시자. 그리고 오늘은 푹 자.',
  '오늘 다 못 울어도 괜찮아. 언제든 또 와. 여기 있을게.',
]
const WORD_MS = 12000 // 한 문장을 천천히 읽고 머금을 수 있게

const SOUNDS = [
  { id: 'music', label: '음악' },
  { id: 'rain', label: '빗소리' },
  { id: 'waves', label: '파도' },
  { id: 'off', label: '조용히' },
]

function useAmbient(sound, volume, setLoading) {
  const ctxRef = useRef(null)
  const master = useRef(null)
  const stop = useRef(null)

  useEffect(() => {
    if (sound === 'off') {
      setLoading(false)
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
    // 소리마다 따로 음량을 두어, 다른 소리로 바꿀 때 툭 끊기지 않고 서로 스르르 바뀌게
    const voice = ctx.createGain()
    voice.gain.value = 0
    voice.connect(master.current)
    voice.gain.setTargetAtTime(1, ctx.currentTime, 0.6)
    const end = makeSound(ctx, sound, voice, (st) => setLoading(st === 'loading'))
    stop.current = () => {
      try { voice.gain.setTargetAtTime(0, ctx.currentTime, 0.3) } catch { /* 이미 닫힘 */ }
      setTimeout(() => { end(); voice.disconnect() }, 1200)
    }
    master.current.gain.cancelScheduledValues(ctx.currentTime)
    master.current.gain.setTargetAtTime(volume, ctx.currentTime, 0.8) // 천천히 커지게
  }, [sound]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (master.current && sound !== 'off') master.current.gain.setTargetAtTime(volume, ctxRef.current.currentTime, 0.2)
  }, [volume, sound])

  // 다른 앱으로 가거나 화면을 끄면 소리를 멈추고, 다시 돌아오면 이어서 들려준다
  useEffect(() => {
    const onVis = () => {
      const ctx = ctxRef.current
      if (!ctx) return
      if (document.visibilityState === 'hidden') ctx.suspend().catch(() => {})
      else if (sound !== 'off') ctx.resume().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', onVis)
    }
  }, [sound])

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
  return m < 1 ? '방금 왔구나' : `함께 있은 지 ${m}분`
}

export default function Cry({ go }) {
  const [step, setStep] = useState('room') // room | check | after
  const [feel, setFeel] = useState(null)
  const [sound, setSound] = useState('off')
  const [loading, setLoading] = useState(false)
  const [volume, setVolume] = useState(0.6)
  const [word, setWord] = useState(0)
  const [since] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [pour, setPour] = useState(false) // 꺼내 놓기 칸 열림
  const [text, setText] = useState('')
  const [letting, setLetting] = useState(false) // 흘려보내는 중
  const [note, setNote] = useState(null) // 흘려보낸 뒤 잠깐 보여 줄 말

  useAmbient(step === 'room' ? sound : 'off', volume, setLoading)
  useWakeLock()

  // 쉼터에 있는 동안 휴대폰 상단 막대도 어둡게
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', '#17152a')
    return () => meta?.setAttribute('content', barColor())
  }, [])

  useEffect(() => {
    if (step !== 'room') return
    const t = setInterval(() => {
      setNote(null)
      setWord((w) => (w + 1) % WORDS.length)
    }, WORD_MS)
    const c = setInterval(() => setNow(Date.now()), 15000)
    return () => {
      clearInterval(t)
      clearInterval(c)
    }
  }, [step])

  const leave = (to) => go(to)

  // 쓴 글은 어디에도 보내거나 저장하지 않고, 천천히 사라지게 한 뒤 지운다
  const letGo = () => {
    if (!text.trim() || letting) return
    setLetting(true)
    setTimeout(() => {
      setText('')
      setLetting(false)
      setPour(false)
      setNote('잘 꺼내 놓았어. 그 마음, 이제 여기 내려놓고 가도 돼.')
    }, 2800)
  }

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
          <p key={note ? 'note' : word} className="cry-word" aria-live="polite">{note || WORDS[word]}</p>
          <small className="cry-time">{minutes(now - since)}</small>

          <div className="cry-controls">
            <div className="cry-sounds" role="radiogroup" aria-label="소리">
              {SOUNDS.map((s) => (
                <button key={s.id} role="radio" aria-checked={sound === s.id}
                  className={sound === s.id ? 'on' : ''} onClick={() => setSound(s.id)}>{s.label}</button>
              ))}
            </div>
            {sound !== 'off' && loading && <small className="cry-time" role="status">소리를 불러오고 있어…</small>}
            {sound !== 'off' && (
              <label className="cry-volume">
                <span>소리 크기</span>
                <input type="range" min="0.05" max="1" step="0.05" value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))} />
              </label>
            )}
            {pour ? (
              <div className={'cry-pour' + (letting ? ' letting' : '')}>
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={2000}
                  readOnly={letting} autoFocus aria-label="꺼내 놓고 싶은 말"
                  placeholder="누구한테도 못 한 말, 여기에 마음껏 써 봐. 어디에도 저장되지 않아." />
                <div className="cry-pour-row">
                  <button className="cry-ghost" onClick={() => { setPour(false); setText('') }} disabled={letting}>닫기</button>
                  <button className="cry-done" onClick={letGo} disabled={!text.trim() || letting}>
                    {letting ? '흘려보내는 중…' : '흘려보내기'}
                  </button>
                </div>
              </div>
            ) : (
              <button className="cry-ghost" onClick={() => setPour(true)}>하고 싶은 말 꺼내 놓기</button>
            )}
            <button className="cry-done" onClick={() => setStep('check')}>조금 진정됐어</button>
          </div>
        </main>
      )}

      {step === 'check' && (
        <main className="cry-center">
          <p className="cry-word">많이 힘들었지.<br />지금은 좀 어때?</p>
          <div className="cry-choices">
            {[
              ['better', '조금 나아졌어'],
              ['same', '아직 힘들어'],
              ['unsure', '잘 모르겠어'],
            ].map(([id, label]) => (
              <button key={id} onClick={() => { setFeel(id); setStep('after') }}>{label}</button>
            ))}
          </div>
          <button className="cry-ghost" onClick={() => setStep('room')}>조금 더 있을래</button>
        </main>
      )}

      {step === 'after' && (
        <main className="cry-center">
          <p className="cry-word">
            {feel === 'better' && <>조금이라도 가벼워졌다니 정말 다행이야.<br />그렇게 쏟아 낼 만큼, 그동안 많이 참아 왔던 거야.</>}
            {feel === 'same' && <>그렇게 쌓인 마음이 한 번에 풀릴 리 없지.<br />아직 힘들어도 괜찮아. 혼자 견디지 않아도 돼.</>}
            {feel === 'unsure' && <>모르겠는 것도 괜찮아.<br />울 수 있었던 것만으로도, 마음은 조금씩 숨을 쉬어.</>}
          </p>
          <p className="cry-tip">물 한 잔 천천히 마시고, 어깨에 힘을 한 번 빼 봐. 오늘 정말 수고했어.</p>
          <div className="cry-choices">
            <button onClick={() => leave('chat')}>마음 대화로 이야기하기</button>
            <button onClick={() => leave('journal')}>오늘의 마음 기록하기</button>
            {feel === 'same' && <button onClick={() => leave('help')}>상담 연결 안내 보기</button>}
          </div>
          {feel === 'same' && (
            <p className="cry-sos">
              스스로를 해칠 것 같은 생각이 든다면 지금 바로 <a href="tel:109">109</a>에 전화해 줘. 24시간 받아.
            </p>
          )}
          <button className="cry-ghost" onClick={() => setStep('room')}>쉼터에 조금 더 있을래</button>
        </main>
      )}
    </div>
  )
}
