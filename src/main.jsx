import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { startTheme } from './theme.js'

startTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 무료 서버는 한동안 안 쓰면 잠들기 때문에, 앱을 열자마자 미리 깨워 둔다 (마음 대화 첫 답장이 빨라짐).
// 휴대폰에서는 앱을 닫지 않고 뒤로 보냈다가 다시 여는 일이 많아서, 다시 화면에 나올 때도 깨운다(5분에 한 번까지).
let lastWake = 0
const wakeServer = () => {
  if (Date.now() - lastWake < 5 * 60 * 1000) return
  lastWake = Date.now()
  fetch('/api/health', { cache: 'no-store' }).catch(() => {})
}
wakeServer()
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && wakeServer())

// 앱 설치(PWA)용 서비스 워커. 개발 서버에서는 캐시가 헷갈리지 않도록 등록하지 않는다.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}))
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type === 'update-ready') window.dispatchEvent(new Event('maeumgyeot-update'))
  })
}
