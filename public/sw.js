// 마음곁 서비스 워커: 앱 설치와 인터넷이 끊겼을 때 화면을 열 수 있게 하는 최소 캐시.
// - 같은 주소의 GET 요청만 다룬다. /api(마음 대화)와 Firebase 요청은 절대 캐시하지 않는다.
// - 화면(HTML)은 항상 인터넷에서 먼저 받아 새 버전을 쓰고, 끊겼을 때만 저장본을 쓴다.
const CACHE = 'maeumgyeot-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()))
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return

  // 빌드 결과물(이름에 해시가 붙은 파일)은 바뀌지 않으므로 저장본을 먼저 쓴다
  if (url.pathname.includes('/assets/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()))
      return res
    })))
    return
  }

  // 그 밖의 파일(화면, 아이콘 등)은 인터넷 먼저, 실패하면 저장본
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) {
      const copy = res.clone()
      caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? './' : req, copy))
    }
    return res
  }).catch(() => caches.match(req.mode === 'navigate' ? './' : req).then((hit) => hit || Response.error())))
})
