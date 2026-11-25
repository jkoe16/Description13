// 마음곁 서비스 워커
// - 무료 서버가 잠들어 있어도 앱이 바로 열리도록, 화면(HTML·JS·CSS·아이콘)을 휴대폰에 저장해 두고 먼저 보여 준다.
// - 화면은 뒤에서 조용히 새 버전을 받아 두었다가 다음에 열 때 쓴다.
// - 같은 주소의 GET 요청만 다룬다. /api(마음 대화)와 Firebase 요청은 절대 저장하지 않는다.
const CACHE = 'maeumgyeot-v2'
const SHELL = './'
const STATIC = ['./manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './apple-touch-icon.png']

const assetsIn = (html) => [...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+)"/g)].map((m) => './' + m[1])

// 새 화면을 받아 저장하고, 그 화면이 쓰는 파일도 함께 저장한다. 더 이상 안 쓰는 옛 파일은 지운다.
async function refreshShell() {
  const res = await fetch(SHELL, { cache: 'no-cache' })
  if (!res.ok) return
  const html = await res.clone().text()
  const cache = await caches.open(CACHE)
  const assets = assetsIn(html)
  await cache.addAll(assets)
  await cache.put(SHELL, res)
  const keep = new Set(assets.map((a) => new URL(a, self.registration.scope).href))
  for (const req of await cache.keys()) {
    if (new URL(req.url).pathname.includes('/assets/') && !keep.has(req.url)) await cache.delete(req)
  }
}

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)).then(refreshShell).catch(() => {}))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()))
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return

  // 화면 열기: 저장본을 바로 보여 주고, 뒤에서 새 버전을 받아 둔다. 저장본이 없으면 인터넷에서.
  if (req.mode === 'navigate') {
    e.respondWith(caches.match(SHELL).then((hit) => {
      const update = refreshShell().catch(() => {})
      if (hit) {
        e.waitUntil(update)
        return hit
      }
      return fetch(req)
    }))
    return
  }

  // 그 밖의 파일: 저장본이 있으면 바로, 없으면 인터넷에서 받아 저장
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && (url.pathname.includes('/assets/') || STATIC.some((s) => url.pathname.endsWith(s.slice(1))))) {
      const copy = res.clone()
      caches.open(CACHE).then((c) => c.put(req, copy))
    }
    return res
  })))
})
