// 눈물 쉼터의 소리.
// 빗소리·파도는 진짜 녹음을 쓰고, 받지 못했을 때만 Web Audio로 직접 만든 소리로 대신한다.
// 음악은 파일 없이 Web Audio로 그때그때 만든다.
import rainUrl from './sounds/rain.mp3'
import wavesUrl from './sounds/waves.mp3'

const rand = (a, b) => a + Math.random() * (b - a)

// 왼쪽·오른쪽 귀에 서로 다른 잡음을 넣어 소리가 넓게 퍼지게 한다
function noise(ctx, kind, seconds = 8) {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      if (kind === 'white') d[i] = w * 0.5
      else if (kind === 'brown') {
        last = (last + 0.02 * w) / 1.02
        d[i] = last * 3.5
      } else { // pink
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759
        b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856
        b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
        b6 = w * 0.115926
      }
    }
  }
  return buf
}

// 소리 부품을 만들고, 끝낼 때 한꺼번에 정리한다
function kit(ctx) {
  const nodes = []
  const timers = []
  const live = new Set()
  const k = {
    loop(buf) {
      const s = ctx.createBufferSource()
      s.buffer = buf
      s.loop = true
      s.start(ctx.currentTime, rand(0, buf.duration))
      nodes.push(s)
      return s
    },
    filter(type, freq, q = 0.7) {
      const f = ctx.createBiquadFilter()
      f.type = type
      f.frequency.value = freq
      f.Q.value = q
      nodes.push(f)
      return f
    },
    gain(v) {
      const g = ctx.createGain()
      g.gain.value = v
      nodes.push(g)
      return g
    },
    pan(v, dest) {
      if (!ctx.createStereoPanner) return dest
      const p = ctx.createStereoPanner()
      p.pan.value = v
      p.connect(dest)
      return p
    },
    // 잠깐 울리고 사라지는 소리 (빗방울 하나)
    once(node, end, ...extra) {
      live.add(node)
      node.onended = () => { live.delete(node); [node, ...extra].filter(Boolean).forEach((n) => n.disconnect()) }
      node.stop(end)
    },
    every(ms, fn) { timers.push(setInterval(fn, ms)) },
    later(ms, fn) { timers.push(setTimeout(fn, ms)) },
    stop() {
      timers.forEach((t) => { clearInterval(t); clearTimeout(t) })
      live.forEach((n) => { try { n.stop() } catch { /* 이미 멈춤 */ } })
      nodes.forEach((n) => { try { n.stop?.() } catch { /* 이미 멈춤 */ } n.disconnect() })
    },
  }
  return k
}

// 빗소리: 쏴아 하는 빗줄기 + 낮은 울림 + 여기저기 떨어지는 빗방울 + 가끔 바람처럼 세졌다 약해짐
function makeRain(ctx, out) {
  const k = kit(ctx)

  const bed = k.gain(0.6)
  k.loop(noise(ctx, 'pink')).connect(k.filter('highpass', 700)).connect(k.filter('lowpass', 6500)).connect(bed).connect(out)
  const low = k.gain(0.3)
  k.loop(noise(ctx, 'brown')).connect(k.filter('lowpass', 320)).connect(low).connect(out)

  // 비가 굵어졌다 가늘어졌다
  const gust = () => {
    const now = ctx.currentTime
    bed.gain.setTargetAtTime(rand(0.42, 0.8), now, rand(1.5, 3.5))
    low.gain.setTargetAtTime(rand(0.2, 0.38), now, rand(2, 4))
  }
  gust()
  k.every(4000, gust)

  // 빗방울 하나: 아주 짧은 '톡' (미리 만들어 둔 짧은 소리를 높낮이와 위치만 바꿔 재생)
  const len = Math.floor(ctx.sampleRate * 0.03)
  const tick = ctx.createBuffer(1, len, ctx.sampleRate)
  const td = tick.getChannelData(0)
  for (let i = 0; i < len; i++) td[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len / 6))
  const drops = k.gain(1)
  drops.connect(out)

  const drop = (t) => {
    const s = ctx.createBufferSource()
    s.buffer = tick
    s.playbackRate.value = rand(0.6, 1.5)
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = rand(1800, 6500)
    bp.Q.value = rand(1.5, 5)
    const g = ctx.createGain()
    g.gain.value = rand(0.03, 0.14) ** 1.3
    const p = k.pan(rand(-0.9, 0.9), drops)
    s.connect(bp).connect(g).connect(p)
    s.start(t)
    k.once(s, t + 0.1, bp, g, p === drops ? null : p)
  }
  // 처마나 창틀에 떨어지는 굵은 물방울: 가끔 '똑'
  const plink = (t) => {
    const o = ctx.createOscillator()
    const f = rand(1400, 3200)
    o.frequency.setValueAtTime(f, t)
    o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.04)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(rand(0.01, 0.03), t + 0.003)
    g.gain.setTargetAtTime(0, t + 0.006, 0.02)
    const p = k.pan(rand(-0.7, 0.7), drops)
    o.connect(g).connect(p)
    o.start(t)
    k.once(o, t + 0.2, g, p === drops ? null : p)
  }

  let rate = 45 // 1초에 들리는 빗방울 수
  k.every(100, () => {
    rate = Math.min(80, Math.max(20, rate + rand(-4, 4)))
    const t0 = ctx.currentTime + 0.05
    const n = Math.round(rate * 0.1 * rand(0.6, 1.4))
    for (let i = 0; i < n; i++) drop(t0 + Math.random() * 0.1)
    if (Math.random() < 0.12) plink(t0 + Math.random() * 0.1)
  })

  return () => k.stop()
}

