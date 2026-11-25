import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 무료 서버는 한동안 안 쓰면 잠들기 때문에, 앱을 열자마자 미리 깨워 둔다 (마음 대화 첫 답장이 빨라짐)
fetch('/api/health', { cache: 'no-store' }).catch(() => {})

// 앱 설치(PWA)용 서비스 워커. 개발 서버에서는 캐시가 헷갈리지 않도록 등록하지 않는다.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}))
}
