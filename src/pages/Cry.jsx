import { useEffect, useRef, useState } from 'react'
import { barColor } from '../theme.js'
import { makeSound } from '../ambient.js'

// 눈물 쉼터: 어두운 화면, 잔잔한 소리, 곁에 있어 주는 말. 아무것도 저장하지 않는다.

// 처음엔 울어도 된다고 허락하고, 참아 온 마음을 알아주고, 곁에 있다고 말하는 순서로 천천히 흐른다.
export const WORDS = [
  '괜찮아. 여기선 울어도 돼.',
  '아무도 안 봐. 지금은 나만 여기 있어.',
  '이유는 말 안 해도 돼. 그냥 울어.',
  '오늘 하루, 많이 참았지.',
  '괜찮다고 웃었던 날들, 사실은 하나도 안 괜찮았잖아.',
  '아무렇지 않은 척 하루를 버티는 거, 그게 얼마나 힘든 일인데.',
  '누구한테도 말 못 하고, 혼자 꿀꺽 삼킨 말이 많았지.',
  '힘들다고 하면 짐이 될까 봐, 꾹 참아 왔던 거지.',
  '잘하고 싶었는데 마음처럼 안 돼서, 많이 속상했지.',
  '너 정말 열심히 살았어. 누가 몰라줘도, 그건 진짜야.',
  '약해서 우는 게 아니야. 너무 오래 강했던 거야.',
  '눈물은 마음이 꽉 차서 넘치는 거래. 넘치게 둬도 돼.',
  '그동안 많이 외로웠지. 이제 혼자 울지 않아도 돼.',
  '소리 내서 울어도 괜찮아. 참지 마.',
  '울고 싶은 만큼 울어. 아무도 재촉 안 해.',
  '나 아무 데도 안 가. 여기 그대로 있을게.',
  '숨이 차면 천천히 한 번 내쉬어 봐. 그리고 또 울어도 돼.',
  '여기까지 버텨 줘서, 정말 고마워.',
  '너는 네 생각보다 훨씬 소중한 사람이야.',
  '오늘 다 못 울어도 괜찮아. 언제든 또 와.',
]
const WORD_MS = 10000

const SOUNDS = [
  { id: 'music', label: '음악' },
  { id: 'rain', label: '빗소리' },
  { id: 'waves', label: '파도' },
  { id: 'off', label: '조용히' },
]

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
  return m < 1 ? '방금 왔구나' : `함께 있은 지 ${m}분`
}

export default function Cry({ go }) {
  const [step, setStep] = useState('room') // room | check | after
  const [feel, setFeel] = useState(null)
  const [sound, setSound] = useState('off')
  const [volume, setVolume] = useState(0.6)
  const [word, setWord] = useState(0)
  const [since] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [pour, setPour] = useState(false) // 꺼내 놓기 칸 열림
  const [text, setText] = useState('')
  const [letting, setLetting] = useState(false) // 흘려보내는 중
  const [note, setNote] = useState(null) // 흘려보낸 뒤 잠깐 보여 줄 말

  useAmbient(step === 'room' ? sound : 'off', volume)
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