// 파도: 멀리서 들리는 바다 + 밀려와 부서지는 파도 + 모래 위로 빠져나가는 거품 소리.
// 파도마다 크기와 길이, 다음 파도까지의 간격이 조금씩 다르다.
function makeWaves(ctx, out) {
  const k = kit(ctx)

  k.loop(noise(ctx, 'brown')).connect(k.filter('lowpass', 420)).connect(k.gain(0.14)).connect(out)

  const bodyLp = k.filter('lowpass', 300)
  const body = k.gain(0.08)
  k.loop(noise(ctx, 'brown')).connect(bodyLp)
  k.loop(noise(ctx, 'pink')).connect(k.gain(0.6)).connect(bodyLp)
  bodyLp.connect(body).connect(out)

  const foam = k.gain(0)
  k.loop(noise(ctx, 'white')).connect(k.filter('highpass', 1600)).connect(k.filter('lowpass', 7000)).connect(foam).connect(out)

  const hold = (param, t) => {
    param.cancelScheduledValues(t)
    param.setValueAtTime(param.value, t)
  }

  const wave = () => {
    const t = ctx.currentTime + 0.05
    const rise = rand(2.2, 4) // 밀려오는 시간
    const size = rand(0.55, 1) // 파도 크기
    const crash = t + rise

    hold(body.gain, t)
    body.gain.linearRampToValueAtTime(0.95 * size, crash)
    body.gain.setTargetAtTime(0.08, crash + 0.2, rand(1.4, 2.2))

    hold(bodyLp.frequency, t)
    bodyLp.frequency.exponentialRampToValueAtTime(rand(1300, 2200) * size, crash)
    bodyLp.frequency.setTargetAtTime(300, crash + 0.2, 1.6)

    hold(foam.gain, t)
    foam.gain.setTargetAtTime(0.04 * size, t, rise / 2)
    foam.gain.linearRampToValueAtTime(0.3 * size, crash + 0.3)
    foam.gain.setTargetAtTime(0, crash + 0.6, rand(1.3, 2.4)) // 쏴아… 하고 빠져나감

    k.later((rise + rand(5, 9)) * 1000, wave)
  }
  wave()

  return () => k.stop()
}

// 잔잔한 음악: 느린 화음(가라앉는 진행) 위에 가끔 피아노 같은 한 음이 떨어진다
const hz = (m) => 440 * 2 ** ((m - 69) / 12)
const CHORDS = [
  [57, 60, 64, 71], // Am(add9)
  [53, 57, 60, 64], // Fmaj7
  [48, 55, 60, 64], // C
  [55, 59, 62, 67], // G
]
const MELODY = [69, 72, 74, 76, 79, 81] // 라 단조 5음
const BAR = 8 // 화음 하나의 길이(초)

