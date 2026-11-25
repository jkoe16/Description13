import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { handleChat, handleComfort } from './server/chat.js'

// 개발·미리보기 서버에 /api/chat을 붙인다. 키는 서버 쪽 process.env에만 들어가고
// VITE_ 접두사가 없으므로 화면 코드(번들)에는 포함되지 않는다.
const chatApi = {
  name: 'maeumgyeot-chat-api',
  configureServer(server) {
    server.middlewares.use('/api/chat', handleChat)
    server.middlewares.use('/api/comfort', handleComfort)
  },
  configurePreviewServer(server) {
    server.middlewares.use('/api/chat', handleChat)
    server.middlewares.use('/api/comfort', handleComfort)
  },
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const k of ['OPENAI_API_KEY', 'OPENAI_MODEL', 'OPENAI_REASONING_EFFORT', 'OPENAI_BASE_URL', 'FIREBASE_PROJECT_ID', 'VITE_FIREBASE_PROJECT_ID', 'ALLOWED_EMAILS']) {
    if (env[k] && !process.env[k]) process.env[k] = env[k]
  }
  return {
    plugins: [react(), chatApi],
    base: './',
  }
})