function makeMusic(ctx, out) {
  const bus = ctx.createGain()
  bus.gain.value = 0.65
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 1300
  const echo = ctx.createDelay()
  echo.delayTime.value = 0.42
  const fb = ctx.createGain()
  fb.gain.value = 0.32
  bus.connect(lp)
  lp.connect(out)
  lp.connect(echo)
  echo.connect(fb).connect(echo)
  echo.connect(out)

  const live = new Set()
  const tone = (freq, t, type, peak, attack, fadeAt, fadeTau, end) => {
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(peak, t + attack)
    g.gain.setTargetAtTime(0, fadeAt, fadeTau)
    o.connect(g).connect(bus)
    o.start(t)
    o.stop(end)
    live.add(o)
    o.onended = () => { live.delete(o); g.disconnect() }
  }

  let bar = 0
  const play = () => {
    const t = ctx.currentTime + 0.1
    CHORDS[bar % CHORDS.length].forEach((m, i) =>
      tone(hz(m), t, 'sine', i === 0 ? 0.07 : 0.045, 2.5, t + BAR - 1.5, 1.2, t + BAR + 5))
    // 한 마디에 한두 음만, 띄엄띄엄
    ;[1.5, 4.5, 6.5].forEach((at) => {
      if (Math.random() < 0.55) {
        const m = MELODY[Math.floor(Math.random() * MELODY.length)]
        tone(hz(m), t + at, 'sine', 0.04, 0.06, t + at + 0.1, 1.2, t + at + 6)
      }
    })
    bar++
  }
  play()
  const timer = setInterval(play, BAR * 1000)
  return () => {
    clearInterval(timer)
    live.forEach((o) => { try { o.stop() } catch { /* 이미 멈춤 */ } })
    ;[bus, lp, echo, fb].forEach((n) => n.disconnect())
  }
}


// ---------- 진짜로 녹음한 빗소리·파도 ----------
// 출처(CC BY): 빗소리 alex36917, 파도 Luftrum (freesound.org, Blanket 앱의 편집본). 정책 화면에 표시한다.
const RECORDINGS = { rain: rainUrl, waves: wavesUrl }
const SOFTEN = { rain: 5200, waves: 6000 } // 높은 소리를 살짝 깎아 귀에 부드럽게
const LEVEL = { rain: 2, waves: 1.6 }
const FADE = 4 // 끝과 처음을 4초 동안 겹쳐 이어서, 반복되는 이음매가 들리지 않게
const decoded = new Map() // 같은 화면에서 다시 고르면 다시 받지 않는다

// 녹음의 끝부분을 처음 4초에 겹쳐 섞은 새 소리를 만든다. 이걸 반복하면 이음매가 없다.
// (타이머 없이 반복되므로 화면이 잠깐 꺼지거나 다른 앱을 봐도 끊기지 않는다)
function seamless(ctx, buf) {
  const f = Math.floor(FADE * buf.sampleRate)
  const n = buf.length
  if (n < f * 3) return buf
  const out = ctx.createBuffer(buf.numberOfChannels, n - f, buf.sampleRate)
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const src = buf.getChannelData(ch)
    const dst = out.getChannelData(ch)
    dst.set(src.subarray(f, n - f), f)
    for (let i = 0; i < f; i++) {
      const x = (i / f) * (Math.PI / 2)
      dst[i] = src[i] * Math.sin(x) + src[n - f + i] * Math.cos(x)
    }
  }
  return out
}

function loadRecording(ctx, id) {
  const key = id
  if (!decoded.has(key) || decoded.get(key).ctx !== ctx) {
    const promise = fetch(RECORDINGS[id])
      .then((r) => { if (!r.ok) throw new Error('load'); return r.arrayBuffer() })
      .then((b) => new Promise((ok, fail) => ctx.decodeAudioData(b, ok, fail)))
      .then((buf) => seamless(ctx, buf))
    decoded.set(key, { ctx, promise })
  }
  return decoded.get(key).promise
}

function makeRecording(ctx, id, out, onState) {
  let stopped = false
  let fallback = null
  const live = new Set()
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = SOFTEN[id]
  lp.Q.value = 0.5
  const level = ctx.createGain()
  level.gain.value = LEVEL[id]
  lp.connect(level).connect(out)

  const play = (buf) => {
    const s = ctx.createBufferSource()
    s.buffer = buf
    s.loop = true
    s.connect(lp)
    s.start(ctx.currentTime + 0.05)
    live.add(s)
  }

  onState?.('loading')
  loadRecording(ctx, id).then((buf) => {
    if (stopped) return
    onState?.('ready')
    play(buf)
  }, () => {
    // 받지 못하면(인터넷이 끊겼을 때 등) 직접 만든 소리로 대신한다
    if (stopped) return
    onState?.('ready')
    fallback = id === 'rain' ? makeRain(ctx, out) : makeWaves(ctx, out)
  })

  return () => {
    stopped = true
    live.forEach((s) => { try { s.stop() } catch { /* 이미 멈춤 */ } })
    fallback?.()
    lp.disconnect()
    level.disconnect()
  }
}

export function makeSound(ctx, id, out, onState) {
  if (id === 'music') return makeMusic(ctx, out)
  return makeRecording(ctx, id, out, onState)
}
